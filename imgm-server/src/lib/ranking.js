/**
 * IMGM's ranking of games by their reviews: a weighted score (IMDb's own formula), so
 * one glowing review can't put a game on top. Used by Top Games and Game of the Week.
 *
 *     weighted = (v / (v + PULL)) × R  +  (PULL / (v + PULL)) × C
 *     R = the game's average · v = its number of reviews · C = the average of every review
 * PULL = how many reviews it takes before a game's own average counts more than the site's.
 */
import { prisma } from './db.js';

export const PULL = 3;

// Every reviewed game, best first: [{ gameId, average, reviewCount, weighted, rank }]
export const rankGames = async ({ minReviews = 1 } = {}) => {
  const [stats, site] = await Promise.all([
    prisma.review.groupBy({ by: ['gameId'], _avg: { rating: true }, _count: { _all: true } }),
    prisma.review.aggregate({ _avg: { rating: true } }),
  ]);
  const siteAverage = site._avg.rating ?? 0;
  return stats
    .filter((s) => s._count._all >= minReviews)
    .map((s) => {
      const v = s._count._all;
      const average = s._avg.rating;
      return { gameId: s.gameId, average, reviewCount: v, weighted: (v / (v + PULL)) * average + (PULL / (v + PULL)) * siteAverage };
    })
    .sort((a, b) => b.weighted - a.weighted || b.reviewCount - a.reviewCount)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
};
