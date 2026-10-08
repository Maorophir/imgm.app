import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { requireUser, getSessionUser } from '../lib/session.js';
import { canUsePlayNext } from '../lib/config.js';
import { streamGuide, wakeGuide } from '../controllers/guideController.js';
import { listChats, getChat, saveChat, deleteChat } from '../controllers/playNextChatsController.js';

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

// Before launch, only beta players may use it; for everyone else it doesn't exist (404)
const playNextAccess = (req, res, next) =>
  canUsePlayNext(req.user.id) ? next() : res.status(404).json({ error: 'Not found' });

// GET /api/guide/access — may the current visitor use Play Next? (the website asks)
router.get('/access', async (req, res) => {
  const user = await getSessionUser(req).catch(() => null);
  res.json({ enabled: Boolean(user && canUsePlayNext(user.id)) });
});

// Chat history (see playNextChatsController.js)
const historyLimiter = limit(60 * 1000, 60, 'Too many requests. Please slow down.');
router.get('/chats', requireUser, playNextAccess, historyLimiter, listChats);
router.get('/chats/:id', requireUser, playNextAccess, historyLimiter, getChat);
router.put('/chats/:id', requireUser, playNextAccess, historyLimiter, saveChat);
router.delete('/chats/:id', requireUser, playNextAccess, historyLimiter, deleteChat);

// POST /api/guide/wake — the page opened: wake the AI service up early
router.post('/wake', requireUser, playNextAccess, wakeGuide);

// POST /api/guide/stream — ask Play Next (logged-in players with access only)
router.post('/stream', requireUser, playNextAccess, oneAtATime, burstLimiter, dailyLimiter, streamGuide);

export default router;
