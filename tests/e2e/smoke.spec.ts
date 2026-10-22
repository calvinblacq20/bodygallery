import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { JS_FLAG_SCRIPT } from '../../src/lib/inline-scripts';

const WHATSAPP = 'https://wa.me/233540185528?text=';
const messageOf = (href: string | null) => new URL(href ?? '').searchParams.get('text') ?? '';

async function goToServices(page: Page, isMobile: boolean) {
  if (isMobile) {
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page
      .getByRole('navigation', { name: 'Mobile' })
      .getByRole('link', { name: 'Services' })
      .click();
  } else {
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Services' })
      .click();
  }
  await expect(page).toHaveURL(/\/services$/);
}

test('core action: a visitor picks a treatment and gets a ready-written WhatsApp message', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Kasoa');
  await goToServices(page, isMobile);

  const book = page.locator('#deep-tissue-massage').getByRole('link', { name: 'Book on WhatsApp' });
  const href = await book.getAttribute('href');
  expect(href?.startsWith(WHATSAPP)).toBe(true);
  expect(messageOf(href)).toBe(
    "Hi Body Gallery (from website), I'd like to book:\nTreatment: Deep Tissue Massage - 1 hr - GH₵250",
  );
});

test('advanced treatments ask for a consultation and never show a guessed price', async ({
  page,
}) => {
  await page.goto('/services');
  const row = page.locator('#laser-tattoo-removal');
  await expect(row).toContainText('Price on consultation');
  const href = await row.getByRole('link', { name: 'Book a consultation' }).getAttribute('href');
  expect(messageOf(href)).toContain("I'd like to book a consultation for:");
});

test('the Sunday special explains its day rule in the message', async ({ page }) => {
  await page.goto('/');
  const href = await page
    .getByRole('link', { name: 'Book Sunday Special on WhatsApp' })
    .getAttribute('href');
  expect(messageOf(href)).toContain('Sundays only');
});

test('pages never scroll sideways', async ({ page }) => {
  for (const path of ['/', '/services']) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test('only the hash-allow-listed inline script is present (CSP-ready)', async ({ page }) => {
  for (const path of ['/', '/services']) {
    await page.goto(path);
    const inline = await page.locator('script:not([src])').allTextContents();
    expect(inline, path).toEqual([JS_FLAG_SCRIPT]);
  }
});

test('unknown pages get the custom 404', async ({ page }) => {
  const response = await page.goto('/no-such-page');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('link', { name: 'See services & prices' })).toBeVisible();
});

test.describe('without JavaScript (Opera Mini, data savers)', () => {
  test.use({ javaScriptEnabled: false });

  test('content is visible and booking links still work', async ({ page }) => {
    await page.goto('/services');
    const row = page.locator('#hot-stone-massage');
    await expect(row).toBeVisible();
    await expect(row).toHaveCSS('opacity', '1');
    const href = await row.getByRole('link', { name: 'Book on WhatsApp' }).getAttribute('href');
    expect(messageOf(href)).toContain('Hot Stone Massage - 1 hr - GH₵300');
  });
});

test('no detectable accessibility violations', async ({ page }) => {
  for (const path of ['/', '/services']) {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s) - ${v.help}`),
      path,
    ).toEqual([]);
  }
});
