import { Router } from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { getBallot, castGotwVote, nominateGame, getHistory } from '../controllers/gotwController.js';

const router = Router();

// GET /api/gotw — this week's ballot, your vote, and the current Game of the Week
router.get('/', getBallot);

// PUT /api/gotw/vote — vote for this week (once: votes are final)
const voteLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many votes. Slow down a little.' },
});
router.put('/vote', voteLimiter, castGotwVote);

// PUT /api/gotw/nominate — nominate a game for next week's "Player pick" slot
router.put('/nominate', voteLimiter, nominateGame);

// GET /api/gotw/history — past Games of the Week
router.get('/history', getHistory);

export default router;
