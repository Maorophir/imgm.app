/**
 * Steam login — connecting a Steam account to an IMGM account, and logging in with it
 * afterwards. A Better Auth plugin (registered in auth.js), so it gets Better Auth's own
 * session cookies, origin checks and one-time tokens; its routes live at /api/auth/steam/*:
 *
 *   POST /steam/link      a logged-in player starts connecting Steam → { url }
 *   POST /steam/sign-in   someone starts logging in with Steam → { url }
 *   POST /steam/sign-up   someone new starts signing up with Steam → { url }
 *   GET  /steam/sign-up/pending  is a Steam sign-up waiting for an email? → { pending }
 *   POST /steam/sign-up/finish   the email: makes the account and logs in → { returnTo }
 *   GET  /steam/callback  Steam sends the player back here; always answers with a redirect
 *   POST /steam/unlink    disconnects Steam (and deletes the library imported from it)
 *
 * It uses Steam's official "Sign in through Steam" (OpenID 2.0): the player logs in on
 * steamcommunity.com, and Steam sends back a signed note saying which Steam account it
 * was (the SteamID64). IMGM never sees a Steam password, email or anything else.
 *
 * That note is only trusted after every check below, because the classic Steam login
 * bugs all come from skipping one (steam-fake-openid-provider, GHSA-hhw9-35p2-q2c5):
 *   - the note is checked with Steam itself, always at the fixed address below (never at
 *     an address the note names), and its answer is read strictly
 *   - it must be for this exact trip (its return address carries a random state, which
 *     must match a signed cookie and a one-time record made when the trip started), so a
 *     note made for another site, or for someone else's browser, is useless here
 *   - each note works once (its nonce is reserved before Steam is asked) and only fresh
 *   - its fields, keys and the SteamID64 are checked to the letter
 *
 * Steam gives no email, so Steam alone never makes an IMGM account. Signing up with Steam
 * keeps the Steam account for a while, and the player gives an email on /signup/steam;
 * like an email sign-up, that email is confirmed later. Logging in with Steam works for
 * a player who signed up that way, or connected it from a recent login with a confirmed
 * email; with a Steam account new to IMGM, it signs up instead.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import {
  APIError,
  createAuthEndpoint,
  createAuthMiddleware,
  createEmailVerificationToken,
  formCsrfMiddleware,
  freshSessionMiddleware,
  getSessionFromCtx,
  sensitiveSessionMiddleware,
} from 'better-auth/api';
import { expireCookie, setSessionCookie } from 'better-auth/cookies';
import { generateRandomString } from 'better-auth/crypto';
import { clientOrigins } from './config.js';
import { sendEmail, steamConnectedEmail } from './email.js';
import { STEAM_ISSUER, STEAM_PROVIDER, disconnectSteam } from './steamAccount.js';

// Steam's OpenID address: where the player logs in, and the only place a note is checked
const STEAM_LOGIN = 'https://steamcommunity.com/openid/login';
const OPENID_NS = 'http://specs.openid.net/auth/2.0';
const IDENTIFIER_SELECT = `${OPENID_NS}/identifier_select`;

// Every field Steam's note has, and exactly which of them its signature covers
const NOTE_KEYS = ['ns', 'mode', 'op_endpoint', 'claimed_id', 'identity', 'return_to', 'response_nonce', 'assoc_handle', 'signed', 'sig']
  .map((key) => `openid.${key}`);
const SIGNED_FIELDS = 'signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle';
// Printable ASCII only: no spaces, control characters or bytes a check could read differently
const PRINTABLE = /^[\x21-\x7e]{1,2048}$/;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

// A Steam account's identity: https only, the exact host, 17 digits and nothing after
const CLAIMED_ID = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;
// The range of real individual SteamID64s (universe 1, individual accounts)
const STEAM_ID_FIRST = 76561197960265729n;
const STEAM_ID_LAST = 76561202255233023n;

// "2026-10-18T20:15:02Z" + up to 235 unique characters
const NONCE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z[\x21-\x7e]{0,235}$/;
const NONCE_MAX_AGE = 5 * 60 * 1000;
const NONCE_MAX_AHEAD = 60 * 1000; // a little clock difference with Steam
const NONCE_KEPT = 15 * 60 * 1000; // a used nonce is remembered for longer than it could be accepted

// How long a trip to Steam may take (logging in there can need a Steam Guard code)
const TRIP_MS = 10 * 60 * 1000;
const TRIP_SECONDS = TRIP_MS / 1000;
// How long a new player has, back from Steam, to give an email and finish signing up
const SIGN_UP_MS = 30 * 60 * 1000;
const SIGN_UP_SECONDS = SIGN_UP_MS / 1000;

// Where a connection made from IMGM comes back to
const LINK_RETURNS = ['/steam', '/steam/library', '/settings'];
// Where a Steam login may land: a path on IMGM (one slash, then printable characters,
// no backslash), never another site
const SIGN_IN_RETURN = /^\/(?![/\\])[\x21-\x7e]{0,511}$/;
const signInReturn = (path) => (typeof path === 'string' && SIGN_IN_RETURN.test(path) && !path.includes('\\') ? path : '/');

const sha256 = (text) => createHash('sha256').update(text).digest('hex');

// Equal strings, compared in constant time
const sameText = (a, b) => {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
};

/* ── Reading Steam's note (pure, exported for tests) ─────────────────────────── */

/**
 * The callback's query string as a Map, or null when any key appears twice (a repeated
 * key is how a check can be made to read one value while Steam signed another).
 */
export const readCallbackQuery = (search) => {
  const query = new Map();
  for (const [key, value] of new URLSearchParams(search)) {
    if (query.has(key)) return null;
    query.set(key, value);
  }
  return query;
};

// The 17-digit SteamID64 inside a claimed_id, or null. Kept as a string: it's too wide
// for a JavaScript number.
export const steamIdFrom = (claimedId) => {
  const match = CLAIMED_ID.exec(claimedId ?? '');
  if (!match) return null;
  const id = BigInt(match[1]);
  return id >= STEAM_ID_FIRST && id <= STEAM_ID_LAST ? match[1] : null;
};

// Is the nonce well formed, a real date, and recent?
export const freshNonce = (nonce, now = Date.now()) => {
  const match = NONCE.exec(nonce ?? '');
  if (!match) return false;
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
  const time = Date.UTC(year, month - 1, day, hour, minute, second);
  const when = new Date(time);
  // Date.UTC rolls an impossible date (Feb 30) over; a real one survives the round trip
  if (when.getUTCFullYear() !== year || when.getUTCMonth() !== month - 1 || when.getUTCDate() !== day
    || when.getUTCHours() !== hour || when.getUTCMinutes() !== minute || when.getUTCSeconds() !== second) return false;
  return now - time <= NONCE_MAX_AGE && time - now <= NONCE_MAX_AHEAD;
};

/**
 * Steam's note, read without trusting anything in it yet: { steamId } when it is
 * well formed and made for `expectedReturnTo`, else { error: 'cancelled' | 'invalid' }.
 * It still has to be confirmed by Steam (confirmWithSteam).
 */
export const readSteamNote = (query, expectedReturnTo, now = Date.now()) => {
  if (query.get('openid.mode') === 'cancel') return { error: 'cancelled' };
  for (const key of query.keys()) {
    if (key.startsWith('openid.') && !NOTE_KEYS.includes(key)) return { error: 'invalid' };
  }
  if (!NOTE_KEYS.every((key) => PRINTABLE.test(query.get(key) ?? ''))) return { error: 'invalid' };
  const field = (key) => query.get(`openid.${key}`);
  if (field('ns') !== OPENID_NS || field('mode') !== 'id_res' || field('op_endpoint') !== STEAM_LOGIN) return { error: 'invalid' };
  if (field('signed') !== SIGNED_FIELDS || !BASE64.test(field('sig'))) return { error: 'invalid' };
  // Made for this trip and this site: Steam signs any return address it's given
  if (field('return_to') !== expectedReturnTo) return { error: 'invalid' };
  if (field('claimed_id') !== field('identity')) return { error: 'invalid' };
  const steamId = steamIdFrom(field('claimed_id'));
  if (!steamId || !freshNonce(field('response_nonce'), now)) return { error: 'invalid' };
  return { steamId, nonce: field('response_nonce') };
};

/**
 * Steam's answer to "is this note yours?" (OpenID key-value form), read strictly:
 * "\n"-separated lines, no trimming, no repeated keys, the 2.0 namespace and exactly
 * is_valid:true. Anything else is a no.
 */
export const readSteamAnswer = (text) => {
  const lines = String(text).split('\n');
  if (lines.at(-1) === '') lines.pop();
  const fields = new Map();
  for (const line of lines) {
    const colon = line.indexOf(':');
    if (colon < 1) return false;
    const key = line.slice(0, colon);
    if (fields.has(key)) return false;
    fields.set(key, line.slice(colon + 1));
  }
  return fields.get('ns') === OPENID_NS && fields.get('is_valid') === 'true';
};

// Asks Steam itself whether it wrote the note (at the fixed address, following no redirect)
const confirmWithSteam = async (query) => {
  const body = new URLSearchParams();
  for (const key of NOTE_KEYS) body.set(key, query.get(key));
  body.set('openid.mode', 'check_authentication');
  const response = await fetch(STEAM_LOGIN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'text/plain' },
    body,
    redirect: 'manual',
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status !== 200) return false;
  const text = await response.text();
  return text.length <= 4096 && readSteamAnswer(text);
};

/* ── The plugin ─────────────────────────────────────────────────────────────── */

const stepError = (status, code, message) => APIError.from(status, { code, message });

export const steam = () => {
  // The short-lived cookie that ties Steam's answer to the browser that went to Steam
  // (signed; SameSite=Lax, so it comes back on Steam's redirect)
  const tripCookie = (ctx) => ctx.context.createAuthCookie('steam_state', { maxAge: TRIP_SECONDS });
  const callbackUrl = (ctx, state) => `${ctx.context.baseURL}/steam/callback?state=${state}`;

  // Starts a trip to Steam: a one-time record of what it's for, the cookie, and Steam's
  // sign-in address to send the player to. Addresses come from BETTER_AUTH_URL only.
  const startTrip = async (ctx, trip) => {
    const state = generateRandomString(32); // a-z A-Z 0-9 - _: travels through Steam unchanged
    await ctx.context.internalAdapter.createVerificationValue({
      identifier: `steam-state:${state}`,
      value: JSON.stringify(trip),
      expiresAt: new Date(Date.now() + TRIP_MS),
    });
    const cookie = tripCookie(ctx);
    await ctx.setSignedCookie(cookie.name, state, ctx.context.secret, cookie.attributes);
    const url = `${STEAM_LOGIN}?${new URLSearchParams({
      'openid.ns': OPENID_NS,
      'openid.mode': 'checkid_setup',
      'openid.return_to': callbackUrl(ctx, state),
      'openid.realm': new URL(ctx.context.baseURL).origin,
      'openid.identity': IDENTIFIER_SELECT,
      'openid.claimed_id': IDENTIFIER_SELECT,
    })}`;
    return ctx.json({ url });
  };

  // Where the callback sends the player: always IMGM's website, at a path from the trip
  const siteUrl = (path, params) => {
    const query = params ? new URLSearchParams(params).toString() : '';
    return `${clientOrigins[0]}${path}${query ? `${path.includes('?') ? '&' : '?'}${query}` : ''}`;
  };

  // Connects the Steam account to the player who started the trip
  const connect = async (ctx, trip, steamId) => {
    const adapter = ctx.context.internalAdapter;
    const failed = (code) => siteUrl(trip.returnTo, { steam_error: code });
    // Still the same player as when the trip began (not logged out, or in as someone else)
    const current = await getSessionFromCtx(ctx, { disableCookieCache: true });
    if (!current?.user || current.user.id !== trip.userId) return failed('session_changed');

    const existing = await adapter.findAccountByKey({ issuer: STEAM_ISSUER, accountId: steamId });
    if (existing) return existing.userId === trip.userId ? siteUrl(trip.returnTo, { steam: 'connected' }) : failed('taken');
    if ((await adapter.findAccounts(trip.userId)).some((account) => account.providerId === STEAM_PROVIDER)) return failed('already_connected');
    try {
      await adapter.createAccount({ userId: trip.userId, providerId: STEAM_PROVIDER, issuer: STEAM_ISSUER, accountId: steamId });
    } catch {
      return failed('taken'); // someone connected the same Steam account a moment earlier (unique issuer + accountId)
    }
    sendEmail({ to: current.user.email, ...steamConnectedEmail(siteUrl('/settings')) }).catch((error) =>
      console.error('Steam connected email failed:', error.message)
    );
    return siteUrl(trip.returnTo, { steam: 'connected' });
  };

  // Logs in the player whose IMGM account this Steam account is connected to
  const logIn = async (ctx, trip, steamId) => {
    const adapter = ctx.context.internalAdapter;
    const failed = (code) => siteUrl('/login', { steam_error: code, ...(trip.returnTo !== '/' && { redirect: trip.returnTo }) });
    const owner = await adapter.findAccountOwnerByKey({ issuer: STEAM_ISSUER, accountId: steamId });
    // A Steam account new to IMGM: logging in with it means signing up (an email next)
    if (!owner) return startSignUp(ctx, trip, steamId);
    if (owner.kind !== 'owned' || owner.account.providerId !== STEAM_PROVIDER) return failed('not_connected');
    const session = await adapter.createSession(owner.user.id);
    if (!session) return failed('failed');
    await setSessionCookie(ctx, { session, user: owner.user });
    return siteUrl(trip.returnTo);
  };

  // The cookie that ties a sign-up waiting for its email to the browser back from Steam
  const signUpCookie = (ctx) => ctx.context.createAuthCookie('steam_signup', { maxAge: SIGN_UP_SECONDS });

  // A new player signing up with Steam: Steam only says which Steam account it is, so
  // IMGM keeps that (a one-time record, for this browser only) while they give an email
  // on /signup/steam. A Steam account that's already connected just logs in.
  // (logIn and startSignUp hand over to each other only when the other one fits, so they
  // never go round in circles)
  const startSignUp = async (ctx, trip, steamId) => {
    const owner = await ctx.context.internalAdapter.findAccountOwnerByKey({ issuer: STEAM_ISSUER, accountId: steamId });
    if (owner) return logIn(ctx, trip, steamId);
    const token = generateRandomString(32);
    await ctx.context.internalAdapter.createVerificationValue({
      identifier: `steam-signup:${token}`,
      value: JSON.stringify({ steamId, returnTo: trip.returnTo }),
      expiresAt: new Date(Date.now() + SIGN_UP_MS),
    });
    const cookie = signUpCookie(ctx);
    await ctx.setSignedCookie(cookie.name, token, ctx.context.secret, cookie.attributes);
    return siteUrl('/signup/steam', trip.returnTo !== '/' ? { redirect: trip.returnTo } : undefined);
  };

  // The "Confirm my email" welcome an email sign-up gets (auth.js sends it), with the
  // same one-time link; confirming lands on the website, like an email sign-up's
  const sendConfirmEmail = async (ctx, user) => {
    const { expiresIn, sendVerificationEmail } = ctx.context.options.emailVerification;
    const token = await createEmailVerificationToken(ctx.context.secret, user.email, undefined, expiresIn);
    const url = `${ctx.context.baseURL}/verify-email?token=${token}&callbackURL=${encodeURIComponent(siteUrl('/', { verified: 1 }))}`;
    await sendVerificationEmail({ user, url, token }, ctx.request);
  };

  // What each kind of trip does once Steam's answer has passed every check
  const FINISH = { link: connect, 'sign-in': logIn, 'sign-up': startSignUp };

  // Steam's redirect back: every check, then connect or log in. Answers with an address.
  const finishTrip = async (ctx) => {
    const adapter = ctx.context.internalAdapter;
    const expired = siteUrl('/login', { steam_error: 'expired' });

    const cookie = tripCookie(ctx);
    const cookieState = await ctx.getSignedCookie(cookie.name, ctx.context.secret);
    expireCookie(ctx, cookie);

    const query = readCallbackQuery(new URL(ctx.request?.url ?? 'http://invalid/').search);
    if (!query) return siteUrl('/login', { steam_error: 'invalid' });
    const state = query.get('state');
    // A used nonce is burned on every path, so a note seen anywhere can't be tried again
    const nonce = query.get('openid.response_nonce');
    const burnNonce = () =>
      typeof nonce === 'string' && PRINTABLE.test(nonce)
        ? adapter.reserveVerificationValue({
            identifier: `steam-nonce:${sha256(`${STEAM_LOGIN}:${nonce}`)}`,
            value: '1',
            expiresAt: new Date(Date.now() + NONCE_KEPT),
          })
        : Promise.resolve(false);

    if (!state || typeof cookieState !== 'string' || !sameText(state, cookieState)) {
      await burnNonce();
      return expired;
    }
    const record = await adapter.consumeVerificationValue(`steam-state:${state}`); // once only
    if (!record) {
      await burnNonce();
      return expired;
    }
    const trip = JSON.parse(record.value);
    const failed = (code) =>
      trip.mode === 'link'
        ? siteUrl(trip.returnTo, { steam_error: code })
        : siteUrl('/login', {
          ...(trip.mode === 'sign-up' && { mode: 'signup' }), // back to the Sign up tab
          steam_error: code,
          ...(trip.returnTo !== '/' && { redirect: trip.returnTo }),
        });

    const note = readSteamNote(query, callbackUrl(ctx, state));
    if (note.error) {
      await burnNonce();
      return failed(note.error);
    }
    if (!(await burnNonce())) return failed('invalid'); // this note was already used
    let confirmed;
    try {
      confirmed = await confirmWithSteam(query);
    } catch (error) {
      console.error('Steam login check failed:', error.name); // never the query: it's a login note
      return failed('failed');
    }
    if (!confirmed) return failed('invalid');

    return FINISH[trip.mode](ctx, trip, note.steamId);
  };

  return {
    id: 'steam',
    endpoints: {
      // A logged-in player connects Steam: needs a confirmed email and a recent login
      // (so a stolen, old session can't quietly add its own way in)
      steamLink: createAuthEndpoint(
        '/steam/link',
        { method: 'POST', body: z.object({ returnTo: z.string().max(64) }), use: [freshSessionMiddleware], metadata: { noStore: true } },
        async (ctx) => {
          const { user } = ctx.context.session;
          if (!LINK_RETURNS.includes(ctx.body.returnTo)) throw stepError('BAD_REQUEST', 'INVALID_RETURN_TO', 'Unknown page to return to');
          if (!user.emailVerified) throw stepError('FORBIDDEN', 'EMAIL_NOT_VERIFIED', 'Confirm your email first.');
          const accounts = await ctx.context.internalAdapter.findAccounts(user.id);
          if (accounts.some((account) => account.providerId === STEAM_PROVIDER)) {
            throw stepError('CONFLICT', 'STEAM_ALREADY_CONNECTED', 'Steam is already connected.');
          }
          return startTrip(ctx, { mode: 'link', userId: user.id, returnTo: ctx.body.returnTo });
        }
      ),

      // Logging in with Steam (form-CSRF checked: only IMGM's own pages can start it)
      steamSignIn: createAuthEndpoint(
        '/steam/sign-in',
        { method: 'POST', body: z.object({ returnTo: z.string().max(512).optional() }), use: [formCsrfMiddleware], metadata: { noStore: true } },
        (ctx) => startTrip(ctx, { mode: 'sign-in', userId: null, returnTo: signInReturn(ctx.body.returnTo) })
      ),

      // Signing up with Steam (form-CSRF checked, like logging in). Steam's answer
      // leads to /signup/steam, where the player gives an email.
      steamSignUp: createAuthEndpoint(
        '/steam/sign-up',
        { method: 'POST', body: z.object({ returnTo: z.string().max(512).optional() }), use: [formCsrfMiddleware], metadata: { noStore: true } },
        (ctx) => startTrip(ctx, { mode: 'sign-up', userId: null, returnTo: signInReturn(ctx.body.returnTo) })
      ),

      // Is a Steam sign-up waiting for this browser's email? (/signup/steam shows the
      // email form, or "start again" when it's gone)
      steamSignUpPending: createAuthEndpoint(
        '/steam/sign-up/pending',
        { method: 'GET', metadata: { noStore: true } },
        async (ctx) => {
          const token = await ctx.getSignedCookie(signUpCookie(ctx).name, ctx.context.secret);
          const record = typeof token === 'string' ? await ctx.context.internalAdapter.findVerificationValue(`steam-signup:${token}`) : null;
          return ctx.json({ pending: Boolean(record && record.expiresAt > new Date()) });
        }
      ),

      // Finishing a Steam sign-up with an email: makes the account with Steam connected,
      // and logs in. Like an email sign-up, the email is confirmed later (the welcome
      // email has the button), so nothing waits for it. Someone who signs up with
      // another person's email loses Steam when the owner resets the password (auth.js).
      steamSignUpFinish: createAuthEndpoint(
        '/steam/sign-up/finish',
        { method: 'POST', body: z.object({ email: z.email().max(254) }), use: [formCsrfMiddleware], metadata: { noStore: true } },
        async (ctx) => {
          const adapter = ctx.context.internalAdapter;
          const cookie = signUpCookie(ctx);
          const token = await ctx.getSignedCookie(cookie.name, ctx.context.secret);
          const identifier = `steam-signup:${token}`;
          // Taken now, so two tries at once can't both use it; put back below when only
          // the email was the problem (they can try another)
          const record = typeof token === 'string' ? await adapter.consumeVerificationValue(identifier) : null;
          if (!record) {
            expireCookie(ctx, cookie);
            throw stepError('BAD_REQUEST', 'STEAM_SIGN_UP_EXPIRED', 'That took a little too long. Please sign up with Steam again.');
          }
          const { steamId, returnTo } = JSON.parse(record.value);
          const email = ctx.body.email.toLowerCase();

          if (await adapter.findUserByEmail(email)) {
            await adapter.createVerificationValue({ identifier, value: record.value, expiresAt: record.expiresAt });
            throw stepError('CONFLICT', 'EMAIL_TAKEN', 'That email already has an IMGM account. Log in, then connect Steam in Settings.');
          }
          expireCookie(ctx, cookie);
          if (await adapter.findAccountOwnerByKey({ issuer: STEAM_ISSUER, accountId: steamId })) {
            throw stepError('CONFLICT', 'STEAM_TAKEN', 'That Steam account is already on IMGM. Log in with Steam.');
          }

          let user;
          try {
            // The account and its Steam login together (one transaction: never one without the other)
            ({ user } = await adapter.createOAuthUser(
              { email, name: email.split('@')[0], emailVerified: false }, // the same name an email sign-up gets
              { providerId: STEAM_PROVIDER, issuer: STEAM_ISSUER, accountId: steamId }
            ));
          } catch {
            // The same email or Steam account signed up a moment earlier (both are unique)
            throw stepError('CONFLICT', 'STEAM_SIGN_UP_CLASH', 'That email or Steam account was just used to sign up. Try logging in.');
          }
          sendConfirmEmail(ctx, user).catch((error) => console.error('Steam sign-up confirm email failed:', error.message));

          const session = await adapter.createSession(user.id);
          await setSessionCookie(ctx, { session, user });
          return ctx.json({ returnTo });
        }
      ),

      // Steam sends the player back here. Always a redirect to the website (never an
      // error page), with no-store and no referrer (the address carries the login note).
      steamCallback: createAuthEndpoint(
        '/steam/callback',
        { method: 'GET', metadata: { noStore: true } },
        async (ctx) => {
          ctx.setHeader('Referrer-Policy', 'no-referrer');
          let target;
          try {
            target = await finishTrip(ctx);
          } catch (error) {
            console.error('Steam login failed:', error.message);
            target = siteUrl('/login', { steam_error: 'failed' });
          }
          throw ctx.redirect(target);
        }
      ),

      // Disconnects Steam: the login and everything imported from it. Reviews and the
      // Backlog stay. Refused if Steam were somehow the player's only way to log in.
      steamUnlink: createAuthEndpoint(
        '/steam/unlink',
        { method: 'POST', use: [sensitiveSessionMiddleware], metadata: { noStore: true } },
        async (ctx) => {
          const { user } = ctx.context.session;
          const accounts = await ctx.context.internalAdapter.findAccounts(user.id);
          const steamAccounts = accounts.filter((account) => account.providerId === STEAM_PROVIDER);
          if (steamAccounts.length > 0 && steamAccounts.length === accounts.length) {
            throw stepError('BAD_REQUEST', 'LAST_LOGIN_METHOD', 'Add a password or Google first.');
          }
          await disconnectSteam(user.id);
          return ctx.json({ status: true });
        }
      ),
    },

    hooks: {
      before: [
        {
          // Better Auth's own "unlink account" must never leave Steam as a player's only
          // way in (a Steam account can't get an IMGM account back: there's no email)
          matcher: (ctx) => ctx.path === '/unlink-account',
          handler: createAuthMiddleware(async (ctx) => {
            const session = await getSessionFromCtx(ctx);
            if (!session) return; // the route itself answers 401
            const accounts = await ctx.context.internalAdapter.findAccounts(session.user.id);
            // Steam itself is disconnected only through /steam/unlink, which also deletes its library
            if (accounts.find((account) => account.id === ctx.body?.accountId)?.providerId === STEAM_PROVIDER) {
              throw stepError('BAD_REQUEST', 'USE_STEAM_UNLINK', 'Disconnect Steam from Settings.');
            }
            const left = accounts.filter((account) => account.id !== ctx.body?.accountId); // its accountId is the row's id
            if (left.length > 0 && left.every((account) => account.providerId === STEAM_PROVIDER)) {
              throw stepError('BAD_REQUEST', 'STEAM_CANNOT_BE_ONLY_LOGIN', 'Keep a password or Google connected.');
            }
          }),
        },
      ],
    },

    // Better Auth applies these in production (per visitor, in memory)
    rateLimit: [{ pathMatcher: (path) => path.startsWith('/steam/'), window: 60, max: 10 }],
  };
};
