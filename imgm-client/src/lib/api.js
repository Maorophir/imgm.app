/**
 * API client — thin fetch wrappers for the IMGM backend.
 */
// Dev: the API runs on its own port. Production: '' makes requests same-origin
// (/api/... on imgm.app), which the host proxies to the server.
export const API_BASE =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:5000' : '');

/**
 * Calls our API and returns the JSON response.
 * Pass `body` to send data (it's sent as JSON). On failure it throws an Error
 * carrying `status` and the server's JSON (`data`, e.g. { error, issues }).
 */
export async function fetchJson(path, { signal, method = 'GET', body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    signal,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    // The server usually explains what went wrong — keep that for the UI
    const data = await response.json().catch(() => null);
    const error = new Error(data?.error || `Request to ${path} failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  // 204 No Content (e.g. after a delete) has no body to read
  if (response.status === 204) return null;
  return response.json();
}

export const searchGames = (query, signal) =>
  fetchJson(`/api/games/search?q=${encodeURIComponent(query)}`, { signal });

export const getFeaturedGames = (signal) => fetchJson('/api/games/featured', { signal });

export const getGame = (id, signal) => fetchJson(`/api/games/${id}`, { signal });

// The logged-in user's review of a game, or null if they haven't reviewed it
export const getMyReview = (gameId, signal) => fetchJson(`/api/reviews/mine/${gameId}`, { signal });

// Creates the review, or updates it if the user already reviewed this game
export const saveReview = (review) => fetchJson('/api/reviews', { method: 'POST', body: review });

// Deletes the logged-in user's review of a game
export const deleteMyReview = (gameId) => fetchJson(`/api/reviews/mine/${gameId}`, { method: 'DELETE' });

// Is this gamer tag free and allowed? → { available, reason? }
export const checkUsername = (name, signal) =>
  fetchJson(`/api/users/username-available?name=${encodeURIComponent(name)}`, { signal });

// Choose or change the logged-in user's gamer tag
export const setUsername = (name) => fetchJson('/api/users/me/username', { method: 'PUT', body: { name } });
