/**
 * The emails a player chose to get, and nothing else. Every one is off until the player
 * switches it on (Settings → Emails, or "Want a Sunday roundup?" once after a review):
 *   weekly    the Sunday roundup: Game of the Week, backlog games that came out, the
 *             week's most helpful review
 *   releases  the day a game in their backlog comes out
 *   replies   replies to their comments and helpful votes on their reviews, bundled,
 *             at most one a day (and only what they haven't already seen in the bell)
 *
 * The promises, kept in code:
 *   - only to a confirmed email address
 *   - at most WEEKLY_CAP of these emails in any 7 days, whatever is switched on
 *   - never the same email twice: each one is claimed in EmailSend first (a unique
 *     player + kind + key), so a restart or a second run sends nothing new
 *   - every email can be stopped in one click without logging in: a link in it (the
 *     /unsubscribe page), and the List-Unsubscribe headers (RFC 8058), which mail
 *     apps like Gmail show as their own Unsubscribe button
 *   - nothing is sent without EMAILS=on (config.optInEmailsEnabled): a dry run logs it
 * Account emails (password resets, welcome) are lib/email.js, and none of this applies.
 */
import { randomBytes } from 'node:crypto';
import { prisma } from './db.js';
import { sendEmail } from './email.js';
import { clientOrigins, optInEmailsEnabled } from './config.js';

export const EMAIL_KINDS = ['weekly', 'releases', 'replies'];
const WEEKLY_CAP = 2;
const DAY = 24 * 60 * 60 * 1000;

const SITE = clientOrigins[0];
// The API's own address (one-click unsubscribes are posted there by mail apps). On
// imgm.app it's the site itself: Vercel passes /api/* on to the server.
const API = process.env.BETTER_AUTH_URL || 'http://localhost:5000';

const OFF = { weekly: false, releases: false, replies: false };
const choicesOf = (row) => (row ? { weekly: row.weekly, releases: row.releases, replies: row.replies } : { ...OFF });

// The unsubscribe link's secret: 24 random bytes, so nobody can guess another's
const newToken = () => randomBytes(24).toString('base64url');

// A player's row, made (everything off) the first time it's needed
const ensureRow = (userId) =>
  prisma.emailSettings.upsert({ where: { userId }, create: { userId, token: newToken() }, update: {} });

/**
 * What Settings shows: the three choices, whether the email is confirmed, and `ask`:
 * whether to ask "Want a Sunday roundup?" (once, after they've posted a review)
 */
export const settingsFor = async (user) => {
  const [row, reviewed] = await Promise.all([
    prisma.emailSettings.findUnique({ where: { userId: user.id } }),
    prisma.review.count({ where: { userId: user.id }, take: 1 }),
  ]);
  return {
    ...choicesOf(row),
    verified: Boolean(user.emailVerified),
    ask: Boolean(user.emailVerified) && reviewed > 0 && !row?.askedAt && !row?.weekly,
  };
};

// Switches some on or off: { weekly?, releases?, replies? }
export const updateChoices = async (userId, choices) => {
  await ensureRow(userId);
  return choicesOf(await prisma.emailSettings.update({ where: { userId }, data: choices }));
};

// The one-time question: answered either way, it's never asked again
export const answerRoundup = async (userId, yes) => {
  await ensureRow(userId);
  return choicesOf(
    await prisma.emailSettings.update({ where: { userId }, data: { askedAt: new Date(), ...(yes && { weekly: true }) } })
  );
};

/**
 * Unsubscribe from all, by the link's token (no login). Returns what was on, so the
 * page can offer Undo, or null for a token nobody has.
 */
export const unsubscribeByToken = async (token) => {
  const row = await prisma.emailSettings.findUnique({ where: { token } });
  if (!row) return null;
  await prisma.emailSettings.update({ where: { token }, data: { ...OFF, askedAt: row.askedAt ?? new Date() } });
  return choicesOf(row);
};

// Undo on the unsubscribe page: puts back the choices it was given
export const resubscribeByToken = async (token, choices) => {
  const row = await prisma.emailSettings.findUnique({ where: { token } });
  if (!row) return null;
  return choicesOf(await prisma.emailSettings.update({ where: { token }, data: choices }));
};

/**
 * Sends one opt-in email if every promise above allows it.
 *   user   { id, email, emailVerified }
 *   kind   'weekly' | 'releases' | 'replies' (the switch it needs)
 *   key    which one it is ("2026-11-08"): the same kind + key never goes twice
 *   build  (links) => { subject, html, text }, given { unsubscribe, settings }
 * Returns 'sent', 'dry-run' or 'skipped'.
 */
export const sendOptInEmail = async ({ user, kind, key, build }) => {
  if (!user.emailVerified) return 'skipped';
  const row = await prisma.emailSettings.findUnique({ where: { userId: user.id } });
  if (!row?.[kind]) return 'skipped';
  const recent = await prisma.emailSend.count({ where: { userId: user.id, sentAt: { gte: new Date(Date.now() - 7 * DAY) } } });
  if (recent >= WEEKLY_CAP) return 'skipped';

  // Claim it first: if it's already claimed (sent before, or being sent), stop
  try {
    await prisma.emailSend.create({ data: { userId: user.id, kind, key } });
  } catch (error) {
    if (error.code === 'P2002') return 'skipped';
    throw error;
  }

  const links = {
    unsubscribe: `${SITE}/unsubscribe?token=${encodeURIComponent(row.token)}`,
    settings: `${SITE}/settings#emails`,
  };
  const email = build(links);
  if (!optInEmailsEnabled) {
    console.log(`[email] Dry run (EMAILS isn't on). ${kind} to ${user.id}: ${email.subject}\n${email.text}`);
    return 'dry-run';
  }
  try {
    await sendEmail({
      to: user.email,
      ...email,
      headers: {
        'List-Unsubscribe': `<${API}/api/emails/unsubscribe?token=${encodeURIComponent(row.token)}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });
    return 'sent';
  } catch (error) {
    // Not sent: let it go again on a later run
    await prisma.emailSend.delete({ where: { userId_kind_key: { userId: user.id, kind, key } } }).catch(() => {});
    throw error;
  }
};

// ── What the emails look like ─────────────────────────────
// Noir in an email: tables and inline styles (what mail apps understand), the site's
// warm black and ivory, the lime only on the one button.

const INK = { page: '#100f0d', card: '#1a1815', line: '#2e2a25', text: '#eee7d9', soft: '#c4bbac', quiet: '#948b7d', lime: '#c6eb4e' };
const LOGO = 'https://imgm.app/email-start.png';
const FONT = 'Arial,Helvetica,sans-serif';

// Text from players and games goes into HTML only escaped
export const esc = (text) =>
  String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const WHY = {
  weekly: 'You get this because you turned on the weekly roundup.',
  releases: 'You get this because you turned on the release radar.',
  replies: 'You get this because you turned on emails for replies and likes.',
};

/**
 * One email: a heading (plain text), then sections ({ title?, html, text }), and a button
 * ({ label, url }), with the footer every opt-in email carries (why it came, and the
 * one-click unsubscribe). Returns { html, text }.
 */
export const optInLayout = ({ kind, heading, sections, button, links }) => {
  const html = `
<div style="background:${INK.page};padding:32px 16px;font-family:${FONT}">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:${INK.card};border:1px solid ${INK.line}">
    <tr><td style="padding:24px 28px;border-bottom:1px solid ${INK.line}">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle;padding-right:10px"><img src="${LOGO}" width="24" height="24" alt="" style="display:block;border:0"></td>
        <td style="vertical-align:middle;font-size:20px;font-weight:900;letter-spacing:2px;color:${INK.text}">IMGM</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:24px 28px 8px">
      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:${INK.text}">${esc(heading)}</h1>
      ${sections
        .map(
          (s) => `<div style="margin:0 0 20px">${s.title ? `<p style="margin:0 0 6px;font-size:15px;font-weight:700;color:${INK.text}">${s.title}</p>` : ''}<div style="font-size:15px;line-height:1.55;color:${INK.soft}">${s.html}</div></div>`
        )
        .join('')}
      ${button ? `<p style="margin:4px 0 24px"><a href="${button.url}" style="display:inline-block;background:${INK.lime};color:${INK.page};font-weight:700;font-size:15px;text-decoration:none;padding:12px 22px;border-radius:2px">${button.label}</a></p>` : ''}
    </td></tr>
    <tr><td style="padding:18px 28px;border-top:1px solid ${INK.line};font-size:12px;line-height:1.6;color:${INK.quiet}">
      ${WHY[kind]}<br>
      <a href="${links.unsubscribe}" style="color:${INK.quiet}">Unsubscribe</a> (one click, no login) · <a href="${links.settings}" style="color:${INK.quiet}">Choose which emails</a>
    </td></tr>
  </table>
</div>`;
  const text = [
    heading,
    '',
    ...sections.flatMap((s) => [...(s.title ? [s.title] : []), s.text, '']),
    ...(button ? [`${button.label}: ${button.url}`, ''] : []),
    WHY[kind],
    `Unsubscribe (one click): ${links.unsubscribe}`,
    `Choose which emails: ${links.settings}`,
  ].join('\n');
  return { html, text };
};

export const siteUrl = (path) => `${SITE}${path}`;
