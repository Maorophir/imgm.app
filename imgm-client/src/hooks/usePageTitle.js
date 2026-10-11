/**
 * The page's title and description: what the browser tab shows, and what Google shows
 * for the page (the blue headline, and the grey line under it).
 * "Hades · IMGM" on a page, the site's own title and description on the home page.
 */
import { useEffect } from 'react';

export const SITE_TITLE = 'IMGM · I Am Gaming: game reviews and what to play next';
export const SITE_DESCRIPTION =
  'IMGM (I Am Gaming) is a community game review site. Rate what you play, see what players really think, and let Play Next find your next game.';

export function usePageTitle(title, description) {
  useEffect(() => {
    document.title = title ? `${title} · IMGM` : SITE_TITLE;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description || SITE_DESCRIPTION);
  }, [title, description]);
}
