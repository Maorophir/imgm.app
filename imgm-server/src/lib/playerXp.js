/**
 * Player XP — a player's XP is the sum of the XP stored on their reviews (what the
 * quest earned + what helpful votes earned), so editing or deleting a review
 * corrects it automatically. Levels and tiers are
 * worked out from this number on the client (imgm-client/src/lib/levels.js).
 */
import { prisma } from './db.js';

// One player's total XP and review count
export const getPlayerXp = async (userId) => {
  const { _sum, _count } = await prisma.review.aggregate({
    where: { userId },
    _sum: { xp: true, helpfulXp: true },
    _count: { _all: true },
  });
  return { xp: (_sum.xp ?? 0) + (_sum.helpfulXp ?? 0), reviews: _count._all };
};

/**
 * Adds `user.xp` to each review's author, so reviews can show the writer's
 * level. One grouped query for all the authors on the page.
 */
export const withAuthorXp = async (reviews) => {
  const userIds = [...new Set(reviews.map((r) => r.userId))];
  if (userIds.length === 0) return reviews;

  const totals = await prisma.review.groupBy({
    by: ['userId'],
    where: { userId: { in: userIds } },
    _sum: { xp: true, helpfulXp: true },
  });
  const xpByUser = new Map(totals.map((t) => [t.userId, (t._sum.xp ?? 0) + (t._sum.helpfulXp ?? 0)]));

  return reviews.map((r) => ({ ...r, user: r.user && { ...r.user, xp: xpByUser.get(r.userId) ?? 0 } }));
};
