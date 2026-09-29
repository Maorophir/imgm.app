/**
 * Environment-driven configuration.
 *
 * Anything that differs between local dev and production lives here,
 * read from environment variables with local-dev defaults.
 */
import 'dotenv/config';

/**
 * Browser origins allowed to call the API with credentials (CORS + Better Auth).
 * Comma-separated in the env, e.g. CLIENT_ORIGINS="https://imgm.app,https://www.imgm.app"
 */
export const clientOrigins = (process.env.CLIENT_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
