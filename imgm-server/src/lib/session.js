/**
 * Who is logged in? Shared by every route that needs the current user.
 */
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from './auth.js';

// Returns the logged-in user (from the session cookie), or null
export const getSessionUser = async (req) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  return session?.user ?? null;
};
