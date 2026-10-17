/**
 * API client — thin fetch wrappers for the IMGM backend.
 * One does a little more: after a player posts, edits or deletes a review, getGame and
 * getRecentReviews skip the CDN's copy, so they see their change (changedGames).
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
// Games to get the player reviewing: popular ones in their favourite genres they haven't
// rated (logged in), else the most played games of all time. { personal, genres, games }
export const getReviewPicks = (signal) => fetchJson('/api/games/review-picks', { signal });

// Games whose page this player changed in this tab (they posted, edited or deleted a
// review). Vercel's CDN may still hold a copy of the page from before (the server lets
// it keep one for a minute, then serve it once more while it refreshes), which would
// leave their own review out of the score and count. So these games skip that copy: a
// unique query string is its own cache key, so it always reaches the server, which
// ignores it. Kept for the tab (sessionStorage), so a reload skips it too.
const CHANGED_GAMES = 'imgm:changed-games';
const changedGames = new Set((() => {
  try {
    return JSON.parse(sessionStorage.getItem(CHANGED_GAMES)) ?? [];
  } catch {
    return [];
  }
})());
const markChanged = (gameId) => {
  changedGames.add(String(gameId));
  try {
    sessionStorage.setItem(CHANGED_GAMES, JSON.stringify([...changedGames]));
  } catch {
    // no storage: it's still remembered until the page reloads
  }
};

export const getGame = (id, signal) =>
  fetchJson(`/api/games/${id}${changedGames.has(String(id)) ? `?fresh=${Date.now()}` : ''}`, { signal });

// "Was this review helpful?": true / false, or null to take the vote back
export const voteOnReview = (reviewId, helpful) =>
  fetchJson(`/api/reviews/${reviewId}/vote`, { method: 'PUT', body: { helpful } });

// Game of the Week: { week, candidates, myVote, totalVotes, gameOfTheWeek }
export const getGotw = (signal) => fetchJson('/api/gotw', { signal });
export const voteGotw = (gameId) => fetchJson('/api/gotw/vote', { method: 'PUT', body: { gameId } });
export const nominateGotw = (gameId) => fetchJson('/api/gotw/nominate', { method: 'PUT', body: { gameId } });
export const getGotwHistory = (signal) => fetchJson('/api/gotw/history', { signal });

// The Hall of Fame (top games): { games: [{ rank, average, reviewCount, myRating, …game }], size, insights }
export const getTopGames = ({ sort, platform }, signal) =>
  fetchJson(`/api/games/top?${new URLSearchParams({ sort, ...(platform && { platform }) })}`, { signal });

// The newest reviews on any game (home page): [{ id, rating, snippet, createdAt, author,
// game: { id, title, coverUrl, genres, releaseDate, developer, artworks (first only),
// ratings, reviewCount }, pinned? }]
// A player who posted, edited or deleted a review in this tab skips the CDN's copy, so
// their own review shows up straight away (see changedGames)
export const getRecentReviews = (signal) =>
  fetchJson(`/api/reviews/recent?limit=8${changedGames.size ? `&fresh=${Date.now()}` : ''}`, { signal });

// One page of a game's reviews: { reviews, mine (the viewer's own, first page only), total, hasMore }
export const getGameReviews = (gameId, { sort, tier, rating, offset, limit, focus }, signal) => {
  const params = new URLSearchParams({ sort, offset, limit, ...(tier && { tier }), ...(rating && { rating }), ...(focus && { focus }) });
  return fetchJson(`/api/reviews/game/${gameId}?${params}`, { signal });
};

// Your card for a game: its picture and words now, and what you may choose
// ({ art, quote, pictures, sentences, sentence }); and choosing ({ art?, sentence? },
// null = back to the automatic choice)
export const getMyCard = (gameId, signal) => fetchJson(`/api/reviews/mine/${gameId}/card`, { signal });
export const setMyCard = (gameId, choice) => fetchJson(`/api/reviews/mine/${gameId}/card`, { method: 'PUT', body: choice });

// The logged-in user's review of a game, or null if they haven't reviewed it
export const getMyReview = (gameId, signal) => fetchJson(`/api/reviews/mine/${gameId}`, { signal });

// Creates the review, or updates it if the user already reviewed this game. Either
// way the game's page has changed for this player (see changedGames).
export const saveReview = async (review) => {
  const saved = await fetchJson('/api/reviews', { method: 'POST', body: review });
  markChanged(review.gameId);
  return saved;
};

// Deletes the logged-in user's review of a game
export const deleteMyReview = async (gameId) => {
  const result = await fetchJson(`/api/reviews/mine/${gameId}`, { method: 'DELETE' });
  markChanged(gameId);
  return result;
};

// Is this gamer tag free and allowed? → { available, reason? }
export const checkUsername = (name, signal) =>
  fetchJson(`/api/users/username-available?name=${encodeURIComponent(name)}`, { signal });

// Choose or change the logged-in user's gamer tag
export const setUsername = (name) => fetchJson('/api/users/me/username', { method: 'PUT', body: { name } });

// Your XP and review count — { xp, reviews }
export const getMyProgress = (signal) => fetchJson('/api/users/me/progress', { signal });

// The Feedback button: { kind: bug | idea | other, message, page }
export const sendFeedback = (feedback) => fetchJson('/api/feedback', { method: 'POST', body: feedback });

// Your Backlog (games to play later)
export const getBacklog = (signal) => fetchJson('/api/backlog', { signal });
export const getBacklogIds = (signal) => fetchJson('/api/backlog/ids', { signal });
export const addToBacklog = (gameId, source) => fetchJson(`/api/backlog/${gameId}`, { method: 'PUT', body: { source } });
export const removeFromBacklog = (gameId) => fetchJson(`/api/backlog/${gameId}`, { method: 'DELETE' });
export const reorderBacklog = (gameIds) => fetchJson('/api/backlog/order', { method: 'PUT', body: { gameIds } });
export const setBacklogFinished = (gameId, finished) => fetchJson(`/api/backlog/${gameId}/finished`, { method: 'PUT', body: { finished } });
// "Playing now": marks a Backlog game as the one you're playing (true) or not (false)
export const setBacklogPlaying = (gameId, playing) => fetchJson(`/api/backlog/${gameId}/playing`, { method: 'PUT', body: { playing } });

// Your profile: { player, stats, reviews } and more reviews page by page
export const getMyProfile = (signal) => fetchJson('/api/users/me/profile', { signal });
export const getMyReviews = (offset, signal) => fetchJson(`/api/users/me/reviews?offset=${offset}&limit=12`, { signal });
// Any player's public profile, by gamer tag: { player, stats, reviews } with only what the
// privacy policy calls public (no email, real name or Game of the Week votes)
export const getPublicProfile = (username, signal) => fetchJson(`/api/users/${encodeURIComponent(username)}/profile`, { signal });
export const getPublicReviews = (username, offset, signal) =>
  fetchJson(`/api/users/${encodeURIComponent(username)}/reviews?offset=${offset}&limit=12`, { signal });
// Profile picture: a data URL from resizeToAvatar (checked by the server before it's saved)
export const uploadAvatar = (image) => fetchJson('/api/users/me/avatar', { method: 'PUT', body: { image } });
// The avatar window opened: wake the photo check's AI service now (never waited on)
export const wakePictureCheck = () => fetchJson('/api/users/me/avatar/wake', { method: 'POST' }).catch(() => {});
export const deleteAvatar = () => fetchJson('/api/users/me/avatar', { method: 'DELETE' });
// Your account: { hasPassword, providers }, and deleting it ({ password?, reason, details? })
export const getMyAccount = (signal) => fetchJson('/api/users/me/account', { signal });
export const deleteMyAccount = (body) => fetchJson('/api/users/me', { method: 'DELETE', body });

// Ready-made avatars (IMGM's original characters): [{ key, name, url }], and choosing one
export const getAvatarPresets = (signal) => fetchJson('/api/users/avatars/presets', { signal });
export const chooseAvatarPreset = (preset) => fetchJson('/api/users/me/avatar', { method: 'PUT', body: { preset } });

/**
 * Asks the Game Guide and streams its work. The server answers with Server-Sent
 * Events; each one is handed to onEvent(name, data) the moment it arrives.
 * (The browser's EventSource can't send a POST body, so the stream is read by hand.)
 */
// Play Next chat history (the player's own chats; see playNextChatsController.js)
export const listGuideChats = (signal) => fetchJson('/api/guide/chats', { signal });
export const getGuideChat = (id) => fetchJson(`/api/guide/chats/${id}`);
export const saveGuideChat = (id, chat) => fetchJson(`/api/guide/chats/${id}`, { method: 'PUT', body: chat });
export const deleteGuideChat = (id) => fetchJson(`/api/guide/chats/${id}`, { method: 'DELETE' });

// Play Next page opened: wake the AI service so the first answer starts sooner
export const wakeGuide = () => fetchJson('/api/guide/wake', { method: 'POST' }).catch(() => {});

export async function streamGuide(body, { signal, onEvent }) {
  const response = await fetch(`${API_BASE}/api/guide/stream`, {
    method: 'POST',
    credentials: 'include',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const error = new Error(data?.error || 'Play Next is unavailable right now.');
    error.status = response.status;
    throw error;
  }

  // Events are separated by a blank line: "event: step\ndata: {...}\n\n"
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let end;
    while ((end = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      let event = 'message';
      let data = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event: ')) event = line.slice(7);
        else if (line.startsWith('data: ')) data += line.slice(6);
      }
      if (data) onEvent(event, JSON.parse(data));
    }
  }
}
