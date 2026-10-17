/**
 * IGDB image sizes — the server sends every cover as t_cover_big (264px wide) and key
 * art as t_1080p (1920px wide). Swap the size in the URL to get a sharper or a lighter
 * copy of the same image, e.g. t_cover_big_2x (528px) for retina screens.
 * Sizes: api-docs.igdb.com/#images
 */
export const igdbImage = (url, size) => url?.replace(/\/t_[a-z0-9_]+\//, `/${size}/`);

// A cover's srcSet: the browser picks the 264px or the 528px copy for the card's width
export const coverSrcSet = (url) =>
  url ? `${igdbImage(url, 't_cover_big')} 264w, ${igdbImage(url, 't_cover_big_2x')} 528w` : undefined;

// Key art's srcSet, for art across the whole screen: the 1280px copy (t_720p) for phones
// and laptops, the 1920px one (t_1080p) for big and retina screens. Only IGDB addresses
// have sizes to swap, so other art gets none.
export const artSrcSet = (url) =>
  /\/t_[a-z0-9_]+\//.test(url ?? '') ? `${igdbImage(url, 't_720p')} 1280w, ${igdbImage(url, 't_1080p')} 1920w` : undefined;

// How wide a cover is in the game grids (Home's shelf, Search): two columns on phones,
// up to about 230px each on desktop. The `sizes` for those covers' srcSet.
export const COVER_SIZES = '(min-width: 1024px) 230px, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw';

// Is this address a game's cover (the other art is artworks and screenshots)?
export const isCover = (url) => Boolean(url?.includes('/t_cover_big'));

// A review's card art at the size a card needs: an artwork or screenshot as IGDB's 889px
// copy (t_screenshot_big; the 1920px original is far too heavy for a card), a cover as it is
export const cardArtUrl = (url, size = 't_screenshot_big') => (!url || isCover(url) ? url : igdbImage(url, size));
