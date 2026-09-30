/**
 * useGamerTagCheck — asks the server (after a short typing pause) whether a
 * gamer tag can be used. Returns { state, message, ok } for GamerTagField.
 */
import { useState, useEffect } from 'react';
import { checkUsername } from '../lib/api';

export const TAG_RULES = '3–20 characters · letters, numbers, _ and - · you can change it once every 30 days';

// Asks the server (after a short typing pause) whether `name` can be used.
// `current` = the user's existing tag, which counts as fine without a check.
export const useGamerTagCheck = (name, current = null) => {
  const trimmed = name.trim();
  const isCurrent = Boolean(current) && trimmed === current;
  // The answer, tagged with the name it belongs to, so stale answers are ignored
  const [answer, setAnswer] = useState({ name: null, available: false, reason: '' });

  useEffect(() => {
    if (!trimmed || isCurrent) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      checkUsername(trimmed, controller.signal)
        .then((r) => setAnswer({ name: trimmed, available: r.available, reason: r.reason ?? '' }))
        .catch((err) => {
          if (err.name === 'AbortError') return;
          setAnswer({ name: trimmed, available: false, reason: err.message || "Couldn't check that name." });
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, isCurrent]);

  if (!trimmed) return { state: 'empty', message: '', ok: false };
  if (isCurrent) return { state: 'current', message: 'That’s your current tag.', ok: false };
  if (answer.name !== trimmed) return { state: 'checking', message: 'Checking…', ok: false };
  return answer.available
    ? { state: 'ok', message: '✓ Available', ok: true }
    : { state: 'bad', message: answer.reason, ok: false };
};
