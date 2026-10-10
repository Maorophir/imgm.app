/**
 * IGDB image sizes — the server sends every cover as t_cover_big (264px wide).
 * Swap the size in the URL to get a sharper or a lighter copy of the same image,
 * e.g. t_cover_big_2x (528px) for retina screens. Sizes: api-docs.igdb.com/#images
 */
export const igdbImage = (url, size) => url?.replace(/\/t_[a-z0-9_]+\//, `/${size}/`);

// A cover's srcSet: the browser picks the 264px or the 528px copy for the card's width
export const coverSrcSet = (url) =>
  url ? `${igdbImage(url, 't_cover_big')} 264w, ${igdbImage(url, 't_cover_big_2x')} 528w` : undefined;
