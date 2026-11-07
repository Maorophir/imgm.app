/**
 * The browser's daily game, kept by the server in a signed cookie (imgm_daily), apart
 * from the login. Without it a player could finish the game, log out (or clear the
 * page's storage, or log into another account) and start again knowing the answer,
 * for a "got it in one" (the user's report, 2026-11-07). With it:
 *   - logged out, the browser shows the game it already played, finished or not
 *   - logging into an account with no game today carries this browser's game over
 * The page still keeps its own copy in localStorage: clearing only one of the two
 * changes nothing. A private window, another device or wiping all the site's data
 * still starts fresh; only logged-in players count in today's results anyway.
 *
 * Signed (HMAC with the server's secret) so a player can't write their own game into
 * it. Only the guesses (IGDB ids, 0 = a skip) and the day are in it, never the answer.
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

/** This browser's guesses for `day`, or null (no cookie, another day, or tampered with). */
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
    return game?.day === day && Array.isArray(game.guesses) ? game.guesses : null;
  } catch {
    return null;
  }
};

/** Remembers this browser's guesses for `day`. */
export const writeBrowserGame = (res, day, guesses) => {
  const payload = Buffer.from(JSON.stringify({ day, guesses })).toString('base64url');
  res.cookie(NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/daily',
    maxAge: MAX_AGE,
  });
};
