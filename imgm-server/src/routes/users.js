import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { checkUsername, setUsername, getMyProgress } from '../controllers/usersController.js';
import { uploadAvatar, deleteAvatar, getAvatar, getAvatarPresets, getMyProfile, getMyReviews, getMyAccount, deleteMyAccount } from '../controllers/profileController.js';

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

// Your profile: stats + reviews
router.get('/me/profile', getMyProfile);
router.get('/me/reviews', getMyReviews);

// Your account: how you log in, and deleting it (password changes go through Better Auth)
router.get('/me/account', getMyAccount);
router.delete('/me', deleteMyAccount);

// Profile pictures: upload (checked first), remove, and the picture itself
const pictureLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many picture changes. Try again in an hour.' },
});
router.get('/avatars/presets', getAvatarPresets);
router.put('/me/avatar', pictureLimiter, uploadAvatar);
router.delete('/me/avatar', deleteAvatar);
router.get('/:id/avatar', getAvatar);

export default router;
