import { Router } from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { clientIp } from '../lib/clientIp.js';
import { getDaily, guessDaily, skipDaily } from '../controllers/dailyController.js';

const router = Router();

// A guess can ask IGDB what the game is, so guesses are limited like searches
const guessLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  keyGenerator: (req) => ipKeyGenerator(clientIp(req)),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many guesses. Slow down a little.' },
});
const pageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  keyGenerator: (req) => ipKeyGenerator(clientIp(req)),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a moment.' },
});

// GET /api/daily — today's puzzle and where you stand (?guesses=… for logged-out players)
router.get('/', pageLimiter, getDaily);

// POST /api/daily/guess — guess today's game  { gameId, guesses? }
router.post('/guess', guessLimiter, guessDaily);

// POST /api/daily/skip — skip a try: the next picture and clues, without a guess (the
// last one shows the answer)
router.post('/skip', guessLimiter, skipDaily);

export default router;
