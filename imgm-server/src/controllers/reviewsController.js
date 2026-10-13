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
import { cacheAtEdge } from '../lib/cdnCache.js';
import { CHECKLIST } from '../lib/reviewOptions.js';

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
  // One review to show first, whatever the sort (a review clicked on the home page)
  focus: z.string().trim().min(1).max(40).optional(),
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
  const { sort, tier, rating, offset, limit, focus } = query.data;

  try {
    const user = await getUser(req).catch(() => null);
    const where = {
      gameId,
      ...(rating ? { rating } : tier && { rating: { gte: TIER_RATINGS[tier][0], lte: TIER_RATINGS[tier][1] } }),
      ...(user && { NOT: { userId: user.id } }),
    };
    const [page, total, mine, focused] = await Promise.all([
      prisma.review.findMany({ where, include: withViewerVote(user?.id), orderBy: REVIEW_SORTS[sort], skip: offset, take: limit }),
      prisma.review.count({ where }),
      user && offset === 0
        ? prisma.review.findUnique({ where: { userId_gameId: { userId: user.id, gameId } }, include: REVIEW_INCLUDE })
        : null,
      // Only a review of THIS game, and not the viewer's own (that one is `mine`)
      focus && offset === 0
        ? prisma.review.findFirst({ where: { id: focus, gameId, ...(user && { NOT: { userId: user.id } }) }, include: withViewerVote(user?.id) })
        : null,
    ]);
    const [reviews, [mineForClient = null], [focusedForClient = null]] = await Promise.all([
      forClient(page),
      forClient(mine ? [mine] : []),
      forClient(focused ? [focused] : []),
    ]);
    res.json({ reviews, mine: mineForClient, focused: focusedForClient, total, hasMore: offset + page.length < total });
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

    // A game that isn't out yet can't get a new review (its pages offer Add to Backlog
    // instead, imgm-client/src/lib/release.js). Editing one written before is still fine.
    if (game.releaseDate && new Date(game.releaseDate) > new Date()) {
      const reviewed = await prisma.review.count({ where: { userId: user.id, gameId } });
      if (!reviewed) {
        return res.status(400).json({ error: `You can rate ${game.title} once it's out.` });
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
//
// Each game comes with what the home page's two big cards and its key-art band show,
// so the page needs no second round of requests: genres, release date and studio (the
// cards' small print), the first artwork (the band; the others would only weigh the
// answer down), and its IMGM average and review count (the band's caption).
//
// Each review also brings its checklist answers (only the ones it ticked), for the back
// of the home page's card: turned over, it shows the checklist like a game page's card.
//
// The site owner can pin one review as the home page's card (HOME_PINNED_REVIEW_ID, see
// .env.example). It comes back with `pinned: true`: marked in place when it is one of the
// newest, otherwise added at the end, so the rest of the list stays newest first.
const PER_GAME = 2;
const recentQuery = z.object({ limit: z.coerce.number().int().min(1).max(12).default(8) });
const CHECKLIST_FIELDS = Object.keys(CHECKLIST);
const RECENT_SELECT = {
  id: true,
  rating: true,
  reviewText: true,
  createdAt: true,
  ...Object.fromEntries(CHECKLIST_FIELDS.map((field) => [field, true])),
  user: { select: { displayUsername: true } },
  game: {
    select: { id: true, title: true, coverUrl: true, genres: true, releaseDate: true, developer: true, artworks: true },
  },
};
export const getRecentReviews = async (req, res) => {
  const query = recentQuery.safeParse(req.query);
  if (!query.success) return res.status(400).json({ error: 'Invalid request' });
  const pinnedId = process.env.HOME_PINNED_REVIEW_ID?.trim() || null;
  try {
    const [newest, pinned] = await Promise.all([
      prisma.review.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: query.data.limit * 6, // enough to fill the row even with a busy game
        select: RECENT_SELECT,
      }),
      // Reviews have no hidden or removed state (a deleted review, or a deleted
      // player's, is gone from the DB), so a pinned review that still exists is public.
      // An id that no longer exists simply pins nothing.
      pinnedId ? prisma.review.findUnique({ where: { id: pinnedId }, select: RECENT_SELECT }) : null,
    ]);
    const perGame = new Map();
    const latest = newest
      .filter((review) => {
        const shown = perGame.get(review.game.id) ?? 0;
        perGame.set(review.game.id, shown + 1);
        return shown < PER_GAME;
      })
      .slice(0, query.data.limit);
    const reviews = pinned && !latest.some((review) => review.id === pinned.id) ? [...latest, pinned] : latest;

    // Each game's IMGM average and review count, in one grouped query for the list
    const gameIds = [...new Set(reviews.map((review) => review.game.id))];
    const stats = gameIds.length
      ? await prisma.review.groupBy({
        by: ['gameId'],
        where: { gameId: { in: gameIds } },
        _avg: { rating: true },
        _count: { _all: true },
      })
      : [];
    const statsByGame = new Map(stats.map((s) => [s.gameId, s]));

    // The same list for every visitor, so Vercel's CDN may keep it for a minute: the home
    // page's cards then come from the edge even while this server sleeps
    cacheAtEdge(res, { maxAge: 60, staleWhileRevalidate: 86400 });
    res.json(
      reviews.map((review) => {
        const { masked, reviewText } = withMaskedText(review);
        const text = (masked?.reviewText ?? reviewText)?.trim() || null;
        const { artworks, ...game } = review.game;
        const stat = statsByGame.get(game.id);
        return {
          id: review.id,
          rating: review.rating,
          snippet: text && (text.length > 160 ? `${text.slice(0, 160).trimEnd()}…` : text),
          createdAt: review.createdAt,
          author: review.user?.displayUsername ?? null,
          // { graphics: 'pretty', story: 'tears', … }, the answers it gave (empty if none)
          checklist: Object.fromEntries(CHECKLIST_FIELDS.filter((field) => review[field]).map((field) => [field, review[field]])),
          game: {
            ...game,
            artworks: artworks.slice(0, 1),
            ratings: stat ? { imgm: stat._avg.rating } : {},
            reviewCount: stat?._count._all ?? 0,
          },
          ...(review.id === pinnedId && { pinned: true }),
        };
      })
    );
  } catch (error) {
    console.error('Error fetching recent reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
