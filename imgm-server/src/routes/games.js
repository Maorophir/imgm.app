import { Router } from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { getSessionUser } from '../lib/session.js';
import { isInternalRequest } from '../lib/internal.js';
import {
  getAllGames,
  getGameById,
  searchGames,
  getFeaturedGames,
} from '../controllers/gamesController.js';

const router = Router();

// Limits on routes that can call IGDB, so one visitor (or bot) can't use up our shared
// IGDB quota (4 requests/second) for everyone.
//
// Counted PER PLAYER, not per IP address: Play Next's agent runs on Google's servers,
// so all players' agents share Google's IPs (a per-IP limit would be one limit for
// everyone), and friends on one network shouldn't share a limit either.
//   Play Next for a player (valid internal key)  → that player's agent
//   a logged-in player                           → that player
//   a logged-out visitor                         → their IP address
const perPlayer = async (req) => {
  if (isInternalRequest(req) && req.get('X-User-Id')) return `agent:${req.get('X-User-Id')}`;
  const user = await getSessionUser(req).catch(() => null);
  return user ? `user:${user.id}` : `ip:${ipKeyGenerator(req.ip)}`;
};

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30, // searches per minute per player
  keyGenerator: perPlayer,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many searches — please wait a moment and try again.' },
});

const igdbLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60, // game page / featured requests per minute per player
  keyGenerator: perPlayer,
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
