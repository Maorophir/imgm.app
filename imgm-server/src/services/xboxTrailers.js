/**
 * Xbox trailers for Discover: the second place a game's trailer can come from without
 * YouTube's ads, when Steam has none (GTA VI isn't on Steam) or turns this server away.
 * Microsoft's store catalog (displaycatalog.mp.microsoft.com, no key) answers for up to
 * 40 games in one request, and its trailers stream (HLS) from Xbox's own video servers.
 *
 * Its playlists already list the smallest stream first, so Safari starts fast without a
 * copy of ours, and the servers let any site play them (hls.js needs that). Only
 * cdn.trailers.xboxservices.com: some trailers are on another Microsoft server, which
 * refuses other sites.
 *
 * Cached like Steam's: a day, a failure tried again after 5 minutes (keeping the last
 * answer until then).
 */
import { pickMovie } from './steamTrailers.js';

const CATALOG = 'https://displaycatalog.mp.microsoft.com/v7.0/products';
const VIDEO_HOST = 'cdn.trailers.xboxservices.com';
const FOUND_FOR = 24 * 60 * 60 * 1000;
const FAILED_FOR = 5 * 60 * 1000;
const PER_REQUEST = 40;
const TIMEOUT = 8_000;

// A game's Xbox store id (its "big id"), from its store link: .../store/fable/9PMN4DGRT1LN
export const xboxIdOf = (stores) => {
  const url = (stores ?? []).find((store) => store.key === 'xbox')?.url ?? '';
  return url.match(/\/(9[A-Z0-9]{11})(?:[/?#]|$)/i)?.[1].toUpperCase() ?? null;
};

const playsHere = (hls) => {
  try {
    return new URL(hls).hostname === VIDEO_HOST;
  } catch {
    return false;
  }
};

const cache = new Map(); // big id -> { expiresAt, trailer: { name, hls, poster } | null }

// One product's trailer, chosen by the same rules as Steam's (its name says what it is)
const trailerOf = (product) => {
  const videos = product.LocalizedProperties?.[0]?.CMSVideos ?? [];
  const movie = pickMovie(
    videos
      .filter((video) => video.VideoPurpose === 'trailer' && playsHere(video.HLS))
      .map((video) => ({
        name: video.PreviewImage?.Caption ?? video.Caption ?? 'Trailer',
        hls_h264: video.HLS,
        thumbnail: video.PreviewImage?.Uri ? `https:${video.PreviewImage.Uri}` : null,
        highlight: false,
      }))
  );
  return movie ? { name: movie.name, hls: movie.hls_h264, poster: movie.thumbnail } : null;
};

// Several products at once: Map(big id -> trailer | null)
const lookUp = async (ids) => {
  const response = await fetch(`${CATALOG}?bigIds=${ids.join(',')}&market=US&languages=en-us`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!response.ok) throw new Error(`Xbox's catalog answered ${response.status}`);
  const products = (await response.json())?.Products;
  if (!Array.isArray(products)) throw new Error("Xbox's catalog sent no products");
  return new Map(products.map((product) => [String(product.ProductId).toUpperCase(), trailerOf(product)]));
};

/**
 * Xbox's trailer for each big id: Map(id -> { name, hls, poster } | null). Never throws:
 * what Xbox can't tell, the feed does without.
 */
export const getXboxTrailers = async (ids) => {
  const unique = [...new Set(ids.filter(Boolean))];
  const missing = unique.filter((id) => !(Date.now() < cache.get(id)?.expiresAt));
  for (let i = 0; i < missing.length; i += PER_REQUEST) {
    const batch = missing.slice(i, i + PER_REQUEST);
    try {
      const trailers = await lookUp(batch);
      batch.forEach((id) => cache.set(id, { expiresAt: Date.now() + FOUND_FOR, trailer: trailers.get(id) ?? null }));
    } catch (error) {
      console.error(`Xbox trailer lookup for ${batch.length} games failed:`, error.message);
      batch.forEach((id) => cache.set(id, { expiresAt: Date.now() + FAILED_FOR, trailer: cache.get(id)?.trailer ?? null }));
    }
  }
  return new Map(unique.map((id) => [id, cache.get(id)?.trailer ?? null]));
};
