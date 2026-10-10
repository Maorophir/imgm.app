/**
 * Player XP — a player's XP is the sum of the XP stored on their reviews (what the
 * quest earned + what helpful votes earned), so editing or deleting a review
 * corrects it automatically, plus GOTW_VOTE_XP for each Game of the Week vote. Levels and tiers are
 * worked out from this number on the client (imgm-client/src/lib/levels.js).
 */
import { prisma } from './db.js';

export const GOTW_VOTE_XP = 5;

// One player's total XP and review count
export const getPlayerXp = async (userId) => {
  const [{ _sum, _count }, votes] = await Promise.all([
    prisma.review.aggregate({ where: { userId }, _sum: { xp: true, helpfulXp: true }, _count: { _all: true } }),
    prisma.gotwVote.count({ where: { userId } }),
  ]);
  return { xp: (_sum.xp ?? 0) + (_sum.helpfulXp ?? 0) + votes * GOTW_VOTE_XP, reviews: _count._all };
};

/**
 * Adds `user.xp` to each review's author, so reviews can show the writer's
 * level. One grouped query for all the authors on the page.
 */
export const withAuthorXp = async (reviews) => {
  const userIds = [...new Set(reviews.map((r) => r.userId))];
  if (userIds.length === 0) return reviews;

  const [totals, votes] = await Promise.all([
    prisma.review.groupBy({ by: ['userId'], where: { userId: { in: userIds } }, _sum: { xp: true, helpfulXp: true } }),
    prisma.gotwVote.groupBy({ by: ['userId'], where: { userId: { in: userIds } }, _count: { _all: true } }),
  ]);
  const voteXp = new Map(votes.map((v) => [v.userId, v._count._all * GOTW_VOTE_XP]));
  const xpByUser = new Map(totals.map((t) => [t.userId, (t._sum.xp ?? 0) + (t._sum.helpfulXp ?? 0) + (voteXp.get(t.userId) ?? 0)]));

  return reviews.map((r) => ({ ...r, user: r.user && { ...r.user, xp: xpByUser.get(r.userId) ?? 0 } }));
};
