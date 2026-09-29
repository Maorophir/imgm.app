import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import {
  getAllGames,
  getGameById,
  searchGames,
  getFeaturedGames,
} from '../controllers/gamesController.js';

const router = Router();

// Per-visitor limits on routes that can call IGDB, so one visitor (or bot)
// can't use up our shared IGDB quota (4 requests/second) for everyone
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30, // searches per minute per visitor
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many searches — please wait a moment and try again.' },
});

const igdbLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60, // game page / featured requests per minute per visitor
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many requests — please wait a moment and try again.' },
});

// GET /api/games
router.get('/', getAllGames);

// NOTE: static routes must be registered before '/:id' or Express treats them as ids

// GET /api/games/search?q=...
router.get('/search', searchLimiter, searchGames);

// GET /api/games/featured
router.get('/featured', igdbLimiter, getFeaturedGames);

// GET /api/games/:id
router.get('/:id', igdbLimiter, getGameById);

export default router;
