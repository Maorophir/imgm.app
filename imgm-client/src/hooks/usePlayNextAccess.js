/**
 * usePlayNextAccess — may the current visitor use Play Next?
 *
 * After launch (VITE_PLAY_NEXT=on, or local dev) it's everyone. Before launch, the
 * server decides per player (its beta list) and the site asks it once per login.
 * Returns { enabled, loading }.
 */
import { useEffect, useState } from 'react';
import { useSession } from '../lib/authClient';
import { fetchJson } from '../lib/api';
import { PLAY_NEXT_ENABLED } from '../lib/features';

export function usePlayNextAccess() {
  const { data: session, isPending } = useSession();
  const userId = session?.user?.id ?? null;
  const [answer, setAnswer] = useState({ userId: null, enabled: false }); // the server's answer, per player

  useEffect(() => {
    if (PLAY_NEXT_ENABLED || !userId) return undefined;
    let ignore = false; // a late answer for an earlier login mustn't win
    fetchJson('/api/guide/access')
      .then((data) => !ignore && setAnswer({ userId, enabled: Boolean(data.enabled) }))
      .catch(() => !ignore && setAnswer({ userId, enabled: false }));
    return () => {
      ignore = true;
    };
  }, [userId]);

  if (PLAY_NEXT_ENABLED) return { enabled: true, loading: false };
  if (isPending) return { enabled: false, loading: true };
  if (!userId) return { enabled: false, loading: false };
  return { enabled: answer.userId === userId && answer.enabled, loading: answer.userId !== userId };
}
