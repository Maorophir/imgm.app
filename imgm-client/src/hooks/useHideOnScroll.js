/**
 * useHideOnScroll — whether the phone's header should step aside: hidden while the page
 * scrolls down, back as soon as it scrolls up a little (like Safari's own bars), so a
 * phone's small screen belongs to the page while reading. The pinned header took 101px
 * of an iPhone's 664 on every page (the user's ask, 2026-11-08).
 *
 * Phones only (below 640px): computers and tablets have the room. The header always
 * shows near the top of a page, and whenever `keep()` says something in it is open (the
 * search, a menu). Small scrolls don't count, so it doesn't flicker.
 *
 * Returns [hidden, show]: `show` brings it back at once (a keyboard focus inside it).
 */
import { useCallback, useEffect, useState } from 'react';

const PHONE = '(max-width: 639.98px)';
const TOP = 120; // always shown in a page's first 120px: the header's own height, and a bit
const MOVE = 12; // a scroll this long in one direction counts; shorter ones are ignored

export function useHideOnScroll(keep, enabled = true) {
  const [hidden, setHidden] = useState(false);
  const show = useCallback(() => setHidden(false), []);

  useEffect(() => {
    if (!enabled) return undefined;
    const phone = window.matchMedia(PHONE);
    // Where the last hide or show happened: the next one needs MOVE pixels from there
    let last = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      if (!phone.matches || y < TOP || keep()) {
        setHidden(false);
        last = y;
      } else if (y - last > MOVE) {
        setHidden(true);
        last = y;
      } else if (last - y > MOVE) {
        setHidden(false);
        last = y;
      }
    };
    // At most once a frame, however fast the scroll events come
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    phone.addEventListener('change', update);
    return () => {
      window.removeEventListener('scroll', onScroll);
      phone.removeEventListener('change', update);
      cancelAnimationFrame(frame);
    };
  }, [keep, enabled]);

  // Switched off (Discover), it's never hidden, whatever was last seen
  return [enabled && hidden, show];
}
