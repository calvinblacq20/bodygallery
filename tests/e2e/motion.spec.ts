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
  for (const path of ['/', '/?scroll=js', '/services', '/about', '/services/hammam']) {
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

test.describe('motion levels (resolved once into <html data-motion>)', () => {
  const marqueeOffsets = async (page: Page) => {
    // Scroll to the still wrapper: the moving row itself never settles for Playwright.
    await page.locator('.marquee-row').first().scrollIntoViewIfNeeded();
    const read = () =>
      page
        .locator('.marquee')
        .evaluateAll((els) => els.map((el) => new DOMMatrix(getComputedStyle(el).transform).m41));
    const before = await read();
    await page.waitForTimeout(800);
    return { before, after: await read() };
  };

  test('reduced motion (iOS also asks for it in Low Power Mode) is calm, not frozen', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'calm');

    // Ambient loops keep running...
    const { before, after } = await marqueeOffsets(page);
    expect(after[0], 'band still loops').toBeLessThan(before[0] ?? 0);

    // ...travel does not: photos stay put in their frames.
    const img = await page.evaluate(() => {
      const el = document.querySelector('[data-parallax-img] img');
      return el ? `${getComputedStyle(el).animationName} ${getComputedStyle(el).translate}` : '';
    });
    expect(img).toBe('none none');

    // And content still arrives, as a fade.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect
      .poll(() =>
        page
          .locator('#visit [data-reveal]')
          .first()
          .evaluate((el) => el.className),
      )
      .toContain('is-in');
  });

  test('?motion=off overrides the device: a complete, still page', async ({ page }) => {
    await page.goto('/?motion=off');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
    const state = await page.evaluate(() => ({
      faded: [...document.querySelectorAll('[data-reveal]')].filter(
        (el) => getComputedStyle(el).opacity !== '1',
      ).length,
      band: [...document.querySelectorAll('.marquee')].map(
        (el) => getComputedStyle(el).animationName,
      ),
    }));
    expect(state).toEqual({ faded: 0, band: ['none', 'none'] });
  });

  test('?motion=full overrides a reduced-motion device', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?motion=full');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
  });

  test('without CSS scroll timelines the script drives the effects (Safari before 26)', async ({
    page,
  }) => {
    await page.goto('/?scroll=js');
    await expect(page.locator('html')).toHaveAttribute('data-scroll', 'js');
    const read = () =>
      page.evaluate(() => {
        const copy = document.querySelector<HTMLElement>('.hero-copy');
        const bar = document.querySelector('.scroll-progress');
        const tilt = document.querySelector<HTMLElement>('[data-tilt]');
        return {
          copy: Number(copy ? getComputedStyle(copy).opacity : 1),
          bar: bar ? new DOMMatrix(getComputedStyle(bar).transform).a : 0,
          tilt: tilt?.style.getPropertyValue('rotate') ?? '',
          cssRunning: copy ? copy.getAnimations().length : 0,
        };
      });
    await expect.poll(async () => (await read()).tilt).toMatch(/deg$/);
    expect((await read()).cssRunning, 'CSS engine stays out of the way').toBe(0);

    await page.evaluate(() => window.scrollTo(0, Math.round(window.innerHeight * 0.7)));
    await expect
      .poll(async () => (await read()).copy, { message: 'hero words fade' })
      .toBeLessThan(0.5);
    await expect
      .poll(async () => (await read()).bar, { message: 'progress line grows' })
      .toBeGreaterThan(0);
  });
});
