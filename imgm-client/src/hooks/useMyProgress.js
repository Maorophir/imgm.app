/**
 * useMyProgress — the logged-in player's XP, level and tier (null until loaded).
 *
 * Call refreshMyProgress() after posting, editing or deleting a review: every
 * component using the hook (e.g. the navbar) reloads its numbers.
 */
import { useEffect, useState } from 'react';
import { getMyProgress } from '../lib/api';
import { getProgress } from '../lib/levels';

const EVENT = 'imgm:xp-changed';

export const refreshMyProgress = () => window.dispatchEvent(new Event(EVENT));

export function useMyProgress(enabled = true) {
  const [data, setData] = useState(null); // { xp, reviews } from the server

  useEffect(() => {
    if (!enabled) return undefined;
    let ignore = false; // an old answer arriving late mustn't overwrite a newer one
    const load = () =>
      getMyProgress()
        .then((d) => !ignore && setData(d))
        .catch(() => {}); // the level just stays hidden if this fails
    load();
    window.addEventListener(EVENT, load);
    return () => {
      ignore = true;
      window.removeEventListener(EVENT, load);
    };
  }, [enabled]);

  return enabled && data ? { ...getProgress(data.xp), reviews: data.reviews } : null;
}
