import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useSession } from '../lib/authClient';
import SearchBar from './SearchBar';
import UserMenu from './UserMenu';
import Logo from './Logo';
import { usePlayNextAccess } from '../hooks/usePlayNextAccess';

// White links; the current page gets a thin lime underline
const navClass = ({ isActive }) =>
  `transition py-1 ${isActive ? 'text-white shadow-[inset_0_-2px_0_var(--color-brand)]' : 'text-slate-300 hover:text-white'}`;

// Phone menu rows; the current page gets a lime bar on the left
const mobileNavClass = ({ isActive }) =>
  `block px-5 py-3 font-semibold border-l-2 transition ${
    isActive ? 'border-brand text-white bg-white/5' : 'border-transparent text-slate-300 hover:text-white hover:bg-white/5'
  }`;

const BASE_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/top', label: 'Top Games' },
  { to: '/game-of-the-week', label: 'Game of the Week' },
  // Trending is hidden until it has real content (pages/Trending.jsx)
];
const PLAY_NEXT_LINK = { to: '/play-next', label: <><span className="text-brand">✦</span> Play Next</> };

/**
 * Desktop (md+): logo · search · links · account, all on one row.
 * Phone: logo · account · menu button on top, the search bar full-width underneath,
 * and the links in a menu that drops down from it. The account part (Log In or
 * the player menu) is rendered once and shown at every width.
 */
function Navbar() {
  const { data: session, isPending } = useSession();
  // Play Next shows for everyone after launch, before that only for beta players
  const playNext = usePlayNextAccess();
  const LINKS = playNext.enabled ? [...BASE_LINKS, PLAY_NEXT_LINK] : BASE_LINKS;
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  const logInButton = (
    <Link
      to="/login"
      onClick={closeMenu}
      className="bg-white hover:bg-slate-200 text-slate-950 font-bold py-2 px-4 md:px-6 rounded-full transition whitespace-nowrap"
    >
      Log In
    </Link>
  );

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur border-b border-slate-800">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 md:px-5 py-3 md:py-4">
        {/* Logo / Brand */}
        <Link to="/" onClick={closeMenu} className="flex items-center gap-3 shrink-0" aria-label="IMGM home">
          <Logo />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded">
            Beta
          </span>
        </Link>

        {/* Search: middle of the row on desktop; its own full-width row on phones */}
        <div className="order-last w-full md:order-none md:w-auto md:flex-1 md:flex md:justify-center">
          <SearchBar />
        </div>

        {/* Desktop links */}
        <ul className="hidden md:flex gap-6 font-semibold items-center">
          {LINKS.map((l) => (
            <li key={l.to}>
              <NavLink to={l.to} end={l.end} className={navClass}>{l.label}</NavLink>
            </li>
          ))}
        </ul>

        {/* Account (every width) + the phone menu button */}
        <div className="ml-auto md:ml-4 flex items-center gap-2">
          {!isPending && (session ? <UserMenu user={session.user} /> : logInButton)}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="md:hidden w-10 h-10 grid place-items-center rounded-xl border border-slate-700 text-slate-200 hover:text-white hover:border-slate-500 transition"
          >
            {menuOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Phone menu */}
      {menuOpen && (
        <div id="mobile-menu" className="md:hidden border-t border-slate-800 pb-3 animate-fade-in">
          <ul>
            {LINKS.map((l) => (
              <li key={l.to}>
                <NavLink to={l.to} end={l.end} onClick={closeMenu} className={mobileNavClass}>{l.label}</NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
