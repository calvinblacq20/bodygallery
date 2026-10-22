import { expect, test, type Page } from '@playwright/test';

async function scrollThrough(page: Page) {
  const { total, step } = await page.evaluate(() => ({
    total: document.documentElement.scrollHeight,
    step: Math.round(window.innerHeight * 0.6),
  }));
  let widest = 0;
  for (let y = 0; y <= total; y += step) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(120);
    widest = Math.max(
      widest,
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    );
  }
  return widest;
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});

test('scroll-linked effects survive the production build', async ({ page }) => {
  await page.goto('/');
  const supported = await page.evaluate(() => CSS.supports('animation-timeline: view()'));
  test.skip(!supported, 'this browser has no scroll-driven animations; the page stays static');

  // A minifier folding animation-timeline into the animation shorthand switches these off.
  const names = await page.evaluate(() =>
    [
      '.scroll-progress',
      '.hero-copy',
      '[data-drift]',
      '[data-tilt]',
      '[data-parallax-img] img',
    ].map((selector) => {
      const el = document.querySelector(selector);
      return el ? getComputedStyle(el).animationName : `${selector} missing`;
    }),
  );
  expect(names).toEqual(['scroll-progress', 'hero-copy', 'drift', 'tilt', 'img-parallax']);
});

test('the treatment band loops on its own: top row left, bottom row right', async ({ page }) => {
  await page.goto('/');
  const rows = page.locator('.marquee');
  // Scroll to the still wrapper: the moving row itself never settles for Playwright.
  await page.locator('.marquee-row').first().scrollIntoViewIfNeeded();
  const offsets = () =>
    rows.evaluateAll((els) => els.map((el) => new DOMMatrix(getComputedStyle(el).transform).m41));
  const before = await offsets();
  expect(before).toHaveLength(2);
  const [topBefore = 0, bottomBefore = 0] = before;
  await page.waitForTimeout(800);
  const [topAfter = 0, bottomAfter = 0] = await offsets();
  expect(topAfter, 'top row moves left').toBeLessThan(topBefore);
  expect(bottomAfter, 'bottom row moves right').toBeGreaterThan(bottomBefore);
});

test('every reveal settles and nothing pushes the page sideways while moving', async ({ page }) => {
  test.slow(); // scrolls four long pages a step at a time
  for (const path of ['/', '/services', '/about', '/services/hammam']) {
    await page.goto(path);
    expect(await scrollThrough(page), path).toBeLessThanOrEqual(0);
    await expect
      .poll(
        () =>
          page.evaluate(() =>
            // Only what is displayed: some photos are hidden on phones and never scroll into view.
            [...document.querySelectorAll('[data-reveal]:not(.is-in), [data-stagger]:not(.is-in)')]
              .filter((el) => el.getClientRects().length > 0)
              .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`),
          ),
        { message: `${path}: reveals still hidden after scrolling` },
      )
      .toEqual([]);
  }
});
