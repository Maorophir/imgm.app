/**
 * The Steam library API (/api/steam, logged-in players only). Connecting Steam itself
 * happens on the login server (/api/auth/steam/*); this is what comes after:
 *
 *   GET  /me        is Steam connected, and the library's state
 *   POST /import    ask Steam for the library again (then answers like GET /library)
 *   GET  /library   the library page: games to rate, and apps IMGM can't review
 *
 * Errors carry a code the website knows: NOT_CONNECTED, LIBRARY_OFF (no Steam Web API
 * key on this server), TOO_SOON (5 minutes between imports; 20 seconds after Steam said
 * the games are private), STEAM_UNAVAILABLE.
 */
import { prisma } from '../lib/db.js';
import { steamApiKey } from '../lib/config.js';
import { findSteamId, steamProfileUrl } from '../lib/steamAccount.js';
import { buildLibrary, importLibrary } from '../services/steamLibrary.js';

const IMPORT_COOLDOWN = 5 * 60 * 1000;
// After Steam said the games are private, the player is likely fixing their privacy
// settings right now: "Try again" works again sooner (the route's limiter still applies)
const PRIVATE_COOLDOWN = 20 * 1000;

const ERRORS = {
  NOT_CONNECTED: [404, 'Connect Steam first.'],
  LIBRARY_OFF: [503, "Steam libraries aren't switched on yet."],
  TOO_SOON: [429, 'Your library was updated a moment ago. Please try again in a few minutes.'],
  STEAM_UNAVAILABLE: [502, "Steam isn't answering right now. Please try again in a few minutes."],
};

const fail = (res, code, extra = {}) => {
  const [status, error] = ERRORS[code];
  res.status(status).json({ error, code, ...extra });
};

class TooSoonError extends Error {
  constructor(retryAfter) {
    super('Imported too recently');
    this.code = 'TOO_SOON';
    this.retryAfter = retryAfter;
  }
}

// One import at a time per player: a second click while one runs waits for it and gets
// the same answer (and two can't both slip past the cooldown)
const importing = new Map();

const runImport = async (userId, steamId) => {
  const last = await prisma.steamLibrary.findUnique({ where: { userId }, select: { importedAt: true, state: true } });
  const cooldown = last?.state === 'private' ? PRIVATE_COOLDOWN : IMPORT_COOLDOWN;
  const wait = last ? cooldown - (Date.now() - last.importedAt.getTime()) : 0;
  if (wait > 0) throw new TooSoonError(Math.ceil(wait / 1000));
  await importLibrary(userId, { steamId });
};

// GET /api/steam/me
export const getSteamStatus = async (req, res) => {
  try {
    const steamId = await findSteamId(req.user.id);
    const library = steamId
      ? await prisma.steamLibrary.findUnique({
          where: { userId: req.user.id },
          select: { state: true, gameCount: true, hoursHidden: true, personaName: true, importedAt: true },
        })
      : null;
    res.json({
      connected: Boolean(steamId),
      steamId,
      profileUrl: steamId ? steamProfileUrl(steamId) : null,
      libraryEnabled: Boolean(steamApiKey),
      library,
    });
  } catch (error) {
    console.error('Error reading the Steam connection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/steam/import
export const importSteamLibrary = async (req, res) => {
  const userId = req.user.id;
  try {
    const steamId = await findSteamId(userId);
    if (!steamId) return fail(res, 'NOT_CONNECTED');
    if (!steamApiKey) return fail(res, 'LIBRARY_OFF');

    let job = importing.get(userId);
    if (!job) {
      job = runImport(userId, steamId).finally(() => importing.delete(userId));
      importing.set(userId, job);
    }
    await job;
    const library = await buildLibrary(userId, { steamId });
    if (!library) return fail(res, 'NOT_CONNECTED');
    res.json(library);
  } catch (error) {
    if (error.code === 'TOO_SOON') {
      res.set('Retry-After', String(error.retryAfter));
      return fail(res, 'TOO_SOON', { retryAfter: error.retryAfter });
    }
    if (error.code === 'NOT_CONNECTED') return fail(res, 'NOT_CONNECTED'); // disconnected meanwhile
    if (error.code === 'STEAM_UNAVAILABLE') {
      console.error('Steam library import failed:', error.message);
      return fail(res, 'STEAM_UNAVAILABLE');
    }
    console.error('Error importing a Steam library:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/steam/library
export const getSteamLibrary = async (req, res) => {
  try {
    const library = await buildLibrary(req.user.id);
    if (!library) return fail(res, 'NOT_CONNECTED');
    res.json(library);
  } catch (error) {
    console.error('Error loading a Steam library:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
