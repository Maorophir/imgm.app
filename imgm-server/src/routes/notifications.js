import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { requireUser } from '../lib/session.js';
import { getNotifications, getUnread, markAllRead, markRead } from '../controllers/notificationsController.js';

const router = Router();

// The bell asks once a minute per open tab: plenty of room for a few tabs, too little
// for a script
const bellLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
  message: { error: 'Too many requests. Please slow down.' },
});

router.use(requireUser, bellLimiter);
router.get('/', getNotifications);
router.get('/unread', getUnread);
router.put('/read-all', markAllRead); // before /:id
router.put('/:id/read', markRead);

export default router;
