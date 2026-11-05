/**
 * The admin pages (/api/admin/*, only for players whose role is 'admin': requireAdmin in
 * session.js): the site's numbers, and moderation (reported comments, recent comments
 * and reviews, hiding and deleting them). Every moderation action is logged in
 * AdminAction, with a copy of anything removed so it could be put back by hand.
 *
 * Weeks are the last 7 days (today, UTC, and the 6 before it), then the 7 before those,
 * and so on, so "this week" is never a half-empty Monday.
 */
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { CHECKLIST } from '../lib/reviewOptions.js';
import { removeReview } from '../lib/reviewRemoval.js';
import { utcDay } from '../lib/activity.js';

const DAY = 24 * 60 * 60 * 1000;
const WEEKS = 8;
const LIST_SIZE = 50;

// A quick review is a score and nothing written or answered past the setup: Discover's
// "Played it?", or a quest skipped after the score. Anything more is a full quest.
const QUICK = {
  reviewText: null,
  bestMoment: null,
  worstMoment: null,
  gotGoodAfter: null,
  comparedAId: null,
  vibes: { isEmpty: true },
  pros: { isEmpty: true },
  cons: { isEmpty: true },
  ...Object.fromEntries(Object.keys(CHECKLIST).map((field) => [field, null])),
};

// How many different players appear in a table's rows since `since`
const playersIn = async (model, field, since) =>
  (await prisma[model].findMany({ where: { [field]: { gte: since } }, distinct: ['userId'], select: { userId: true } })).length;

// GET /api/admin/stats
export const getStats = async (req, res) => {
  try {
    const todayStr = utcDay();
    const today = new Date(`${todayStr}T00:00:00Z`);
    const weekStart = new Date(today.getTime() - 6 * DAY); // this week: today and the 6 days before
    const lastWeekStart = new Date(weekStart.getTime() - 7 * DAY);

    const [total, newThisWeek, weekRows, [cameBack], reviews, quick, firstDay, rated, gotwVoted, commented, playNext, discoverVoted] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
        // Different players per week, for the last 8 (week 0 = this week)
        prisma.$queryRaw`
          SELECT ((${todayStr}::date - "day") / 7)::int AS week, count(DISTINCT "userId")::int AS players
          FROM "PlayerDay"
          WHERE "day" > ${todayStr}::date - ${WEEKS * 7}::int
          GROUP BY 1`,
        // Of last week's new players, how many used the site again this week
        prisma.$queryRaw`
          SELECT count(DISTINCT u."id")::int AS joined, count(DISTINCT p."userId")::int AS returned
          FROM "User" u
          LEFT JOIN "PlayerDay" p ON p."userId" = u."id" AND p."day" >= ${utcDay(weekStart)}::date
          WHERE u."createdAt" >= ${lastWeekStart} AND u."createdAt" < ${weekStart}`,
        prisma.review.count({ where: { createdAt: { gte: weekStart } } }),
        prisma.review.count({ where: { createdAt: { gte: weekStart }, ...QUICK } }),
        prisma.playerDay.findFirst({ orderBy: { day: 'asc' }, select: { day: true } }),
        // What this week's players did. createdAt for reviews: a helpful vote also
        // touches a review's updatedAt. A vote or chat that changed counts by updatedAt.
        playersIn('review', 'createdAt', weekStart),
        playersIn('gotwVote', 'updatedAt', weekStart),
        playersIn('discoverComment', 'createdAt', weekStart),
        playersIn('playNextChat', 'updatedAt', weekStart),
        playersIn('discoverVote', 'updatedAt', weekStart),
      ]);

    const perWeek = new Map(weekRows.map((row) => [row.week, row.players]));
    const weeks = Array.from({ length: WEEKS }, (_, i) => {
      const back = WEEKS - 1 - i; // oldest first
      return { start: utcDay(new Date(weekStart.getTime() - back * 7 * DAY)), players: perWeek.get(back) ?? 0 };
    });

    res.json({
      weekStart: utcDay(weekStart),
      // Activity is only counted from the day it shipped: older weeks show 0
      activitySince: firstDay ? utcDay(firstDay.day) : null,
      players: { total, newThisWeek },
      active: { thisWeek: perWeek.get(0) ?? 0, lastWeek: perWeek.get(1) ?? 0 },
      cameBack,
      reviews: { total: reviews, quick, full: reviews - quick },
      weeks,
      doing: { rated, gotwVoted, commented, playNext, discoverVoted },
    });
  } catch (error) {
    console.error('Error building admin stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Moderation ──

const listQuery = z.object({ q: z.string().trim().max(80).optional() });
const ID = z.string().min(1).max(64);
const noteBody = z.object({ note: z.string().trim().max(300).optional() }).optional();

const AUTHOR = { select: { id: true, displayUsername: true, username: true } };
const tagOf = (user) => user?.displayUsername || user?.username || null;

// Discover comments carry only an IGDB id: the titles come from the games IMGM has stored
const withGameTitles = async (comments) => {
  const ids = [...new Set(comments.map((c) => c.gameId))];
  const games = await prisma.game.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } });
  const titles = new Map(games.map((g) => [g.id, g.title]));
  return comments.map((c) => ({
    id: c.id,
    body: c.body,
    hidden: c.hidden,
    createdAt: c.createdAt,
    parentId: c.parentId,
    gameId: c.gameId,
    gameTitle: titles.get(c.gameId) ?? null,
    author: { id: c.user.id, tag: tagOf(c.user) },
    likes: c._count.likes,
    replies: c._count.replies,
    reports: (c.reports ?? []).map((r) => ({ reason: r.reason, createdAt: r.createdAt, by: tagOf(r.user) })),
  }));
};
const COMMENT_INCLUDE = {
  user: AUTHOR,
  _count: { select: { likes: true, replies: true } },
};

// GET /api/admin/reports — every comment someone reported, hidden ones first
export const listReports = async (req, res) => {
  try {
    const comments = await prisma.discoverComment.findMany({
      where: { reports: { some: {} } },
      include: { ...COMMENT_INCLUDE, reports: { include: { user: AUTHOR }, orderBy: { createdAt: 'desc' } } },
      orderBy: [{ hidden: 'desc' }, { createdAt: 'desc' }],
      take: LIST_SIZE,
    });
    res.json({ comments: await withGameTitles(comments) });
  } catch (error) {
    console.error('Error listing reported comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/admin/comments?q= — the newest comments, or the ones whose words or writer match
export const listComments = async (req, res) => {
  const query = listQuery.safeParse(req.query);
  if (!query.success) return res.status(400).json({ error: 'Bad request' });
  const q = query.data.q;
  try {
    const comments = await prisma.discoverComment.findMany({
      where: q ? { OR: [{ body: { contains: q, mode: 'insensitive' } }, { user: { username: { contains: q.toLowerCase() } } }] } : {},
      include: { ...COMMENT_INCLUDE, reports: { include: { user: AUTHOR } } },
      orderBy: { createdAt: 'desc' },
      take: LIST_SIZE,
    });
    res.json({ comments: await withGameTitles(comments) });
  } catch (error) {
    console.error('Error listing comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/admin/reviews?q= — the newest reviews, or the ones whose game or writer match
export const listReviews = async (req, res) => {
  const query = listQuery.safeParse(req.query);
  if (!query.success) return res.status(400).json({ error: 'Bad request' });
  const q = query.data.q;
  try {
    const reviews = await prisma.review.findMany({
      where: q
        ? { OR: [{ game: { title: { contains: q, mode: 'insensitive' } } }, { user: { username: { contains: q.toLowerCase() } } }] }
        : {},
      select: {
        id: true, rating: true, reviewText: true, createdAt: true, helpfulCount: true, unhelpfulCount: true,
        game: { select: { id: true, title: true } },
        user: AUTHOR,
      },
      orderBy: { createdAt: 'desc' },
      take: LIST_SIZE,
    });
    res.json({ reviews: reviews.map(({ user, ...review }) => ({ ...review, author: { id: user.id, tag: tagOf(user) } })) });
  } catch (error) {
    console.error('Error listing reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const logAction = (req, action, targetType, target, snapshot, note) =>
  prisma.adminAction.create({
    data: { adminId: req.user.id, action, targetType, targetId: target.id, targetUserId: target.userId, note: note || null, snapshot },
  });

// PUT /api/admin/comments/:id/hidden  { hidden } — hide a comment, or keep it: put it
// back and clear its reports (they were checked, so they don't count toward hiding it again)
export const setCommentHidden = async (req, res) => {
  const id = ID.safeParse(req.params.id);
  const body = z.object({ hidden: z.boolean(), note: z.string().trim().max(300).optional() }).safeParse(req.body ?? {});
  if (!id.success || !body.success) return res.status(400).json({ error: 'Bad request' });
  try {
    const comment = await prisma.discoverComment.findUnique({ where: { id: id.data }, select: { id: true, userId: true } });
    if (!comment) return res.status(404).json({ error: 'That comment is gone.' });
    const { hidden, note } = body.data;
    await prisma.$transaction([
      prisma.discoverComment.update({ where: { id: comment.id }, data: { hidden } }),
      ...(hidden ? [] : [prisma.discoverCommentReport.deleteMany({ where: { commentId: comment.id } })]),
      logAction(req, hidden ? 'comment.hide' : 'comment.keep', 'comment', comment, undefined, note),
    ]);
    res.json({ ok: true, hidden });
  } catch (error) {
    console.error('Error hiding a comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/admin/comments/:id  { note? } — its replies go with it, as when its writer deletes it
export const deleteComment = async (req, res) => {
  const id = ID.safeParse(req.params.id);
  const body = noteBody.safeParse(req.body ?? undefined);
  if (!id.success || !body.success) return res.status(400).json({ error: 'Bad request' });
  try {
    const comment = await prisma.discoverComment.findUnique({
      where: { id: id.data },
      include: { replies: { select: { id: true, userId: true, body: true, createdAt: true } } },
    });
    if (!comment) return res.status(404).json({ error: 'That comment is gone.' });
    await prisma.$transaction([
      logAction(req, 'comment.delete', 'comment', comment, JSON.parse(JSON.stringify(comment)), body.data?.note),
      prisma.discoverComment.deleteMany({ where: { id: comment.id } }),
    ]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting a comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/admin/reviews/:id  { note? } — the same delete as the player's own
export const deleteReview = async (req, res) => {
  const id = ID.safeParse(req.params.id);
  const body = noteBody.safeParse(req.body ?? undefined);
  if (!id.success || !body.success) return res.status(400).json({ error: 'Bad request' });
  try {
    const review = await prisma.review.findUnique({ where: { id: id.data } });
    if (!review) return res.status(404).json({ error: 'That review is gone.' });
    await removeReview(review, [logAction(req, 'review.delete', 'review', review, JSON.parse(JSON.stringify(review)), body.data?.note)]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting a review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
