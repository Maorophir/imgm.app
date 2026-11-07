/**
 * usePlayNextSteam — Play Next's Steam menu (laid out by the user, 2026-11-07): the
 * player's Steam status (connected? games played, never played, played under each
 * limit) and their three choices:
 *   use             use my Steam library (on)
 *   suggestPlayed   recommend games I've already played (on)…
 *   playedUnder     …only if I've played them less than 2, 5, 10 or 20 hours, or with
 *                   no limit (null: replaying a favourite) (2)
 *   maxLibrary      at most this many of the 5 picks from my library: 0 (none), 1, 2, 3 (2)
 * Owned games never played can always be suggested (marked as in the library); played
 * games teach Play Next the player's taste. Remembered per player in this browser, sent
 * with every Play Next question as `steam` ({ use, suggest_played, played_under }); the
 * AI service reads the library only when `use` is on and Steam is connected.
 *
 * → { status (null while loading, false for logged-out visitors or a failed load),
 *     settings, update(changes), request (what's sent) }
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSteamStatus } from '../lib/api';

export const UNDER_HOURS = [2, 5, 10, 20, null]; // null: no limit
export const LIBRARY_PICKS = [0, 1, 2, 3]; // of the 5 picks
const DEFAULTS = { use: true, suggestPlayed: true, playedUnder: 2, maxLibrary: 2 };
const keyFor = (userId) => `imgm:play-next:steam:${userId}`;

const readSettings = (userId) => {
  try {
    const saved = JSON.parse(localStorage.getItem(keyFor(userId)) ?? 'null');
    if (!saved || typeof saved !== 'object') return DEFAULTS;
    return {
      use: saved.use !== false,
      suggestPlayed: saved.suggestPlayed !== false,
      playedUnder: UNDER_HOURS.includes(saved.playedUnder) ? saved.playedUnder : DEFAULTS.playedUnder,
      maxLibrary: LIBRARY_PICKS.includes(saved.maxLibrary) ? saved.maxLibrary : DEFAULTS.maxLibrary,
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
    () => ({ use: settings.use, suggest_played: settings.suggestPlayed, played_under: settings.playedUnder, max_library: settings.maxLibrary }),
    [settings]
  );
  return { status: userId ? status : false, settings, update, request };
}
