/**
 * SteamSwitch — Play Next's "Use my Steam library" switch, under the page's title, in
 * every chat (hooks/usePlayNextSteam.js keeps it).
 *
 * Three states, so every player knows the option is there (the user's call, 2026-11-07):
 *   connected, games played   the switch (on by default) and how many games it uses
 *   connected, nothing to use  why (no games played 2h+, or none imported), and the way to fix it
 *   not connected              an invitation to connect Steam
 * Logged-out visitors don't see it (Play Next asks them to log in first).
 *
 * Noir: a hairline box with a line icon; the switch is ivory when on (lime stays the
 * page's one main action).
 */
import { Link } from 'react-router-dom';
import { Gamepad2 } from 'lucide-react';
import { TEXT_LINK } from '../../lib/ui';

const Box = ({ children }) => (
  <div className="mt-3 flex items-center gap-3 rounded-sm border border-slate-600 bg-slate-900/80 px-3.5 py-2.5 max-w-xl animate-fade-in">
    <Gamepad2 className="w-5 h-5 shrink-0 text-slate-300" strokeWidth={1.8} aria-hidden="true" />
    {children}
  </div>
);

const SteamSwitch = ({ steam, disabled }) => {
  const { status, on, setOn } = steam;
  if (!status) return null; // loading, or a logged-out visitor

  if (!status.connected) {
    return (
      <Box>
        <p className="text-sm text-slate-300 min-w-0">
          Play Next can learn from the games you play on Steam.{' '}
          <Link to="/steam" className={`font-medium text-white whitespace-nowrap ${TEXT_LINK}`}>Connect Steam</Link>
        </p>
      </Box>
    );
  }

  if (!status.played) {
    const why = !status.library ? 'your library isn’t imported yet'
      : status.library.state === 'private' ? 'Steam keeps your game details private'
        : status.library.hoursHidden ? 'Steam hides your hours played'
          : 'no game has 2 hours or more yet';
    return (
      <Box>
        <p className="text-sm text-slate-300 min-w-0">
          Steam is connected, but Play Next has nothing to learn from: {why}.{' '}
          <Link to="/steam/library" className={`font-medium text-white whitespace-nowrap ${TEXT_LINK}`}>Your Steam library</Link>
        </p>
      </Box>
    );
  }

  return (
    <Box>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">Use my Steam library</p>
        <p className="text-xs text-slate-400 mt-0.5">
          {on
            ? `${status.played} game${status.played === 1 ? '' : 's'} you've played 2h+ shape the picks`
            : 'Off: Play Next ignores your Steam hours'}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Use my Steam library"
        disabled={disabled}
        onClick={() => setOn(!on)}
        className={`relative shrink-0 w-12 h-7 rounded-full border transition-colors duration-120 disabled:opacity-50 ${on ? 'bg-white border-white' : 'bg-slate-800 border-slate-500'}`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full transition-[left,background-color] duration-120 ${on ? 'left-[24px] bg-slate-950' : 'left-[3px] bg-slate-400'}`}
        />
      </button>
    </Box>
  );
};

export default SteamSwitch;
