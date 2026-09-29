/**
 * API client — thin fetch wrappers for the IMGM backend.
 */
// Dev: the API runs on its own port. Production: '' makes requests same-origin
// (/api/... on imgm.app), which the host proxies to the server.
export const API_BASE =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:5000' : '');

export async function fetchJson(path, { signal } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    signal,
  });

  if (!response.ok) {
    const error = new Error(`Request to ${path} failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export const searchGames = (query, signal) =>
  fetchJson(`/api/games/search?q=${encodeURIComponent(query)}`, { signal });

export const getFeaturedGames = (signal) => fetchJson('/api/games/featured', { signal });

export const getGame = (id, signal) => fetchJson(`/api/games/${id}`, { signal });
