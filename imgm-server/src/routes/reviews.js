import { Router } from 'express';
import { getReviewsByGameId, createReview } from '../controllers/reviewsController.js';

const router = Router();

// GET /api/reviews/game/:gameId
router.get('/game/:gameId', getReviewsByGameId);

// POST /api/reviews
router.post('/', createReview);

export default router;
