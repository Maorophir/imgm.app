/**
 * Makes or refreshes the "what players think" summaries by hand (e.g. the first time,
 * or after changing the prompt):
 *     npm run summaries                 games whose summary is due
 *     npm run summaries -- --all        every game with enough reviews
 *     npm run summaries -- 305152       just these games
 */
import { prisma } from '../src/lib/db.js';
import { refreshGameSummary } from '../src/lib/aiSummary.js';

const args = process.argv.slice(2);
const ids = args.filter((a) => /^\d+$/.test(a)).map(Number);
const force = args.includes('--all') || ids.length > 0;

const games = ids.length
  ? ids
  : (await prisma.review.groupBy({ by: ['gameId'], _count: { _all: true }, having: { gameId: { _count: { gte: 3 } } } })).map((g) => g.gameId);

for (const gameId of games) {
  process.stdout.write(`Game ${gameId}… `);
  await refreshGameSummary(gameId, { force });
  const summary = await prisma.gameAISummary.findUnique({ where: { gameId }, select: { generatedAt: true } });
  console.log(summary ? `summary from ${summary.generatedAt.toISOString()}` : 'no summary');
}
await prisma.$disconnect();
