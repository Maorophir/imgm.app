import { Router } from 'express';
import {
  getAllGames,
  getGameById,
  searchGames,
  getFeaturedGames,
} from '../controllers/gamesController.js';

const router = Router();

// GET /api/games
router.get('/', getAllGames);

// NOTE: static routes must be registered before '/:id' or Express treats them as ids

// GET /api/games/search?q=...
router.get('/search', searchGames);

// GET /api/games/featured
router.get('/featured', getFeaturedGames);

// GET /api/games/:id
router.get('/:id', getGameById);

export default router;
