/**
 * The bell (routes/notifications.js) and the emails a player chose (routes/emails.js).
 * What's in them and when they're sent: lib/notifications.js, lib/optInEmails.js and
 * lib/notifyJobs.js.
 */
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { listFor, unreadCount } from '../lib/notifications.js';
import { answerRoundup, resubscribeByToken, settingsFor, unsubscribeByToken, updateChoices } from '../lib/optInEmails.js';

const failed = (res, what, error) => {
  console.error(`Error ${what}:`, error);
  res.status(500).json({ error: 'Internal server error' });
};

// ── The bell ──

// GET /api/notifications/unread — just the count (the bell asks every minute)
export const getUnread = async (req, res) => {
  try {
    res.json({ unread: await unreadCount(req.user.id) });
  } catch (error) {
    failed(res, 'counting notifications', error);
  }
};

// GET /api/notifications — the latest 20, and how many are unread
export const getNotifications = async (req, res) => {
  try {
    res.json(await listFor(req.user.id));
  } catch (error) {
    failed(res, 'loading notifications', error);
  }
};

// PUT /api/notifications/:id/read — your own only
export const markRead = async (req, res) => {
  const id = z.string().min(1).max(40).safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: 'Bad request' });
  try {
    await prisma.notification.updateMany({ where: { id: id.data, userId: req.user.id, readAt: null }, data: { readAt: new Date() } });
    res.json({ unread: await unreadCount(req.user.id) });
  } catch (error) {
    failed(res, 'marking a notification read', error);
  }
};

// PUT /api/notifications/read-all
export const markAllRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user.id, readAt: null }, data: { readAt: new Date() } });
    res.json({ unread: 0 });
  } catch (error) {
    failed(res, 'marking notifications read', error);
  }
};

// ── Emails ──

const choicesSchema = z.object({ weekly: z.boolean(), releases: z.boolean(), replies: z.boolean() });

// GET /api/emails/settings — { weekly, releases, replies, verified, ask }
export const getEmailSettings = async (req, res) => {
  try {
    res.json(await settingsFor(req.user));
  } catch (error) {
    failed(res, 'loading email settings', error);
  }
};

// PUT /api/emails/settings  { weekly?, releases?, replies? } — the ones given change
export const putEmailSettings = async (req, res) => {
  const body = choicesSchema.partial().strict().safeParse(req.body ?? {});
  if (!body.success) return res.status(400).json({ error: 'Bad request' });
  try {
    await updateChoices(req.user.id, body.data);
    res.json(await settingsFor(req.user));
  } catch (error) {
    failed(res, 'saving email settings', error);
  }
};

// PUT /api/emails/settings/roundup-question  { yes } — "Want a Sunday roundup?", once
export const putRoundupAnswer = async (req, res) => {
  const body = z.object({ yes: z.boolean() }).safeParse(req.body ?? {});
  if (!body.success) return res.status(400).json({ error: 'Bad request' });
  try {
    await answerRoundup(req.user.id, body.data.yes);
    res.json(await settingsFor(req.user));
  } catch (error) {
    failed(res, 'saving the roundup answer', error);
  }
};

const TOKEN = z.string().min(20).max(64).regex(/^[A-Za-z0-9_-]+$/);

/**
 * POST /api/emails/unsubscribe — every opt-in email off, without logging in. Two callers:
 *   mail apps' own Unsubscribe button (RFC 8058): ?token=… with a form body
 *   the /unsubscribe page the email's link opens: { token } as JSON
 * Returns { was }: what was on, for the page's Undo.
 */
export const unsubscribe = async (req, res) => {
  const token = TOKEN.safeParse(req.query.token ?? req.body?.token);
  if (!token.success) return res.status(400).json({ error: 'This unsubscribe link is broken.' });
  try {
    const was = await unsubscribeByToken(token.data);
    if (!was) return res.status(404).json({ error: 'This unsubscribe link is unknown or out of date.' });
    res.json({ was });
  } catch (error) {
    failed(res, 'unsubscribing', error);
  }
};

// POST /api/emails/resubscribe  { token, weekly, releases, replies } — the page's Undo
export const resubscribe = async (req, res) => {
  const body = choicesSchema.extend({ token: TOKEN }).safeParse(req.body ?? {});
  if (!body.success) return res.status(400).json({ error: 'Bad request' });
  const { token, ...choices } = body.data;
  try {
    const now = await resubscribeByToken(token, choices);
    if (!now) return res.status(404).json({ error: 'This unsubscribe link is unknown or out of date.' });
    res.json({ now });
  } catch (error) {
    failed(res, 'resubscribing', error);
  }
};
