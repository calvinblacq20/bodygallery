import Lenis from 'lenis';
import { formatTime, openStatus, type Closure, type WeeklyHours } from '../lib/hours';
import { startGlide } from './glide';
import { startScrollLoop } from './scroll-loop';

const root = document.documentElement;
// Resolved once in <head> (lib/inline-scripts.ts); never re-read the media query here.
const motion = root.dataset.motion ?? 'off';
// Tells the <head> failsafe this script started, so it leaves the motion level alone.
root.setAttribute('data-motion-ready', '');
// Phones and tablets keep native scrolling: it's smoother on budget devices, and smooth-scroll
// fights browser-initiated scrolls there (focusing a form field, scrolling a button into view).
const touchScreen = window.matchMedia('(pointer: coarse)').matches;

// Smooth, weighted scrolling for wheel and trackpad only.
if (motion === 'full' && !touchScreen) {
  new Lenis({
    autoRaf: true,
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    anchors: true,
  });
}

// Staggered groups: number the children so each arrives a beat after the one before
// (capped, so long lists don't keep the last items waiting).
document.querySelectorAll<HTMLElement>('[data-stagger]').forEach((group) => {
  Array.from(group.children).forEach((child, i) => {
    (child as HTMLElement).style.setProperty('--stagger-index', String(Math.min(i, 8)));
  });
});

if (motion !== 'off') {
  const revealables = [...document.querySelectorAll<HTMLElement>('[data-reveal], [data-stagger]')];
  // The observer makes reveals prompt; the scroll loop's position check makes them certain,
  // so one undelivered callback can never leave content hidden.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    },
    // The huge top margin counts anything already scrolled past as seen, so a fast fling or
    // an anchor jump (/#packages) never leaves content above the screen waiting to fade in.
    { rootMargin: '100000px 0px -8% 0px', threshold: 0.08 },
  );
  revealables.forEach((el) => observer.observe(el));

  const jsScroll = root.dataset.scroll === 'js';
  startScrollLoop({
    reveals: revealables,
    effects: motion === 'full' && jsScroll,
    heroFade: motion === 'calm' && jsScroll,
    progress: jsScroll,
  });
}

// Carousel arrows. Without JS the track still scrolls by swipe, so the arrows start hidden.
document.querySelectorAll<HTMLElement>('[data-carousel]').forEach((root) => {
  const track = root.querySelector<HTMLElement>('[data-track]');
  const prev = root.querySelector<HTMLButtonElement>('[data-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-next]');
  if (!track || !prev || !next) return;

  const step = () => {
    const slide = track.querySelector<HTMLElement>('[data-slide]');
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return (slide?.offsetWidth ?? track.clientWidth * 0.8) + gap;
  };
  const sync = () => {
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
  };
  const behavior: ScrollBehavior = motion === 'off' ? 'auto' : 'smooth';
  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior }));
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior }));
  track.addEventListener('scroll', sync, { passive: true });
  prev.hidden = false;
  next.hidden = false;
  sync();
});

// The home-page carousels glide slowly on their own: an ambient loop, so calm keeps it too.
if (motion !== 'off') startGlide([...document.querySelectorAll<HTMLElement>('[data-glide]')]);

// Close the mobile menu when an in-page link is chosen.
document.querySelectorAll<HTMLAnchorElement>('[data-close-menu]').forEach((link) => {
  link.addEventListener('click', () => document.getElementById('mobile-menu')?.hidePopover());
});

// Open-now badge, worked out in Accra time whatever the visitor's clock says.
const DAY_NAMES = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};
document.querySelectorAll<HTMLElement>('[data-open-status]').forEach((el) => {
  const { hours, closures, tz } = el.dataset;
  if (!hours || !tz) return;
  const status = openStatus(
    JSON.parse(hours) as WeeklyHours,
    new Date(),
    tz,
    closures ? (JSON.parse(closures) as Closure[]) : [],
  );
  let text: string;
  if (status.open) {
    text = `Open now · until ${formatTime(status.closesAt)}`;
  } else if (status.next) {
    const when = status.next.isToday ? 'today' : DAY_NAMES[status.next.day];
    text = `${status.reason ?? 'Closed now'} · opens ${when} ${formatTime(status.next.opensAt)}`;
  } else {
    text = status.reason ?? 'Closed';
  }
  el.textContent = text;
  el.dataset.state = status.open ? 'open' : 'closed';
});
