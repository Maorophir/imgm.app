/**
 * What Google may index, page by page (set on every page change):
 *   - public pages name their one real address in <link rel="canonical">: the production
 *     site plus the path, without ?… or #… . So /game/305152?review=abc#review-abc and
 *     /hall-of-fame?platform=pc count as /game/305152 and /hall-of-fame, not as copies.
 *   - private or personal pages (logging in, settings, the review quest, search results…)
 *     get <meta name="robots" content="noindex">: nothing a searcher should land on.
 *   - a player's public profile (/u/<gamer tag>) starts as noindex: only the page knows
 *     whether the player has reviewed anything. It calls this hook again with
 *     `indexable` once it does know: a profile with reviews is indexed (at its gamer
 *     tag's own capitalisation), an empty one or a tag nobody has stays out.
 * robots.txt doesn't block these pages on purpose: Google must visit a page to read them.
 */
import { useEffect } from 'react';

const SITE = 'https://imgm.app'; // the real address, also when testing locally
const NOINDEX = new Set([
  '/backlog',
  '/steam/library', // the games you own (the page explaining Steam, /steam, is public)
  '/profile',
  '/settings',
  '/search', // results pages (Google's advice: don't index your own search)
  '/login',
  '/signup/steam',
  '/welcome',
  '/forgot-password',
  '/reset-password',
  '/oauth-success',
]);
const isPrivate = (path) =>
  NOINDEX.has(path) ||
  /^\/game\/[^/]+\/review$/.test(path) || // the review quest
  path.startsWith('/u/'); // a player's profile, until the page says it has reviews

// The <head> tag matching `selector`, made if missing (or removed when `keep` is false)
const headTag = (selector, create, keep) => {
  let tag = document.head.querySelector(selector);
  if (!keep) {
    tag?.remove();
    return null;
  }
  if (!tag) {
    tag = create();
    document.head.append(tag);
  }
  return tag;
};

// pathname: the page's address. indexable: leave it out to go by the rules above; a page
// that decides for itself passes true or false (its call runs after App's, so it wins).
export function useSearchIndexing(pathname, indexable) {
  useEffect(() => {
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname; // no trailing slash
    const hidden = indexable === undefined ? isPrivate(path) : !indexable;
    headTag(
      'meta[name="robots"]',
      () => Object.assign(document.createElement('meta'), { name: 'robots' }),
      hidden
    )?.setAttribute('content', 'noindex');
    headTag(
      'link[rel="canonical"]',
      () => Object.assign(document.createElement('link'), { rel: 'canonical' }),
      !hidden
    )?.setAttribute('href', `${SITE}${path}`);
  }, [pathname, indexable]);
}
