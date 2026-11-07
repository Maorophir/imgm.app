/**
 * usePlayNextSteam — Play Next's Steam menu: the player's Steam status (connected? how
 * many games count as played at each choice of hours?) and their three choices:
 *   use            use the Steam library at all (on by default, the user's call 2026-11-07)
 *   playedHours    from how many hours a game counts as played: 1, 2, 5 or 10 (2)
 *   suggestOwned   whether owned games played less than that can be picked (on)
 * Remembered per player in this browser. They ride along with every Play Next question
 * as `steam` ({ use, played_hours, suggest_owned }); the AI service reads the library
 * only when `use` is on and the player has Steam connected.
 *
 * → { status (null while loading, false for logged-out visitors or a failed load),
 *     settings, update(changes), request (what's sent) }
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSteamStatus } from '../lib/api';

export const PLAYED_HOURS = [1, 2, 5, 10];
const DEFAULTS = { use: true, playedHours: 2, suggestOwned: true };
const keyFor = (userId) => `imgm:play-next:steam:${userId}`;

const readSettings = (userId) => {
  try {
    const saved = JSON.parse(localStorage.getItem(keyFor(userId)) ?? 'null');
    if (!saved || typeof saved !== 'object') return DEFAULTS;
    return {
      use: saved.use !== false,
      playedHours: PLAYED_HOURS.includes(saved.playedHours) ? saved.playedHours : DEFAULTS.playedHours,
      suggestOwned: saved.suggestOwned !== false,
    };
  } catch {
    return DEFAULTS; // storage blocked or an old value: the defaults
  }
};

export function usePlayNextSteam(userId) {
  const [status, setStatus] = useState(null);
  const [settings, setSettings] = useState(() => (userId ? readSettings(userId) : DEFAULTS));
  const [shownFor, setShownFor] = useState(userId);
  // Another player logged in on this page: their own choices
  if (userId !== shownFor) {
    setShownFor(userId);
    setSettings(userId ? readSettings(userId) : DEFAULTS);
  }

  useEffect(() => {
    if (!userId) return undefined;
    const controller = new AbortController();
    getSteamStatus(controller.signal)
      .then(setStatus)
      .catch((error) => error.name !== 'AbortError' && setStatus(false));
    return () => controller.abort();
  }, [userId]);

  const update = useCallback(
    (changes) => {
      setSettings((old) => {
        const next = { ...old, ...changes };
        try {
          localStorage.setItem(keyFor(userId), JSON.stringify(next));
        } catch {
          /* the choice still holds for this visit */
        }
        return next;
      });
    },
    [userId]
  );

  const request = useMemo(
    () => ({ use: settings.use, played_hours: settings.playedHours, suggest_owned: settings.suggestOwned }),
    [settings]
  );
  return { status: userId ? status : false, settings, update, request };
}
