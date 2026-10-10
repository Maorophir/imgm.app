/**
 * usePlayNextAccess — may the current visitor use Play Next?
 *
 * The server decides (one switch on Render: PLAY_NEXT=on opens it to everyone, logged
 * out too; before that, only its beta players), and the site asks it once per login
 * (or once as a guest). Local development always has it. Returns { enabled, loading }.
 */
import { useEffect, useState } from 'react';
import { useSession } from '../lib/authClient';
import { fetchJson } from '../lib/api';
import { PLAY_NEXT_ENABLED } from '../lib/features';

export function usePlayNextAccess() {
  const { data: session, isPending } = useSession();
  const who = isPending ? null : (session?.user?.id ?? 'guest'); // whose answer we need
  const [answer, setAnswer] = useState({ who: null, enabled: false }); // the server's answer

  useEffect(() => {
    if (PLAY_NEXT_ENABLED || !who) return undefined;
    let ignore = false; // a late answer for an earlier login mustn't win
    fetchJson('/api/guide/access')
      .then((data) => !ignore && setAnswer({ who, enabled: Boolean(data.enabled) }))
      .catch(() => !ignore && setAnswer({ who, enabled: false }));
    return () => {
      ignore = true;
    };
  }, [who]);

  if (PLAY_NEXT_ENABLED) return { enabled: true, loading: false };
  if (!who) return { enabled: false, loading: true };
  return { enabled: answer.who === who && answer.enabled, loading: answer.who !== who };
}
