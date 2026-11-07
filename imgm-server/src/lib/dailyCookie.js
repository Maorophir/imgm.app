/**
 * The browser's daily game, kept by the server in a signed cookie (imgm_daily), apart
 * from the login. Without it a player could finish the game, log out (or clear the
 * page's storage, or log into another account) and start again knowing the answer,
 * for a "got it in one" (the user's report, 2026-11-07). With it, logged out, the
 * browser shows the game it already played, finished or not.
 *
 * It also says who played it (`owner`: an account's id, or null for a logged-out
 * visitor). Every account starts the day clean (the user's call: two people on one
 * computer only fool themselves), so logging in carries the browser's game over only if
 * a logged-out visitor played it: progress made before logging in is kept.
 *
 * The page still keeps its own copy in localStorage: clearing only one of the two
 * changes nothing. A private window, another device or wiping all the site's data
 * still starts fresh; only logged-in players count in today's results anyway.
 *
 * Signed (HMAC with the server's secret) so a player can't write their own game into
 * it. Only the day, the guesses (IGDB ids, 0 = a skip) and who played them are in it,
 * never the answer.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const NAME = 'imgm_daily';
const MAX_AGE = 2 * 24 * 60 * 60 * 1000; // a new day's game ignores it anyway
const SECRET = process.env.BETTER_AUTH_SECRET || 'local-development-daily-cookie';

const sign = (payload) => createHmac('sha256', SECRET).update(`daily-game:${payload}`).digest('base64url');

const cookieValue = (req) =>
  (req.headers.cookie ?? '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${NAME}=`))
    ?.slice(NAME.length + 1);

/** This browser's game for `day`: { guesses, owner }, or null (no cookie, another day, or
 * tampered with). */
export const readBrowserGame = (req, day) => {
  const raw = cookieValue(req);
  if (!raw) return null;
  const [payload, signature] = decodeURIComponent(raw).split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const game = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return game?.day === day && Array.isArray(game.guesses) ? { guesses: game.guesses, owner: game.owner ?? null } : null;
  } catch {
    return null;
  }
};

/** Remembers this browser's game for `day`, and who played it (an account's id, or null). */
export const writeBrowserGame = (res, day, guesses, owner = null) => {
  const payload = Buffer.from(JSON.stringify({ day, guesses, owner })).toString('base64url');
  res.cookie(NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/daily',
    maxAge: MAX_AGE,
  });
};
