/**
 * Who is logged in? Shared by every route that needs the current user.
 */
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from './auth.js';
import { prisma } from './db.js';
import { recordActivity } from './activity.js';

// Returns the logged-in user (from the session cookie), or null. Also counts the day
// for the admin stats (activity.js: once a day per player, no database write after that).
export const getSessionUser = async (req) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  recordActivity(session?.user?.id);
  return session?.user ?? null;
};

/**
 * Route guard: only logged-in players get through, available as req.user.
 */
export const requireUser = async (req, res, next) => {
  const user = await getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Log in to use this feature.' });
  }
  req.user = user;
  next();
};

/**
 * Route guard for the admin pages (router.use it): only an admin gets through. Everyone
 * else, logged in or not, falls through to Express's own "Cannot GET" 404, exactly like
 * an address that doesn't exist, so the area never admits it's there. The role is read
 * from the database, not the session, so taking it away works at once.
 */
export const requireAdmin = async (req, res, next) => {
  const user = await getSessionUser(req).catch(() => null);
  const role = user && (await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } }))?.role;
  if (role !== 'admin') return next('router');
  req.user = user;
  next();
};
