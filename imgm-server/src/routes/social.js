/**
 * /api/users — following players and comparing taste (controllers/socialController.js).
 * Mounted after the users router at the same address: none of these paths are its own.
 */
import { Router } from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { clientIp } from '../lib/clientIp.js';
import { requireUser } from '../lib/session.js';
import { getFollows, follow, unfollow, getFollowingFeed, getTasteMatch, getCompareGames } from '../controllers/socialController.js';

const router = Router();

// Following is a tap on a profile: plenty for a person, too few to follow everyone with
// a script (each follow puts the follower's name nowhere, but it fills the counts)
const followLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(clientIp(req)),
  message: { error: 'You are following very fast. Please wait a minute.' },
});
const dailyFollowLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(clientIp(req)),
  message: { error: "That's the most follows for today. Come back tomorrow." },
});

router.get('/me/following/reviews', requireUser, getFollowingFeed);
router.get('/:username/follows', getFollows);
router.put('/:username/follow', requireUser, followLimiter, dailyFollowLimiter, follow);
router.delete('/:username/follow', requireUser, followLimiter, unfollow);
router.get('/:username/taste', requireUser, getTasteMatch);
router.get('/:username/compare', getCompareGames);

export default router;
