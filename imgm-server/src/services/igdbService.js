/**
 * IGDB Service
 *
 * Wraps the IGDB v4 API (https://api-docs.igdb.com).
 * IGDB authenticates through Twitch's OAuth2 Client Credentials flow, so we
 * fetch an app access token, cache it in memory, and refresh it on expiry
 * (or when IGDB rejects it with a 401).
 *
 * All queries use IGDB's Apicalypse syntax in the POST body, and every
 * response is mapped to the shape of our Prisma `Game` model.
 */
import 'dotenv/config';

const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const IGDB_BASE_URL = 'https://api.igdb.com/v4';
const IGDB_IMAGE_BASE = 'https://images.igdb.com/igdb/image/upload';

const SEARCH_CACHE_TTL = 5 * 60 * 1000;        // 5 minutes
const POPULAR_CACHE_TTL = 6 * 60 * 60 * 1000;  // 6 hours
const TOKEN_EXPIRY_BUFFER = 60 * 1000;         // refresh 60s before actual expiry

const GAME_FIELDS = `fields name, slug, summary, first_release_date, cover.image_id,
  artworks.image_id, artworks.artwork_type, artworks.alpha_channel, artworks.width, artworks.height,
  screenshots.image_id, genres.name, platforms.name, videos.video_id, videos.name,
  involved_companies.developer, involved_companies.publisher, involved_companies.company.name;`;

// Artwork types usable as a hero background, best first (IGDB /artwork_types).
// Logos, icons, and alternative covers are excluded.
const HERO_ARTWORK_PRIORITY = {
  2: 0, // key art without logo
  1: 1, // artwork
  3: 2, // key art with logo
  4: 3, // concept art
};

// IGDB platform names are verbose — shorten the common ones for UI tags.
const PLATFORM_NAME_MAP = {
  'PC (Microsoft Windows)': 'PC',
  'Legacy Mobile Device': 'Mobile',
};

// ---------------------------------------------------------------------------
// Token handling
// ---------------------------------------------------------------------------

let tokenCache = { accessToken: null, expiresAt: 0 };
let tokenRequest = null; // in-flight promise so concurrent callers share one request

const requestNewToken = async () => {
  const { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } = process.env;
  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
    throw new Error('[IGDB] TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET must be set in .env');
  }

  const params = new URLSearchParams({
    client_id: TWITCH_CLIENT_ID,
    client_secret: TWITCH_CLIENT_SECRET,
    grant_type: 'client_credentials',
  });

  const response = await fetch(`${TWITCH_TOKEN_URL}?${params}`, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`[IGDB] Twitch token request failed with status ${response.status}`);
  }

  const data = await response.json();
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - TOKEN_EXPIRY_BUFFER,
  };
  return tokenCache.accessToken;
};

const getAccessToken = async () => {
  if (tokenCache.accessToken && Date.now() < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }
  if (!tokenRequest) {
    tokenRequest = requestNewToken().finally(() => {
      tokenRequest = null;
    });
  }
  return tokenRequest;
};

const clearToken = () => {
  tokenCache = { accessToken: null, expiresAt: 0 };
};

// ---------------------------------------------------------------------------
// Core request
// ---------------------------------------------------------------------------

/**
 * POSTs an Apicalypse query to an IGDB endpoint.
 * Retries once with a fresh token if IGDB responds with 401.
 */
const igdbRequest = async (endpoint, body, isRetry = false) => {
  const accessToken = await getAccessToken();

  const response = await fetch(`${IGDB_BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'text/plain',
      Accept: 'application/json',
    },
    body,
  });

  if (response.status === 401 && !isRetry) {
    clearToken();
    return igdbRequest(endpoint, body, true);
  }

  if (!response.ok) {
    const error = new Error(`[IGDB] ${endpoint} request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const igdbImageUrl = (imageId, size = 't_cover_big') =>
  imageId ? `${IGDB_IMAGE_BASE}/${size}/${imageId}.jpg` : null;

/**
 * Upgrades a raw IGDB image `url` field (e.g. "//images.igdb.com/.../t_thumb/co1q1f.jpg")
 * to an absolute URL at the requested size.
 */
export const upscaleImageUrl = (url, size = 't_cover_big') => {
  if (!url) return null;
  const absolute = url.startsWith('//') ? `https:${url}` : url;
  return absolute.replace('t_thumb', size);
};

// Escape characters that would break out of an Apicalypse string literal.
const escapeSearch = (query) => query.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const findCompany = (involvedCompanies = [], role) =>
  involvedCompanies.find((ic) => ic[role])?.company?.name ?? null;

/**
 * Picks landscape, opaque artworks suitable for a full-width hero,
 * falling back to screenshots when a game has none.
 */
const pickHeroImages = (artworks = [], screenshots = []) => {
  const priority = (a) => HERO_ARTWORK_PRIORITY[a.artwork_type ?? 1];
  const heroArtworks = artworks
    .filter((a) => priority(a) !== undefined && !a.alpha_channel && a.width > a.height)
    .sort((a, b) => priority(a) - priority(b) || b.width - a.width);

  const source = heroArtworks.length > 0 ? heroArtworks : screenshots;
  return source.map((a) => igdbImageUrl(a.image_id, 't_1080p')).filter(Boolean);
};

/**
 * Maps a raw IGDB game object to our Prisma `Game` shape.
 */
export const mapIgdbGame = (raw) => {
  return {
    id: raw.id,
    title: raw.name,
    slug: raw.slug,
    description: raw.summary ?? null,
    releaseDate: raw.first_release_date ? new Date(raw.first_release_date * 1000) : null,
    coverUrl: igdbImageUrl(raw.cover?.image_id, 't_cover_big'),
    artworks: pickHeroImages(raw.artworks, raw.screenshots),
    genres: (raw.genres ?? []).map((g) => g.name),
    platforms: (raw.platforms ?? []).map((p) => PLATFORM_NAME_MAP[p.name] ?? p.name),
    developer: findCompany(raw.involved_companies, 'developer'),
    publisher: findCompany(raw.involved_companies, 'publisher'),
    videos: (raw.videos ?? [])
      .filter((v) => v.video_id)
      .map((v) => ({ name: v.name ?? 'Trailer', youtubeId: v.video_id })),
  };
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// IGDB game types worth reviewing (IGDB /game_types): main game, DLC, expansion,
// standalone expansion, remake, remaster, expanded game, port.
// Hidden from search: bundles (this is a review site, not a store), mods, episodes,
// seasons, forks, packs and updates.
const REVIEWABLE_GAME_TYPES = [0, 1, 2, 4, 8, 9, 10, 11];

const searchCache = new Map(); // lowercased query -> { expiresAt, results }
let popularCache = { expiresAt: 0, results: null };

/**
 * Searches IGDB for games matching `query`.
 */
export const searchGames = async (query, limit = 12) => {
  const key = `${query.trim().toLowerCase()}|${limit}`;
  const cached = searchCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.results;
  }

  const body = `search "${escapeSearch(query.trim())}"; ${GAME_FIELDS} where cover != null & version_parent = null & game_type = (${REVIEWABLE_GAME_TYPES.join(',')}); limit ${limit};`;
  const results = (await igdbRequest('games', body)).map(mapIgdbGame);

  searchCache.set(key, { expiresAt: Date.now() + SEARCH_CACHE_TTL, results });
  return results;
};

/**
 * Fetches a single game's full details by IGDB id. Returns null if not found.
 */
export const getGameDetails = async (id) => {
  const [raw] = await igdbRequest('games', `${GAME_FIELDS} where id = ${Number(id)};`);
  return raw ? mapIgdbGame(raw) : null;
};

/**
 * Fetches just the cover art URL for a game.
 */
export const getCoverArt = async (id, size = 't_cover_big') => {
  const [cover] = await igdbRequest('covers', `fields image_id; where game = ${Number(id)};`);
  return igdbImageUrl(cover?.image_id, size);
};

/**
 * Popular recent games: released in the last 2 years, sorted by rating count.
 * Cached in memory to keep Home page loads off the IGDB rate limit.
 */
export const getPopularGames = async (limit = 10) => {
  if (popularCache.results && Date.now() < popularCache.expiresAt) {
    return popularCache.results;
  }

  const twoYearsAgo = Math.floor(Date.now() / 1000) - 2 * 365 * 24 * 60 * 60;
  const body = `${GAME_FIELDS} where cover != null & artworks != null & first_release_date > ${twoYearsAgo} & total_rating_count > 50; sort total_rating_count desc; limit ${limit};`;
  const results = (await igdbRequest('games', body)).map(mapIgdbGame);

  popularCache = { expiresAt: Date.now() + POPULAR_CACHE_TTL, results };
  return results;
};
