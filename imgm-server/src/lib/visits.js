/**
 * The visitor counter behind /admin's Visitors tab: page views and visitors per day,
 * logged in or not, with no cookies and nothing stored about who anyone is.
 *
 * The site sends one small beacon per page view (POST /api/visits): the page (ids
 * collapsed, so /game/:id), the site it came from (its host only, on the first page of a
 * visit) and phone / tablet / computer. This server adds the browser and system (from the
 * User-Agent), and the country (Vercel doesn't pass its own on through the rewrite, so
 * routes/visits.js looks it up from the address: IP2Location LITE, via ip3country).
 *
 * A visitor is recognised only within a day: a hash of a random salt, their IP and their
 * User-Agent. The salt lives only in memory and is replaced at midnight UTC, so
 * yesterday's visitor can't be matched with today's, and the IP itself is never stored
 * (the same method as Plausible's). A restart makes a new salt too, so someone who visits
 * before and after one counts twice that day: fine for a small site's numbers.
 *
 * Counts gather in memory and are added to the daily rows once a minute (VisitDay,
 * VisitCount), so a page view costs no database write of its own.
 */
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from './db.js';
import { utcDay } from './activity.js';

export const DIMENSIONS = ['path', 'referrer', 'country', 'device', 'browser', 'os'];
const DEVICES = new Set(['phone', 'tablet', 'computer']);
const FLUSH_EVERY = 60 * 1000;
// Anyone can send a beacon, so the different pages and sites one day can add are capped:
// past these, the rest count as "other" (and the memory stays small)
const MAX_VALUES = { path: 400, referrer: 300 };
const MAX_SEEN = 200_000;

// Crawlers, link previews, uptime checks and scripts (headless browsers say so too)
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pagespeed|pingdom|uptime|monitor|curl|wget|python|axios|node-fetch|undici|go-http|java\/|okhttp|facebookexternalhit|embedly|whatsapp|telegram/i;

// The browser and system families, in the order that tells them apart (Edge's User-Agent
// also says Chrome and Safari, Chrome's also says Safari)
const BROWSERS = [
  ['Edge', /Edg(e|A|iOS)?\//],
  ['Opera', /OPR\/|Opera/],
  ['Samsung Internet', /SamsungBrowser\//],
  ['Firefox', /Firefox\/|FxiOS\//],
  ['Chrome', /Chrome\/|CriOS\//],
  ['Safari', /Version\/[\d.]+.*Safari\//],
];
const SYSTEMS = [
  ['iOS', /iPhone|iPad|iPod/],
  ['Android', /Android/],
  ['ChromeOS', /CrOS/],
  ['Windows', /Windows/],
  ['macOS', /Mac OS X|Macintosh/],
  ['Linux', /Linux/],
];
const family = (list, ua) => list.find(([, test]) => test.test(ua))?.[0] ?? 'Other';

// A page as the counter keeps it: lowercase, no query, ids collapsed, and only the
// characters a real IMGM address has (anything else is a made-up path)
export const cleanPath = (raw) => {
  const path = String(raw ?? '').split(/[?#]/)[0].toLowerCase();
  if (!/^\/[a-z0-9\-/_.:]{0,80}$/.test(path)) return null;
  return path
    .replace(/^\/game\/[^/]+/, '/game/:id')
    .replace(/^\/u\/[^/]+/, '/u/:name')
    .replace(/^\/compare\/[^/]+/, '/compare/:name')
    .replace(/\/\d+(?=\/|$)/g, '/:id')
    .replace(/(.)\/$/, '$1');
};

// The site a visit came from: its host only, without www., or '' for none / IMGM itself
export const cleanReferrer = (raw) => {
  const host = String(raw ?? '').toLowerCase().replace(/^www\./, '');
  if (!host || host === 'imgm.app' || host.endsWith('.imgm.app') || host === 'localhost') return '';
  return /^[a-z0-9.-]{1,100}$/.test(host) && host.includes('.') ? host : '';
};

// ── Today's counts, in memory until the next flush ──

let day = null;
let salt = null;
let seen = new Set(); // "visitor" and "visitor|dimension|value", for today's different visitors
let values = new Map(); // dimension → the values seen today (for the caps)
let pending = null; // { views, visitors, counts: Map("dimension\u0000value" → { views, visitors }) }

const freshPending = () => ({ views: 0, visitors: 0, counts: new Map() });

// A new day: a new salt (yesterday's visitors can't be matched any more), and the old
// day's counts written first, under their own date
const rollOver = (today) => {
  if (day === today) return;
  if (pending && (pending.views || pending.counts.size)) flush(day, pending);
  day = today;
  salt = randomBytes(16);
  seen = new Set();
  values = new Map();
  pending = freshPending();
};

const remember = (key) => {
  if (seen.has(key)) return false;
  if (seen.size < MAX_SEEN) seen.add(key);
  return true;
};

const valueFor = (dimension, value) => {
  const cap = MAX_VALUES[dimension];
  if (!cap) return value;
  const known = values.get(dimension) ?? new Set();
  values.set(dimension, known);
  if (known.has(value) || known.size < cap) {
    known.add(value);
    return value;
  }
  return 'other';
};

/**
 * Counts one page view. `ip` and `ua` only make today's visitor hash and are never
 * kept. Returns false for a visit that isn't counted (a bot, a made-up page).
 */
export const countVisit = ({ path, referrer, device, country, ip, ua }) => {
  if (!ua || BOT.test(ua)) return false;
  const page = cleanPath(path);
  if (!page || page.startsWith('/admin')) return false;
  rollOver(utcDay());

  const visitor = createHash('sha256').update(salt).update(String(ip ?? '')).update(ua).digest('base64url').slice(0, 16);
  pending.views += 1;
  if (remember(visitor)) pending.visitors += 1;

  const parts = {
    path: page,
    referrer: cleanReferrer(referrer),
    country: /^[A-Z]{2}$/.test(country ?? '') ? country : '',
    device: DEVICES.has(device) ? device : '',
    browser: family(BROWSERS, ua),
    os: family(SYSTEMS, ua),
  };
  for (const dimension of DIMENSIONS) {
    const raw = parts[dimension];
    if (!raw) continue; // no referrer (typed in, or a page after the first), no country
    const value = valueFor(dimension, raw);
    const key = `${dimension}\u0000${value}`;
    const count = pending.counts.get(key) ?? { views: 0, visitors: 0 };
    count.views += 1;
    if (remember(`${visitor}|${key}`)) count.visitors += 1;
    pending.counts.set(key, count);
  }
  return true;
};

// Adds one day's gathered counts to its rows. Counts that fail to save are lost (a
// minute of them at most): numbers for a chart, not records.
const flush = (forDay, batch) => {
  const date = new Date(`${forDay}T00:00:00Z`);
  const counts = [...batch.counts].map(([key, c]) => {
    const [dimension, value] = key.split('\u0000');
    return { dimension, value, ...c };
  });
  return prisma
    .$transaction([
      prisma.$executeRaw`
        INSERT INTO "VisitDay" ("day", "views", "visitors") VALUES (${date}, ${batch.views}, ${batch.visitors})
        ON CONFLICT ("day") DO UPDATE SET
          "views" = "VisitDay"."views" + EXCLUDED."views",
          "visitors" = "VisitDay"."visitors" + EXCLUDED."visitors"`,
      ...counts.map((c) => prisma.$executeRaw`
        INSERT INTO "VisitCount" ("day", "dimension", "value", "views", "visitors")
        VALUES (${date}, ${c.dimension}, ${c.value}, ${c.views}, ${c.visitors})
        ON CONFLICT ("day", "dimension", "value") DO UPDATE SET
          "views" = "VisitCount"."views" + EXCLUDED."views",
          "visitors" = "VisitCount"."visitors" + EXCLUDED."visitors"`),
    ])
    .catch((error) => console.error('Saving the visitor counts failed:', error.message));
};

// Writes what has gathered so far (the admin's Visitors tab calls it first, so the
// numbers include the last minute)
export const flushVisits = async () => {
  if (!pending || (!pending.views && !pending.counts.size)) return;
  const batch = pending;
  pending = freshPending();
  await flush(day, batch);
};

// Started once by index.js
export const startVisitCounter = () => {
  setInterval(() => flushVisits(), FLUSH_EVERY).unref();
};

// The daily rows older than 13 months go (the nightly tidy in notifyJobs.js)
export const pruneVisits = async (before) => {
  await prisma.visitDay.deleteMany({ where: { day: { lt: before } } });
  await prisma.visitCount.deleteMany({ where: { day: { lt: before } } });
};
