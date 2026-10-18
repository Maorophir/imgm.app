/**
 * Steam Web API: the two calls IMGM makes, only when a player asks for their library
 * (connecting Steam, or Refresh), never in the background (Steam's API terms).
 *
 *   GetOwnedGames        the games a player owns, with playtime in minutes
 *   GetPlayerSummaries   just their Steam name (optional: a failure is ignored)
 *
 * The key (STEAM_API_KEY) goes in the x-webapi-key header, never in the address, so it
 * can't end up in a proxy's or a log's list of URLs, and it is never logged. Redirects
 * are refused, so the key can't be carried to another host either.
 *
 * Steam's error answers are HTML pages, not JSON, so the status and content type are
 * checked before reading. A busy or broken Steam (429 / 5xx) gets one more try after a
 * second; anything else (a bad key: 401/403) would only fail again.
 */
import { setTimeout as delay } from 'node:timers/promises';
import { steamApiKey } from '../lib/config.js';

const STEAM_API = 'https://api.steampowered.com';
const OWNED_TIMEOUT = 10 * 1000;  // a big library is a few MB
const SUMMARY_TIMEOUT = 5 * 1000; // only for the name: not worth a long wait
const RETRY_AFTER = 1000;
const STEAM_ID = /^\d{17}$/;      // a SteamID64, kept as a string (it's wider than a JS number)

// Steam is down, busy, timed out, or answered something we can't read.
// The library API turns it into 502 STEAM_UNAVAILABLE.
export class SteamUnavailableError extends Error {
  constructor(message, status = null) {
    super(message);
    this.code = 'STEAM_UNAVAILABLE';
    this.status = status;
  }
}

// GETs one Web API method and returns its `response` object
const steamGet = async (path, params, { timeout, retry }) => {
  if (!steamApiKey) throw new Error('[Steam] STEAM_API_KEY is not set');
  let response;
  try {
    response = await fetch(`${STEAM_API}${path}?${new URLSearchParams(params)}`, {
      headers: { 'x-webapi-key': steamApiKey, Accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(timeout),
    });
  } catch (error) {
    // A timeout or a network failure (the message never includes the address)
    throw new SteamUnavailableError(`[Steam] ${path} failed: ${error.name === 'TimeoutError' ? 'timed out' : error.message}`);
  }

  if (response.status === 429 || response.status >= 500) {
    response.body?.cancel().catch(() => {});
    if (retry) {
      await delay(RETRY_AFTER);
      return steamGet(path, params, { timeout, retry: false });
    }
    throw new SteamUnavailableError(`[Steam] ${path} answered ${response.status}`, response.status);
  }
  if (!response.ok) {
    response.body?.cancel().catch(() => {});
    // 401/403: Steam refused the key itself (revoked, or a typo on Render). Retrying won't help.
    if (response.status === 401 || response.status === 403) {
      console.error(`[Steam] The Web API key was refused (${response.status}): check STEAM_API_KEY`);
    }
    throw new SteamUnavailableError(`[Steam] ${path} answered ${response.status}`, response.status);
  }
  if (!/\bjson\b/i.test(response.headers.get('content-type') ?? '')) {
    response.body?.cancel().catch(() => {});
    throw new SteamUnavailableError(`[Steam] ${path} answered something other than JSON`);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new SteamUnavailableError(`[Steam] ${path} answered unreadable JSON`);
  }
  if (!data || typeof data.response !== 'object' || data.response === null || Array.isArray(data.response)) {
    throw new SteamUnavailableError(`[Steam] ${path} answered an unexpected shape`);
  }
  return data.response;
};

const checkSteamId = (steamId) => {
  if (typeof steamId !== 'string' || !STEAM_ID.test(steamId)) throw new Error('[Steam] Not a SteamID64');
};

/**
 * The games a player owns, exactly as Steam sends them: { game_count, games: [...] },
 * { game_count: 0 } for an empty library, or {} when Steam doesn't share them (the
 * player's "Game details" is Private or Friends only). steamLibrary.js reads it.
 * Free games count once played; unvetted store apps are included (IGDB sorts out junk).
 */
export const getOwnedGames = async (steamId) => {
  checkSteamId(steamId);
  return steamGet(
    '/IPlayerService/GetOwnedGames/v1/',
    { steamid: steamId, include_appinfo: 'true', include_played_free_games: 'true', skip_unvetted_apps: 'false' },
    { timeout: OWNED_TIMEOUT, retry: true }
  );
};

// The player's Steam name as Steam has it (anything the player typed: steamLibrary.js
// cleans it before it's saved), or null. Never throws: the name is only a nicety.
export const getPersonaName = async (steamId) => {
  if (!steamApiKey) return null;
  try {
    checkSteamId(steamId);
    const { players } = await steamGet('/ISteamUser/GetPlayerSummaries/v2/', { steamids: steamId }, { timeout: SUMMARY_TIMEOUT, retry: false });
    const player = Array.isArray(players) ? players.find((p) => p?.steamid === steamId) : null;
    return typeof player?.personaname === 'string' ? player.personaname : null;
  } catch (error) {
    console.error('Steam name lookup failed:', error.message);
    return null;
  }
};
