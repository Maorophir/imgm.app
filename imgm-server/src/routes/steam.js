import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { requireUser } from '../lib/session.js';
import { getSteamStatus, importSteamLibrary, getSteamLibrary } from '../controllers/steamController.js';

const router = Router();

// A player's own Steam data: never kept by a browser or the CDN (every answer, errors
// and the logged-out 401 included, so this comes first)
router.use((req, res, next) => {
  res.set('Cache-Control', 'private, no-store');
  next();
});

// Limits are per player (not per IP): each import calls Steam, and maybe IGDB
const limit = (windowMs, max, error) =>
  rateLimit({
    windowMs,
    limit: max,
    keyGenerator: (req) => req.user.id,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error },
  });

// Besides the 5 minutes between imports (counted from the last one), this caps retries
// after Steam failed: 10 tries per 15 minutes
const importLimiter = limit(15 * 60 * 1000, 10, 'Too many tries. Please wait a few minutes and try again.');
const readLimiter = limit(60 * 1000, 60, 'Too many requests. Please slow down.');

router.get('/me', requireUser, readLimiter, getSteamStatus);
router.get('/library', requireUser, readLimiter, getSteamLibrary);
router.post('/import', requireUser, importLimiter, importSteamLibrary);

export default router;
