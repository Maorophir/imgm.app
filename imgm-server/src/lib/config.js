/**
 * Environment-driven configuration.
 *
 * Anything that differs between local dev and production lives here,
 * read from environment variables with local-dev defaults.
 */
import 'dotenv/config';

export const isProduction = process.env.NODE_ENV === 'production';

// Public beta: reviewers get the "Beta Tester" badge. Set BETA=false at launch.
export const isBeta = process.env.BETA !== 'false';

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
