import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { requireUser } from '../lib/session.js';
import { streamGuide } from '../controllers/guideController.js';

const router = Router();

// Each request runs several AI model calls, so it's limited per player (not per IP)
const guideLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => req.user.id,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: "You've asked the Game Guide a lot in a short time. Take a breather and try again in a few minutes." },
});

// POST /api/guide/stream — ask the Game Guide (logged-in players only)
router.post('/stream', requireUser, guideLimiter, streamGuide);

export default router;
