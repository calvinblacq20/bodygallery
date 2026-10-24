/**
 * Runs in <head> before first paint and decides, once, how much the page moves. The <html>
 * element ships with data-motion="off" so the page is complete without JavaScript; this sets:
 *
 *   data-motion="full"  nothing requested: everything runs
 *   data-motion="calm"  reduced motion requested. iOS also reports this in Low Power Mode, so
 *                       it is common; fades and constant ambient loops stay, travel goes
 *   data-motion="off"   ?motion=off, or motion.ts failed to run (checked at DOMContentLoaded,
 *                       which waits for module scripts however slow the connection)
 *   data-scroll="css"   the browser runs CSS scroll timelines; "js" means motion.ts drives the
 *                       scroll-linked effects instead (Safari before 26, or ?scroll=js)
 *
 * ?motion=full|calm|off overrides the device setting, to tell a setting apart from a bug on a
 * phone that can't be inspected. CSS and motion.ts read these attributes, never the media
 * query, so they can't disagree.
 *
 * Its SHA-256 hash is allow-listed in the CSP in vercel.json; a unit test keeps them in sync.
 */
export const MOTION_SCRIPT =
  "(function(d,q){d.classList.add('js');var o=/[?&]motion=(full|calm|off)(&|$)/.exec(q),c=window.CSS&&CSS.supports;d.setAttribute('data-motion',o?o[1]:matchMedia('(prefers-reduced-motion: reduce)').matches?'calm':'full');d.setAttribute('data-scroll',c&&CSS.supports('animation-timeline: view()')&&!/[?&]scroll=js(&|$)/.test(q)?'css':'js');addEventListener('DOMContentLoaded',function(){d.hasAttribute('data-motion-ready')||d.setAttribute('data-motion','off')})})(document.documentElement,location.search)";
