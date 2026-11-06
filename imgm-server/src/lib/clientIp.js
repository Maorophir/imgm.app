/**
 * The visitor's own address, for rate limits and the visitor counter.
 *
 * Requests reach this server through Vercel (imgm.app's /api rewrite) and then Render's
 * proxy, so req.ip is a proxy's address, not the visitor's: each Vercel address shared
 * one limit, and Better Auth, seeing several addresses, kept ONE bucket for the whole
 * site (3 logins per 10 seconds for everyone; found before launch, 2026-11-06). Vercel
 * always replaces X-Forwarded-For with the visitor's address before its own hops are
 * added, so the first address there is the visitor's.
 *
 * Someone calling Render directly (not through imgm.app) can put any address first, so
 * the limits that protect accounts also count per email (authLimits.js).
 */
import { isIP } from 'node:net';

export const clientIp = (req) => {
  const first = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
  return isIP(first) ? first : req.ip;
};
