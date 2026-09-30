import { prisma } from '../lib/db.js';
import * as igdb from '../services/igdbService.js';
import { upsertGame } from '../services/gameStore.js';
import { withMaskedText } from '../lib/reviewText.js';

// Re-fetch a cached game from IGDB once it's older than this
const GAME_STALE_AFTER = 7 * 24 * 60 * 60 * 1000; // 7 days

const GAME_INCLUDE = {
  aiSummary: true,
  reviews: {
    include: {
      analysis: true,
      // Public author info = the gamer tag only (never the real name or Google photo)
      user: { select: { id: true, displayUsername: true } },
      // "It's like ___ meets ___" games
      comparedA: { select: { id: true, title: true, coverUrl: true } },
      comparedB: { select: { id: true, title: true, coverUrl: true } },
    },
    orderBy: {
      createdAt: 'desc'
    }
  }
};

/**
 * Shapes a DB game for the client: flattens the AI summary relation into
 * `aiSummary` / `aiSentiment` strings and computes the IMGM average rating.
 */
const toClientGame = (game) => {
  const { aiSummary, reviews = [], ...rest } = game;
  const ratings = {};
  if (reviews.length > 0) {
    ratings.imgm = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  }

  return {
    ...rest,
    reviews: reviews.map(withMaskedText), // swearing gets a masked copy
    ratings,
    aiSummary: aiSummary?.summaryText ?? null,
    aiSentiment: aiSummary?.overallSentiment ?? null,
  };
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
    res.json(results);
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

    res.json(games);
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

    res.json(toClientGame(game));
  } catch (error) {
    console.error(`Error fetching game ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
