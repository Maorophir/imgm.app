/**
 * Which games are in the logged-in player's Backlog, for every "Add to Backlog" button
 * on the page (they all stay in step). Loaded once per login; adding and removing
 * update at once and go back if the server refuses.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSession } from '../lib/authClient';
import { addToBacklog, getBacklogIds, removeFromBacklog } from '../lib/api';

const BacklogContext = createContext(null);

export function BacklogProvider({ children }) {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;
  // Whose list it is travels with it: after a logout (or another login) the old one is ignored
  const [loaded, setLoaded] = useState({ userId: null, ids: new Set() });
  const ids = useMemo(() => (loaded.userId === userId ? loaded.ids : new Set()), [loaded, userId]);

  useEffect(() => {
    if (!userId) return undefined;
    const controller = new AbortController();
    getBacklogIds(controller.signal)
      .then((list) => setLoaded({ userId, ids: new Set(list) }))
      .catch(() => {});
    return () => controller.abort();
  }, [userId]);

  const toggle = useCallback(
    async (gameId, source) => {
      const adding = !ids.has(gameId);
      const change = (add) =>
        setLoaded((current) => {
          const next = new Set(current.userId === userId ? current.ids : []);
          if (add) next.add(gameId);
          else next.delete(gameId);
          return { userId, ids: next };
        });
      change(adding);
      try {
        if (adding) await addToBacklog(gameId, source);
        else await removeFromBacklog(gameId);
      } catch {
        change(!adding); // the server refused: back as it was
      }
    },
    [ids, userId]
  );

  const value = useMemo(() => ({ loggedIn: Boolean(userId), has: (id) => ids.has(id), toggle, count: ids.size }), [userId, ids, toggle]);
  return <BacklogContext.Provider value={value}>{children}</BacklogContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useBacklog = () => useContext(BacklogContext);
