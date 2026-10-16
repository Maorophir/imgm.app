/**
 * A review's own art: the picture on its card. The player can choose it (one of the
 * game's cover, artworks or screenshots: `cardArt` on the review); until then it's one
 * of the game's official artworks, chosen from the review's id, so the same review
 * always gets the same picture (on the game page, the home page, the review quest's
 * reward and the picture shared from it) and one game's reviews get different ones.
 * A game with no artworks uses its screenshots, and one with neither its cover.
 *
 * The address is IGDB's 1080p copy (or the cover); the website asks for the size it
 * needs (lib/igdbImage).
 */

// Fields a game needs for this: add them to a query's game select
export const ART_SELECT = { coverUrl: true, artworks: true, screenshots: true };

// Every picture a player may choose for their card: the cover, then the artworks, then
// the screenshots
export const artChoices = (game) =>
  [game?.coverUrl, ...(game?.artworks ?? []), ...(game?.screenshots ?? [])].filter(Boolean);

// A steady number from the review's id (FNV-1a), the same every time
const hash = (text) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

// review: { id, cardArt } (or just the id)
export const reviewArt = (game, review) => {
  const id = typeof review === 'object' ? review?.id : review;
  const chosen = typeof review === 'object' ? review?.cardArt : null;
  if (chosen && artChoices(game).includes(chosen)) return chosen;
  const pool = game?.artworks?.length ? game.artworks : game?.screenshots ?? [];
  if (pool.length === 0) return game?.coverUrl ?? null;
  return pool[hash(String(id)) % pool.length];
};
