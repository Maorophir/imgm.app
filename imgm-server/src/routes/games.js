import { Router } from 'express';
import { getAllGames, getGameById } from '../controllers/gamesController.js';

const router = Router();

// GET /api/games
router.get('/', getAllGames);

// GET /api/games/:id
router.get('/:id', getGameById);

export default router;
