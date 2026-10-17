/**
 * ScrollToTop — where a page opens: at its top, at a section, or (Back/Forward) where
 * you left it.
 *
 * The site is one page that swaps its content, so the browser can't do this alone:
 * it kept the old scroll position (clicking a game far down a list opened it halfway,
 * in its reviews), and on Back it restored the spot too early, before the list had
 * loaded, so you landed near the top. So:
 *   - a new page (a link) opens at the top
 *   - a link with a section (/game/123#reviews) scrolls to that section, waiting
 *     briefly for it: it only appears once the page has loaded its data
 *   - Back/Forward (and a reload) return to where you were on that visit: every visit's
 *     position is remembered (by React Router's key for it, kept for the tab in
 *     sessionStorage) and restored once the page is tall enough, unless you start
 *     scrolling first. Opening the site fresh (from Google, a typed address) = the top,
 *     or the section its address names: a shared card link
 *     (/game/1942?review=abc#review-abc) opens on that card.
 * A visit with no remembered position is treated like a link. That's how a fresh
 * opening reaches its section: React Router reports it as Back/Forward ("POP"), but a
 * fresh opening has nothing remembered (see below), while a reload or Back/Forward does.
 */
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const SECTION_WAIT_MS = 10000; // a section can wait for a sleepy server, unless you scroll first
const RESTORE_WAIT_MS = 4000; // a page's data usually loads well within this
const STORE = 'imgm:scroll-positions';
const MAX_SAVED = 50; // visits remembered per tab

const readSaved = () => {
  try {
    return JSON.parse(sessionStorage.getItem(STORE)) ?? {};
  } catch {
    return {};
  }
};
const save = (key, y) => {
  try {
    const saved = readSaved();
    delete saved[key]; // re-added last, so the oldest visits are dropped first
    saved[key] = Math.round(y);
    const keys = Object.keys(saved);
    for (const old of keys.slice(0, Math.max(0, keys.length - MAX_SAVED))) delete saved[old];
    sessionStorage.setItem(STORE, JSON.stringify(saved));
  } catch {
    // private mode or storage full: Back simply opens at the top
  }
};

// The first page of a site opening has no visit key of its own (React Router calls it
// "default"), so every opening in this tab shares it. A fresh opening (a link from
// elsewhere, a typed address) forgets the old one; a reload or Back from another site
// keeps it. Done once when the site loads (not in an effect, which React's development
// mode runs twice).
const openedBy = performance.getEntriesByType?.('navigation')[0]?.type ?? 'navigate';
if (openedBy === 'navigate') {
  try {
    const saved = readSaved();
    delete saved.default;
    sessionStorage.setItem(STORE, JSON.stringify(saved));
  } catch {
    // no storage: nothing to forget
  }
}

// Repeats `step` every 100ms until it returns true or `ms` pass, and stops early if the
// player scrolls or clicks first (they've taken over). Returns a cancel function.
const USER_INPUT = ['wheel', 'touchstart', 'keydown', 'mousedown'];
const retry = (step, ms) => {
  const started = Date.now();
  let timer = 0;
  const cancel = () => {
    clearInterval(timer);
    USER_INPUT.forEach((e) => window.removeEventListener(e, cancel));
  };
  USER_INPUT.forEach((e) => window.addEventListener(e, cancel, { passive: true }));
  timer = setInterval(() => {
    if (step(Date.now() - started > ms)) cancel();
  }, 100);
  return cancel;
};

const ScrollToTop = () => {
  const { pathname, hash, key } = useLocation();
  const navigationType = useNavigationType();
  const keyRef = useRef(key);

  // The browser's own restore runs too early for a page that loads its data: turn it off
  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  }, []);

  // Which visit the scroll position belongs to, updated before the new page paints
  useLayoutEffect(() => {
    keyRef.current = key;
  }, [key]);

  // Remember the position of the visit on screen as the player scrolls (once a frame)
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        save(keyRef.current, window.scrollY);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    // Back/Forward (or a reload): where you were on that visit, once the page is tall enough
    const target = navigationType === 'POP' ? readSaved()[key] : undefined;
    if (target !== undefined) {
      return retry((timeUp) => {
        const reachable = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo(0, Math.min(target, reachable));
        return reachable >= target || timeUp;
      }, RESTORE_WAIT_MS);
    }
    // A link, or a visit with nothing remembered (a fresh opening): the top, or the
    // section it names. The glide is a jump for people who ask for less motion.
    window.scrollTo(0, 0);
    if (!hash) return undefined;
    return retry((timeUp) => {
      const section = document.getElementById(decodeURIComponent(hash.slice(1)));
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      if (section) section.scrollIntoView({ behavior, block: 'start' });
      return Boolean(section) || timeUp;
    }, SECTION_WAIT_MS);
  }, [pathname, hash, key, navigationType]);

  return null;
};

export default ScrollToTop;
