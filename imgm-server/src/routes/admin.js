/**
 * /api/admin — the admin pages' data: stats and moderation. Every route is behind
 * requireAdmin: anyone who isn't an admin gets the same 404 as an address that doesn't
 * exist (session.js).
 */
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { requireAdmin } from '../lib/session.js';
import {
  getStats, listReports, listComments, listReviews, setCommentHidden, deleteComment, deleteReview,
} from '../controllers/adminController.js';

const router = Router();

router.use(requireAdmin);
// One person clicking through tabs: plenty. A stolen session still can't sweep the site.
router.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
  message: { error: 'Too many requests. Please wait a minute.' },
}));

router.get('/stats', getStats);
router.get('/reports', listReports);
router.get('/comments', listComments); // ?q=
router.get('/reviews', listReviews); // ?q=
router.put('/comments/:id/hidden', setCommentHidden); // { hidden, note? }
router.delete('/comments/:id', deleteComment); // { note? }
router.delete('/reviews/:id', deleteReview); // { note? }

export default router;
