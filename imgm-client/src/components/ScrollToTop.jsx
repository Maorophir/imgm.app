/**
 * ScrollToTop — a new page opens at its top.
 *
 * The site is one page that swaps its content, so without this the browser keeps the
 * old scroll position: clicking a game from far down a list opened that game halfway
 * down, in its reviews. On every page change (a new address, not just new ?filters):
 *   - a link with a section (/game/123#reviews) scrolls to that section, waiting
 *     briefly for it: it only appears once the page has loaded its data
 *   - anything else goes to the top
 * The Back and Forward buttons are left alone, so going back returns you where you were.
 */
import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const SECTION_WAIT_MS = 4000;

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType === 'POP') return; // Back/Forward: the browser restores the spot
    if (!hash) {
      window.scrollTo(0, 0);
      return undefined;
    }
    window.scrollTo(0, 0); // start at the top while the section loads
    const started = Date.now();
    const timer = setInterval(() => {
      const section = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (section || Date.now() - started > SECTION_WAIT_MS) {
        clearInterval(timer);
        section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
    return () => clearInterval(timer);
  }, [pathname, hash, navigationType]);

  return null;
};

export default ScrollToTop;
