/**
 * The Feedback button: bugs and ideas from players (the beta's QA channel).
 * Each message is saved, and emailed to FEEDBACK_EMAIL when that's set (Render), so
 * nothing gets lost in chat apps. Logged out works too: the message is just anonymous.
 */
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { getSessionUser } from '../lib/session.js';
import { sendEmail } from '../lib/email.js';

const feedbackSchema = z.object({
  kind: z.enum(['bug', 'idea', 'other']),
  message: z.string().trim().min(5).max(2000),
  page: z.string().max(300).optional(),
});

const LABEL = { bug: 'Bug', idea: 'Idea', other: 'Feedback' };

// POST /api/feedback  { kind, message, page }
export const sendFeedback = async (req, res) => {
  const body = feedbackSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Please write at least a few words (up to 2,000 characters).' });
  try {
    const user = await getSessionUser(req).catch(() => null);
    const { kind, message, page } = body.data;
    await prisma.feedback.create({ data: { userId: user?.id ?? null, kind, message, page } });

    const to = process.env.FEEDBACK_EMAIL?.trim();
    if (to) {
      const who = user ? `${user.displayUsername ?? user.username ?? 'a player'} (${user.email})` : 'a logged-out visitor';
      sendEmail({
        to,
        subject: `IMGM ${LABEL[kind]}: ${message.slice(0, 60)}${message.length > 60 ? '…' : ''}`,
        text: `${LABEL[kind]} from ${who}\nPage: ${page ?? '?'}\n\n${message}`,
      }).catch((error) => console.error('Feedback email failed (it is saved):', error.message));
    }
    res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Error saving feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
