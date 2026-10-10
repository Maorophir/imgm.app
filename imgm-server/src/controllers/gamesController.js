import { reigningWeek } from '../lib/gotw.js';
import { prisma } from '../lib/db.js';
import * as igdb from '../services/igdbService.js';
import { upsertGame } from '../services/gameStore.js';

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

    res.json(await withImgmRatings(games));
  } catch (error) {
    console.error('Error fetching featured games:', error);
    res.status(502).json({ error: 'Failed to fetch featured games' });
  }
};

export const getGameById = async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid game id' });
  }

  try {
    let game = await prisma.game.findUnique({
      where: { id },
      include: GAME_INCLUDE,
    });

    const isStale = game && Date.now() - game.updatedAt.getTime() > GAME_STALE_AFTER;

    if (!game || isStale) {
      try {
        const mapped = await igdb.getGameDetails(id);
        if (mapped) {
          await upsertGame(mapped);
          game = await prisma.game.findUnique({
            where: { id },
            include: GAME_INCLUDE,
          });
        }
      } catch (error) {
        console.error(`Error fetching game ${id} from IGDB:`, error);
        // Serve the stale copy if we have one; otherwise report the upstream failure
        if (!game) {
          return res.status(502).json({ error: 'Failed to fetch game from IGDB' });
        }
      }
    }

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // A gold "Game of the Week" badge on the page during its reign (never blocks the page)
    const gameOfTheWeek = await reigningWeek(id).catch(() => null);
    res.json({ ...toClientGame(game), gameOfTheWeek });
  } catch (error) {
    console.error(`Error fetching game ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
