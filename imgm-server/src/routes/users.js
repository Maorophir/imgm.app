import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { checkUsername, setUsername, getMyProgress } from '../controllers/usersController.js';

const router = Router();

// The availability check runs as people type — generous, but not unlimited
const checkLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many checks — please wait a moment.' },
});

// GET /api/users/username-available?name=… — is this gamer tag free?
router.get('/username-available', checkLimiter, checkUsername);

// PUT /api/users/me/username — choose or change your gamer tag
router.put('/me/username', setUsername);

// GET /api/users/me/progress — your XP and review count
router.get('/me/progress', getMyProgress);

export default router;
