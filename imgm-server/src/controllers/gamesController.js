import { reigningWeek } from '../lib/gotw.js';
import { prisma } from '../lib/db.js';
import { cacheAtEdge } from '../lib/cdnCache.js';
import * as igdb from '../services/igdbService.js';
import { upsertGame } from '../services/gameStore.js';
import { getSteamTrailers } from '../services/steamTrailers.js';
import { getSessionUser } from '../lib/session.js';

// Re-fetch a cached game from IGDB once it's older than this
const GAME_STALE_AFTER = 7 * 24 * 60 * 60 * 1000; // 7 days

const GAME_INCLUDE = {
  aiSummary: true,
  // Only the ratings: the reviews themselves come page by page from /api/reviews/game/:id
  reviews: { select: { rating: true } },
};

/**
 * Shapes a DB game for the client: flattens the AI summary relation into
 * `aiSummary` / `aiSentiment` strings, computes the IMGM average rating, and sums up
 * the reviews: how many, and how many gave each rating (for the breakdown bar).
 */
const toClientGame = (game) => {
  const { aiSummary, reviews = [], ...rest } = game;
  const ratings = {};
  if (reviews.length > 0) {
    ratings.imgm = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  }
  const byRating = {}; // { 10: 3, 8: 1, … }
  for (const { rating } of reviews) byRating[rating] = (byRating[rating] ?? 0) + 1;

  return {
    ...rest,
    reviewStats: { count: reviews.length, byRating },
    ratings,
    aiSummary: aiSummary?.summaryText ?? null,
    aiSentiment: aiSummary?.overallSentiment ?? null,
    // The summary's chips and what it was based on (game pages)
    aiAspects: aiSummary?.aspects ?? [],
    aiSummaryReviews: aiSummary?.reviewCountAtGen ?? null,
    aiSummaryAt: aiSummary?.generatedAt ?? null,
  };
};

/**
 * Adds our community score to a list of IGDB games: `ratings.imgm` (the average)
 * and `reviewCount`. One grouped query for the whole list, not one per game.
 * Returns new objects: the IGDB cache's arrays must never be changed in place.
 */
const withImgmRatings = async (games) => {
  const stats = await prisma.review.groupBy({
    by: ['gameId'],
    where: { gameId: { in: games.map((g) => g.id) } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const byGame = new Map(stats.map((s) => [s.gameId, s]));

  return games.map((game) => {
    const s = byGame.get(game.id);
    return s
      ? { ...game, ratings: { ...game.ratings, imgm: s._avg.rating }, reviewCount: s._count._all }
      : { ...game, reviewCount: 0 };
  });
};

export const getAllGames = async (req, res) => {
  try {
    const games = await prisma.game.findMany({
      include: {
        aiSummary: true,
      },
    });
    res.json(games);
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const searchGames = async (req, res) => {
  const query = (req.query.q ?? '').toString().trim();
  if (query.length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }

  try {
    const results = await igdb.searchGames(query);
    res.json(await withImgmRatings(results));
  } catch (error) {
    console.error(`Error searching IGDB for "${query}":`, error);
    res.status(502).json({ error: 'Failed to search games' });
  }
};

// GET /api/games/:id/family — the game's series, its studio's games like it, and
// IGDB's similar games (for Play Next; see igdbService.getGameFamily). Each game comes
// with what a search result has (platforms, length, IMGM rating), plus modes and themes.
export const getGameFamily = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid game id' });

  try {
    const family = await igdb.getGameFamily(id);
    if (!family) return res.status(404).json({ error: 'Game not found' });
    const [series, studio, similar] = await Promise.all(
      [family.series, family.studio, family.similar].map(withImgmRatings)
    );
    res.json({ ...family, series, studio, similar });
  } catch (error) {
    console.error(`Error fetching the family of game ${id}:`, error);
    res.status(502).json({ error: 'Failed to fetch the game family' });
  }
};

const FEATURED_COUNT = 40;

// The list we last saved to the DB. igdb.getPopularGames() returns the same cached
// array until its 6h cache expires, so a new array means "fresh list — save it".
let lastSavedFeatured = null;

export const getFeaturedGames = async (req, res) => {
  try {
    const games = await igdb.getPopularGames(FEATURED_COUNT);

    // Cache featured games locally so their detail pages load from the DB.
    // Runs in the background (not awaited) so visitors don't wait for 40 DB writes.
    if (games !== lastSavedFeatured) {
      lastSavedFeatured = games;
      Promise.all(
        games.map((game) =>
          upsertGame(game).catch((error) =>
            console.error(`Error caching featured game ${game.id}:`, error)
          )
        )
      );
    }

    // Games with IMGM reviews first, so the shelf opens on games that already have cards.
    // sort is stable, so each group keeps IGDB's popularity order; the client pages
    // through this one list, so every page agrees with it.
    const featured = await withImgmRatings(games);
    featured.sort((a, b) => (b.reviewCount > 0) - (a.reviewCount > 0));

    // The same list for every visitor: the CDN can answer while this server sleeps
    cacheAtEdge(res);
    res.json(featured);
  } catch (error) {
    console.error('Error fetching featured games:', error);
    res.status(502).json({ error: 'Failed to fetch featured games' });
  }
};

// The last list of each Discover feed saved to the DB (saved again only when it changes)
const lastSavedDiscover = new Map();

// GET /api/games/discover?feed=hot|upcoming — Discover's feeds, one game per
// screen: each with its trailers (Steam's, without ads, when the game is on Steam;
// YouTube's otherwise), whether it's for adults (any rating board, or Steam), and its
// IMGM rating like the featured games
export const getDiscoverGames = async (req, res) => {
  const feed = req.query.feed ?? 'hot';
  if (!igdb.DISCOVER_FEED_NAMES.includes(feed)) return res.status(400).json({ error: 'Unknown feed' });
  try {
    const games = await igdb.getDiscoverGames(feed);
    // Saved in the background, like the featured games, so their pages load from the DB
    if (lastSavedDiscover.get(feed) !== games) {
      lastSavedDiscover.set(feed, games);
      // Only the usual game fields: the Discover-only ones aren't columns
      Promise.all(
        games.map(({ mature, steamAppId, ...game }) =>
          upsertGame(game).catch((error) => console.error(`Error caching Discover game ${game.id}:`, error))
        )
      );
    }
    const steam = await getSteamTrailers(games.map((game) => game.steamAppId));
    const list = await withImgmRatings(
      games.map(({ steamAppId, ...game }) => ({
        ...game,
        steamTrailer: steam.get(steamAppId)?.trailer ?? null,
        mature: game.mature || Boolean(steam.get(steamAppId)?.mature),
      }))
    );
    // The same list for every visitor: the CDN can answer while this server sleeps
    cacheAtEdge(res);
    res.json(list);
  } catch (error) {
    console.error(`Error fetching the Discover feed ${feed}:`, error);
    res.status(502).json({ error: 'Failed to fetch games' });
  }
};

// IGDB refreshes running right now, by game id: a busy game page starts one refresh,
// not one per visitor
const refreshing = new Map();

// Fetches a game from IGDB and saves it. Resolves to false when IGDB doesn't know it.
const refreshGame = (id) => {
  if (!refreshing.has(id)) {
    const refresh = igdb
      .getGameDetails(id)
      .then(async (mapped) => {
        if (mapped) await upsertGame(mapped);
        return Boolean(mapped);
      })
      .finally(() => refreshing.delete(id));
    refreshing.set(id, refresh);
  }
  return refreshing.get(id);
};

export const getGameById = async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid game id' });
  }

  try {
    const findGame = () => prisma.game.findUnique({ where: { id }, include: GAME_INCLUDE });
    let game = await findGame();

    if (!game) {
      // Never stored: the page needs IGDB's copy before it can show anything
      try {
        if (await refreshGame(id)) game = await findGame();
      } catch (error) {
        console.error(`Error fetching game ${id} from IGDB:`, error);
        return res.status(502).json({ error: 'Failed to fetch game from IGDB' });
      }
    } else if (Date.now() - game.updatedAt.getTime() > GAME_STALE_AFTER || game.stores === null) {
      // Stale after a week (games saved before store links existed count as stale too).
      // A week-old copy is still a good page, so answer with it now and refresh in the
      // background: the next visitor gets the fresh one. A failed refresh keeps the copy.
      refreshGame(id).catch((error) => console.error(`Error refreshing game ${id} from IGDB:`, error));
    }

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // A gold "Game of the Week" badge on the page during its reign (never blocks the page)
    const gameOfTheWeek = await reigningWeek(id).catch(() => null);
    // The same page for every visitor (no session, no "my review"): the CDN may keep it.
    // A player who just changed a review of this game skips that copy with a ?fresh=
    // query (imgm-client lib/api.js, changedGames), so they see their own review counted.
    cacheAtEdge(res);
    res.json({ ...toClientGame(game), gameOfTheWeek });
  } catch (error) {
    console.error(`Error fetching game ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/games/review-picks — games to get a player reviewing, for the home page.
//   Logged in: popular games in the genres they review most, minus the ones they've
//   reviewed (filled up with the all-time greats when there aren't enough).
//   Guests (and new players): the most played games of all time.
// { personal, genres: ['Role-playing (RPG)', …] (what "for you" is based on), games }
// Per visitor, so never kept at the CDN.
const PICKS = 8;
export const getReviewPicks = async (req, res) => {
  try {
    const user = await getSessionUser(req).catch(() => null);
    let picks = [];
    let basis = [];
    let reviewed = new Set();
    if (user) {
      const mine = await prisma.review.findMany({ where: { userId: user.id }, select: { gameId: true, game: { select: { genres: true } } } });
      reviewed = new Set(mine.map((r) => r.gameId));
      const counts = new Map();
      for (const r of mine) for (const g of r.game?.genres ?? []) counts.set(g, (counts.get(g) ?? 0) + 1);
      basis = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([g]) => g);
      if (basis.length) {
        const ids = await igdb.getGenreIds();
        const genres = basis.map((name) => ids.get(name)).filter(Boolean);
        // Their top genres together first, then their favourite alone (any genre is too
        // loose: nearly every game is also an "Adventure")
        for (const query of [{ genres, all: true }, { genres: genres.slice(0, 1) }]) {
          if (picks.length >= PICKS || (query.all && genres.length < 2)) continue;
          const found = (await igdb.getAllTimeGreats(query)).filter((g) => !reviewed.has(g.id) && !picks.some((p) => p.id === g.id));
          picks = [...picks, ...found];
        }
      }
    }
    if (picks.length < PICKS) {
      const more = (await igdb.getAllTimeGreats()).filter((g) => !reviewed.has(g.id) && !picks.some((p) => p.id === g.id));
      picks = [...picks, ...more];
    }
    const games = await withImgmRatings(picks.slice(0, PICKS));
    res.set('Cache-Control', 'private, no-store');
    res.json({ personal: Boolean(user && basis.length), genres: basis, games });
  } catch (error) {
    console.error('Error picking games to review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
