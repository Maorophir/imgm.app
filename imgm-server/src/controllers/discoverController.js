/**
 * Discover's thumbs up / down on games, and its comments (routes/discover.js).
 *
 * The feeds themselves are the same for everyone and cached at the edge
 * (GET /api/games/discover), so the votes come separately: counts for the games on
 * screen, and the player's own vote and score (their review's rating: Played it? shows
 * it instead of a picker, so a one-tap score never replaces a written review), which no
 * cache may share.
 */
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { getSessionUser } from '../lib/session.js';
import { sendEmail } from '../lib/email.js';
import { commentProblem } from '../lib/commentFilter.js';

const MAX_IDS = 60; // a feed is 40 games; a little room
const IGDB_ID = z.coerce.number().int().positive().max(2_147_483_647);

// { [gameId]: { up, down, mine, myRating, comments } } for the given games (mine: 1, -1
// or 0; myRating: the player's review score, or null; comments: how many, replies too)
const tally = async (gameIds, userId) => {
  const [counts, mine, rated, comments] = await Promise.all([
    prisma.discoverVote.groupBy({ by: ['gameId', 'value'], where: { gameId: { in: gameIds } }, _count: { _all: true } }),
    userId ? prisma.discoverVote.findMany({ where: { userId, gameId: { in: gameIds } }, select: { gameId: true, value: true } }) : [],
    userId ? prisma.review.findMany({ where: { userId, gameId: { in: gameIds } }, select: { gameId: true, rating: true } }) : [],
    prisma.discoverComment.groupBy({ by: ['gameId'], where: { gameId: { in: gameIds }, hidden: false }, _count: { _all: true } }),
  ]);
  const votes = Object.fromEntries(gameIds.map((id) => [id, { up: 0, down: 0, mine: 0, myRating: null, comments: 0 }]));
  for (const row of counts) votes[row.gameId][row.value > 0 ? 'up' : 'down'] = row._count._all;
  for (const row of mine) votes[row.gameId].mine = row.value;
  for (const row of rated) votes[row.gameId].myRating = row.rating;
  for (const row of comments) votes[row.gameId].comments = row._count._all;
  return votes;
};

// GET /api/discover/votes?ids=1,2,3
export const getVotes = async (req, res) => {
  const ids = z.array(IGDB_ID).max(MAX_IDS).safeParse(String(req.query.ids ?? '').split(',').filter(Boolean));
  if (!ids.success) return res.status(400).json({ error: 'Bad game ids' });
  try {
    const user = await getSessionUser(req);
    res.set('Cache-Control', 'private, no-store'); // it carries the player's own votes
    res.json(await tally([...new Set(ids.data)], user?.id ?? null));
  } catch (error) {
    console.error('Error loading Discover votes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/discover/votes/:gameId  { value: 1 | -1 | 0 }  (0 takes the vote back)
export const setVote = async (req, res) => {
  const gameId = IGDB_ID.safeParse(req.params.gameId);
  const body = z.object({ value: z.union([z.literal(1), z.literal(-1), z.literal(0)]) }).safeParse(req.body ?? {});
  if (!gameId.success || !body.success) return res.status(400).json({ error: 'Bad vote' });
  const userId = req.user.id;
  try {
    const where = { userId_gameId: { userId, gameId: gameId.data } };
    if (body.data.value === 0) await prisma.discoverVote.deleteMany({ where: { userId, gameId: gameId.data } });
    else await prisma.discoverVote.upsert({ where, create: { userId, gameId: gameId.data, value: body.data.value }, update: { value: body.data.value } });
    res.json((await tally([gameId.data], userId))[gameId.data]);
  } catch (error) {
    console.error('Error saving a Discover vote:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/*
 * Comments on a game in Discover: GET lists them (anyone), the rest need a logged-in
 * beta player (routes/discover.js). Replies are one level deep, like TikTok. A comment
 * hidden by reports is left out everywhere; its writer can still delete it.
 */
const PAGE = 20;
const COMMENT_ID = z.string().min(1).max(40);
const AUTHOR = { select: { id: true, username: true, displayUsername: true, avatarUpdatedAt: true } };
const REPORTS_TO_HIDE = 3;

// A comment as the page shows it: its writer (gamer tag and picture, never more), its
// likes and replies, and whether the viewer liked or wrote it
const shape = (row, likedIds, userId) => ({
  id: row.id,
  parentId: row.parentId,
  body: row.body,
  createdAt: row.createdAt,
  author: {
    id: row.user.id,
    tag: row.user.displayUsername ?? row.user.username ?? 'Player',
    avatarUpdatedAt: row.user.avatarUpdatedAt,
  },
  likes: row._count.likes,
  replyCount: row._count.replies ?? 0,
  liked: likedIds.has(row.id),
  mine: row.userId === userId,
});

const loadComments = async (where, userId, { orderBy, skip = 0, take }) => {
  const rows = await prisma.discoverComment.findMany({
    where: { ...where, hidden: false },
    orderBy,
    skip,
    take,
    select: {
      id: true, parentId: true, body: true, createdAt: true, userId: true, user: AUTHOR,
      _count: { select: { likes: true, replies: { where: { hidden: false } } } },
    },
  });
  const liked = userId && rows.length
    ? await prisma.discoverCommentLike.findMany({ where: { userId, commentId: { in: rows.map((r) => r.id) } }, select: { commentId: true } })
    : [];
  const likedIds = new Set(liked.map((l) => l.commentId));
  return rows.map((row) => shape(row, likedIds, userId));
};

// GET /api/discover/games/:gameId/comments?page=0 — the most liked first, then the newest
export const getComments = async (req, res) => {
  const gameId = IGDB_ID.safeParse(req.params.gameId);
  const page = z.coerce.number().int().min(0).max(50).safeParse(req.query.page ?? 0);
  if (!gameId.success || !page.success) return res.status(400).json({ error: 'Bad request' });
  try {
    const user = await getSessionUser(req).catch(() => null);
    const where = { gameId: gameId.data, parentId: null };
    const [comments, total] = await Promise.all([
      loadComments(where, user?.id ?? null, {
        orderBy: [{ likes: { _count: 'desc' } }, { createdAt: 'desc' }],
        skip: page.data * PAGE,
        take: PAGE + 1, // one more says whether there's another page
      }),
      prisma.discoverComment.count({ where: { gameId: gameId.data, hidden: false } }),
    ]);
    res.set('Cache-Control', 'private, no-store'); // it carries the viewer's own likes
    res.json({ comments: comments.slice(0, PAGE), more: comments.length > PAGE, total });
  } catch (error) {
    console.error('Error loading Discover comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/discover/comments/:id/replies — oldest first, as a conversation reads
export const getReplies = async (req, res) => {
  const id = COMMENT_ID.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: 'Bad request' });
  try {
    const user = await getSessionUser(req).catch(() => null);
    res.set('Cache-Control', 'private, no-store');
    res.json({ replies: await loadComments({ parentId: id.data }, user?.id ?? null, { orderBy: { createdAt: 'asc' }, take: 200 }) });
  } catch (error) {
    console.error('Error loading Discover replies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const commentSchema = z.object({
  body: z.string().trim().min(1).max(300).transform((text) => text.replace(/\n{3,}/g, '\n\n')),
  parentId: COMMENT_ID.optional(),
});

// POST /api/discover/games/:gameId/comments  { body, parentId? }
export const postComment = async (req, res) => {
  const gameId = IGDB_ID.safeParse(req.params.gameId);
  const body = commentSchema.safeParse(req.body ?? {});
  if (!gameId.success || !body.success) return res.status(400).json({ error: 'Write 1 to 300 characters.' });
  const problem = commentProblem(body.data.body);
  if (problem) return res.status(422).json({ error: problem });
  try {
    // A reply joins the conversation of the comment it answers (one level deep)
    let parentId = null;
    if (body.data.parentId) {
      const parent = await prisma.discoverComment.findUnique({ where: { id: body.data.parentId }, select: { id: true, parentId: true, gameId: true, hidden: true } });
      if (!parent || parent.hidden || parent.gameId !== gameId.data) return res.status(404).json({ error: 'That comment is gone.' });
      parentId = parent.parentId ?? parent.id;
    }
    const created = await prisma.discoverComment.create({
      data: { gameId: gameId.data, userId: req.user.id, parentId, body: body.data.body },
      select: { id: true },
    });
    const [comment] = await loadComments({ id: created.id }, req.user.id, { take: 1 });
    res.status(201).json(comment);
  } catch (error) {
    console.error('Error saving a Discover comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/discover/comments/:id — your own only (its replies go with it)
export const deleteComment = async (req, res) => {
  const id = COMMENT_ID.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: 'Bad request' });
  try {
    const { count } = await prisma.discoverComment.deleteMany({ where: { id: id.data, userId: req.user.id } });
    if (!count) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting a Discover comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/discover/comments/:id/like  { liked: true | false }
export const likeComment = async (req, res) => {
  const id = COMMENT_ID.safeParse(req.params.id);
  const body = z.object({ liked: z.boolean() }).safeParse(req.body ?? {});
  if (!id.success || !body.success) return res.status(400).json({ error: 'Bad request' });
  const userId = req.user.id;
  try {
    const comment = await prisma.discoverComment.findUnique({ where: { id: id.data }, select: { hidden: true } });
    if (!comment || comment.hidden) return res.status(404).json({ error: 'That comment is gone.' });
    if (body.data.liked) {
      await prisma.discoverCommentLike.upsert({ where: { userId_commentId: { userId, commentId: id.data } }, create: { userId, commentId: id.data }, update: {} });
    } else {
      await prisma.discoverCommentLike.deleteMany({ where: { userId, commentId: id.data } });
    }
    res.json({ liked: body.data.liked, likes: await prisma.discoverCommentLike.count({ where: { commentId: id.data } }) });
  } catch (error) {
    console.error('Error liking a Discover comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/discover/comments/:id/report  { reason? } — once per player. It's emailed
// to FEEDBACK_EMAIL (like the Feedback button), and 3 reports hide the comment until
// it's checked.
export const reportComment = async (req, res) => {
  const id = COMMENT_ID.safeParse(req.params.id);
  const body = z.object({ reason: z.string().trim().max(300).optional() }).safeParse(req.body ?? {});
  if (!id.success || !body.success) return res.status(400).json({ error: 'Bad request' });
  const userId = req.user.id;
  try {
    const comment = await prisma.discoverComment.findUnique({ where: { id: id.data }, select: { id: true, body: true, gameId: true, userId: true, user: AUTHOR } });
    if (!comment) return res.status(404).json({ error: 'That comment is gone.' });
    if (comment.userId === userId) return res.status(400).json({ error: "You can't report your own comment." });
    await prisma.discoverCommentReport.upsert({
      where: { userId_commentId: { userId, commentId: comment.id } },
      create: { userId, commentId: comment.id, reason: body.data.reason || null },
      update: {},
    });
    const reports = await prisma.discoverCommentReport.count({ where: { commentId: comment.id } });
    if (reports >= REPORTS_TO_HIDE) await prisma.discoverComment.update({ where: { id: comment.id }, data: { hidden: true } });

    const to = process.env.FEEDBACK_EMAIL?.trim();
    if (to) {
      const writer = comment.user.displayUsername ?? comment.user.username ?? 'a player';
      const reporter = req.user.displayUsername ?? req.user.username ?? 'a player';
      sendEmail({
        to,
        subject: `IMGM comment reported (${reports}): ${comment.body.slice(0, 50)}${comment.body.length > 50 ? '…' : ''}`,
        text: [
          `${reporter} reported a Discover comment by ${writer} (user ${comment.userId}) on game ${comment.gameId}.`,
          `Reports so far: ${reports}${reports >= REPORTS_TO_HIDE ? ' (now hidden)' : ''}`,
          `Reason: ${body.data.reason || '(none given)'}`,
          '',
          comment.body,
          '',
          `Comment id: ${comment.id}`,
        ].join('\n'),
      }).catch((error) => console.error('Comment report email failed (it is saved):', error.message));
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('Error reporting a Discover comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
