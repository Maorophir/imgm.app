/**
 * A review's own art: one of its game's artworks or screenshots, chosen from the
 * review's id. The same review always gets the same picture (on the game page, the home
 * page's card, the review quest's reward and the picture shared from it), and the
 * reviews of one game get different ones, so their cards don't all look alike. A game
 * with no artworks or screenshots uses its cover.
 *
 * The address is IGDB's 1080p copy (or the cover); the website asks for the size it
 * needs (lib/igdbImage).
 */

// Fields a game needs for this: add them to a query's game select
export const ART_SELECT = { coverUrl: true, artworks: true, screenshots: true };

// A steady number from the review's id (FNV-1a), the same every time
const hash = (text) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const reviewArt = (game, reviewId) => {
  const pool = [...(game?.artworks ?? []), ...(game?.screenshots ?? [])];
  if (pool.length === 0) return game?.coverUrl ?? null;
  return pool[hash(String(reviewId)) % pool.length];
};
