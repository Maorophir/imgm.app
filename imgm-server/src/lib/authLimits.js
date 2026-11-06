/**
 * Limits per email address on the login server's sensitive routes, on top of Better
 * Auth's own limits per visitor (3 tries in 10 seconds, by clientIp.js).
 *
 * A visitor's address can be faked by calling the server directly instead of through
 * imgm.app, so an address limit alone can't stop someone guessing one player's password
 * from many "addresses", or filling someone's inbox with reset emails. Counting per
 * email can't be dodged that way. The numbers leave plenty for a real player who
 * mistypes.
 */
import { rateLimit } from 'express-rate-limit';

const MINUTE = 60 * 1000;
// Better Auth's paths (below /api/auth) → how many tries per email in how long
const RULES = {
  '/sign-in/email': { windowMs: 15 * MINUTE, limit: 10, message: 'Too many tries for this account. Wait 15 minutes, or reset your password.' },
  '/sign-up/email': { windowMs: 60 * MINUTE, limit: 5, message: 'Too many sign-ups with this email. Try again in an hour.' },
  '/request-password-reset': { windowMs: 60 * MINUTE, limit: 3, message: 'We sent a reset link a moment ago. Check your inbox (and spam), or try again in an hour.' },
  '/send-verification-email': { windowMs: 60 * MINUTE, limit: 3, message: 'We sent the email a moment ago. Check your inbox (and spam), or try again in an hour.' },
};

const emailOf = (req) => String(req.body?.email ?? '').trim().toLowerCase();

const limiters = Object.fromEntries(
  Object.entries(RULES).map(([path, { windowMs, limit, message }]) => [
    path,
    rateLimit({
      windowMs,
      limit,
      keyGenerator: (req) => `${path}:${emailOf(req)}`,
      skip: (req) => req.method !== 'POST' || !emailOf(req),
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      // Better Auth's error shape, so the site shows the message like its own
      handler: (req, res) => res.status(429).json({ code: 'TOO_MANY_REQUESTS', message }),
    }),
  ])
);

// Mounted on /api/auth before Better Auth (req.path is below the mount)
export const authLimits = (req, res, next) => {
  const limiter = limiters[req.path];
  return limiter ? limiter(req, res, next) : next();
};
