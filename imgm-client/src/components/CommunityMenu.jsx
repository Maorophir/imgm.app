/**
 * CommunityMenu — the header's "Community" link, a dropdown of the pages the players
 * make together: the daily Guess the game, Game of the Week and the Hall of Fame. One
 * link instead of three keeps the menu to five, so it fits beside the search on more
 * laptops.
 *
 * It looks like the other links (underlined while on one of its pages) with a small
 * chevron. A click or tap opens it; an outside click, Esc, picking a page or going
 * anywhere else closes it. The list is a panel like the bell's (card stock, a hairline,
 * no glow), placed under the button with `fixed`: on phones the links' row scrolls
 * sideways, and a scrolling row would clip a list hung inside it. So the list closes
 * when that row scrolls or the window resizes, rather than drifting off its button.
 */
import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const COMMUNITY_PAGES = [
  { to: '/daily', label: 'Daily game', note: 'Guess today\'s game from its screenshots', fresh: true },
  { to: '/game-of-the-week', label: 'Game of the Week', note: 'Nominate and vote for this week\'s game' },
  { to: '/hall-of-fame', label: 'Hall of Fame', note: 'The best-rated games on IMGM' },
];

const PANEL_WIDTH = 300;
const MARGIN = 16; // the panel keeps this far from the screen's edges

export default function CommunityMenu({ linkClass, rowRef }) {
  const location = useLocation();
  // Remembers the page it was opened on, so going anywhere closes it by itself
  const [openOn, setOpenOn] = useState(null);
  const [place, setPlace] = useState(null);
  const open = openOn === location.key;
  const boxRef = useRef(null);
  const buttonRef = useRef(null);
  const current = COMMUNITY_PAGES.some((page) => location.pathname.startsWith(page.to));

  const toggle = () => {
    if (open) {
      setOpenOn(null);
      return;
    }
    // Under the button, but never past the screen's edge (phones: the full width)
    const box = buttonRef.current.getBoundingClientRect();
    const width = Math.min(PANEL_WIDTH, window.innerWidth - 2 * MARGIN);
    const left = Math.min(Math.max(MARGIN, box.left), window.innerWidth - MARGIN - width);
    setPlace({ top: box.bottom + 6, left, width });
    setOpenOn(location.key);
  };

  // While open: a click outside, Esc, the links' row scrolling or the window resizing
  // closes it (Esc gives the focus back to the button)
  useEffect(() => {
    if (!open) return;
    const close = () => setOpenOn(null);
    const onClick = (e) => {
      if (!boxRef.current?.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      close();
      buttonRef.current?.focus();
    };
    const row = rowRef?.current;
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    row?.addEventListener('scroll', close, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      row?.removeEventListener('scroll', close);
    };
  }, [open, rowRef]);

  return (
    <div ref={boxRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls="community-menu"
        className={`${linkClass({ isActive: current })} gap-1 cursor-pointer`}
      >
        Community
        <ChevronDown className={`w-4 h-4 transition-transform duration-120 ${open ? 'rotate-180' : ''}`} strokeWidth={1.8} aria-hidden="true" />
      </button>

      {open && place && (
        <div
          id="community-menu"
          style={{ top: place.top, left: place.left, width: place.width }}
          className="fixed z-50 p-1.5 rounded-sm bg-slate-900 border border-slate-600 shadow-[0_32px_64px_-24px_rgba(0,0,0,.85)] transition-[opacity,translate] duration-160 ease-out translate-y-0 starting:opacity-0 starting:-translate-y-1"
        >
          <ul>
            {COMMUNITY_PAGES.map((page) => (
              <li key={page.to}>
                <NavLink
                  to={page.to}
                  onClick={() => setOpenOn(null)}
                  className={({ isActive }) =>
                    `flex flex-col gap-0.5 px-3 py-2.5 rounded-sm text-left hover:bg-slate-800 transition-colors duration-120 focus-visible:outline-offset-[-2px] ${isActive ? 'bg-slate-800' : ''}`
                  }
                >
                  <span className="flex items-center gap-2 text-base font-medium text-white whitespace-nowrap">
                    {page.label}
                    {page.fresh && (
                      // A hairline tag, not lime (lime is each page's main action)
                      <span className="px-1.5 py-0.5 rounded-xs border border-slate-500 text-[11px] font-semibold leading-none tracking-[.04em] uppercase text-slate-200">New</span>
                    )}
                  </span>
                  <span className="text-sm text-slate-400">{page.note}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
