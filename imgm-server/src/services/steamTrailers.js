/**
 * Steam trailers for Discover: a game's trailer from its Steam store page, streamed
 * from Steam's own video servers (HLS), so the feed plays it without YouTube's ads,
 * logo or title bar. Also what Steam says about the game's age: 17+, or adult content.
 *
 * The games come from Steam's Web API (IStoreBrowseService/GetItems, no key), up to 50
 * in one request. The store's own appdetails, one request per game, turned this
 * server away: on Render, no Upcoming game got its Steam trailer (all 40 played
 * YouTube, the heavy player iPhones choke on), while a home connection got 37.
 * Each game is looked up once a day, and a game Steam won't tell us about just keeps
 * its YouTube trailer. A failed lookup is tried again after 5 minutes, keeping what
 * Steam said last time until then.
 */
const STORE_API = 'https://api.steampowered.com/IStoreBrowseService/GetItems/v1/';
const VIDEOS = 'https://video.akamai.steamstatic.com/store_trailers/';
const PICTURES = 'https://shared.akamai.steamstatic.com/store_item_assets/';
const FOUND_FOR = 24 * 60 * 60 * 1000;
const FAILED_FOR = 5 * 60 * 1000;
const PER_REQUEST = 50; // ~1.8 KB of address
const TIMEOUT = 8_000;
// Steam's content descriptors for adult sexual content (3 adult only, 4 frequent nudity)
const ADULT_DESCRIPTORS = new Set([3, 4]);

// Which trailer: a video's name says what it is. The kinds worth a first look, best
// first (as the game page's pickVideos), and the ones that aren't the game itself:
// critics' quotes, people talking, updates and add-ons. Steam's own "highlight" is often
// an accolades reel, so it only breaks ties.
const KINDS = [/\b(launch|release)\b/i, /gameplay|demo/i, /story|cinematic|opening/i, /announce|reveal|debut|teaser/i, /trailer/i];
const SKIP = /accolade|interview|diary|behind the scenes|message|q ?& ?a|commentary|developer|director|producer|livestream|podcast|recap|anniversary|tv spot|commercial|dlc|expansion|season pass|patch|update/i;
// A name in Chinese, Japanese or Korean script: the version for those markets (YouTube's
// trailer is the better pick then)
const CJK = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/;
const kindOf = (name) => {
  const i = KINDS.findIndex((kind) => kind.test(name));
  return i === -1 ? KINDS.length : i;
};
// The best of a game's Steam videos, or null if none is the game itself (then the
// feed plays its YouTube trailer, chosen by the same rules)
const pickMovie = (movies) =>
  movies
    .map((movie, order) => ({ movie, name: movie.name ?? '', order }))
    .filter(({ movie, name }) => typeof movie.hls_h264 === 'string' && movie.hls_h264.startsWith('https://') && !SKIP.test(name) && !CJK.test(name))
    .sort((a, b) =>
      kindOf(a.name) - kindOf(b.name) ||
      Boolean(b.movie.highlight) - Boolean(a.movie.highlight) ||
      a.order - b.order)[0]?.movie ?? null;

const cache = new Map(); // appid -> { expiresAt, info: { trailer, mature } | null }

// A GetItems trailer as pickMovie reads it (the shape of the store's own movie list).
// Steam's highlights are the ones its store page shows first.
const asMovie = (trailer, highlight) => {
  const hls = trailer.adaptive_trailers?.find((a) => a.encoding === 'hls_h264')?.cdn_path;
  return {
    name: trailer.trailer_name,
    hls_h264: hls ? `${VIDEOS}${hls}` : null,
    thumbnail: trailer.screenshot_medium && trailer.trailer_url_format
      ? `${PICTURES}${trailer.trailer_url_format.replace('${FILENAME}', trailer.screenshot_medium)}`
      : null,
    highlight,
  };
};

// One store item's trailer ({ name, hls, poster }) and age, or null when Steam has none
// to give. The US store, so the English and ESRB versions of a trailer, wherever this
// server is.
const infoOf = (item) => {
  if (item?.success !== 1) return null;
  const { highlights = [], other_trailers: others = [] } = item.trailers ?? {};
  const movie = pickMovie([...highlights.map((t) => asMovie(t, true)), ...others.map((t) => asMovie(t, false))]);
  return {
    trailer: movie ? { name: movie.name ?? 'Trailer', hls: movie.hls_h264, poster: movie.thumbnail } : null,
    mature: Number(item.game_rating?.required_age) >= 17 || (item.content_descriptorids ?? []).some((id) => ADULT_DESCRIPTORS.has(id)),
  };
};

// Several apps at once: Map(appid -> info | null)
const lookUp = async (appids) => {
  const input = {
    ids: appids.map((appid) => ({ appid })),
    context: { language: 'english', country_code: 'US' },
    data_request: { include_trailers: true, include_ratings: true },
  };
  const response = await fetch(`${STORE_API}?input_json=${encodeURIComponent(JSON.stringify(input))}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; IMGM/1.0; +https://imgm.app)' },
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!response.ok) throw new Error(`Steam answered ${response.status}`);
  const items = (await response.json())?.response?.store_items;
  if (!Array.isArray(items)) throw new Error('Steam sent no store items');
  return new Map(items.map((item) => [item.appid ?? item.id, infoOf(item)]));
};

/**
 * Steam's trailer and age for each app id: Map(appid -> { trailer, mature } | null).
 * Never throws: what Steam can't tell, the feed does without.
 */
export const getSteamTrailers = async (appids) => {
  const unique = [...new Set(appids.filter(Boolean))];
  const missing = unique.filter((appid) => !(Date.now() < cache.get(appid)?.expiresAt));
  for (let i = 0; i < missing.length; i += PER_REQUEST) {
    const batch = missing.slice(i, i + PER_REQUEST);
    try {
      const infos = await lookUp(batch);
      batch.forEach((appid) => cache.set(appid, { expiresAt: Date.now() + FOUND_FOR, info: infos.get(appid) ?? null }));
    } catch (error) {
      console.error(`Steam trailer lookup for ${batch.length} apps failed:`, error.message);
      batch.forEach((appid) => cache.set(appid, { expiresAt: Date.now() + FAILED_FOR, info: cache.get(appid)?.info ?? null }));
    }
  }
  return new Map(unique.map((appid) => [appid, cache.get(appid)?.info ?? null]));
};

// ── Safari's copy of a trailer's playlist ──
// Steam lists each trailer's 1080p stream first, and Safari (every iPhone) starts with
// whichever stream is listed first: a phone downloaded 2 MB pieces before the first
// frame, and froze on mobile data until Safari stepped down. Safari gets this copy
// instead: the same streams, still from Steam's video servers (only the 1 KB list is
// ours), with 480p first. Safari moves up to HD by itself when the connection allows.
// Other browsers play through hls.js, which starts low on its own.
const STEAM_VIDEO_HOST = 'video.akamai.steamstatic.com';
const START_HEIGHT = 480;
const PLAYLIST_FOR = 24 * 60 * 60 * 1000;
const MAX_PLAYLISTS = 500; // ~1 KB each; the oldest goes first
const playlists = new Map(); // Steam's address -> { expiresAt, text }

// Only Steam's own trailer playlists (never a way to fetch anything else through us)
export const isSteamPlaylist = (src) => {
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && url.hostname === STEAM_VIDEO_HOST && url.pathname.startsWith('/store_trailers/') && url.pathname.endsWith('.m3u8');
  } catch {
    return false;
  }
};

// Every address in the list made whole (they're written relative to Steam's), and the
// stream closest to 480 lines tall moved to the top
const rewritePlaylist = (text, src) => {
  const lines = text.split(/\r?\n/);
  const head = [];
  const streams = []; // [tag line, address line]
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].replace(/URI="([^"]+)"/, (_, uri) => `URI="${new URL(uri, src)}"`);
    if (line.startsWith('#EXT-X-STREAM-INF')) {
      streams.push([line, new URL(lines[i + 1].trim(), src).toString()]);
      i += 1;
    } else if (line && !line.startsWith('#')) head.push(new URL(line.trim(), src).toString());
    else if (line) head.push(line);
  }
  const height = ([tag]) => Number(tag.match(/RESOLUTION=\d+x(\d+)/)?.[1] ?? 0);
  const first = streams.reduce((best, s) => (best && Math.abs(height(best) - START_HEIGHT) <= Math.abs(height(s) - START_HEIGHT) ? best : s), null);
  const ordered = first ? [first, ...streams.filter((s) => s !== first)] : streams;
  return [...head, ...ordered.flat()].join('\n') + '\n';
};

// Safari's copy of one trailer's playlist (throws when Steam won't give it)
export const getSafariPlaylist = async (src) => {
  const known = playlists.get(src);
  if (known && Date.now() < known.expiresAt) return known.text;
  const response = await fetch(src, { signal: AbortSignal.timeout(TIMEOUT) });
  if (!response.ok) throw new Error(`Steam's video server answered ${response.status}`);
  const text = rewritePlaylist(await response.text(), src);
  playlists.delete(src);
  playlists.set(src, { expiresAt: Date.now() + PLAYLIST_FOR, text });
  if (playlists.size > MAX_PLAYLISTS) playlists.delete(playlists.keys().next().value);
  return text;
};
