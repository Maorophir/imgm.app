/**
 * Where to go next, from a ?redirect=/some/page link (defaults to home).
 * Only paths on OUR site are allowed: "//evil.com" or "/\evil.com" would make the
 * browser leave for another website (an "open redirect" that phishers abuse).
 */
export const safeRedirect = (path) =>
  path?.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\') ? path : '/';
