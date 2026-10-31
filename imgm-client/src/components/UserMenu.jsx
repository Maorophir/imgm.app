/**
 * UserMenu — the logged-in player's chip in the navbar: avatar (with level) + gamer tag.
 * Clicking it opens a small dropdown: tier + XP bar, Backlog, Steam library, Send
 * feedback, Profile, Log out. Closes on an outside click, on Esc, or after picking an item.
 * Styled like the header's "Sign up": a ghost button with a control-grey edge.
 */
import { Bookmark, ChevronDown, Gamepad2, LogOut, MessageSquarePlus, User } from 'lucide-react';
import { openFeedback } from './Feedback';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { signOut } from '../lib/authClient';
import { Avatar } from './reviewCard/RarityCard';
import { LevelBadge, XpBar } from './LevelBadge';
import { useMyProgress } from '../hooks/useMyProgress';

// One row of the dropdown: ivory text, a raised row on hover (as in the search results)
const itemClass =
  'flex items-center gap-3 w-full h-11 px-2 rounded-sm text-base font-medium text-white text-left hover:bg-slate-800 transition-colors duration-120';
const iconClass = 'w-4 h-4 shrink-0 text-slate-400';

function UserMenu({ user }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const name = user.displayUsername || 'Choose a tag';
  const progress = useMyProgress();

  // While open: a click anywhere outside the menu, or Esc, closes it
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (!menuRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const logOut = async () => {
    await signOut();
    window.location.reload();
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        // A name to read out on phones too, where the gamer tag is hidden
        aria-label={`Account menu for ${name}`}
        // No frame: the avatar and name stand on the bar like the links; a soft fill on
        // hover and while the menu is open says it's a button
        className={`flex items-center gap-2 h-11 pl-1.5 pr-2.5 rounded-sm transition-colors duration-120 ${
          open ? 'bg-slate-900' : 'hover:bg-slate-900'
        }`}
      >
        <span className="relative">
          <Avatar name={name} user={user} />
          {progress && (
            <LevelBadge level={progress.level} tier={progress.tier} small className="absolute -bottom-1 -right-1.5" />
          )}
        </span>
        {/* The gamer tag shows where the header has room for it: not on phones, and not on
            laptops, where the links share the one row with the search (it shows again from xl) */}
        <span className="hidden md:block text-base font-medium text-white max-w-32 truncate">{name}</span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-120 ${open ? 'rotate-180' : ''}`}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </button>

      {open && (
        // Floats like the search results: card stock, a hairline edge, a soft shadow
        // underneath (no glow), and a quick fade in
        <div
          role="menu"
          className="absolute right-0 top-full mt-2.5 w-64 sm:w-72 p-2 rounded-sm bg-slate-900 border border-slate-600 shadow-[0_32px_64px_-24px_rgba(0,0,0,.85)] transition-[opacity,translate] duration-160 ease-out translate-y-0 starting:opacity-0 starting:-translate-y-1"
        >
          <div className="px-2 pt-1 pb-3">
            <p className="text-sm text-slate-400">Playing as</p>
            <p className="text-base font-semibold text-white truncate">{name}</p>
            {progress && (
              <div className="mt-3">
                <p className="flex items-baseline justify-between text-sm font-medium">
                  <span style={{ color: progress.tier.color }}>{progress.tier.label}</span>
                  <span className="text-slate-400 tabular-nums">Level {progress.level}</span>
                </p>
                <XpBar progress={progress} className="mt-1.5" />
                <p className="mt-1.5 text-sm text-slate-400 tabular-nums">
                  {progress.xp.toLocaleString()} XP · {progress.toNext.toLocaleString()} to Level {progress.level + 1}
                </p>
              </div>
            )}
          </div>
          <div role="separator" className="mb-1 h-px bg-slate-700" />
          <Link to="/backlog" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
            <Bookmark className={iconClass} strokeWidth={1.8} aria-hidden="true" /> Backlog
          </Link>
          {/* The games you own on Steam (that page explains connecting, if you haven't) */}
          <Link to="/steam/library" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
            <Gamepad2 className={iconClass} strokeWidth={1.8} aria-hidden="true" /> Steam library
          </Link>
          <button type="button" role="menuitem" onClick={() => { setOpen(false); openFeedback(); }} className={itemClass}>
            <MessageSquarePlus className={iconClass} strokeWidth={1.8} aria-hidden="true" /> Send feedback
          </button>
          <Link to="/profile" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
            <User className={iconClass} strokeWidth={1.8} aria-hidden="true" /> Profile
          </Link>
          <div role="separator" className="my-1 h-px bg-slate-700" />
          <button type="button" role="menuitem" onClick={logOut} className={itemClass}>
            <LogOut className={iconClass} strokeWidth={1.8} aria-hidden="true" /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
