/**
 * The browser tab's title, which is also the headline Google shows for the page.
 * "Hades · IMGM" on a page, the full site title on the home page.
 */
import { useEffect } from 'react';

export const SITE_TITLE = 'IMGM · I Am Gaming: game reviews and what to play next';

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · IMGM` : SITE_TITLE;
  }, [title]);
}
