/**
 * /api/visits — the site's page-view beacon for the visitor counter (lib/visits.js).
 * Open to everyone, logged in or not, and it always answers 204 with nothing: a beacon
 * that wasn't counted (a bot, too many) looks the same as one that was.
 */
import { Router } from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { clientIp } from '../lib/clientIp.js';
import ip3country from 'ip3country';

// The visitor's country from their address, for the Visitors tab: Vercel doesn't pass its
// own country header through the rewrite (Render's log said so on 2026-11-06), so a small
// address → country table (IP2Location LITE, credited in the Privacy Policy) answers it
// here. The address is used for that moment only and never stored.
ip3country.init();
const countryOf = (ip) => {
  try {
    return ip3country.lookupStr(ip) ?? '';
  } catch {
    return ''; // an address it can't read (IPv6 and the like): no country
  }
};
import { z } from 'zod';
import { countVisit } from '../lib/visits.js';

const router = Router();

// One person clicking around sends one a page: plenty. A script can't fill the counts.
const beaconLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  keyGenerator: (req) => ipKeyGenerator(clientIp(req)),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) => res.status(204).end(),
});

const Beacon = z.object({
  path: z.string().max(200),
  referrer: z.string().max(200).optional(),
  device: z.enum(['phone', 'tablet', 'computer']).optional(),
  // The browser says it's driven by a script (navigator.webdriver): not a person
  automated: z.boolean().optional(),
});

// The visitor's own address: Vercel puts it first in X-Forwarded-For when it passes the
// request on. It only goes into today's visitor hash, never into storage.

// POST /api/visits  { path, referrer?, device?, automated? }
router.post('/', beaconLimiter, (req, res) => {
  const beacon = Beacon.safeParse(req.body);
  if (beacon.success && !beacon.data.automated) {
    const ip = clientIp(req);
    const header = req.headers['x-vercel-ip-country'];
    const country = typeof header === 'string' && header ? header : countryOf(ip);
    countVisit({
      path: beacon.data.path,
      referrer: beacon.data.referrer,
      device: beacon.data.device,
      country: country.toUpperCase(),
      ip,
      ua: String(req.headers['user-agent'] ?? ''),
    });
  }
  res.status(204).end();
});

export default router;
