import { Router } from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { sendFeedback } from '../controllers/feedbackController.js';

const router = Router();

// POST /api/feedback — 10 messages an hour per visitor is plenty
const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Thanks for all the feedback! Please try again in a bit.' },
});
router.post('/', feedbackLimiter, sendFeedback);

export default router;
