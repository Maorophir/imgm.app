/**
 * Notifications: the lines in a player's bell (the header), and the one place that
 * writes them. News about the same thing shares one row (its kind + key), so it
 * bundles: three helpful votes on a review are one line, "X and 2 others found…".
 *
 *   reply         someone answered your Discover comment (key: the comment answered)
 *   helpful       someone found your review helpful (key: the review)
 *   released      a game in your backlog came out (key: the game; lib/notifyJobs.js)
 *   gotw_closing  Game of the Week's vote closes tonight and you haven't voted (key: the
 *                 week; lib/notifyJobs.js)
 *
 * A player is never told about their own doing. Writing one never fails what caused
 * it: a vote still counts if the bell can't be written.
 */
import { prisma } from './db.js';

const MAX_ACTORS = 50; // names kept on a line (it shows the latest, then "and N others")

export const nameOf = (user) => user?.displayUsername ?? user?.username ?? 'A player';

/**
 * Adds news to a player's bell. A line they've read (or a new one) starts fresh;
 * one still unread gets the new name added, latest first.
 *   actor  { id, name }: who did it (a line about a release has none)
 */
export const addNews = async ({ userId, kind, key, data, actor }) => {
  if (actor && actor.id === userId) return; // never about your own doing
  try {
    const where = { userId_kind_key: { userId, kind, key } };
    const existing = await prisma.notification.findUnique({ where });
    if (existing && !actor) return; // a release or a reminder is said once, never again
    let actors = actor ? [actor] : undefined;
    if (existing && !existing.readAt) {
      if (actor && existing.data?.actors?.some((a) => a.id === actor.id)) return; // already says so
      if (actor) actors = [actor, ...(existing.data?.actors ?? [])].slice(0, MAX_ACTORS);
    }
    const next = { ...data, ...(actors && { actors }) };
    await prisma.notification.upsert({
      where,
      create: { userId, kind, key, data: next },
      update: { data: next, readAt: null, emailedAt: null },
    });
  } catch (error) {
    console.error(`Couldn't add a ${kind} notification:`, error.message);
  }
};

// Discover has two feeds; a game that isn't out yet is on Upcoming
const feedOf = (game) => (!game?.releaseDate || game.releaseDate > new Date() ? 'upcoming' : 'hot');

// A reply on Discover: tells the author of the comment it answers
export const notifyReply = async ({ answered, gameId, replier }) => {
  const game = await prisma.game.findUnique({ where: { id: gameId }, select: { title: true, releaseDate: true } }).catch(() => null);
  await addNews({
    userId: answered.userId,
    kind: 'reply',
    key: `comment:${answered.id}`,
    data: { gameId, title: game?.title ?? null, feed: feedOf(game) },
    actor: { id: replier.id, name: nameOf(replier) },
  });
};

// "Was this review helpful?" Yes: tells the review's author
export const notifyHelpful = async ({ review, voter }) => {
  await addNews({
    userId: review.userId,
    kind: 'helpful',
    key: `review:${review.id}`,
    data: { reviewId: review.id, gameId: review.gameId, title: review.game?.title ?? null },
    actor: { id: voter.id, name: nameOf(voter) },
  });
};

const LIST_SIZE = 20;

// The bell's list: the latest lines first, and how many are unread
export const listFor = async (userId) => {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: LIST_SIZE,
      select: { id: true, kind: true, data: true, readAt: true, updatedAt: true },
    }),
    unreadCount(userId),
  ]);
  return {
    unread,
    items: items.map(({ readAt, updatedAt, ...item }) => ({ ...item, read: Boolean(readAt), at: updatedAt })),
  };
};

export const unreadCount = (userId) => prisma.notification.count({ where: { userId, readAt: null } });

const DAY = 24 * 60 * 60 * 1000;

// Old lines go: read ones after 60 days, any after 180 (lib/notifyJobs.js, daily)
export const pruneOld = async () => {
  const now = Date.now();
  await prisma.notification.deleteMany({
    where: { OR: [{ readAt: { lt: new Date(now - 60 * DAY) } }, { updatedAt: { lt: new Date(now - 180 * DAY) } }] },
  });
};
