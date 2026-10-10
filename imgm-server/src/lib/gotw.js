/**
 * Game of the Week — players vote Sunday to Saturday (Israel time) on a ballot of
 * BALLOT_SIZE games; the winner is the Game of the Week for the following week.
 *
 * No timer runs it (Render's free plan sleeps): the first request after Saturday
 * midnight closes the finished week (counts its votes, crowns the winner) and opens
 * the new ballot. Doing it twice is harmless: a week's id is unique, so a second
 * attempt finds the week the first one made.
 *
 * Each ballot slot comes from a different place, so every week has variety even while
 * IMGM is small (each slot is labelled on the ballot):
 *     hot          most new reviews on IMGM in the last two weeks
 *     favorite     the best weighted score (Top Games)
 *     new_release  the most popular game released in the last 90 days (IGDB)
 *     hidden_gem   loved (8+) by the few who reviewed it
 *     classic      5+ years old and still rated highly
 *     popular      fills any empty slot from IGDB's popular games
 * A game that won in the last NO_REPEAT_WEEKS weeks can't be a candidate.
 * Votes are final (no switching to the leader after seeing the results).
 */
import { prisma } from './db.js';
import { rankGames } from './ranking.js';
import * as igdb from '../services/igdbService.js';
import { upsertGame } from '../services/gameStore.js';

export const TIME_ZONE = 'Asia/Jerusalem';
const BALLOT_SIZE = 6;
const NO_REPEAT_WEEKS = 4; // a winner sits out about a month
const DAY = 24 * 60 * 60 * 1000;

// ── The week, in Israel time ─────────────────────────────

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// What an Israeli clock and calendar show at this instant
const israelClock = (instant) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE, year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23', weekday: 'short',
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value])
  );
  return { ...parts, weekday: WEEKDAYS.indexOf(parts.weekday) };
};

// The instant it's 00:00 in Israel on a calendar day (daylight saving included)
const israelMidnight = (year, month, day) => {
  let instant = Date.UTC(year, month - 1, day);
  for (let i = 0; i < 2; i += 1) {
    const c = israelClock(new Date(instant));
    const offset = Date.UTC(c.year, c.month - 1, c.day, c.hour, c.minute, c.second) - instant;
    instant = Date.UTC(year, month - 1, day) - offset;
  }
  return new Date(instant);
};

// The voting week an instant falls in: { id: "2026-10-11", startsAt, endsAt }
export const weekOf = (instant = new Date()) => {
  const c = israelClock(instant);
  const sunday = new Date(Date.UTC(Number(c.year), Number(c.month) - 1, Number(c.day) - c.weekday));
  const [y, m, d] = [sunday.getUTCFullYear(), sunday.getUTCMonth() + 1, sunday.getUTCDate()];
  const next = new Date(Date.UTC(y, m - 1, d + 7));
  return {
    id: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    startsAt: israelMidnight(y, m, d),
    endsAt: israelMidnight(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate()),
  };
};

// ── Closing a week ───────────────────────────────────────

const tallyOf = async (weekId) =>
  new Map(
    (await prisma.gotwVote.groupBy({ by: ['gameId'], where: { weekId }, _count: { _all: true } })).map((t) => [t.gameId, t._count._all])
  );

// Most votes wins; a tie (or a week nobody voted in) goes to the better IMGM ranking
const closeFinishedWeeks = async (now) => {
  const finished = await prisma.gotwWeek.findMany({
    where: { closedAt: null, endsAt: { lte: now } },
    include: { candidates: { orderBy: { order: 'asc' } } },
  });
  if (finished.length === 0) return;
  const rank = new Map((await rankGames()).map((r) => [r.gameId, r.rank]));
  for (const week of finished) {
    const tally = await tallyOf(week.id);
    const [winner] = [...week.candidates].sort(
      (a, b) =>
        (tally.get(b.gameId) ?? 0) - (tally.get(a.gameId) ?? 0) ||
        (rank.get(a.gameId) ?? Infinity) - (rank.get(b.gameId) ?? Infinity) ||
        a.order - b.order
    );
    await prisma.gotwWeek.update({ where: { id: week.id }, data: { winnerId: winner?.gameId ?? null, closedAt: now } });
  }
};

// ── Building a ballot ────────────────────────────────────

const pickCandidates = async (now) => {
  const recentWinners = await prisma.gotwWeek.findMany({
    where: { winnerId: { not: null } },
    orderBy: { startsAt: 'desc' },
    take: NO_REPEAT_WEEKS,
    select: { winnerId: true },
  });
  const taken = new Set(recentWinners.map((w) => w.winnerId));
  const ballot = [];
  const add = (gameId, slot) => {
    if (!gameId || taken.has(gameId) || ballot.length >= BALLOT_SIZE) return false;
    taken.add(gameId);
    ballot.push({ gameId, slot });
    return true;
  };

  const ranked = await rankGames();
  const released = new Map(
    (await prisma.game.findMany({ where: { id: { in: ranked.map((r) => r.gameId) } }, select: { id: true, releaseDate: true } })).map((g) => [g.id, g.releaseDate])
  );
  let popular = [];
  try {
    popular = await igdb.getPopularGames(40);
  } catch (error) {
    console.error('Game of the Week: IGDB popular games unavailable:', error.message);
  }
  const addFromIgdb = async (game, slot) => {
    if (!add(game.id, slot)) return false;
    await upsertGame(game); // the ballot links to it, so it must be in our database
    return true;
  };

  // hot: the most new reviews lately
  const hot = await prisma.review.groupBy({
    by: ['gameId'],
    where: { createdAt: { gte: new Date(now - 14 * DAY) } },
    _count: { _all: true },
    orderBy: { _count: { gameId: 'desc' } },
    take: 10,
  });
  hot.some((h) => add(h.gameId, 'hot'));
  // favorite: the best weighted score
  ranked.some((r) => add(r.gameId, 'favorite'));
  // new_release: the most popular recent release
  for (const game of popular) {
    const date = game.releaseDate && new Date(game.releaseDate);
    if (date && date <= now && now - date < 90 * DAY && (await addFromIgdb(game, 'new_release'))) break;
  }
  // hidden_gem: loved by the few who played it
  [...ranked]
    .filter((r) => r.average >= 8)
    .sort((a, b) => a.reviewCount - b.reviewCount || b.average - a.average)
    .some((r) => add(r.gameId, 'hidden_gem'));
  // classic: 5+ years old, still loved
  ranked.some((r) => released.get(r.gameId) && now - released.get(r.gameId) > 5 * 365 * DAY && add(r.gameId, 'classic'));
  // fill the rest: IGDB's popular games, then IMGM's next best
  for (const game of popular) {
    if (ballot.length >= BALLOT_SIZE) break;
    await addFromIgdb(game, 'popular');
  }
  ranked.some((r) => (add(r.gameId, 'favorite'), ballot.length >= BALLOT_SIZE));
  return ballot;
};

// ── The current week ─────────────────────────────────────

const WEEK_INCLUDE = { candidates: { orderBy: { order: 'asc' } } };

const openCurrentWeek = async () => {
  const now = new Date();
  const { id, startsAt, endsAt } = weekOf(now);
  const existing = await prisma.gotwWeek.findUnique({ where: { id }, include: WEEK_INCLUDE });
  if (existing) return existing;

  await closeFinishedWeeks(now);
  const ballot = await pickCandidates(now);
  try {
    return await prisma.gotwWeek.create({
      data: { id, startsAt, endsAt, candidates: { create: ballot.map((c, order) => ({ ...c, order })) } },
      include: WEEK_INCLUDE,
    });
  } catch (error) {
    if (error.code === 'P2002') return prisma.gotwWeek.findUnique({ where: { id }, include: WEEK_INCLUDE }); // made meanwhile
    throw error;
  }
};

// One opening at a time in this server, however many visitors arrive at once
let opening = null;
export const currentWeek = () => {
  opening ??= openCurrentWeek().finally(() => {
    opening = null;
  });
  return opening;
};

export { tallyOf };
