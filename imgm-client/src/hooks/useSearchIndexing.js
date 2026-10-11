/**
 * What Google may index, page by page (set on every page change):
 *   - public pages name their one real address in <link rel="canonical">: the production
 *     site plus the path, without ?… or #… . So /game/305152?review=abc#review-abc and
 *     /hall-of-fame?platform=pc count as /game/305152 and /hall-of-fame, not as copies.
 *   - private or personal pages (logging in, settings, the review quest, search results…)
 *     get <meta name="robots" content="noindex">: nothing a searcher should land on.
 * robots.txt doesn't block these pages on purpose: Google must visit a page to read them.
 */
import { useEffect } from 'react';

const SITE = 'https://imgm.app'; // the real address, also when testing locally
const NOINDEX = new Set([
  '/backlog',
  '/profile',
  '/settings',
  '/search', // results pages (Google's advice: don't index your own search)
  '/login',
  '/welcome',
  '/forgot-password',
  '/reset-password',
  '/oauth-success',
]);
const isPrivate = (path) => NOINDEX.has(path) || /^\/game\/[^/]+\/review$/.test(path); // the review quest

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

export function useSearchIndexing(pathname) {
  useEffect(() => {
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname; // no trailing slash
    const hidden = isPrivate(path);
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
  }, [pathname]);
}
