/**
 * Steam trailers for Discover: a game's trailer from its Steam store page, streamed
 * from Steam's own video servers (HLS), so the feed plays it without YouTube's ads,
 * logo or title bar. Also what Steam says about the game's age: 17+, or adult content.
 *
 * Steam's store data (store.steampowered.com/api/appdetails) needs no key, but it's
 * shared by everyone, so: each game is looked up once a day (a failure is tried again
 * after an hour), a few at a time, and a game Steam won't tell us about just keeps its
 * YouTube trailer.
 */
const STORE_API = 'https://store.steampowered.com/api/appdetails';
const FOUND_FOR = 24 * 60 * 60 * 1000;
const FAILED_FOR = 60 * 60 * 1000;
const AT_ONCE = 6;
const TIMEOUT = 8_000;
// Steam's content descriptors for adult sexual content (3 adult only, 4 frequent nudity)
const ADULT_DESCRIPTORS = new Set([3, 4]);

const cache = new Map(); // appid -> { expiresAt, info: { trailer, mature } | null }

// One app's trailer ({ name, hls, poster }) and age, or null when Steam has none to give
const lookUp = async (appid) => {
  const response = await fetch(`${STORE_API}?appids=${appid}&filters=basic,movies`, {
    headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; IMGM/1.0; +https://imgm.app)' },
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!response.ok) throw new Error(`Steam's store answered ${response.status}`);
  const data = (await response.json())?.[appid]?.data;
  if (!data) return null;
  // Steam marks its featured trailers as highlights; the first of those, else the first
  const movies = (data.movies ?? []).filter((movie) => typeof movie.hls_h264 === 'string' && movie.hls_h264.startsWith('https://'));
  const movie = movies.find((m) => m.highlight) ?? movies[0];
  const descriptors = data.content_descriptors?.ids ?? [];
  return {
    trailer: movie ? { name: movie.name ?? 'Trailer', hls: movie.hls_h264, poster: movie.thumbnail ?? null } : null,
    mature: Number(data.required_age) >= 17 || descriptors.some((id) => ADULT_DESCRIPTORS.has(id)),
  };
};

const cachedLookUp = async (appid) => {
  const known = cache.get(appid);
  if (known && Date.now() < known.expiresAt) return known.info;
  try {
    const info = await lookUp(appid);
    cache.set(appid, { expiresAt: Date.now() + FOUND_FOR, info });
    return info;
  } catch (error) {
    console.error(`Steam trailer lookup for app ${appid} failed:`, error.message);
    cache.set(appid, { expiresAt: Date.now() + FAILED_FOR, info: null });
    return null;
  }
};

/**
 * Steam's trailer and age for each app id, a few at a time: Map(appid -> { trailer,
 * mature } | null). Never throws: what Steam can't tell, the feed does without.
 */
export const getSteamTrailers = async (appids) => {
  const unique = [...new Set(appids.filter(Boolean))];
  const found = new Map();
  for (let i = 0; i < unique.length; i += AT_ONCE) {
    const batch = unique.slice(i, i + AT_ONCE);
    const infos = await Promise.all(batch.map(cachedLookUp));
    batch.forEach((appid, j) => found.set(appid, infos[j]));
  }
  return found;
};
