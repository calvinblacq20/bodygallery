/**
 * One loop for everything that follows the scroll position:
 *
 * - Reveals. IntersectionObserver (in motion.ts) makes them prompt; this position check makes
 *   them certain. An observer callback that never arrives would otherwise leave content
 *   hidden for good, and this check cannot fail closed.
 * - Scroll-linked effects and the progress line, when the browser has no CSS scroll
 *   timelines (Safari before 26, or ?scroll=js). The maths mirrors the CSS keyframes.
 *
 * Layout is measured on resize and cached (offsetTop ignores the transforms written here);
 * each tick reads scrollY once and writes only values that changed. Safari can stop
 * delivering animation frames (backgrounding, back/forward cache, a finger on the screen),
 * so a watchdog restarts the loop and scroll events tick it directly while frames are stalled.
 */

interface Options {
  /** Elements waiting for .is-in. */
  reveals: HTMLElement[];
  /** Drive the scroll-linked effects here instead of in CSS. */
  effects: boolean;
  /** Drive the reading-progress line here instead of in CSS. */
  progress: boolean;
}

type Kind =
  'parallax' | 'zoom' | 'draw' | 'drift' | 'img' | 'tilt' | 'tilt-img' | 'hero-photo' | 'hero-copy';

interface Tracked {
  el: HTMLElement | SVGElement;
  kind: Kind;
  /** Document top and height of the box whose position drives the effect. */
  top: number;
  height: number;
  /** Parallax travel in px, read from --parallax. */
  travel: number;
  shown: boolean;
}

const clamp = (n: number) => Math.min(1, Math.max(0, n));
const round = (n: number, places = 3) => Math.round(n * 10 ** places) / 10 ** places;

/** Document top from the offset chain, which ignores transforms (ours included). */
function docTop(el: HTMLElement): number {
  let y = 0;
  for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null)
    y += n.offsetTop;
  return y;
}

export function startScrollLoop({ reveals, effects, progress }: Options) {
  const root = document.documentElement;
  const pending = reveals.map((el) => ({ el, top: 0 }));
  const tracked: Tracked[] = [];
  const heroSection = document.querySelector<HTMLElement>('.hero');

  if (effects) {
    const add = (selector: string, kind: Kind) =>
      document
        .querySelectorAll<HTMLElement | SVGElement>(selector)
        .forEach((el) => tracked.push({ el, kind, top: 0, height: 0, travel: 0, shown: true }));
    add('[data-parallax]', 'parallax');
    add('[data-zoom-out]', 'zoom');
    add('[data-draw]', 'draw');
    add('[data-drift]', 'drift');
    add('[data-parallax-img] img', 'img');
    add('[data-tilt]', 'tilt');
    add('[data-tilt] img', 'tilt-img');
    add('.hero-photo', 'hero-photo');
    add('.hero-copy', 'hero-copy');
  }
  const bar = progress ? document.querySelector<HTMLElement>('.scroll-progress') : null;

  // Cached layout.
  let lastY = -1;
  let vh = window.innerHeight;
  let maxScroll = 1;
  let wide = false;
  let needsMeasure = true;

  const measure = () => {
    needsMeasure = false;
    vh = window.innerHeight;
    maxScroll = Math.max(1, root.scrollHeight - vh);
    wide = window.matchMedia('(min-width: 768px)').matches;
    for (const p of pending) p.top = docTop(p.el);
    for (const t of tracked) {
      // The hero effects follow the hero section; a drawn path follows its <svg>.
      const box =
        t.kind === 'hero-photo' || t.kind === 'hero-copy'
          ? heroSection
          : t.el instanceof SVGElement
            ? t.el.ownerSVGElement
            : t.el;
      t.shown = !!box && box.getClientRects().length > 0;
      if (!box || !t.shown) continue;
      if (box instanceof HTMLElement) {
        t.top = docTop(box);
        t.height = box.offsetHeight;
      } else {
        const r = box.getBoundingClientRect();
        t.top = r.top + window.scrollY;
        t.height = r.height;
      }
      if (t.kind === 'parallax') {
        t.travel = parseFloat(getComputedStyle(t.el).getPropertyValue('--parallax')) || 60;
      }
    }
    lastY = -1; // force a full write after re-measuring
  };

  // Writes, skipped when the value hasn't changed.
  const written = new WeakMap<Element, Record<string, string>>();
  const write = (el: HTMLElement | SVGElement, prop: string, value: string) => {
    let seen = written.get(el);
    if (!seen) written.set(el, (seen = {}));
    if (seen[prop] === value) return;
    seen[prop] = value;
    el.style.setProperty(prop, value);
  };

  const apply = (t: Tracked, y: number) => {
    // View progress over the element's whole pass through the window (CSS "cover").
    const cover = clamp((y + vh - t.top) / (vh + t.height));
    // Hero leaving the top of the window (CSS "exit" for a box no taller than the window).
    const exit = (end: number) => clamp((y - t.top) / (t.height * end || 1));
    switch (t.kind) {
      case 'parallax':
        write(t.el, 'translate', wide ? `0 ${round(t.travel * (1 - 2 * cover), 1)}px` : '');
        break;
      case 'zoom':
        // CSS range: entry 0% to exit 30%, which is about 65% of the cover range.
        write(t.el, 'scale', String(round(1.18 - 0.18 * clamp(cover / 0.65))));
        break;
      case 'draw':
        // CSS range: entry 10% to cover 60%.
        write(t.el, 'stroke-dashoffset', String(round(1 - clamp((cover - 0.05) / 0.55))));
        break;
      case 'drift':
        write(t.el, 'translate', `${round(8 - 16 * cover, 2)}% 0`);
        break;
      case 'img':
        write(t.el, 'translate', `0 ${round(-6 + 12 * cover, 2)}%`);
        break;
      case 'tilt':
        write(t.el, 'rotate', `${round(7 - 14 * cover, 2)}deg`);
        break;
      case 'tilt-img':
        write(t.el, 'rotate', `${round(-7 + 14 * cover, 2)}deg`);
        break;
      case 'hero-photo': {
        const e = exit(1);
        write(t.el, 'translate', `0 ${round(28 * e, 2)}%`);
        write(t.el, 'scale', String(round(1 + 0.08 * e)));
        break;
      }
      case 'hero-copy': {
        const e = exit(0.8);
        write(t.el, 'opacity', String(round(1 - e)));
        write(t.el, 'translate', `0 ${round(-14 * e, 2)}%`);
        break;
      }
    }
  };

  const tick = () => {
    if (needsMeasure) measure();
    const y = window.scrollY;
    if (y === lastY) return;
    lastY = y;

    // Reveal anything at or above the reveal line (8% up from the bottom, like the observer).
    for (let i = pending.length - 1; i >= 0; i--) {
      const p = pending[i];
      if (!p) continue;
      if (p.el.classList.contains('is-in') || p.top - y < vh * 0.92) {
        p.el.classList.add('is-in');
        pending.splice(i, 1);
      }
    }
    for (const t of tracked) if (t.shown) apply(t, y);
    if (bar) write(bar, 'transform', `scaleX(${round(clamp(y / maxScroll), 4)})`);
    if (!pending.length && !tracked.length && !bar) stop();
  };

  // The loop, plus a watchdog for when Safari stops delivering frames.
  let frameId = 0;
  let running = false;
  let lastBeat = performance.now();
  const frame = (now: number) => {
    lastBeat = now;
    tick();
    if (running) frameId = requestAnimationFrame(frame);
  };
  const start = () => {
    if (!running) return;
    cancelAnimationFrame(frameId);
    lastBeat = performance.now();
    frameId = requestAnimationFrame(frame);
  };
  const stalled = () => performance.now() - lastBeat > 250;
  const watchdog = window.setInterval(() => {
    if (document.visibilityState !== 'visible' || !stalled()) return;
    tick();
    start();
  }, 500);
  const onScroll = () => {
    if (stalled()) tick();
  };
  const onResize = () => {
    needsMeasure = true;
  };
  const onShow = () => {
    needsMeasure = true;
    start();
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible') onShow();
  };
  const resizeObserver = new ResizeObserver(onResize);

  function stop() {
    running = false;
    cancelAnimationFrame(frameId);
    window.clearInterval(watchdog);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('load', onResize);
    window.removeEventListener('pageshow', onShow);
    document.removeEventListener('visibilitychange', onVisible);
    resizeObserver.disconnect();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  window.addEventListener('load', onResize);
  window.addEventListener('pageshow', onShow);
  document.addEventListener('visibilitychange', onVisible);
  // Lazy images and late fonts change the page height; re-measure when the body resizes.
  resizeObserver.observe(document.body);
  void document.fonts.ready.then(onResize);
  running = true;
  start();
}
