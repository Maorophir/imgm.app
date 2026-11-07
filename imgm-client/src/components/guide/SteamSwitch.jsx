/**
 * SteamSwitch — Play Next's Steam menu, under the page's title, in every chat
 * (hooks/usePlayNextSteam.js keeps the choices).
 *
 * Three states, so every player knows the option is there (the user's call, 2026-11-07):
 *   connected, games played   "Use my Steam library" (on by default) with its count, and a
 *                             settings button that opens the player's own rules: from how
 *                             many hours a game counts as played (1/2/5/10), and whether
 *                             owned games played less can be suggested
 *   connected, nothing to use  why (none imported, private, hours hidden), and the fix
 *   not connected              an invitation to connect Steam
 * Logged-out visitors don't see it (Play Next asks them to log in first).
 *
 * Noir: a hairline box with line icons; the switch is ivory when on (lime stays the
 * page's one main action).
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, SlidersHorizontal } from 'lucide-react';
import { PLAYED_HOURS } from '../../hooks/usePlayNextSteam';
import { TEXT_LINK } from '../../lib/ui';

const Box = ({ children }) => (
  <div className="mt-3 rounded-sm border border-slate-600 bg-slate-900/80 max-w-xl animate-fade-in">{children}</div>
);

// An on/off switch: ivory when on
const Toggle = ({ on, onChange, label, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!on)}
    className={`relative shrink-0 w-12 h-7 rounded-full border transition-colors duration-120 disabled:opacity-50 ${on ? 'bg-white border-white' : 'bg-slate-800 border-slate-500'}`}
  >
    <span
      aria-hidden="true"
      className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full transition-[left,background-color] duration-120 ${on ? 'left-[24px] bg-slate-950' : 'left-[3px] bg-slate-400'}`}
    />
  </button>
);

const Note = ({ children }) => (
  <div className="flex items-center gap-3 px-3.5 py-2.5">
    <Gamepad2 className="w-5 h-5 shrink-0 text-slate-300" strokeWidth={1.8} aria-hidden="true" />
    <p className="text-sm text-slate-300 min-w-0">{children}</p>
  </div>
);

const SteamSwitch = ({ steam, disabled }) => {
  const { status, settings, update } = steam;
  const [open, setOpen] = useState(false);
  if (!status) return null; // loading, or a logged-out visitor

  if (!status.connected) {
    return (
      <Box>
        <Note>
          Play Next can learn from the games you play on Steam.{' '}
          <Link to="/steam" className={`font-medium text-white whitespace-nowrap ${TEXT_LINK}`}>Connect Steam</Link>
        </Note>
      </Box>
    );
  }

  const hasHours = status.library?.state === 'ok' && !status.library.hoursHidden && status.owned > 0;
  if (!hasHours) {
    const why = !status.library ? 'your library isn’t imported yet'
      : status.library.state === 'private' ? 'Steam keeps your game details private'
        : status.library.hoursHidden ? 'Steam hides your hours played'
          : 'your library is empty';
    return (
      <Box>
        <Note>
          Steam is connected, but Play Next has nothing to learn from: {why}.{' '}
          <Link to="/steam/library" className={`font-medium text-white whitespace-nowrap ${TEXT_LINK}`}>Your Steam library</Link>
        </Note>
      </Box>
    );
  }

  const played = status.playedByHours?.[settings.playedHours] ?? status.played ?? 0;
  const barely = Math.max(0, (status.owned ?? 0) - played);
  return (
    <Box>
      <div className="flex items-center gap-3 px-3.5 py-2.5">
        <Gamepad2 className="w-5 h-5 shrink-0 text-slate-300" strokeWidth={1.8} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">Use my Steam library</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {settings.use
              ? `${played} game${played === 1 ? '' : 's'} you've played ${settings.playedHours}h+ shape the picks`
              : 'Off: Play Next ignores your Steam library'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Steam settings"
          disabled={!settings.use}
          className={`grid place-items-center w-9 h-9 rounded-sm border transition-colors duration-120 disabled:opacity-40 ${open ? 'border-white text-white' : 'border-slate-600 text-slate-300 hover:border-white hover:text-white'}`}
        >
          <SlidersHorizontal className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
        </button>
        <Toggle on={settings.use} onChange={(use) => { update({ use }); if (!use) setOpen(false); }} label="Use my Steam library" disabled={disabled} />
      </div>

      {open && settings.use && (
        <div className="border-t border-slate-700 px-3.5 py-3 flex flex-col gap-4 animate-fade-in">
          <fieldset disabled={disabled}>
            <legend className="text-sm text-white">A game counts as played after</legend>
            <div className="mt-2 flex gap-1.5" role="radiogroup" aria-label="Hours to count a game as played">
              {PLAYED_HOURS.map((hours) => (
                <button
                  key={hours}
                  type="button"
                  role="radio"
                  aria-checked={settings.playedHours === hours}
                  onClick={() => update({ playedHours: hours })}
                  className={`h-9 min-w-12 px-3 rounded-sm border text-sm font-medium tabular-nums transition-colors duration-120 ${
                    settings.playedHours === hours ? 'bg-white text-slate-950 border-white' : 'border-slate-600 text-white hover:border-white'
                  }`}
                >
                  {hours}h
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-slate-400">
              Played games show Play Next what you like and are never suggested again. A short game played
              for half its length counts too.
            </p>
          </fieldset>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white">Suggest games I own but barely played</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {barely} game{barely === 1 ? '' : 's'} under {settings.playedHours}h, marked as already in your library
              </p>
            </div>
            <Toggle on={settings.suggestOwned} onChange={(suggestOwned) => update({ suggestOwned })} label="Suggest games I own but barely played" disabled={disabled} />
          </div>
        </div>
      )}
    </Box>
  );
};

export default SteamSwitch;
