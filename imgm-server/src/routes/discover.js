import { Router } from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { getSessionUser, requireUser } from '../lib/session.js';
import { canUseDiscover, discoverEnabled } from '../lib/config.js';
import { getSafariPlaylist, isSteamPlaylist } from '../services/steamTrailers.js';
import {
  getVotes, setVote, getComments, getReplies, postComment, deleteComment, likeComment, reportComment,
} from '../controllers/discoverController.js';

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

// Comments: a few a minute and 60 a day per player (enough to talk, too few to spam);
// reports, 20 an hour
const commentLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip),
  message: { error: 'You are commenting very fast. Please wait a minute.' },
});
const dailyCommentLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip),
  message: { error: "That's the most comments for today. Come back tomorrow." },
});
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip),
  message: { error: 'Too many reports. Please try again later.' },
});

// Safari's trailer playlists: one per swipe, so a generous limit (each is cached)
const playlistLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  message: { error: 'Too many requests. Please slow down.' },
});

// Before launch, only beta players may vote or comment; for everyone else it doesn't exist (404)
const discoverAccess = (req, res, next) =>
  canUseDiscover(req.user.id) ? next() : res.status(404).json({ error: 'Not found' });

// GET /api/discover/access — may the current visitor use Discover? (the website asks)
// Launched (DISCOVER=on): everyone, logged out too. Before that: only the beta players.
router.get('/access', async (req, res) => {
  if (discoverEnabled) return res.json({ enabled: true });
  const user = await getSessionUser(req).catch(() => null);
  res.json({ enabled: Boolean(user && canUseDiscover(user.id)) });
});

// GET /api/discover/stream.m3u8?src=<a Steam trailer's playlist> — the copy Safari plays,
// 480p first (services/steamTrailers.js says why)
router.get('/stream.m3u8', playlistLimiter, async (req, res) => {
  const src = String(req.query.src ?? '');
  if (!isSteamPlaylist(src)) return res.status(400).json({ error: 'Not a Steam trailer' });
  try {
    const text = await getSafariPlaylist(src);
    res.set({ 'Content-Type': 'application/vnd.apple.mpegurl', 'Cache-Control': 'public, max-age=3600' }).send(text);
  } catch (error) {
    console.error('Steam trailer playlist failed:', error.message);
    res.status(502).json({ error: "Couldn't get the trailer" });
  }
});

router.get('/votes', getVotes); // ?ids=1,2,3: counts, and your own vote
router.put('/votes/:gameId', requireUser, discoverAccess, voteLimiter, setVote); // { value: 1 | -1 | 0 }

// Comments (and replies, one level deep): anyone may read them
router.get('/games/:gameId/comments', getComments); // ?page=0
router.get('/comments/:id/replies', getReplies);
router.post('/games/:gameId/comments', requireUser, discoverAccess, commentLimiter, dailyCommentLimiter, postComment); // { body, parentId? }
router.delete('/comments/:id', requireUser, discoverAccess, deleteComment);
router.put('/comments/:id/like', requireUser, discoverAccess, voteLimiter, likeComment); // { liked }
router.post('/comments/:id/report', requireUser, discoverAccess, reportLimiter, reportComment); // { reason? }

export default router;
