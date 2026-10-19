/**
 * Play Next chat history: the player's past chats, to reopen from the sidebar.
 *
 * The page saves a chat after every answer (its turns, exactly as it shows them).
 * The AI service remembers the same chat under the same ids, so a reopened chat
 * can carry on. Limits keep both small:
 *   20 chats per player   the oldest is deleted when a 21st starts
 *   30 days               chats untouched for longer are deleted (the AI forgets them then too)
 *   10 questions a chat   enforced by the AI service; the page then offers a new chat
 *
 * Pinned chats (up to 5) sit at the top of the list and are kept: they don't expire
 * and don't count toward the 20. The AI service still forgets them after 30 days, so
 * an old pinned chat shows its history but its follow-ups start fresh.
 */
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { aiServiceUrl, internalApiKey } from '../lib/config.js';

const MAX_CHATS = 20;
const MAX_TURNS = 10;
const RETENTION_DAYS = 30;
const MAX_PINS = 5;

const chatId = z.string().regex(/^[A-Za-z0-9-]{8,64}$/);
const saveSchema = z.object({
  // Shown only to the same player, so the page's own shape is kept as is
  turns: z.array(z.looseObject({ question: z.string().min(1).max(1000) })).min(1).max(MAX_TURNS),
  // The "Tune it" answers (the AI service checks their exact shape when they're used)
  prefs: z.record(z.string(), z.any()).default({}),
});
const pinSchema = z.object({ pinned: z.boolean() });

// Forget a chat in the AI service too (fire-and-forget: the history row is what matters)
const forgetInAi = (userId, id) =>
  fetch(`${aiServiceUrl}/chats/${id}`, {
    method: 'DELETE',
    headers: { 'X-User-Id': userId, ...(internalApiKey && { 'X-Internal-Key': internalApiKey }) },
    signal: AbortSignal.timeout(30 * 1000),
  }).catch(() => {});

const deleteChats = async (userId, ids) => {
  if (ids.length === 0) return;
  await prisma.playNextChat.deleteMany({ where: { userId, id: { in: ids } } });
  ids.forEach((id) => forgetInAi(userId, id));
};

// GET /api/guide/chats — the player's chats: pinned first (latest pin on top), then
// newest first (titles only)
export const listChats = async (req, res) => {
  const userId = req.user.id;
  // Unpinned chats past the 30 days go first (the AI service forgets them on its own)
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.playNextChat.deleteMany({ where: { userId, pinnedAt: null, updatedAt: { lt: cutoff } } });

  const chats = await prisma.playNextChat.findMany({
    where: { userId },
    orderBy: [{ pinnedAt: { sort: 'desc', nulls: 'last' } }, { updatedAt: 'desc' }],
    take: MAX_CHATS + MAX_PINS,
    select: { id: true, title: true, updatedAt: true, pinnedAt: true },
  });
  res.json({
    chats: chats.map(({ pinnedAt, ...chat }) => ({ ...chat, pinned: Boolean(pinnedAt) })),
    limits: { chats: MAX_CHATS, questions: MAX_TURNS, pins: MAX_PINS },
  });
};

// GET /api/guide/chats/:id — one chat, to reopen it
export const getChat = async (req, res) => {
  const id = chatId.safeParse(req.params.id);
  const chat =
    id.success &&
    (await prisma.playNextChat.findUnique({
      where: { userId_id: { userId: req.user.id, id: id.data } },
      select: { id: true, title: true, turns: true, prefs: true, updatedAt: true },
    }));
  if (!chat) return res.status(404).json({ error: 'Chat not found.' });
  res.json(chat);
};

// PUT /api/guide/chats/:id — save a chat (after each answer)
export const saveChat = async (req, res) => {
  const id = chatId.safeParse(req.params.id);
  const body = saveSchema.safeParse(req.body);
  if (!id.success || !body.success) return res.status(400).json({ error: 'Invalid chat.' });

  const userId = req.user.id;
  const { turns, prefs } = body.data;
  const title = turns[0].question.slice(0, 80);
  const key = { userId_id: { userId, id: id.data } };

  const exists = await prisma.playNextChat.findUnique({ where: key, select: { id: true } });
  if (!exists) {
    // A new chat: make room, keeping the newest 19 + this one (pinned chats aside)
    const older = await prisma.playNextChat.findMany({
      where: { userId, pinnedAt: null },
      orderBy: { updatedAt: 'desc' },
      skip: MAX_CHATS - 1,
      select: { id: true },
    });
    await deleteChats(userId, older.map((chat) => chat.id));
  }

  await prisma.playNextChat.upsert({
    where: key,
    create: { userId, id: id.data, title, turns, prefs },
    update: { title, turns, prefs },
  });
  res.status(204).end();
};

// PUT /api/guide/chats/:id/pin — the player pins or unpins a chat
export const pinChat = async (req, res) => {
  const id = chatId.safeParse(req.params.id);
  const body = pinSchema.safeParse(req.body);
  if (!id.success || !body.success) return res.status(400).json({ error: 'Invalid chat.' });

  const userId = req.user.id;
  const key = { userId_id: { userId, id: id.data } };
  const chat = await prisma.playNextChat.findUnique({ where: key, select: { pinnedAt: true } });
  if (!chat) return res.status(404).json({ error: 'Chat not found.' });

  if (body.data.pinned && !chat.pinnedAt) {
    const pins = await prisma.playNextChat.count({ where: { userId, pinnedAt: { not: null } } });
    if (pins >= MAX_PINS) {
      return res.status(409).json({ error: `You can pin up to ${MAX_PINS} chats. Unpin one first.` });
    }
  }
  // Pinning again keeps the first pin's time, so the order doesn't jump
  if (body.data.pinned !== Boolean(chat.pinnedAt)) {
    await prisma.playNextChat.update({ where: key, data: { pinnedAt: body.data.pinned ? new Date() : null } });
  }
  res.status(204).end();
};

// DELETE /api/guide/chats/:id — the player deletes a chat
export const deleteChat = async (req, res) => {
  const id = chatId.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: 'Invalid chat.' });
  await deleteChats(req.user.id, [id.data]);
  res.status(204).end();
};
