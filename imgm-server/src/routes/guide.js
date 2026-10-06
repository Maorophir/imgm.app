import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { requireUser } from '../lib/session.js';
import { streamGuide } from '../controllers/guideController.js';

const router = Router();

// One question at a time per player: a new one is refused while the last is still
// running (each run is several AI calls). The slot frees when the response closes,
// whether it finished, failed or the player left.
const running = new Set();
const oneAtATime = (req, res, next) => {
  if (running.has(req.user.id)) {
    return res.status(429).json({ error: 'Play Next is still working on your last question. Give it a moment.' });
  }
  running.add(req.user.id);
  res.on('close', () => running.delete(req.user.id));
  next();
};

// Limits are per player (not per IP), since every run costs AI calls
const limit = (windowMs, max, error) =>
  rateLimit({
    windowMs,
    limit: max,
    keyGenerator: (req) => req.user.id,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error },
  });

// Bursts: 10 per 15 minutes
const burstLimiter = limit(15 * 60 * 1000, 10, "You've asked Play Next a lot in a short time. Take a breather and try again in a few minutes.");
// The whole day: 30, so a slow steady stream can't run all day either
const dailyLimiter = limit(24 * 60 * 60 * 1000, 30, "You've reached today's Play Next limit (30 questions). Come back tomorrow!");

// POST /api/guide/stream — ask Play Next (logged-in players only)
router.post('/stream', requireUser, oneAtATime, burstLimiter, dailyLimiter, streamGuide);

export default router;
