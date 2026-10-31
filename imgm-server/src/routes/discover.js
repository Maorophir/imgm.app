import { Router } from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { requireUser } from '../lib/session.js';
import { getVotes, setVote } from '../controllers/discoverController.js';

const router = Router();

// Votes are quick taps while scrolling: plenty for a person, too few for a script
const voteLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 90,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip),
  message: { error: 'Too many votes. Please slow down.' },
});

router.get('/votes', getVotes); // ?ids=1,2,3: counts, and your own vote
router.put('/votes/:gameId', requireUser, voteLimiter, setVote); // { value: 1 | -1 | 0 }

export default router;
