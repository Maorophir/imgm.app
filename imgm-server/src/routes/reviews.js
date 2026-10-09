import { Router } from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { getReviewsByGameId, getMyReview, saveReview, deleteMyReview, voteOnReview, getRecentReviews } from '../controllers/reviewsController.js';

const router = Router();

// GET /api/reviews/recent — the newest reviews on any game (home page)
router.get('/recent', getRecentReviews);

// GET /api/reviews/game/:gameId — all reviews of a game
router.get('/game/:gameId', getReviewsByGameId);

// GET /api/reviews/mine/:gameId — the logged-in user's review (to edit it)
router.get('/mine/:gameId', getMyReview);

// DELETE /api/reviews/mine/:gameId — delete the logged-in user's review
router.delete('/mine/:gameId', deleteMyReview);

// PUT /api/reviews/:id/vote — "Was this helpful?" (60 votes a minute is plenty for a person)
const voteLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many votes. Slow down a little.' },
});
router.put('/:id/vote', voteLimiter, voteOnReview);

// POST /api/reviews — create or update the logged-in user's review
router.post('/', saveReview);

export default router;
