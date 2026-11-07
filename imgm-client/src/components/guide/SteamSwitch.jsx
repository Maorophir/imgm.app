/**
 * SteamSwitch — Play Next's Steam menu: a small button at the bottom left (under the
 * chats on wide screens, under the chat on others; it's not the page's main feature,
 * the user's call 2026-11-07) that opens the choices above it. hooks/usePlayNextSteam.js
 * keeps them. Laid out by the user:
 *   Use my Steam library                      on / off
 *   Recommend games I've already played       on / off   (while the library is on)
 *   Only if I've played them less than        2h 5h 10h 20h  (while that is on)
 * Owned games never played can always come up, marked as in the library.
 *
 * Every player sees something small, so they know the option is there:
 *   connected, hours to read   "Steam library · On" (opens the menu)
 *   connected, nothing to read  a link to their library, saying why
 *   not connected               "Connect Steam"
 * Logged-out visitors don't see it (Play Next asks them to log in first).
 *
 * Noir: hairline borders and line icons; switches are ivory when on.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronUp, Gamepad2 } from 'lucide-react';
import { UNDER_HOURS } from '../../hooks/usePlayNextSteam';

const CHIP = 'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-sm border border-slate-700 text-xs font-medium text-slate-300 hover:border-slate-400 hover:text-white transition-colors duration-120';
const icon = <Gamepad2 className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} aria-hidden="true" />;

// An on/off switch: ivory when on
const Toggle = ({ on, onChange, label, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!on)}
    className={`relative shrink-0 w-10 h-6 rounded-full border transition-colors duration-120 disabled:opacity-50 ${on ? 'bg-white border-white' : 'bg-slate-800 border-slate-500'}`}
  >
    <span
      aria-hidden="true"
      className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full transition-[left,background-color] duration-120 ${on ? 'left-[20px] bg-slate-950' : 'left-[3px] bg-slate-400'}`}
    />
  </button>
);

// One line of the menu: its words, its switch on the right
const Row = ({ title, line, children }) => (
  <div className="flex items-center gap-3 py-2 first:pt-0">
    <div className="min-w-0 flex-1">
      <p className="text-sm text-white">{title}</p>
      {line && <p className="text-xs text-slate-400 mt-0.5">{line}</p>}
    </div>
    {children}
  </div>
);

const SteamSwitch = ({ steam, disabled }) => {
  const { status, settings, update } = steam;
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  // A click elsewhere or Escape closes the menu
  useEffect(() => {
    if (!open) return undefined;
    const away = (event) => !boxRef.current?.contains(event.target) && setOpen(false);
    const escape = (event) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  if (!status) return null; // loading, or a logged-out visitor

  if (!status.connected) {
    return (
      <Link to="/steam" className={CHIP} title="Play Next can learn from the games you play on Steam">
        {icon} Connect Steam
      </Link>
    );
  }

  const hasHours = status.library?.state === 'ok' && !status.library.hoursHidden && status.owned > 0;
  if (!hasHours) {
    const why = !status.library ? 'Your library isn’t imported yet'
      : status.library.state === 'private' ? 'Steam keeps your game details private'
        : status.library.hoursHidden ? 'Steam hides your hours played'
          : 'Your library is empty';
    return (
      <Link to="/steam/library" className={CHIP} title={`${why}, so Play Next has nothing to learn from`}>
        {icon} Steam: nothing to read
      </Link>
    );
  }

  const games = (n) => `${n} game${n === 1 ? '' : 's'}`;
  const under = status.playedUnder?.[settings.playedUnder] ?? 0;
  return (
    <div ref={boxRef} className="relative inline-block">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={CHIP}>
        {icon} Steam library · {settings.use ? 'On' : 'Off'}
        <ChevronUp className={`w-3.5 h-3.5 transition-transform duration-120 ${open ? '' : 'rotate-180'}`} strokeWidth={1.8} aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute left-0 bottom-full mb-2 z-20 w-[min(320px,calc(100vw-32px))] rounded-sm border border-slate-600 bg-slate-950 p-3.5 shadow-[0_8px_24px_rgba(0,0,0,.5)] animate-fade-in">
          <Row title="Use my Steam library" line={settings.use ? `${games(status.played)} you've played guide the picks` : 'Off: Play Next ignores it'}>
            <Toggle on={settings.use} onChange={(use) => update({ use })} label="Use my Steam library" disabled={disabled} />
          </Row>
          {settings.use && (
            <div className="border-t border-slate-700">
              <Row title="Recommend games I've already played" line={settings.suggestPlayed ? null : 'Games you own but never played can still come up'}>
                <Toggle on={settings.suggestPlayed} onChange={(suggestPlayed) => update({ suggestPlayed })} label="Recommend games I've already played" disabled={disabled} />
              </Row>
            </div>
          )}
          {settings.use && settings.suggestPlayed && (
            <fieldset disabled={disabled} className="border-t border-slate-700 pt-2">
              <legend className="sr-only">Only if I've played them less than</legend>
              <p className="text-sm text-white">Only if I've played them less than</p>
              <div className="mt-1.5 flex gap-1.5" role="radiogroup" aria-label="Only if I've played them less than">
                {UNDER_HOURS.map((hours) => (
                  <button
                    key={hours}
                    type="button"
                    role="radio"
                    aria-checked={settings.playedUnder === hours}
                    onClick={() => update({ playedUnder: hours })}
                    className={`h-7 min-w-10 px-2 rounded-sm border text-xs font-medium tabular-nums transition-colors duration-120 ${
                      settings.playedUnder === hours ? 'bg-white text-slate-950 border-white' : 'border-slate-600 text-white hover:border-white'
                    }`}
                  >
                    {hours}h
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-slate-400">{games(under)} you've played under {settings.playedUnder}h</p>
            </fieldset>
          )}
        </div>
      )}
    </div>
  );
};

export default SteamSwitch;
