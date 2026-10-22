/**
 * Slow, continuous glide for the home-page carousels. It is an ambient loop inside its own
 * frame, so it runs in calm mode as well as full.
 *
 * The cards are cloned once (hidden from assistive tech and the keyboard) so the track loops
 * without rewinding. Movement is time-based and written as scrollLeft, so swiping and the
 * arrows keep working. Snapping is switched off only while gliding. The glide holds while
 * someone is using the carousel (a touch, a swipe, the arrows, a mouse over it, keyboard
 * focus in it) and carries on from wherever they left it a few seconds later.
 *
 * Layout is measured on resize and cached; each frame reads only scrollY. A watchdog
 * restarts the loop when Safari stops delivering frames.
 */

const PX_PER_SECOND = 24;
const RESUME_AFTER_MS = 5000;
/** Longest step one frame may take, so returning from the background doesn't lurch. */
const MAX_STEP_MS = 50;

interface Glider {
  root: HTMLElement;
  track: HTMLElement;
  /** Exact position; scrollLeft only takes whole pixels on some browsers. */
  pos: number;
  written: number;
  /** Width of one set of cards: the distance after which the view repeats. */
  lap: number;
  top: number;
  height: number;
  gliding: boolean;
  holdUntil: number;
  hovering: boolean;
  keyboardFocus: boolean;
}

function docTop(el: HTMLElement): number {
  let y = 0;
  for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null)
    y += n.offsetTop;
  return y;
}

export function startGlide(roots: HTMLElement[]) {
  const gliders: Glider[] = [];
  for (const root of roots) {
    const track = root.querySelector<HTMLElement>('[data-track]');
    if (!track || !track.children.length) continue;
    const originals = Array.from(track.children) as HTMLElement[];
    for (const card of originals) {
      const clone = card.cloneNode(true) as HTMLElement;
      clone.setAttribute('aria-hidden', 'true');
      clone.inert = true;
      clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
      track.append(clone);
    }
    const g: Glider = {
      root,
      track,
      pos: track.scrollLeft,
      written: -1,
      lap: 0,
      top: 0,
      height: 0,
      gliding: false,
      holdUntil: 0,
      hovering: false,
      keyboardFocus: false,
    };
    const hold = () => {
      g.holdUntil = performance.now() + RESUME_AFTER_MS;
    };
    root.addEventListener('pointerdown', hold);
    track.addEventListener('touchstart', hold, { passive: true });
    track.addEventListener('wheel', hold, { passive: true });
    root.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') g.hovering = true;
    });
    root.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'mouse') return;
      g.hovering = false;
      hold();
    });
    root.addEventListener('focusin', (e) => {
      g.keyboardFocus = (e.target as Element).matches(':focus-visible');
    });
    root.addEventListener('focusout', (e) => {
      if (!root.contains(e.relatedTarget as Node | null)) g.keyboardFocus = false;
    });
    gliders.push(g);
  }
  if (!gliders.length) return;

  let vh = window.innerHeight;
  let needsMeasure = true;
  const measure = () => {
    needsMeasure = false;
    vh = window.innerHeight;
    for (const g of gliders) {
      const half = g.track.children.length / 2;
      const first = g.track.children[0] as HTMLElement | undefined;
      const firstClone = g.track.children[half] as HTMLElement | undefined;
      g.lap = first && firstClone ? firstClone.offsetLeft - first.offsetLeft : 0;
      g.top = docTop(g.track);
      g.height = g.track.offsetHeight;
    }
  };

  let last = performance.now();
  const tick = (now: number) => {
    if (needsMeasure) measure();
    const dt = Math.min(now - last, MAX_STEP_MS) / 1000;
    last = now;
    const y = window.scrollY;
    for (const g of gliders) {
      const held = g.hovering || g.keyboardFocus || now < g.holdUntil;
      if (held) {
        if (g.gliding) {
          g.gliding = false;
          g.track.classList.remove('is-gliding'); // snapping back on for the visitor
        }
        continue;
      }
      if (g.top + g.height < y || g.top > y + vh || g.lap <= 0) continue;
      if (!g.gliding) {
        // Pick up from wherever the visitor left it.
        g.gliding = true;
        g.pos = g.track.scrollLeft;
        g.written = -1;
        g.track.classList.add('is-gliding');
      }
      g.pos += PX_PER_SECOND * dt;
      if (g.pos >= g.lap) g.pos -= g.lap;
      const x = Math.round(g.pos);
      if (x !== g.written) {
        g.track.scrollLeft = x;
        g.written = x;
      }
    }
  };

  // The loop, plus a watchdog for when Safari stops delivering frames.
  let frameId = 0;
  let lastBeat = performance.now();
  const frame = (now: number) => {
    lastBeat = now;
    tick(now);
    frameId = requestAnimationFrame(frame);
  };
  const start = () => {
    cancelAnimationFrame(frameId);
    last = lastBeat = performance.now();
    frameId = requestAnimationFrame(frame);
  };
  window.setInterval(() => {
    if (document.visibilityState === 'visible' && performance.now() - lastBeat > 500) start();
  }, 500);
  const remeasure = () => {
    needsMeasure = true;
  };
  window.addEventListener('resize', remeasure);
  window.addEventListener('load', remeasure);
  window.addEventListener('pageshow', () => {
    remeasure();
    start();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') start();
  });
  const resizeObserver = new ResizeObserver(remeasure);
  resizeObserver.observe(document.body);
  for (const g of gliders) resizeObserver.observe(g.track);
  start();
}
