import { Router } from 'express';
import { getReviewsByGameId, getMyReview, saveReview, deleteMyReview } from '../controllers/reviewsController.js';

const router = Router();

// GET /api/reviews/game/:gameId — all reviews of a game
router.get('/game/:gameId', getReviewsByGameId);

// GET /api/reviews/mine/:gameId — the logged-in user's review (to edit it)
router.get('/mine/:gameId', getMyReview);

// DELETE /api/reviews/mine/:gameId — delete the logged-in user's review
router.delete('/mine/:gameId', deleteMyReview);

// POST /api/reviews — create or update the logged-in user's review
router.post('/', saveReview);

export default router;
