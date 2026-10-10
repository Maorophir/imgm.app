/**
 * UserMenu — the logged-in player's chip in the navbar: avatar (with level) + gamer tag.
 * Clicking it opens a small dropdown: tier + XP bar, Profile, Log out. Closes on an outside
 * click, on Esc, or after picking an item.
 */
import { Bookmark, LogOut, MessageSquarePlus, User } from 'lucide-react';
import { openFeedback } from './Feedback';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { signOut } from '../lib/authClient';
import { Avatar } from './reviewCard/RarityCard';
import { LevelBadge, XpBar } from './LevelBadge';
import { useMyProgress } from '../hooks/useMyProgress';

const itemClass =
  'flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition text-left';

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
        className={`flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1 border transition ${
          open ? 'bg-slate-700 border-slate-500' : 'bg-slate-800 border-slate-700 hover:border-slate-500'
        }`}
      >
        <span className="relative">
          <Avatar name={name} user={user} />
          {progress && (
            <LevelBadge level={progress.level} tier={progress.tier} small className="absolute -bottom-1.5 -right-2" />
          )}
        </span>
        <span className="hidden sm:block text-sm font-semibold text-slate-100 max-w-[10rem] truncate">{name}</span>
        <span aria-hidden="true" className={`text-[10px] text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50 overflow-hidden animate-fade-in"
        >
          <div className="px-4 py-3 border-b border-slate-800">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Playing as</p>
            <p className="font-bold text-white truncate">{name}</p>
            {progress && (
              <div className="mt-2.5">
                <p className="flex items-baseline justify-between text-xs font-bold">
                  <span style={{ color: progress.tier.color }}>{progress.tier.label}</span>
                  <span className="text-slate-400">Level {progress.level}</span>
                </p>
                <XpBar progress={progress} className="mt-1.5" />
                <p className="mt-1 text-[11px] text-slate-500 tabular-nums">
                  {progress.xp.toLocaleString()} XP · {progress.toNext.toLocaleString()} to Level {progress.level + 1}
                </p>
              </div>
            )}
          </div>
          <Link to="/backlog" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
            <Bookmark className="w-4 h-4" aria-hidden="true" /> Backlog
          </Link>
          <button type="button" role="menuitem" onClick={() => { setOpen(false); openFeedback(); }} className={itemClass}>
            <MessageSquarePlus className="w-4 h-4" aria-hidden="true" /> Send feedback
          </button>
          <Link to="/profile" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
            <User className="w-4 h-4" aria-hidden="true" /> Profile
          </Link>
          <button type="button" role="menuitem" onClick={logOut} className={`${itemClass} border-t border-slate-800 hover:text-red-400`}>
            <LogOut className="w-4 h-4" aria-hidden="true" /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
