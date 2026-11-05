import { Router } from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { requireUser } from '../lib/session.js';
import {
  getEmailSettings, putEmailSettings, putRoundupAnswer, unsubscribe, resubscribe,
} from '../controllers/notificationsController.js';

const router = Router();

// Switches flipped by hand: plenty for a person
const settingsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
  message: { error: 'Too many changes. Please wait a minute.' },
});

// The unsubscribe link works without logging in, so it's limited by address (its
// token is unguessable either way)
const linkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  message: { error: 'Too many tries. Please wait a few minutes.' },
});

router.get('/settings', requireUser, getEmailSettings);
router.put('/settings', requireUser, settingsLimiter, putEmailSettings);
router.put('/settings/roundup-question', requireUser, settingsLimiter, putRoundupAnswer);
router.post('/unsubscribe', linkLimiter, unsubscribe);
router.post('/resubscribe', linkLimiter, resubscribe);

export default router;
