/**
 * CDN cache — lets Vercel's CDN keep a copy of a public API answer for a short while,
 * so the first visitor after a quiet spell doesn't wait for this server (Render's free
 * plan sleeps) and everyone else gets the answer from the edge.
 *
 * Only for answers that are the same for every visitor: never on anything that reads
 * the session (req.user), a player's own votes or their Backlog. Vercel's cache key is
 * the URL (with its query string), not the visitor, so a per-visitor answer would be
 * handed to everyone.
 *
 * Browsers still ask every time (max-age=0); only Vercel keeps the copy, and it serves
 * a stale copy while it fetches a fresh one in the background. Call it on the success
 * path only: errors must never be kept.
 *
 * Vercel only honours these headers on a rewrite to another server (imgm.app/api/* →
 * Render) because imgm-client/vercel.json sends x-vercel-enable-rewrite-caching: 1.
 * https://vercel.com/docs/routing/rewrites#caching-rewrites-to-external-origins
 */

// Cache this response at Vercel for `maxAge` seconds, then serve it stale for up to
// `staleWhileRevalidate` more seconds while a fresh copy is fetched
export const cacheAtEdge = (res, { maxAge = 60, staleWhileRevalidate = 86400 } = {}) => {
  // For the browser: always check back (Vercel's own default value)
  res.set('Cache-Control', 'public, max-age=0, must-revalidate');
  // For Vercel's cache only. It wins over Cache-Control there, and Vercel removes it
  // before the answer goes on, so neither browsers nor any other CDN act on it
  // (https://vercel.com/docs/caching/cache-control-headers#behavior)
  res.set('Vercel-CDN-Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`);
  // A shared copy mustn't carry anything about the visitor who happened to ask first:
  // the rate limiter's headers hold their remaining quota and a hash of their key
  res.removeHeader('RateLimit');
  res.removeHeader('RateLimit-Policy');
};
