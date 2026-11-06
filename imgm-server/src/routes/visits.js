/**
 * /api/visits — the site's page-view beacon for the visitor counter (lib/visits.js).
 * Open to everyone, logged in or not, and it always answers 204 with nothing: a beacon
 * that wasn't counted (a bot, too many) looks the same as one that was.
 */
import { Router } from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { z } from 'zod';
import { countVisit } from '../lib/visits.js';

const router = Router();

// One person clicking around sends one a page: plenty. A script can't fill the counts.
const beaconLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
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
const clientIp = (req) => String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || req.ip;

// Whether Vercel passes the visitor's country on to this server: said once in the log
let countryNoted = false;

// POST /api/visits  { path, referrer?, device?, automated? }
router.post('/', beaconLimiter, (req, res) => {
  const beacon = Beacon.safeParse(req.body);
  if (beacon.success && !beacon.data.automated) {
    const country = req.headers['x-vercel-ip-country'];
    if (!countryNoted) {
      countryNoted = true;
      console.log(`Visitor counter: ${country ? 'the country reaches this server' : 'no country header (countries stay empty)'}`);
    }
    countVisit({
      path: beacon.data.path,
      referrer: beacon.data.referrer,
      device: beacon.data.device,
      country: typeof country === 'string' ? country.toUpperCase() : '',
      ip: clientIp(req),
      ua: String(req.headers['user-agent'] ?? ''),
    });
  }
  res.status(204).end();
});

export default router;
