import { fromNodeHeaders } from 'better-auth/node';
import { prisma } from '../lib/db.js';
import { auth } from '../lib/auth.js';
import { isBeta } from '../lib/config.js';
import { reviewSchema } from '../lib/reviewSchema.js';
import { VETERAN_HOURS } from '../lib/reviewOptions.js';
import { ensureGame } from '../services/gameStore.js';

// What we send back for each review: the author and the "X meets Y" games
const REVIEW_INCLUDE = {
  analysis: true,
  user: { select: { id: true, name: true, image: true } },
  comparedA: { select: { id: true, title: true, coverUrl: true } },
  comparedB: { select: { id: true, title: true, coverUrl: true } },
};

// A skipped quest screen = null / empty. Starting every save from this means
// that editing a review and skipping a screen clears the old answer.
const EMPTY_ANSWERS = {
  platform: null, hoursPlayed: null, completionStatus: null, difficulty: null, playStyle: null,
  vibes: [], gotGoodAfter: null,
  scoreStory: null, scoreGameplay: null, scoreVisuals: null, scoreSound: null, scorePerformance: null,
  comparedAId: null, comparedBId: null,
  pros: [], cons: [],
  bestMoment: null, worstMoment: null, hasSpoilers: false,
  worthPrice: null, replay: null,
  reviewText: null,
};

/**
 * How many of the 9 optional quest screens (② – ⑩) were answered.
 */
const countAnsweredScreens = (r) =>
  [
    r.platform || r.hoursPlayed != null || r.completionStatus || r.difficulty || r.playStyle, // ② setup
    r.vibes.length > 0,                                                                       // ③ vibes
    r.gotGoodAfter,                                                                           // ④ got good
    [r.scoreStory, r.scoreGameplay, r.scoreVisuals, r.scoreSound, r.scorePerformance]
      .some((s) => s != null),                                                                // ⑤ part scores
    r.comparedAId || r.comparedBId,                                                           // ⑥ X meets Y
    r.pros.length > 0 || r.cons.length > 0,                                                   // ⑦ pros & cons
    r.bestMoment || r.worstMoment,                                                            // ⑧ moments
    r.worthPrice || r.replay,                                                                 // ⑨ price + replay
    r.reviewText,                                                                             // ⑩ your words
  ].filter(Boolean).length;

/**
 * Works out which badges a review earns. "Once earned" badges (first reviewer,
 * beta tester) are kept when a review is edited later.
 */
const awardBadges = (answers, { previousBadges = [], isFirstForGame }) => {
  const badges = new Set();

  if (previousBadges.includes('first_reviewer') || isFirstForGame) badges.add('first_reviewer');
  if (previousBadges.includes('beta_tester') || isBeta) badges.add('beta_tester');
  if (countAnsweredScreens(answers) === 9) badges.add('deep_diver');
  if (answers.completionStatus === 'completed_100') badges.add('completionist');
  if (answers.hoursPlayed >= VETERAN_HOURS) badges.add('veteran');

  return [...badges];
};

/**
 * Returns the logged-in user, or null.
 */
const getUser = async (req) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  return session?.user ?? null;
};

// GET /api/reviews/game/:gameId
export const getReviewsByGameId = async (req, res) => {
  const gameId = Number.parseInt(req.params.gameId, 10);
  if (Number.isNaN(gameId)) {
    return res.status(400).json({ error: 'Invalid game id' });
  }

  try {
    const reviews = await prisma.review.findMany({
      where: { gameId },
      include: REVIEW_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    res.json(reviews);
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
      select: { badges: true },
    });
    const otherReviews = await prisma.review.count({
      where: { gameId, userId: { not: user.id } },
    });
    const badges = awardBadges(answers, {
      previousBadges: existing?.badges,
      isFirstForGame: !existing && otherReviews === 0,
    });

    // 5. Save — one review per user per game, so this creates or updates
    const data = { rating, ...answers, badges };
    const review = await prisma.review.upsert({
      where: { userId_gameId: { userId: user.id, gameId } },
      create: { ...data, userId: user.id, gameId },
      update: data,
      include: REVIEW_INCLUDE,
    });

    // AI analysis is intentionally skipped for now — services/ai.js is still a
    // placeholder, and a fake "Positive" is worse than no sentiment (Phase 6).

    res.status(existing ? 200 : 201).json(review);
  } catch (error) {
    console.error('Error saving review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
