/**
 * Where to go next, from a ?redirect=/some/page link (defaults to home).
 * Only pages on OUR site are allowed: anything else would let a link like
 * imgm.app/login?redirect=… send a player to another website right after they log in
 * (an "open redirect", which phishers abuse).
 *
 * The address is read the way the browser itself will read it (new URL), and only kept
 * if it stays on this site. A simple "starts with /" check isn't enough: browsers drop
 * tabs and line breaks and treat "\" like "/", so "/<tab>/evil.com" or "/\evil.com"
 * become "//evil.com", which is another website.
 */
export const safeRedirect = (path) => {
  if (typeof path !== 'string' || !path.startsWith('/')) return '/';
  try {
    const url = new URL(path, window.location.origin);
    if (url.origin !== window.location.origin) return '/';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
};
