/**
 * The notification jobs: what's said at a time of day rather than when someone acts.
 * All on Israel time, like Game of the Week:
 *   every day         old bell lines are cleared
 *   every day, 9:00   the release radar: backlog games that came out (the bell for
 *                     everyone, an email for those who chose it)
 *   every day, 18:00  "Replies and likes" emails: what's new since the last one, and
 *                     only what the player hasn't already seen in the bell
 *   Saturday, 10:00   Game of the Week closes tonight: the bell, for recent players who
 *                     haven't voted
 *   Sunday, 10:00     the weekly roundup email (votes are counted at midnight)
 *
 * A timer in this server runs them (Render keeps it up all the time, but restarts it on
 * every deploy). It checks every 10 minutes; each job runs once a day after its hour,
 * and a restart that runs one again is harmless: bell lines have one row per thing,
 * and every email is claimed before it's sent (lib/optInEmails.js).
 */
import { prisma } from './db.js';
import { addNews, nameOf, pruneOld } from './notifications.js';
import { esc, optInLayout, sendOptInEmail, siteUrl } from './optInEmails.js';
import { currentWeek, tallyOf, TIME_ZONE } from './gotw.js';
import { cardQuoteOf } from './cardQuote.js';
import { maskProfanity } from './moderation.js';
import * as igdb from '../services/igdbService.js';

const DAY = 24 * 60 * 60 * 1000;
const TICK = 10 * 60 * 1000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ACTIVE_FOR = 14 * DAY; // "recent players": logged in within two weeks
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const SEND_GAP = 600; // between emails: Resend takes 2 a second

// Israel's calendar day ("2026-11-05"), hour and weekday (0 = Sunday) right now
const israelNow = () => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short',
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value])
  );
  return { day: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), weekday: WEEKDAYS.indexOf(p.weekday) };
};

// "2026-11-05", -1 → "2026-11-04"
const shiftDay = (day, by) => {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + by);
  return date.toISOString().slice(0, 10);
};

// IGDB dates a game known only by its year 31 December: that's not a release day
const yearOnly = (date) => date.getUTCMonth() === 11 && date.getUTCDate() === 31;

const gameLink = (gameId) => siteUrl(`/game/${gameId}`);

// ── The release radar ─────────────────────────────────────

const releaseRadar = async ({ day }) => {
  // Backlog games still to play that weren't out two days ago (or have no date yet)
  const since = new Date(`${shiftDay(day, -2)}T00:00:00Z`);
  const items = await prisma.backlogItem.findMany({
    where: { finishedAt: null, game: { OR: [{ releaseDate: null }, { releaseDate: { gte: since } }] } },
    select: { userId: true, gameId: true, addedAt: true },
  });
  if (items.length === 0) return;
  const gameIds = [...new Set(items.map((item) => item.gameId))];

  // A date saved months ago may have moved: ask IGDB for today's (keep ours if it can't say)
  let fresh = new Map();
  try {
    fresh = await igdb.getReleaseDates(gameIds);
  } catch (error) {
    console.error('Release radar: IGDB dates failed, using saved ones:', error.message);
  }
  const games = await prisma.game.findMany({ where: { id: { in: gameIds } }, select: { id: true, title: true, coverUrl: true, releaseDate: true } });
  for (const game of games) {
    if (!fresh.has(game.id)) continue;
    const date = fresh.get(game.id);
    if ((date?.getTime() ?? null) === (game.releaseDate?.getTime() ?? null)) continue;
    await prisma.game.update({ where: { id: game.id }, data: { releaseDate: date } });
    game.releaseDate = date;
  }

  // Out today, or yesterday (in case the server was down when it was due)
  const outDays = new Set([day, shiftDay(day, -1)]);
  const out = new Map(
    games
      .filter((g) => g.releaseDate && !yearOnly(g.releaseDate) && outDays.has(g.releaseDate.toISOString().slice(0, 10)))
      .map((g) => [g.id, g])
  );
  for (const item of items) {
    const game = out.get(item.gameId);
    // Added after it came out: they knew already
    if (!game || item.addedAt >= game.releaseDate) continue;
    await addNews({
      userId: item.userId,
      kind: 'released',
      key: `game:${game.id}`,
      data: { gameId: game.id, title: game.title, coverUrl: game.coverUrl },
    });
  }

  // Emails, for those who chose the release radar: one a day, with every game it hasn't
  // mentioned yet
  const notes = await prisma.notification.findMany({
    where: { kind: 'released', emailedAt: null, createdAt: { gte: new Date(Date.now() - 2 * DAY) }, user: { emailVerified: true, emailSettings: { is: { releases: true } } } },
    select: { id: true, data: true, user: { select: { id: true, email: true, emailVerified: true } } },
  });
  const byUser = Map.groupBy(notes, (note) => note.user.id);
  for (const list of byUser.values()) {
    const { user } = list[0];
    const titles = list.map((note) => note.data.title ?? 'A game from your backlog');
    const result = await sendOptInEmail({
      user,
      kind: 'releases',
      key: day,
      build: (links) => ({
        subject: list.length === 1 ? `${titles[0]} is out` : `${list.length} games from your backlog are out`,
        ...optInLayout({
          kind: 'releases',
          heading: list.length === 1 ? `${titles[0]} is out. It's on your backlog.` : `${list.length} games from your backlog are out.`,
          sections: list.map((note, i) => ({
            html: `<a href="${gameLink(note.data.gameId)}" style="color:#eee7d9">${esc(titles[i])}</a>`,
            text: `${titles[i]}: ${gameLink(note.data.gameId)}`,
          })),
          button: list.length === 1 ? { label: 'See it', url: gameLink(list[0].data.gameId) } : { label: 'Open your backlog', url: siteUrl('/backlog') },
          links,
        }),
      }),
    }).catch((error) => console.error('Release radar email failed:', error.message));
    if (result === 'sent' || result === 'dry-run') {
      await prisma.notification.updateMany({ where: { id: { in: list.map((note) => note.id) } }, data: { emailedAt: new Date() } });
    }
    await pause(SEND_GAP);
  }
};

// ── Replies and likes ─────────────────────────────────────

// "pixelmoth and 2 others" from a line's names (latest first)
const whoDid = (actors = []) =>
  actors.length <= 1 ? nameOf({ displayUsername: actors[0]?.name }) : `${actors[0].name} and ${actors.length - 1} other${actors.length > 2 ? 's' : ''}`;

export const describe = (note) => {
  const title = note.data.title ?? 'a game';
  if (note.kind === 'reply') return { text: `${whoDid(note.data.actors)} replied to your comment on ${title}`, url: siteUrl(`/discover?feed=${note.data.feed ?? 'hot'}&game=${note.data.gameId}`) };
  return { text: `${whoDid(note.data.actors)} found your ${title} review helpful`, url: siteUrl(`/game/${note.data.gameId}?review=${note.data.reviewId}#review-${note.data.reviewId}`) };
};

const repliesDigest = async ({ day }) => {
  const notes = await prisma.notification.findMany({
    where: {
      kind: { in: ['reply', 'helpful'] },
      readAt: null, // seen in the bell already: no email about it
      emailedAt: null,
      updatedAt: { gte: new Date(Date.now() - DAY) },
      user: { emailVerified: true, emailSettings: { is: { replies: true } } },
    },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, kind: true, data: true, user: { select: { id: true, email: true, emailVerified: true } } },
  });
  for (const list of Map.groupBy(notes, (note) => note.user.id).values()) {
    const { user } = list[0];
    const lines = list.map(describe);
    const result = await sendOptInEmail({
      user,
      kind: 'replies',
      key: day,
      build: (links) => ({
        subject: lines.length === 1 ? lines[0].text : `${lines.length} new replies and likes on IMGM`,
        ...optInLayout({
          kind: 'replies',
          heading: 'New on IMGM today',
          sections: lines.map((line) => ({ html: `<a href="${line.url}" style="color:#eee7d9">${esc(line.text)}</a>`, text: `${line.text}: ${line.url}` })),
          links,
        }),
      }),
    }).catch((error) => console.error('Replies email failed:', error.message));
    if (result === 'sent' || result === 'dry-run') {
      await prisma.notification.updateMany({ where: { id: { in: list.map((note) => note.id) } }, data: { emailedAt: new Date() } });
    }
    await pause(SEND_GAP);
  }
};

// ── Game of the Week ──────────────────────────────────────

// Saturday: the vote closes at midnight. Recent players who haven't voted hear it once.
const gotwReminder = async () => {
  const week = await currentWeek();
  const [sessions, votes] = await Promise.all([
    prisma.session.findMany({ where: { updatedAt: { gte: new Date(Date.now() - ACTIVE_FOR) } }, select: { userId: true }, distinct: ['userId'] }),
    prisma.gotwVote.findMany({ where: { weekId: week.id }, select: { userId: true } }),
  ]);
  const voted = new Set(votes.map((v) => v.userId));
  for (const { userId } of sessions) {
    if (voted.has(userId)) continue;
    await addNews({ userId, kind: 'gotw_closing', key: `gotw:${week.id}`, data: { weekId: week.id, endsAt: week.endsAt } });
  }
};

// Sunday: the weekly roundup, for those who chose it
const weeklyRoundup = async () => {
  const week = await currentWeek(); // also counts last week's votes, if no visitor has yet
  const now = Date.now();
  const lastWeek = await prisma.gotwWeek.findFirst({
    where: { closedAt: { not: null }, winnerId: { not: null }, endsAt: { lte: new Date(now) } },
    orderBy: { startsAt: 'desc' },
    select: { id: true, winnerId: true, winner: { select: { title: true } } },
  });
  const winnerVotes = lastWeek ? (await tallyOf(lastWeek.id)).get(lastWeek.winnerId) ?? 0 : 0;
  const top = await prisma.review.findFirst({
    where: { createdAt: { gte: new Date(now - 7 * DAY) }, helpfulCount: { gt: 0 }, reviewText: { not: null } },
    orderBy: [{ helpfulScore: 'desc' }, { helpfulCount: 'desc' }],
    select: { id: true, rating: true, reviewText: true, cardQuote: true, gameId: true, game: { select: { title: true } }, user: { select: { displayUsername: true, username: true } } },
  });
  const quote = top && cardQuoteOf(maskProfanity(top.reviewText), top.cardQuote);

  const users = await prisma.user.findMany({
    where: { emailVerified: true, emailSettings: { is: { weekly: true } } },
    select: { id: true, email: true, emailVerified: true },
  });
  for (const user of users) {
    // Their backlog games that came out this past week
    const released = await prisma.backlogItem.findMany({
      where: { userId: user.id, finishedAt: null, game: { releaseDate: { gte: new Date(now - 7 * DAY), lte: new Date(now) } } },
      select: { game: { select: { id: true, title: true } } },
      take: 5,
    });
    const sections = [];
    if (released.length > 0) {
      sections.push({
        title: 'Out this week, from your backlog',
        html: released.map(({ game }) => `<a href="${gameLink(game.id)}" style="color:#eee7d9">${esc(game.title)}</a>`).join('<br>'),
        text: released.map(({ game }) => `${game.title}: ${gameLink(game.id)}`).join('\n'),
      });
    }
    if (lastWeek) {
      const line = `${lastWeek.winner.title} won with ${winnerVotes} vote${winnerVotes === 1 ? '' : 's'}. This week's vote is open until Saturday night.`;
      sections.push({ title: 'Game of the Week', html: esc(line), text: line });
    }
    if (quote) {
      const by = `${nameOf(top.user)} on ${top.game.title} · ${top.rating}/10`;
      const url = siteUrl(`/game/${top.gameId}?review=${top.id}#review-${top.id}`);
      sections.push({
        title: "The week's most helpful review",
        html: `<span style="font-style:italic;color:#eee7d9">"${esc(quote)}"</span><br><a href="${url}" style="color:#948b7d">${esc(by)}</a>`,
        text: `"${quote}"\n${by}: ${url}`,
      });
    }
    if (sections.length === 0) continue; // nothing to say this week
    const heading = released.length > 0
      ? `${released[0].game.title} is out. It's on your backlog.`
      : lastWeek ? `${lastWeek.winner.title} is the Game of the Week.` : 'Your week on IMGM';
    await sendOptInEmail({
      user,
      kind: 'weekly',
      key: week.id,
      build: (links) => ({
        subject: heading,
        ...optInLayout({ kind: 'weekly', heading, sections, button: { label: "Vote for this week's game", url: siteUrl('/game-of-the-week') }, links }),
      }),
    }).catch((error) => console.error('Weekly roundup email failed:', error.message));
    await pause(SEND_GAP);
  }
};

// ── Tidying ───────────────────────────────────────────────

const prune = async () => {
  await pruneOld();
  // Sent emails are kept only as long as they matter (the 7-day cap, the day's key)
  await prisma.emailSend.deleteMany({ where: { sentAt: { lt: new Date(Date.now() - 60 * DAY) } } });
};

// ── The timer ─────────────────────────────────────────────

const JOBS = [
  { name: 'prune', due: () => true, run: prune },
  { name: 'releases', due: (now) => now.hour >= 9, run: releaseRadar },
  { name: 'replies', due: (now) => now.hour >= 18, run: repliesDigest },
  { name: 'gotw_closing', due: (now) => now.weekday === 6 && now.hour >= 10, run: gotwReminder },
  { name: 'weekly', due: (now) => now.weekday === 0 && now.hour >= 10, run: weeklyRoundup },
];
const doneOn = new Map(); // job → the day it last finished
let running = false;

const tick = async () => {
  if (running) return;
  running = true;
  try {
    const now = israelNow();
    for (const job of JOBS) {
      if (!job.due(now) || doneOn.get(job.name) === now.day) continue;
      try {
        await job.run(now);
        doneOn.set(job.name, now.day);
      } catch (error) {
        console.error(`Notification job "${job.name}" failed (tried again in 10 minutes):`, error.message);
      }
    }
  } finally {
    running = false;
  }
};

// Started once by index.js; the first check waits a minute, so a restart is quick
export const startNotifyJobs = () => {
  setTimeout(tick, 60_000).unref();
  setInterval(tick, TICK).unref();
};
