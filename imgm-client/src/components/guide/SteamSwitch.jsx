/**
 * SteamSwitch — Play Next's Steam menu, under the page's title, in every chat
 * (hooks/usePlayNextSteam.js keeps the choices). Laid out by the user, 2026-11-07:
 *   Use my Steam library                      on / off
 *   Recommend games I've already played       on / off   (while the library is on)
 *   Only if I've played them less than        2h 5h 10h 20h  (while that is on)
 * Owned games never played can always come up, marked as in the library.
 *
 * Every player sees something, so they know the option is there:
 *   connected, hours to read   the menu above
 *   connected, nothing to read  why (none imported, private, hours hidden), and the fix
 *   not connected               an invitation to connect Steam
 * Logged-out visitors don't see it (Play Next asks them to log in first).
 *
 * Noir: a hairline box with line icons; switches are ivory when on (lime stays the
 * page's one main action).
 */
import { Link } from 'react-router-dom';
import { Gamepad2 } from 'lucide-react';
import { UNDER_HOURS } from '../../hooks/usePlayNextSteam';
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

// One line of the menu: its words on the left, its switch on the right (the first line
// carries the Steam icon; the others line up under its words)
const Row = ({ icon = false, title, line, children }) => (
  <div className={`flex items-center gap-3 px-3.5 py-2.5 ${icon ? '' : 'border-t border-slate-700 sm:pl-[46px]'}`}>
    {icon && <Gamepad2 className="w-5 h-5 shrink-0 text-slate-300" strokeWidth={1.8} aria-hidden="true" />}
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="text-xs text-slate-400 mt-0.5">{line}</p>
    </div>
    {children}
  </div>
);

const SteamSwitch = ({ steam, disabled }) => {
  const { status, settings, update } = steam;
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

  const games = (n) => `${n} game${n === 1 ? '' : 's'}`;
  const under = status.playedUnder?.[settings.playedUnder] ?? 0;
  return (
    <Box>
      <Row
        icon
        title="Use my Steam library"
        line={settings.use ? `${games(status.played)} you've played guide the picks` : 'Off: Play Next ignores your Steam library'}
      >
        <Toggle on={settings.use} onChange={(use) => update({ use })} label="Use my Steam library" disabled={disabled} />
      </Row>

      {settings.use && (
        <Row
          title="Recommend games I've already played"
          line={settings.suggestPlayed
            ? 'If you barely played them. Games you own but never played can come up too.'
            : 'Only games you haven’t played. Ones you own but never played can still come up.'}
        >
          <Toggle on={settings.suggestPlayed} onChange={(suggestPlayed) => update({ suggestPlayed })} label="Recommend games I've already played" disabled={disabled} />
        </Row>
      )}

      {settings.use && settings.suggestPlayed && (
        <fieldset disabled={disabled} className="border-t border-slate-700 px-3.5 py-2.5 sm:pl-[46px]">
          <legend className="sr-only">Only if I've played them less than</legend>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-sm text-white">Only if I've played them less than</span>
            <div className="flex gap-1.5" role="radiogroup" aria-label="Only if I've played them less than">
              {UNDER_HOURS.map((hours) => (
                <button
                  key={hours}
                  type="button"
                  role="radio"
                  aria-checked={settings.playedUnder === hours}
                  onClick={() => update({ playedUnder: hours })}
                  className={`h-8 min-w-11 px-2.5 rounded-sm border text-sm font-medium tabular-nums transition-colors duration-120 ${
                    settings.playedUnder === hours ? 'bg-white text-slate-950 border-white' : 'border-slate-600 text-white hover:border-white'
                  }`}
                >
                  {hours}h
                </button>
              ))}
            </div>
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            {games(under)} you've played under {settings.playedUnder}h. A short game you played for half its length or more counts as finished.
          </p>
        </fieldset>
      )}
    </Box>
  );
};

export default SteamSwitch;
