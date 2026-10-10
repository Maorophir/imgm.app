/**
 * IMGM Top Games — the community's chart (like IMDb's Top 250, on IMGM reviews only).
 *
 * Ranked by a weighted score (lib/ranking.js, IMDb's own formula), so one glowing review
 * can't top it. A game enters with MIN_REVIEWS review(s). Filters keep each game's rank.
 */
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { getSessionUser } from '../lib/session.js';
import { rankGames } from '../lib/ranking.js';

const CHART_SIZE = 100;
const MIN_REVIEWS = 1;

// A platform filter shows what plays there (a PS4 game runs on a PS5, and so on)
const PLATFORM_GROUPS = {
  pc: ['PC'],
  playstation: ['PlayStation 5', 'PlayStation 4'],
  xbox: ['Xbox Series X|S', 'Xbox One'],
  switch: ['Nintendo Switch 2', 'Nintendo Switch'],
};

const query = z.object({
  sort: z.enum(['rank', 'score', 'reviews', 'newest']).default('rank'),
  platform: z.enum(Object.keys(PLATFORM_GROUPS)).optional(),
});

const SORTS = {
  rank: (a, b) => a.rank - b.rank,
  score: (a, b) => b.average - a.average || a.rank - b.rank,
  reviews: (a, b) => b.reviewCount - a.reviewCount || a.rank - b.rank,
  newest: (a, b) => (b.releaseDate?.getTime() ?? 0) - (a.releaseDate?.getTime() ?? 0) || a.rank - b.rank,
};

// GET /api/games/top?sort=&platform= — the chart, plus the viewer's own scores
export const getTopGames = async (req, res) => {
  const params = query.safeParse(req.query);
  if (!params.success) return res.status(400).json({ error: 'Invalid request' });
  const { sort, platform } = params.data;

  try {
    const ranked = (await rankGames({ minReviews: MIN_REVIEWS })).slice(0, CHART_SIZE);

    const ids = ranked.map((r) => r.gameId);
    const user = await getSessionUser(req).catch(() => null);
    const [games, mine] = await Promise.all([
      prisma.game.findMany({
        where: { id: { in: ids } },
        select: { id: true, title: true, coverUrl: true, releaseDate: true, platforms: true, genres: true },
      }),
      user
        ? prisma.review.findMany({ where: { userId: user.id, gameId: { in: ids } }, select: { gameId: true, rating: true } })
        : [],
    ]);
    const gameById = new Map(games.map((g) => [g.id, g]));
    const myScore = new Map(mine.map((r) => [r.gameId, r.rating]));

    const chart = ranked.map((r) => ({ ...gameById.get(r.gameId), ...r, myRating: myScore.get(r.gameId) ?? null }));
    const playsOn = (g) => !platform || PLATFORM_GROUPS[platform].some((p) => g.platforms?.includes(p));
    const shown = chart.filter(playsOn).sort(SORTS[sort]);

    const average = (list) => (list.length ? list.reduce((sum, x) => sum + x, 0) / list.length : null);
    res.json({
      games: shown,
      size: chart.length,
      insights: {
        chartAverage: average(chart.map((g) => g.average)),
        myAverage: user ? average(mine.map((r) => r.rating)) : null,
        reviewedByMe: user ? mine.length : null,
      },
    });
  } catch (error) {
    console.error('Error building the Top Games chart:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
