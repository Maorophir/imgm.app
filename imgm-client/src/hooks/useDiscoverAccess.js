/**
 * useDiscoverAccess — may the current visitor use Discover (the scrolling feed)?
 *
 * The server decides (DISCOVER=on on Render opens it to everyone, logged out too; before
 * that, only its beta players, DISCOVER_BETA_USERS), and the site asks it once per login
 * (or once as a guest). Local development always has it. Returns { enabled, loading }.
 */
import { useEffect, useState } from 'react';
import { useSession } from '../lib/authClient';
import { fetchJson } from '../lib/api';

export function useDiscoverAccess() {
  const { data: session, isPending } = useSession();
  const who = isPending ? null : (session?.user?.id ?? 'guest'); // whose answer we need
  const [answer, setAnswer] = useState({ who: null, enabled: false }); // the server's answer

  useEffect(() => {
    if (import.meta.env.DEV || !who) return undefined;
    let ignore = false; // a late answer for an earlier login mustn't win
    fetchJson('/api/discover/access')
      .then((data) => !ignore && setAnswer({ who, enabled: Boolean(data.enabled) }))
      .catch(() => !ignore && setAnswer({ who, enabled: false }));
    return () => {
      ignore = true;
    };
  }, [who]);

  if (import.meta.env.DEV) return { enabled: true, loading: false };
  if (!who) return { enabled: false, loading: true };
  return { enabled: answer.who === who && answer.enabled, loading: answer.who !== who };
}
