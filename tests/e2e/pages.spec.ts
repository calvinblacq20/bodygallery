import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const PAGES = [
  '/',
  '/services',
  '/services/laser-tattoo-removal',
  '/services/deep-tissue-massage',
  '/about',
  '/visit',
  '/faq',
  '/book',
  '/privacy',
  '/terms',
];
// Wednesday 21 Oct 2026, 10:00 in Accra (UTC+0 all year).
const WEDNESDAY_10AM = new Date('2026-10-21T10:00:00Z');
const textOf = (url: string) => new URL(url).searchParams.get('text') ?? '';

/** Stub WhatsApp so the test can read where the visitor was sent without leaving the site. */
async function stubWhatsApp(page: Page) {
  await page.route('https://wa.me/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/plain', body: 'whatsapp' }),
  );
}

test('every internal link on every page resolves', async ({ page, request }) => {
  const seen = new Set<string>();
  for (const path of PAGES) {
    await page.goto(path);
    const hrefs = await page
      .locator('a[href^="/"]')
      .evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''));
    hrefs.forEach((h) => seen.add(h.split('#')[0]?.split('?')[0] || '/'));
  }
  for (const href of seen) {
    const response = await request.get(href);
    expect(response.status(), href).toBe(200);
  }
});

test('treatment page shows details and books a consultation', async ({ page }) => {
  await page.goto('/services/laser-tattoo-removal');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Removal');
  await expect(page.getByText('Price on consultation').first()).toBeVisible();

  const book = page.getByRole('link', { name: /Book a consultation/ }).first();
  expect(textOf((await book.getAttribute('href')) ?? '')).toContain(
    "I'd like to book a consultation for:\nTreatment: Laser Tattoo Removal",
  );
  await expect(page.getByRole('link', { name: 'Pick a day and time' }).first()).toHaveAttribute(
    'href',
    '/book?service=laser-tattoo-removal',
  );

  const question = page.getByText('Will it remove my tattoo completely?');
  await question.click();
  await expect(page.getByText(/Many tattoos fade a lot/)).toBeVisible();
});

test.describe('booking helper', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(WEDNESDAY_10AM);
    await stubWhatsApp(page);
  });

  test('builds the full WhatsApp message from treatment, day, time and name', async ({ page }) => {
    await page.goto('/book?service=deep-tissue-massage');
    await expect(page.getByLabel('Treatment')).toHaveValue('service:deep-tissue-massage');

    await page.getByText('Today', { exact: true }).click();
    await page.getByText('Afternoon (12–4pm)').click();
    await page.getByLabel('Your name').fill('Ama');
    await page.getByLabel(/Anything we should know/).fill('First visit');
    await expect(page.locator('[data-preview]')).toContainText('Name: Ama');

    await page.getByRole('button', { name: /Open WhatsApp/ }).click();
    await page.waitForURL(/wa\.me/);
    expect(new URL(page.url()).pathname).toBe('/233540185528');
    expect(textOf(page.url())).toBe(
      "Hi Body Gallery (from website), I'd like to book:\nTreatment: Deep Tissue Massage - 1 hr - GH₵250\nDay: Wed 21 Oct\nTime: Afternoon (12–4pm)\nName: Ama\nNote: First visit",
    );
  });

  test('shows errors beside each missing field and focuses the first', async ({ page }) => {
    await page.goto('/book');
    await page.getByRole('button', { name: /Open WhatsApp/ }).click();
    await expect(page.getByText('Choose a treatment or package.')).toBeVisible();
    await expect(page.getByText('Pick a day.')).toBeVisible();
    await expect(page.getByText('Add your name so we know who to expect.')).toBeVisible();
    await expect(page.getByLabel('Treatment')).toBeFocused();
    await expect(page).toHaveURL(/\/book/);
  });

  test('Sunday Special offers only Sundays and exactly three picks', async ({ page }) => {
    await page.goto('/book?package=sunday-special');
    await expect(page.locator('[data-days-hint]')).toHaveText('Sundays only, 12–6pm.');
    const dayChips = await page.locator('#bk-days .chip span').allTextContents();
    expect(dayChips).toEqual(['Sun 25 Oct', 'Sun 1 Nov']);

    for (const pick of ['Waxing', 'Facial', 'Pedicure', 'Massage']) {
      await page.locator('[data-choose-options] .chip', { hasText: pick }).click();
    }
    await expect(page.getByText('You can pick 3. Untick one to swap it.')).toBeVisible();
    await expect(page.locator('[data-choose-options] input:checked')).toHaveCount(3);
    await expect(page.locator('[data-preview]')).toContainText(
      'Package: Sunday Special - GH₵350 (Waxing, Facial, Pedicure)',
    );
  });

  test('ignores a crafted ?service= value', async ({ page }) => {
    await page.goto('/book?service=%3Cscript%3Ealert(1)%3C%2Fscript%3E');
    await expect(page.getByLabel('Treatment')).toHaveValue('');
    await expect(page.locator('[data-preview]')).toHaveText(
      "Hi Body Gallery (from website), I'd like to book an appointment.",
    );
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the booking page offers a plain WhatsApp link and phone numbers', async ({ page }) => {
    await page.goto('/book');
    await expect(page.locator('#booking')).toBeHidden();
    const link = page.getByRole('link', { name: /Book on WhatsApp/ }).first();
    await expect(link).toBeVisible();
    expect(await link.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/233540185528\?text=/);
    await expect(page.getByRole('link', { name: '054 018 5528' }).first()).toBeVisible();
  });
});

test('the map on /visit loads only when asked', async ({ page }) => {
  await page.route(/google\.com\/maps/, (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<p>map</p>' }),
  );
  await page.goto('/visit');
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.getByRole('button', { name: 'Show map' }).click();
  await expect(page.locator('iframe')).toHaveAttribute('src', /google\.com\/maps\?q=5\.51/);
});

test('FAQ answers open from their question', async ({ page }) => {
  await page.goto('/faq');
  await page.getByText('Do I need to pay a deposit?').click();
  await expect(page.getByText(/Some advanced treatments need a deposit/)).toBeVisible();
});

test('new pages have no detectable accessibility violations', async ({ page }) => {
  // Check the settled page (?motion=off): mid-fade text would fail contrast for a moment.
  await page.clock.setFixedTime(WEDNESDAY_10AM);
  for (const path of PAGES.slice(2)) {
    await page.goto(`${path}?motion=off`);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s) - ${v.help}`),
      path,
    ).toEqual([]);
  }
});
