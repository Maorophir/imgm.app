/**
 * Navbar — the site header on every page: logo, game search, the main links (Games ·
 * Game of the Week · Hall of Fame · Play Next) and the account: the player's menu, or
 * for visitors "Log in" and "Sign up". Noir: a solid warm-black bar on a hairline.
 *
 * Laptop and up (lg+): one 72px row: logo · search (centred) · links · account.
 * Tablet (sm–lg): the same, with the links wrapped onto a second row underneath.
 * Phone: a 56px row (logo · search button · account), then the links on a row of their
 * own in 14px type, as in the design: no menu to open. Below 400px wide they're 13px
 * with 12px gaps, so all four fit a 360px screen (about 283px of words + 36px of gaps,
 * in 328px). Below 360px that row scrolls sideways instead of breaking. The search
 * button opens the search field on its own row.
 *
 * Visitors: "Sign up" is a ghost button at every width (not lime: that's kept for each
 * page's own main action). "Log in", a plain link, shows beside it from 360px wide,
 * except on laptops below xl, where the links already fill the row. To make room on
 * phones below 400px, the logo's small "beta" steps aside for visitors (the footer still
 * says it): logo about 104px + 8 + search 44 + 8 + Log in 44 + 16 + Sign up 85 = about
 * 309px, in 328px. Below 360px, the sign-up page's "Already have an account? Log in" is
 * one tap away.
 */
import { Search, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useSession } from '../lib/authClient';
import { WRAP } from '../lib/ui';
import SearchBar from './SearchBar';
import UserMenu from './UserMenu';
import Logo from './Logo';
import { usePlayNextAccess } from '../hooks/usePlayNextAccess';

// Ivory links. Hovering underlines one; the current page keeps a heavier underline. On
// phones the row can scroll sideways, which would clip a focus ring drawn outside the
// link, so there it's drawn just inside.
const navClass = ({ isActive }) =>
  `inline-flex items-center h-11 whitespace-nowrap font-medium text-white hover:text-slate-50 underline underline-offset-[6px] transition-colors duration-120 max-sm:focus-visible:outline-offset-[-2px] ${
    isActive ? 'decoration-2' : 'decoration-1 decoration-transparent hover:decoration-current'
  }`;

// A visitor's "Log in": ivory words like the main links, underlined on hover. Hidden
// where it can't fit beside "Sign up" (see the header). The breakpoint is in rem like
// lg and xl, so Tailwind orders the three correctly.
const logInClass =
  'hidden min-[22.5rem]:inline-flex lg:hidden xl:inline-flex items-center h-11 whitespace-nowrap font-medium text-white hover:text-slate-50 underline underline-offset-[6px] decoration-1 decoration-transparent hover:decoration-current transition-colors duration-120';

// The phone's square search button: a bare ivory icon, no box
const iconButtonClass =
  'sm:hidden w-11 h-11 shrink-0 grid place-items-center rounded-sm text-white hover:text-slate-50 transition-colors duration-120';

const BASE_LINKS = [
  // No Home link: the logo goes home. Games is the search page, which shows popular
  // games to pick from until something is typed (pages/Search.jsx).
  { to: '/search', label: 'Games' },
  { to: '/game-of-the-week', label: 'Game of the Week' },
  { to: '/hall-of-fame', label: 'Hall of Fame' },
  // Trending is hidden until it has real content (pages/Trending.jsx)
];
// Play Next keeps its lime star, IMGM's mark for its AI guide
const PLAY_NEXT_LINK = { to: '/play-next', label: <><span className="text-brand mr-1.5" aria-hidden="true">✦</span>Play Next</> };

function Navbar() {
  const { data: session, isPending } = useSession();
  // Play Next shows for everyone after launch, before that only for beta players
  const playNext = usePlayNextAccess();
  const LINKS = playNext.enabled ? [...BASE_LINKS, PLAY_NEXT_LINK] : BASE_LINKS;

  // The phone's search row remembers the page it was opened on, so it closes by
  // itself once a search takes the player somewhere else (a result, or Enter)
  const location = useLocation();
  const [searchOpenOn, setSearchOpenOn] = useState(null);
  const searchOpen = searchOpenOn === location.key;
  const searchRef = useRef(null);

  const toggleSearch = () => {
    if (searchOpen) {
      setSearchOpenOn(null);
      return;
    }
    // Show the field right now, then focus it while we're still inside the tap:
    // phones only bring up the keyboard for a focus that comes straight from a tap
    flushSync(() => setSearchOpenOn(location.key));
    searchRef.current?.querySelector('input')?.focus();
  };

  // Visitors: "Log in" where it fits, and "Sign up" as a ghost button (the GHOST_BUTTON
  // look, with 4px less padding each side on phones so the row fits)
  const visitorLinks = (
    <>
      <Link to="/login" className={logInClass}>
        Log in
      </Link>
      <Link
        to="/login?mode=signup"
        className="inline-flex items-center h-11 px-3.5 sm:px-4.5 rounded-sm border border-slate-500 text-base font-medium text-white hover:border-white hover:text-slate-50 whitespace-nowrap transition-colors duration-120"
      >
        Sign up
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-50 bg-slate-950 border-b border-slate-700">
      <nav aria-label="Main">
        <div className={`${WRAP} flex flex-wrap items-center gap-x-2 sm:gap-x-4 min-h-14 pt-1.5 sm:pt-3.5 sm:pb-1 lg:py-0 lg:min-h-[72px]`}>
          {/* Logo, with a small "beta" up by the top of the wordmark. The tiniest phones
              drop the "beta" (the footer still says it) so the row doesn't overflow, and
              for visitors so do phones below 400px, to fit "Log in" beside "Sign up". */}
          <Link to="/" className="inline-flex items-center gap-2.5 h-11 shrink-0" aria-label="IMGM home">
            <Logo />
            <span className={`self-start mt-[5px] text-sm leading-none text-slate-400 max-[360px]:hidden ${session ? '' : 'max-[25rem]:hidden'}`}>beta</span>
          </Link>

          {/* Phone: the search field hides behind this button */}
          <button
            type="button"
            onClick={toggleSearch}
            aria-expanded={searchOpen}
            aria-controls="nav-search"
            aria-label={searchOpen ? 'Close search' : 'Search games'}
            className={`${iconButtonClass} ml-auto`}
          >
            {searchOpen
              ? <X className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
              : <Search className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />}
          </button>

          {/* Search: centred between the logo and the links (sm+); on phones its own
              full-width row under the bar, while open */}
          <div
            id="nav-search"
            ref={searchRef}
            className={`${searchOpen ? 'flex' : 'hidden'} order-last basis-full pt-1 pb-2.5 sm:flex sm:order-none sm:basis-auto sm:p-0 sm:mx-auto sm:flex-[0_1_380px] sm:min-w-[200px]`}
          >
            <SearchBar />
          </div>

          {/* Links: their own row on phones and tablets (14px type on phones, 13px with
              tighter gaps below 400px so all four fit at 360px, scrolling sideways only
              below that; from tablets up they always fit, so nothing clips their focus
              ring), in the bar from lg */}
          <ul className="flex order-last basis-full gap-4 pb-1.5 text-sm overflow-x-auto [scrollbar-width:none] max-[25rem]:gap-3 max-[25rem]:text-[13px] sm:overflow-visible sm:gap-6 sm:text-base lg:order-none lg:basis-auto lg:gap-7 lg:pb-0">
            {LINKS.map((l) => (
              <li key={l.to}>
                <NavLink to={l.to} end={l.end} className={navClass}>{l.label}</NavLink>
              </li>
            ))}
          </ul>

          {/* Account (every width) */}
          <div className="flex items-center gap-4 shrink-0">
            {!isPending && (session ? <UserMenu user={session.user} /> : visitorLinks)}
          </div>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
