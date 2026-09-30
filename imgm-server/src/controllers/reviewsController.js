import { prisma } from '../lib/db.js';
import { getSessionUser as getUser } from '../lib/session.js';
import { reviewSchema } from '../lib/reviewSchema.js';
import { VETERAN_HOURS, CHECKLIST } from '../lib/reviewOptions.js';
import { ensureGame } from '../services/gameStore.js';
import { findSlurField, withMaskedText } from '../lib/reviewText.js';

// What we send back for each review: the author and the "X meets Y" games
const REVIEW_INCLUDE = {
  analysis: true,
  // Public author info = the gamer tag only (never the real name or Google photo)
  user: { select: { id: true, displayUsername: true } },
  comparedA: { select: { id: true, title: true, coverUrl: true } },
  comparedB: { select: { id: true, title: true, coverUrl: true } },
};

// A skipped quest screen = null / empty. Starting every save from this means
// that editing a review and skipping a screen clears the old answer.
const CHECKLIST_FIELDS = Object.keys(CHECKLIST);

const EMPTY_ANSWERS = {
  platform: null, hoursPlayed: null, completionStatus: null, playStyle: null,
  vibes: [], gotGoodAfter: null,
  ...Object.fromEntries(CHECKLIST_FIELDS.map((f) => [f, null])), // graphics: null, bugs: null, …
  comparedAId: null, comparedBId: null,
  pros: [], cons: [],
  bestMoment: null, worstMoment: null, hasSpoilers: false,
  reviewText: null,
};

const OPTIONAL_SCREENS = 8;

/**
 * How many of the 8 optional quest screens (② – ⑨) were answered.
 */
const countAnsweredScreens = (r) =>
  [
    r.platform || r.hoursPlayed != null || r.completionStatus || r.playStyle, // ② setup
    r.vibes.length > 0,                                                       // ③ vibes
    r.gotGoodAfter,                                                           // ④ got good
    CHECKLIST_FIELDS.some((f) => r[f]),                                       // ⑤ checklist
    r.comparedAId || r.comparedBId,                                           // ⑥ X meets Y
    r.pros.length > 0 || r.cons.length > 0,                                   // ⑦ pros & cons
    r.bestMoment || r.worstMoment,                                            // ⑧ moments
    r.reviewText,                                                             // ⑨ final words
  ].filter(Boolean).length;

/**
 * Works out which badges a review earns. "First Reviewer" is kept when a
 * review is edited later, even if someone else has reviewed the game since.
 */
const awardBadges = (answers, { previousBadges = [], isFirstForGame }) => {
  const badges = new Set();

  if (previousBadges.includes('first_reviewer') || isFirstForGame) badges.add('first_reviewer');
  if (countAnsweredScreens(answers) === OPTIONAL_SCREENS) badges.add('deep_diver');
  if (answers.completionStatus === 'completed_100') badges.add('completionist');
  if (answers.hoursPlayed >= VETERAN_HOURS) badges.add('veteran');

  return [...badges];
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
    // Swearing gets a masked copy; the site shows it unless the viewer opts in
    res.json(reviews.map(withMaskedText));
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
    const { count } = await prisma.review.deleteMany({ where: { userId: user.id, gameId } });
    if (count === 0) {
      return res.status(404).json({ error: "You haven't reviewed this game." });
    }

    res.status(204).end(); // 204 = done, nothing to send back
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
