/**
 * A player's Steam library on IMGM: importing it from Steam (importLibrary) and turning it
 * into the "Your Steam library" page (buildLibrary).
 *
 * Importing only ever touches what came from Steam (SteamLibrary, SteamLibraryGame):
 * never reviews or the Backlog. A list from Steam replaces the stored one; Steam not
 * sharing the games ({} : "Game details" is private, or a passing glitch) keeps the
 * stored games and only marks the library private, so one bad answer can't wipe it.
 *
 * Games played through Steam Family Sharing aren't owned, so GetOwnedGames never lists
 * them; Steam shows them only among the last two weeks' games. Each import adds those
 * (shared) and keeps the ones seen before, so they build up, until the player owns one.
 *
 * Which IGDB game each Steam app is lives in SteamApp, shared by every player: the
 * same app is the same game for everyone, so most imports need no IGDB request at all.
 * A match is checked again after 30 days, "IGDB doesn't know it" after 7 (IGDB links
 * new Steam games over time).
 */
import { prisma } from '../lib/db.js';
import { steamApiKey } from '../lib/config.js';
import { STEAM_ISSUER, STEAM_PROVIDER, findSteamId, steamProfileUrl } from '../lib/steamAccount.js';
import { SteamUnavailableError, getOwnedGames, getPersonaName, getRecentlyPlayedGames } from './steamApi.js';
import * as igdb from './igdbService.js';

const DAY = 24 * 60 * 60 * 1000;
const MATCH_FRESH_FOR = 30 * DAY;
const NONE_FRESH_FOR = 7 * DAY;
// Free-licence collectors can own tens of thousands of apps; past this, the most played are kept
const MAX_GAMES = 20_000;
const WRITE_CHUNK = 2_000;        // rows per insert (Postgres takes at most 65,535 values per query)
const INT_MAX = 2_147_483_647;    // the database's Int
const NAME_MAX = 200;             // Steam app names
const PERSONA_MAX = 32;           // Steam's own limit for a Steam name
const HIDDEN_HOURS_MIN_GAMES = 5; // every playtime 0 across this many games = hours hidden, not unplayed
const LAST_PLAYED_MAX = 4_102_444_800; // 2100-01-01 in Unix seconds: anything later is junk

export class SteamNotConnectedError extends Error {
  constructor() {
    super('Steam is not connected');
    this.code = 'NOT_CONNECTED';
  }
}

// Control and invisible formatting characters (bidi overrides that flip text, zero-width
// spaces, NUL, which Postgres refuses): names typed on Steam can't rearrange IMGM's pages
const INVISIBLE = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu;
const cleanText = (value, max) => {
  if (typeof value !== 'string') return null;
  const text = value.replace(INVISIBLE, '').replace(/\s+/g, ' ').trim();
  return text ? Array.from(text).slice(0, max).join('').trim() : null;
};

const minutesOf = (value) => (Number.isSafeInteger(value) && value > 0 ? Math.min(value, INT_MAX) : 0);

// One game from GetOwnedGames, or null if it isn't a usable entry
const readGame = (raw) => {
  if (!raw || !Number.isSafeInteger(raw.appid) || raw.appid <= 0 || raw.appid > INT_MAX) return null;
  const played = raw.rtime_last_played;
  return {
    appid: raw.appid,
    name: cleanText(raw.name, NAME_MAX) ?? `Steam app ${raw.appid}`,
    minutes: minutesOf(raw.playtime_forever),
    minutes2Weeks: minutesOf(raw.playtime_2weeks),
    lastPlayedAt: Number.isSafeInteger(played) && played > 0 && played < LAST_PLAYED_MAX ? new Date(played * 1000) : null,
  };
};

/**
 * What GetOwnedGames' `response` means:
 *   {}                       private: Steam shares no games (keep what's stored)
 *   { game_count: 0 }        empty: a real, empty library
 *   { game_count, games }    ok (hoursHidden: every playtime is 0, the "keep my total
 *                            playtime private" setting)
 * Steam claiming games but sending none, or none readable, is a glitch: it throws, so
 * the stored library stays.
 */
const readOwnedGames = (response) => {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    throw new SteamUnavailableError('[Steam] GetOwnedGames answered an unexpected shape');
  }
  const list = Array.isArray(response.games) ? response.games : null;
  if (!list && response.game_count === undefined) return { state: 'private' };
  if (!list || list.length === 0) {
    if (Number(response.game_count) > 0) throw new SteamUnavailableError('[Steam] GetOwnedGames counted games but sent none');
    return { state: 'empty', games: [], hoursHidden: false };
  }

  const byAppid = new Map();
  for (const raw of list) {
    const game = readGame(raw);
    if (game && !byAppid.has(game.appid)) byAppid.set(game.appid, game);
  }
  let games = [...byAppid.values()];
  if (games.length === 0) throw new SteamUnavailableError('[Steam] GetOwnedGames sent no readable games');
  if (games.length > MAX_GAMES) games = games.sort((a, b) => b.minutes - a.minutes || a.appid - b.appid).slice(0, MAX_GAMES);
  const hoursHidden = games.length >= HIDDEN_HOURS_MIN_GAMES && games.every((g) => g.minutes === 0);
  return { state: 'ok', games, hoursHidden };
};

// The games in GetRecentlyPlayedGames' `response` that the player doesn't own: played
// through Steam Family Sharing. Anything unreadable is left out (they're only an extra).
const readSharedGames = (response, ownedAppids) => {
  const shared = new Map();
  for (const raw of Array.isArray(response?.games) ? response.games : []) {
    const game = readGame(raw);
    if (game && !ownedAppids.has(game.appid)) shared.set(game.appid, { ...game, shared: true });
  }
  return shared;
};

const chunks = (rows, size) => Array.from({ length: Math.ceil(rows.length / size) }, (_, i) => rows.slice(i * size, (i + 1) * size));

const isFresh = (app, now) => now - app.checkedAt.getTime() < (app.kind === 'none' ? NONE_FRESH_FOR : MATCH_FRESH_FOR);

/**
 * Makes sure every appid has a fresh SteamApp row: the missing and stale ones are looked
 * up on IGDB (one request per 2,500), and the ones IGDB doesn't return become 'none'.
 * Never throws: if IGDB fails, the rest waits for the next import (or page load), and
 * what's already known still shows.
 */
const ensureSteamApps = async (appids) => {
  if (appids.length === 0) return;
  const now = Date.now();
  const known = await prisma.steamApp.findMany({ where: { appid: { in: appids } }, select: { appid: true, kind: true, checkedAt: true } });
  const fresh = new Set(known.filter((app) => isFresh(app, now)).map((app) => app.appid));
  const todo = [...new Set(appids.filter((appid) => !fresh.has(appid)))];

  for (const batch of chunks(todo, igdb.STEAM_APPIDS_PER_REQUEST)) {
    let matches;
    try {
      matches = await igdb.getGamesBySteamAppIds(batch);
    } catch (error) {
      console.error('Steam app lookup on IGDB failed:', error.message);
      return;
    }
    const checkedAt = new Date();
    const rows = batch.map((appid) => ({
      ...(matches.get(appid) ?? { appid, gameId: null, kind: 'none', title: null, coverUrl: null, releaseDate: null, platforms: [] }),
      checkedAt,
    }));
    // Two players importing the same app at once write the same row: skipDuplicates
    await prisma.$transaction([
      prisma.steamApp.deleteMany({ where: { appid: { in: batch } } }),
      prisma.steamApp.createMany({ data: rows, skipDuplicates: true }),
    ]);
  }
};

/**
 * Asks Steam for the player's library and stores it, then makes sure IMGM knows which
 * game every app is. Returns { state, gameCount, hoursHidden }.
 * Throws SteamUnavailableError (Steam down / busy / odd answer) or SteamNotConnectedError.
 *
 * steamId: the connected SteamID64, when the caller already looked it up.
 * fetchOwnedGames / fetchRecentGames / fetchPersonaName: Steam's calls, replaceable
 * (tests run without a key).
 */
export const importLibrary = async (
  userId,
  { steamId, fetchOwnedGames = getOwnedGames, fetchRecentGames = getRecentlyPlayedGames, fetchPersonaName = getPersonaName } = {}
) => {
  steamId ??= await findSteamId(userId);
  if (!steamId) throw new SteamNotConnectedError();

  const [response, recent, rawName] = await Promise.all([
    fetchOwnedGames(steamId),
    Promise.resolve()
      .then(() => fetchRecentGames(steamId))
      .catch(() => null), // only an extra (shared games)
    Promise.resolve()
      .then(() => fetchPersonaName(steamId))
      .catch(() => null), // only a nicety
  ]);
  const owned = readOwnedGames(response);
  const personaName = cleanText(rawName, PERSONA_MAX);
  const importedAt = new Date();
  // A failed name lookup keeps the name already saved
  const named = personaName ? { personaName } : {};

  await prisma.$transaction(
    async (tx) => {
      // Still the same Steam account? Locking its login row makes a Disconnect that
      // happens meanwhile wait for this write and then delete it too (or, if it came
      // first, this finds no row): an import never leaves a library behind a disconnect.
      const [connected] = await tx.$queryRaw`
        SELECT 1 FROM "Account"
        WHERE "userId" = ${userId} AND "providerId" = ${STEAM_PROVIDER} AND "issuer" = ${STEAM_ISSUER} AND "accountId" = ${steamId}
        FOR UPDATE`;
      if (!connected) throw new SteamNotConnectedError();

      if (owned.state === 'private') {
        await tx.steamLibrary.upsert({
          where: { userId },
          create: { userId, state: 'private', importedAt, ...named },
          update: { state: 'private', importedAt, ...named },
        });
        return;
      }
      // Shared games seen before stay (Steam lists them only while recently played), not
      // recently played any more unless seen again now; one the player now owns is owned
      const ownedAppids = new Set(owned.games.map((g) => g.appid));
      const kept = await tx.steamLibraryGame.findMany({ where: { userId, shared: true } });
      const shared = new Map(kept.filter((g) => !ownedAppids.has(g.appid)).map((g) => [g.appid, { ...g, minutes2Weeks: 0 }]));
      for (const [appid, game] of readSharedGames(recent, ownedAppids)) shared.set(appid, game);
      const games = [...owned.games, ...shared.values()];

      // Owning nothing but playing shared games is still a library to show
      const state = owned.state === 'empty' && games.length > 0 ? 'ok' : owned.state;
      const library = { state, gameCount: games.length, hoursHidden: owned.hoursHidden, importedAt, ...named };
      await tx.steamLibraryGame.deleteMany({ where: { userId } });
      for (const rows of chunks(games, WRITE_CHUNK)) {
        await tx.steamLibraryGame.createMany({ data: rows.map((game) => ({ userId, ...game })) });
      }
      await tx.steamLibrary.upsert({ where: { userId }, create: { userId, ...library }, update: library });
    },
    { timeout: 30 * 1000 }
  );

  // Every stored game needs its match checked: the owned and shared ones just written,
  // or, when private, the ones kept from last time
  const appids = (await prisma.steamLibraryGame.findMany({ where: { userId }, select: { appid: true } })).map((g) => g.appid);
  await ensureSteamApps(appids);

  const library = await prisma.steamLibrary.findUnique({ where: { userId }, select: { state: true, gameCount: true, hoursHidden: true } });
  return library;
};

/**
 * The library page: one entry per IMGM game (a game owned as several Steam apps, e.g.
 * the game and its GOTY edition, is one entry with the minutes added up), with the
 * player's own rating and whether it's in their Backlog; and the Steam apps IMGM can't
 * review (tools, soundtracks, bundles, apps IGDB doesn't know) under `others`.
 * Most played first. Returns null when Steam isn't connected.
 */
export const buildLibrary = async (userId, { steamId } = {}) => {
  steamId ??= await findSteamId(userId);
  if (!steamId) return null;

  const [library, owned] = await Promise.all([
    prisma.steamLibrary.findUnique({ where: { userId } }),
    prisma.steamLibraryGame.findMany({ where: { userId } }),
  ]);
  const appids = owned.map((g) => g.appid);
  let apps = await prisma.steamApp.findMany({ where: { appid: { in: appids } } });
  // Apps with no match at all (IGDB failed during the import): one more try now
  if (apps.length < appids.length) {
    const have = new Set(apps.map((app) => app.appid));
    await ensureSteamApps(appids.filter((appid) => !have.has(appid)));
    apps = await prisma.steamApp.findMany({ where: { appid: { in: appids } } });
  }
  const appsById = new Map(apps.map((app) => [app.appid, app]));

  const byGame = new Map();
  const others = [];
  for (const game of owned) {
    const app = appsById.get(game.appid);
    if (!app?.gameId) {
      others.push({ appid: game.appid, name: game.name, minutes: game.minutes, kind: app?.kind ?? 'none', shared: game.shared });
      continue;
    }
    const entry = byGame.get(app.gameId);
    if (!entry) {
      byGame.set(app.gameId, {
        gameId: app.gameId,
        title: app.title ?? game.name, // IGDB's title ("Counter-Strike 2", not Steam's old name)
        coverUrl: app.coverUrl,
        releaseDate: app.releaseDate,
        platforms: app.platforms,
        minutes: game.minutes,
        minutes2Weeks: game.minutes2Weeks,
        lastPlayedAt: game.lastPlayedAt,
        shared: game.shared, // played through Steam Family Sharing, not owned
      });
      continue;
    }
    entry.shared &&= game.shared; // owned as any of its Steam apps = owned
    entry.minutes = Math.min(entry.minutes + game.minutes, INT_MAX);
    entry.minutes2Weeks = Math.max(entry.minutes2Weeks, game.minutes2Weeks);
    if (game.lastPlayedAt && (!entry.lastPlayedAt || game.lastPlayedAt > entry.lastPlayedAt)) entry.lastPlayedAt = game.lastPlayedAt;
  }

  // The player's own ratings and Backlog, for every game at once
  const gameIds = [...byGame.keys()];
  const [reviews, backlog] = await Promise.all([
    prisma.review.findMany({ where: { userId, gameId: { in: gameIds } }, select: { gameId: true, rating: true } }),
    prisma.backlogItem.findMany({ where: { userId, gameId: { in: gameIds } }, select: { gameId: true } }),
  ]);
  const ratings = new Map(reviews.map((r) => [r.gameId, r.rating]));
  const inBacklog = new Set(backlog.map((b) => b.gameId));

  const games = [...byGame.values()]
    .map((game) => ({ ...game, myRating: ratings.get(game.gameId) ?? null, inBacklog: inBacklog.has(game.gameId) }))
    .sort((a, b) => b.minutes - a.minutes || a.title.localeCompare(b.title));
  others.sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name));

  return {
    connected: true,
    steamId,
    profileUrl: steamProfileUrl(steamId),
    personaName: library?.personaName ?? null,
    libraryEnabled: Boolean(steamApiKey),
    importedAt: library?.importedAt ?? null,
    state: library?.state ?? null,
    hoursHidden: library?.hoursHidden ?? false,
    games,
    others,
  };
};
