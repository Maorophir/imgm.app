import { Router } from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { getSessionUser, requireUser } from '../lib/session.js';
import { canUseDiscover, discoverEnabled } from '../lib/config.js';
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

// Before launch, only beta players may vote; for everyone else it doesn't exist (404)
const discoverAccess = (req, res, next) =>
  canUseDiscover(req.user.id) ? next() : res.status(404).json({ error: 'Not found' });

// GET /api/discover/access — may the current visitor use Discover? (the website asks)
// Launched (DISCOVER=on): everyone, logged out too. Before that: only the beta players.
router.get('/access', async (req, res) => {
  if (discoverEnabled) return res.json({ enabled: true });
  const user = await getSessionUser(req).catch(() => null);
  res.json({ enabled: Boolean(user && canUseDiscover(user.id)) });
});

router.get('/votes', getVotes); // ?ids=1,2,3: counts, and your own vote
router.put('/votes/:gameId', requireUser, discoverAccess, voteLimiter, setVote); // { value: 1 | -1 | 0 }

export default router;
