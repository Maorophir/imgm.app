/**
 * usePlayNextSteam — Play Next's "Use my Steam library" switch: the player's Steam
 * status (connected? how many games played 2h+?) and whether the switch is on.
 *
 * On by default (the user's call, 2026-11-07), remembered per player in this browser.
 * The value rides along with every Play Next question as `use_steam`; the AI service
 * only reads the played games when it's on (and the player has Steam connected).
 *
 * → { status (null while loading, false for logged-out visitors or a failed load),
 *     on, setOn, active (on, connected and something played: Steam is really used) }
 */
import { useCallback, useEffect, useState } from 'react';
import { getSteamStatus } from '../lib/api';

const keyFor = (userId) => `imgm:play-next:steam:${userId}`;

const readSwitch = (userId) => {
  try {
    return localStorage.getItem(keyFor(userId)) !== 'off';
  } catch {
    return true; // storage blocked: the default
  }
};

export function usePlayNextSteam(userId) {
  const [status, setStatus] = useState(null);
  const [on, setOnState] = useState(() => (userId ? readSwitch(userId) : true));
  const [shownFor, setShownFor] = useState(userId);
  // Another player logged in on this page: their own switch
  if (userId !== shownFor) {
    setShownFor(userId);
    setOnState(userId ? readSwitch(userId) : true);
  }

  useEffect(() => {
    if (!userId) return undefined;
    const controller = new AbortController();
    getSteamStatus(controller.signal)
      .then(setStatus)
      .catch((error) => error.name !== 'AbortError' && setStatus(false));
    return () => controller.abort();
  }, [userId]);

  const setOn = useCallback(
    (next) => {
      setOnState(next);
      try {
        localStorage.setItem(keyFor(userId), next ? 'on' : 'off');
      } catch {
        /* the switch still works for this visit */
      }
    },
    [userId]
  );

  const active = Boolean(on && status?.connected && status.played > 0);
  return { status: userId ? status : false, on, setOn, active };
}
