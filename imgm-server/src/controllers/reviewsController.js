import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { getSessionUser as getUser } from '../lib/session.js';
import { reviewSchema } from '../lib/reviewSchema.js';
import { EMPTY_ANSWERS, reviewXp, awardBadges } from '../lib/reviewScoring.js';
import { ensureGame } from '../services/gameStore.js';
import { findSlurField, withMaskedText } from '../lib/reviewText.js';
import { getPlayerXp, withAuthorXp } from '../lib/playerXp.js';
import { notifyReviewChanged } from '../lib/aiIndex.js';
import { castVote } from '../lib/reviewVotes.js';
import { refreshGameSummary } from '../lib/aiSummary.js';

// Until a player confirms their email they can post only this many reviews: enough to
// try IMGM, too few for bots and throwaway accounts to flood a game with fake reviews.
// Editing a review they already posted is always fine. (Google accounts arrive confirmed.)
export const UNCONFIRMED_REVIEW_LIMIT = 3;

// What we send back for each review: the author and the "X meets Y" games
const REVIEW_INCLUDE = {
  analysis: true,
  // Public author info = the gamer tag + their IMGM profile picture (never the real
  // name or the Google photo)
  user: { select: { id: true, displayUsername: true, avatarUpdatedAt: true } },
  comparedA: { select: { id: true, title: true, coverUrl: true } },
  comparedB: { select: { id: true, title: true, coverUrl: true } },
};

// Sort orders (ties: newest first, then id, so pages never overlap)
const REVIEW_SORTS = {
  helpful: [{ helpfulScore: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
  newest: [{ createdAt: 'desc' }, { id: 'desc' }],
  highest: [{ rating: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
  lowest: [{ rating: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
};
// The rarity tiers' ratings (the same ranges as the site's RARITIES)
const TIER_RATINGS = {
  junk: [1, 2],
  common: [3, 4],
  uncommon: [5, 5],
  rare: [6, 7],
  epic: [8, 9],
  legendary: [10, 10],
};
const pageQuery = z.object({
  sort: z.enum(Object.keys(REVIEW_SORTS)).default('helpful'),
  tier: z.enum(Object.keys(TIER_RATINGS)).optional(),
  rating: z.coerce.number().int().min(1).max(10).optional(), // one exact score (beats tier)
  offset: z.coerce.number().int().min(0).max(10000).default(0),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

// The viewer's own vote rides along on each review (as `myVote`: true / false / null)
const withViewerVote = (userId) =>
  userId ? { ...REVIEW_INCLUDE, votes: { where: { userId }, select: { helpful: true } } } : REVIEW_INCLUDE;

// Author XP + the masked copy of any swearing (the site shows it unless the viewer opts in)
const forClient = async (reviews) =>
  (await withAuthorXp(reviews)).map(({ votes, ...review }) => withMaskedText({ ...review, myVote: votes?.[0]?.helpful ?? null }));

// GET /api/reviews/game/:gameId?sort=&tier=&rating=&offset=&limit= — one page of a game's reviews.
// The viewer's own review isn't in the pages: the first page returns it as `mine`
// (whatever the filter), so the page can pin it on top.
export const getReviewsByGameId = async (req, res) => {
  const gameId = Number.parseInt(req.params.gameId, 10);
  const query = pageQuery.safeParse(req.query);
  if (Number.isNaN(gameId) || !query.success) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  const { sort, tier, rating, offset, limit } = query.data;

  try {
    const user = await getUser(req).catch(() => null);
    const where = {
      gameId,
      ...(rating ? { rating } : tier && { rating: { gte: TIER_RATINGS[tier][0], lte: TIER_RATINGS[tier][1] } }),
      ...(user && { NOT: { userId: user.id } }),
    };
    const [page, total, mine] = await Promise.all([
      prisma.review.findMany({ where, include: withViewerVote(user?.id), orderBy: REVIEW_SORTS[sort], skip: offset, take: limit }),
      prisma.review.count({ where }),
      user && offset === 0
        ? prisma.review.findUnique({ where: { userId_gameId: { userId: user.id, gameId } }, include: REVIEW_INCLUDE })
        : null,
    ]);
    const [reviews, [mineForClient = null]] = await Promise.all([forClient(page), forClient(mine ? [mine] : [])]);
    res.json({ reviews, mine: mineForClient, total, hasMore: offset + page.length < total });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/reviews/mine/:gameId — the logged-in user's review of a game (null if none)
export const getMyReview = async (req, res) => {
  const gameId = Number.parseInt(req.params.gameId, 10);
  if (Number.isNaN(gameId)) {
    return res.status(400).json({ error: 'Invalid game id' });
  }

  try {
    const user = await getUser(req);
    if (!user) {
      return res.status(401).json({ error: 'You must be logged in.' });
    }

    const review = await prisma.review.findUnique({
      where: { userId_gameId: { userId: user.id, gameId } },
      include: REVIEW_INCLUDE,
    });
    res.json(review);
  } catch (error) {
    console.error('Error fetching own review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/reviews — create a review, or update it if this user already reviewed the game
export const saveReview = async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) {
      return res.status(401).json({ error: 'You must be logged in to leave a review.' });
    }

    // 1. Validate everything the browser sent
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid review',
        issues: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      });
    }
    const { gameId, rating, ...answers } = { ...EMPTY_ANSWERS, ...parsed.data };

    // Slurs and hateful terms can't be posted (casual swearing is fine — it's masked on display)
    const slurField = findSlurField(answers);
    if (slurField) {
      return res.status(400).json({
        error: `Your ${slurField} contain${slurField.endsWith('s') ? '' : 's'} a slur or hateful term. Please remove it. Casual swearing is fine.`,
        field: slurField,
      });
    }

    // Unconfirmed email: a new review only while under the limit
    if (!user.emailVerified) {
      const [posted, editing] = await Promise.all([
        prisma.review.count({ where: { userId: user.id } }),
        prisma.review.count({ where: { userId: user.id, gameId } }),
      ]);
      if (!editing && posted >= UNCONFIRMED_REVIEW_LIMIT) {
        return res.status(403).json({
          error: `Confirm your email to post more than ${UNCONFIRMED_REVIEW_LIMIT} reviews. We sent you a link when you signed up.`,
          code: 'EMAIL_NOT_CONFIRMED',
        });
      }
    }

    // 2. Make sure the reviewed game — and any "X meets Y" games — are in our DB
    const game = await ensureGame(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    for (const id of [answers.comparedAId, answers.comparedBId].filter(Boolean)) {
      if (!(await ensureGame(id))) {
        return res.status(400).json({ error: `Compared game ${id} not found` });
      }
    }

    // 3. The platform must be one this game is actually on
    if (answers.platform && game.platforms.length > 0 && !game.platforms.includes(answers.platform)) {
      return res.status(400).json({ error: `${game.title} isn't available on ${answers.platform}` });
    }

    // 4. Badges
    const existing = await prisma.review.findUnique({
      where: { userId_gameId: { userId: user.id, gameId } },
      select: { badges: true, xp: true },
    });
    const otherReviews = await prisma.review.count({
      where: { gameId, userId: { not: user.id } },
    });
    const badges = awardBadges(answers, {
      previousBadges: existing?.badges,
      isFirstForGame: !existing && otherReviews === 0,
    });

    // 5. Save — one review per user per game, so this creates or updates
    const xp = reviewXp(answers);
    const data = { rating, ...answers, badges, xp };
    const review = await prisma.review.upsert({
      where: { userId_gameId: { userId: user.id, gameId } },
      create: { ...data, userId: user.id, gameId },
      update: data,
      include: REVIEW_INCLUDE,
    });
    // Still to play in their Backlog? The quest's done screen asks if they finished it
    // (never automatic: plenty of players review mid-game)
    const inBacklog = (await prisma.backlogItem.count({ where: { userId: user.id, gameId, finishedAt: null } })) > 0;
    notifyReviewChanged(review.id); // Play Next's search picks up the new words
    refreshGameSummary(gameId); // the game's "what players think", if it's due

    // AI review analysis comes later (Phase 6), built on services/ai/ — until then
    // no sentiment at all, because a fake "Positive" is worse than none.

    // The player's XP before and after, so the quest can celebrate a level-up
    const { xp: after } = await getPlayerXp(user.id);
    const playerXp = { before: after - xp + (existing?.xp ?? 0), after };

    res.status(existing ? 200 : 201).json({ ...review, playerXp, inBacklog });
  } catch (error) {
    console.error('Error saving review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/reviews/mine/:gameId — delete the logged-in user's review of a game
export const deleteMyReview = async (req, res) => {
  const gameId = Number.parseInt(req.params.gameId, 10);
  if (Number.isNaN(gameId)) {
    return res.status(400).json({ error: 'Invalid game id' });
  }

  try {
    const user = await getUser(req);
    if (!user) {
      return res.status(401).json({ error: 'You must be logged in.' });
    }

    // Filtering by userId means you can only ever delete your own review
    const review = await prisma.review.findUnique({
      where: { userId_gameId: { userId: user.id, gameId } },
      select: { id: true },
    });
    if (!review) {
      return res.status(404).json({ error: "You haven't reviewed this game." });
    }
    await prisma.review.delete({ where: { id: review.id } });
    notifyReviewChanged(review.id); // and Play Next's search forgets it
    refreshGameSummary(gameId); // and its summary, if that changed enough

    res.status(204).end(); // 204 = done, nothing to send back
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/reviews/:id/vote  { helpful: true | false | null } — "Was this review helpful?"
// null takes the vote back. Not on your own review.
const voteSchema = z.object({ helpful: z.boolean().nullable() });
export const voteOnReview = async (req, res) => {
  const body = voteSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Invalid vote' });
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Log in to vote.' });
    const review = await prisma.review.findUnique({ where: { id: req.params.id }, select: { userId: true } });
    if (!review) return res.status(404).json({ error: 'Review not found' });
    if (review.userId === user.id) return res.status(403).json({ error: "You can't vote on your own review." });
    res.json(await castVote(user.id, req.params.id, body.data.helpful));
  } catch (error) {
    console.error('Error voting on review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/reviews/recent?limit=8 — the newest reviews on any game, for the home page.
// Light on purpose: who, which game, the score and a short snippet (swearing masked).
// At most 2 per game, so one busy game can't fill the whole row.
const PER_GAME = 2;
const recentQuery = z.object({ limit: z.coerce.number().int().min(1).max(12).default(8) });
export const getRecentReviews = async (req, res) => {
  const query = recentQuery.safeParse(req.query);
  if (!query.success) return res.status(400).json({ error: 'Invalid request' });
  try {
    const newest = await prisma.review.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.data.limit * 6, // enough to fill the row even with a busy game
      select: {
        id: true,
        rating: true,
        reviewText: true,
        createdAt: true,
        user: { select: { displayUsername: true } },
        game: { select: { id: true, title: true, coverUrl: true } },
      },
    });
    const perGame = new Map();
    const reviews = newest
      .filter((review) => {
        const shown = perGame.get(review.game.id) ?? 0;
        perGame.set(review.game.id, shown + 1);
        return shown < PER_GAME;
      })
      .slice(0, query.data.limit);
    res.json(
      reviews.map((review) => {
        const { masked, reviewText } = withMaskedText(review);
        const text = (masked?.reviewText ?? reviewText)?.trim() || null;
        return {
          id: review.id,
          rating: review.rating,
          snippet: text && (text.length > 160 ? `${text.slice(0, 160).trimEnd()}…` : text),
          createdAt: review.createdAt,
          author: review.user?.displayUsername ?? null,
          game: review.game,
        };
      })
    );
  } catch (error) {
    console.error('Error fetching recent reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
