import Lenis from 'lenis';
import { formatTime, openStatus, type Closure, type WeeklyHours } from '../lib/hours';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Phones and tablets keep native scrolling: it's smoother on budget devices, and smooth-scroll
// fights browser-initiated scrolls there (focusing a form field, scrolling a button into view).
const touchScreen = window.matchMedia('(pointer: coarse)').matches;

// Smooth, weighted scrolling for wheel and trackpad only.
if (!reduceMotion && !touchScreen) {
  new Lenis({
    autoRaf: true,
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    anchors: true,
  });
}

// Reveal elements once as they enter the viewport.
const revealables = document.querySelectorAll<HTMLElement>('[data-reveal]');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  revealables.forEach((el) => observer.observe(el));
} else {
  revealables.forEach((el) => el.classList.add('is-in'));
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
  const behavior: ScrollBehavior = reduceMotion ? 'auto' : 'smooth';
  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior }));
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior }));
  track.addEventListener('scroll', sync, { passive: true });
  prev.hidden = false;
  next.hidden = false;
  sync();
});

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
