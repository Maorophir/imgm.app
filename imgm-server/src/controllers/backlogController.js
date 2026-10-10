/**
 * The Backlog: games a player wants to play later. The cycle the site is built around:
 * add (from Play Next, a game page, the Hall of Fame…) → play → review → "Finished it"
 * (the game stays, under Finished; after a review the quest offers it, since many review
 * mid-game). Removing (✕) is separate: for games the player gave up on or added by mistake.
 * Games keep the player's own order (position): new ones go on top, and they can move them.
 */
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { getSessionUser } from '../lib/session.js';
import { ensureGame } from '../services/gameStore.js';

const MAX_ITEMS = 300;
const SOURCES = ['play_next', 'game_page', 'hall_of_fame', 'gotw', 'other'];

const requireLogin = async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) res.status(401).json({ error: 'Log in to use your Backlog.' });
  return user;
};

// GET /api/backlog — your Backlog, newest first, with each game's IMGM score
export const getBacklog = async (req, res) => {
  try {
    const user = await requireLogin(req, res);
    if (!user) return;
    const items = await prisma.backlogItem.findMany({
      where: { userId: user.id },
      orderBy: [{ position: 'asc' }, { addedAt: 'desc' }],
      include: { game: { select: { id: true, title: true, coverUrl: true, releaseDate: true, platforms: true, genres: true } } },
    });
    const stats = await prisma.review.groupBy({
      by: ['gameId'],
      where: { gameId: { in: items.map((i) => i.gameId) } },
      _avg: { rating: true },
      _count: { _all: true },
    });
    const byGame = new Map(stats.map((s) => [s.gameId, s]));
    const mine = new Map(
      (await prisma.review.findMany({ where: { userId: user.id, gameId: { in: items.map((i) => i.gameId) } }, select: { gameId: true, rating: true } }))
        .map((r) => [r.gameId, r.rating])
    );
    res.json(
      items.map((item) => ({
        game: item.game,
        source: item.source,
        addedAt: item.addedAt,
        finishedAt: item.finishedAt, // null = still to play
        myRating: mine.get(item.gameId) ?? null, // reviewed it already (maybe mid-game)
        average: byGame.get(item.gameId)?._avg.rating ?? null,
        reviewCount: byGame.get(item.gameId)?._count._all ?? 0,
      }))
    );
  } catch (error) {
    console.error('Error loading the Backlog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/backlog/ids — just which games are in it (for the "in your Backlog" buttons)
export const getBacklogIds = async (req, res) => {
  try {
    const user = await getSessionUser(req).catch(() => null);
    if (!user) return res.json([]);
    const items = await prisma.backlogItem.findMany({ where: { userId: user.id }, select: { gameId: true } });
    res.json(items.map((i) => i.gameId));
  } catch (error) {
    console.error('Error loading Backlog ids:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/backlog/:gameId  { source? } — add a game (any real game: fetched from IGDB if new)
export const addToBacklog = async (req, res) => {
  const gameId = Number.parseInt(req.params.gameId, 10);
  const body = z.object({ source: z.enum(SOURCES).optional() }).safeParse(req.body ?? {});
  if (Number.isNaN(gameId) || !body.success) return res.status(400).json({ error: 'Invalid request' });
  try {
    const user = await requireLogin(req, res);
    if (!user) return;
    if ((await prisma.backlogItem.count({ where: { userId: user.id } })) >= MAX_ITEMS) {
      return res.status(409).json({ error: `Your Backlog is full (${MAX_ITEMS} games). Play some first!` });
    }
    const game = await ensureGame(gameId);
    if (!game) return res.status(404).json({ error: 'Game not found' });
    // On top of the list: one place above the current first game
    const first = await prisma.backlogItem.aggregate({ where: { userId: user.id }, _min: { position: true } });
    await prisma.backlogItem.upsert({
      where: { userId_gameId: { userId: user.id, gameId } },
      create: { userId: user.id, gameId, source: body.data.source ?? 'other', position: (first._min.position ?? 1) - 1 },
      update: {},
    });
    res.status(204).end();
  } catch (error) {
    console.error('Error adding to the Backlog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/backlog/:gameId — remove a game
export const removeFromBacklog = async (req, res) => {
  const gameId = Number.parseInt(req.params.gameId, 10);
  if (Number.isNaN(gameId)) return res.status(400).json({ error: 'Invalid request' });
  try {
    const user = await requireLogin(req, res);
    if (!user) return;
    await prisma.backlogItem.deleteMany({ where: { userId: user.id, gameId } });
    res.status(204).end();
  } catch (error) {
    console.error('Error removing from the Backlog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/backlog/:gameId/finished  { finished } — finished it (or not after all)
export const setFinished = async (req, res) => {
  const gameId = Number.parseInt(req.params.gameId, 10);
  const body = z.object({ finished: z.boolean() }).safeParse(req.body ?? {});
  if (Number.isNaN(gameId) || !body.success) return res.status(400).json({ error: 'Invalid request' });
  try {
    const user = await requireLogin(req, res);
    if (!user) return;
    const { count } = await prisma.backlogItem.updateMany({
      where: { userId: user.id, gameId },
      data: { finishedAt: body.data.finished ? new Date() : null },
    });
    if (count === 0) return res.status(404).json({ error: 'That game is not in your Backlog.' });
    res.status(204).end();
  } catch (error) {
    console.error('Error marking a Backlog game finished:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/backlog/order  { gameIds: [...] } — the player's new order (their whole list)
const orderSchema = z.object({ gameIds: z.array(z.number().int().positive()).max(MAX_ITEMS) });
export const reorderBacklog = async (req, res) => {
  const body = orderSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Invalid order' });
  try {
    const user = await requireLogin(req, res);
    if (!user) return;
    // Each game's place in the list; games missing from it (added meanwhile) stay above
    await prisma.$transaction(
      body.data.gameIds.map((gameId, position) =>
        prisma.backlogItem.updateMany({ where: { userId: user.id, gameId }, data: { position } })
      )
    );
    res.status(204).end();
  } catch (error) {
    console.error('Error reordering the Backlog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
