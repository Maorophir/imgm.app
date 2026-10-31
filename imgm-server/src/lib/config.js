/**
 * Environment-driven configuration.
 *
 * Anything that differs between local dev and production lives here,
 * read from environment variables with local-dev defaults.
 */
import 'dotenv/config';

export const isProduction = process.env.NODE_ENV === 'production';

// In production, refuse to start without real secrets — the dev fallbacks
// (e.g. the placeholder auth secret) would be insecure on a public site
const REQUIRED_IN_PRODUCTION = [
  'DATABASE_URL',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'CLIENT_ORIGINS',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'TWITCH_CLIENT_ID',
  'TWITCH_CLIENT_SECRET',
];

if (isProduction) {
  const missing = REQUIRED_IN_PRODUCTION.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Browser origins allowed to call the API with credentials (CORS + Better Auth).
 * Comma-separated in the env, e.g. CLIENT_ORIGINS="https://imgm.app,https://www.imgm.app"
 */
export const clientOrigins = (process.env.CLIENT_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

/**
 * The AI service (imgm-ai) that runs the Game Guide. Only this server talks to it:
 * it passes the logged-in player's id plus a shared secret (INTERNAL_API_KEY).
 * Locally, docker-compose points this at the service running on the host.
 */
export const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
export const internalApiKey = process.env.INTERNAL_API_KEY || null;

/**
 * Steam's Web API key (steamcommunity.com/dev/apikey, registered by IMGM's owner for
 * imgm.app). It reads a connected player's library and Steam name. Optional: without it,
 * connecting and logging in with Steam still work, and the library page says it isn't
 * switched on yet. Server-only: never send it to the browser or put it in a URL.
 */
const rawSteamKey = (process.env.STEAM_API_KEY || '').trim();
export const steamApiKey = /^[0-9A-F]{32}$/i.test(rawSteamKey) ? rawSteamKey : null;
if (rawSteamKey && !steamApiKey) console.error('STEAM_API_KEY is malformed (expected 32 hex characters): Steam libraries stay off');

/**
 * Play Next (the AI recommender) is OFF on the live site until PLAY_NEXT=on is set
 * on Render (together with AI_SERVICE_URL and INTERNAL_API_KEY). Locally it's on
 * because docker-compose sets AI_SERVICE_URL. Deliberately not tied to NODE_ENV
 * alone, so a missing NODE_ENV can't switch it on by accident.
 * The website has a matching switch: VITE_PLAY_NEXT in Vercel.
 */
export const playNextEnabled =
  process.env.PLAY_NEXT === 'on' || (!isProduction && Boolean(process.env.AI_SERVICE_URL));

/**
 * Play Next's beta: players who get it before launch (comma-separated user ids in
 * PLAY_NEXT_BETA_USERS on Render). Everyone else doesn't see it until PLAY_NEXT=on.
 */
export const playNextBetaUsers = new Set(
  (process.env.PLAY_NEXT_BETA_USERS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
);

export const canUsePlayNext = (userId) => playNextEnabled || playNextBetaUsers.has(userId);

/**
 * Discover (the scrolling feed of games, /discover) is a closed beta on the live site
 * until DISCOVER=on is set on Render: before that, only the players in
 * DISCOVER_BETA_USERS (comma-separated user ids) see it. Local development always has it.
 */
export const discoverEnabled = process.env.DISCOVER === 'on' || !isProduction;
const discoverBetaUsers = new Set(
  (process.env.DISCOVER_BETA_USERS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
);
export const canUseDiscover = (userId) => discoverEnabled || discoverBetaUsers.has(userId);
