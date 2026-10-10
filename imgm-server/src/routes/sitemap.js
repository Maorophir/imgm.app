/**
 * GET /api/sitemap.xml — the list of pages search engines should know about.
 *
 * The website (imgm.app/sitemap.xml) forwards here (vercel.json), and robots.txt points
 * to it. It lists the main pages and every game with at least one IMGM review: those
 * are the pages with something of ours on them. A game's date is its newest review,
 * so search engines come back when there's something new to read.
 */
import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { clientOrigins } from '../lib/config.js';

const router = Router();
const PAGES = ['/', '/hall-of-fame', '/game-of-the-week', '/play-next', '/terms', '/privacy'];

router.get('/sitemap.xml', async (req, res) => {
  try {
    const site = clientOrigins[0];
    const games = await prisma.review.groupBy({ by: ['gameId'], _max: { updatedAt: true } });
    const url = (path, lastmod) =>
      `  <url><loc>${site}${path}</loc>${lastmod ? `<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : ''}</url>`;
    res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...PAGES.map((path) => url(path)),
        ...games.map((g) => url(`/game/${g.gameId}`, g._max.updatedAt)),
        '</urlset>',
      ].join('\n')
    );
  } catch (error) {
    console.error('Error building the sitemap:', error);
    res.status(500).end();
  }
});

export default router;
