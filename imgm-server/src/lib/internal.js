/**
 * Requests from our own AI service (Play Next), proven by the shared secret it sends
 * in X-Internal-Key. Compared in constant time, so the key can't be guessed by timing.
 */
import { timingSafeEqual } from 'node:crypto';
import { internalApiKey } from './config.js';

export const isInternalRequest = (req) => {
  const given = req.get('X-Internal-Key');
  if (!internalApiKey || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(internalApiKey);
  return a.length === b.length && timingSafeEqual(a, b);
};
