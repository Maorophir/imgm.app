/**
 * The "what players think" summary on game pages: when one is due, ask the AI
 * service (imgm-ai summary.py) for it and save it in GameAISummary.
 *
 * Called after every review save or delete, fire-and-forget. A summary is made or
 * redone only when it's worth it, because each one is an AI call:
 *   - the game has at least MIN_REVIEWS reviews (fewer: any old summary is removed)
 *   - there's no summary yet, or the reviews changed enough since the last one:
 *     REFRESH_EVERY more (or fewer) reviews, or 25% more, and at least MIN_AGE ago;
 *     or reviews were edited and the summary is over a week old
 * The overall sentiment comes from the ratings, never from the AI.
 */
import { prisma } from './db.js';
import { aiServiceUrl, internalApiKey } from './config.js';

const MIN_REVIEWS = 3;
const REFRESH_EVERY = 3;
const MIN_AGE = 6 * 60 * 60 * 1000; // 6 hours
const EDITED_AGE = 7 * 24 * 60 * 60 * 1000; // a week

const enabled = Boolean(process.env.AI_SERVICE_URL);
const running = new Set(); // games being summarized right now (one at a time each)

// Positive / Mixed / Negative from the average rating (the names SentimentBadge knows)
export const sentimentFromRatings = (average) => (average >= 7.5 ? 'Positive' : average >= 5.5 ? 'Mixed' : 'Negative');

const isDue = async (gameId, summary, count) => {
  if (!summary) return true;
  const age = Date.now() - summary.generatedAt.getTime();
  const change = Math.abs(count - summary.reviewCountAtGen);
  if (age >= MIN_AGE && (change >= REFRESH_EVERY || change >= summary.reviewCountAtGen * 0.25)) return true;
  if (age < EDITED_AGE) return false;
  return (await prisma.review.count({ where: { gameId, updatedAt: { gt: summary.generatedAt } } })) > 0;
};

/**
 * Makes or refreshes a game's summary if it's due (or always, with force).
 * Never throws: a failed summary just keeps the old one until the next try.
 */
export const refreshGameSummary = async (gameId, { force = false } = {}) => {
  if (!enabled || running.has(gameId)) return;
  running.add(gameId);
  try {
    const [stats, summary] = await Promise.all([
      prisma.review.aggregate({ where: { gameId }, _count: { _all: true }, _avg: { rating: true } }),
      prisma.gameAISummary.findUnique({ where: { gameId } }),
    ]);
    const count = stats._count._all;
    if (count < MIN_REVIEWS) {
      if (summary) await prisma.gameAISummary.delete({ where: { gameId } });
      return;
    }
    if (!force && !(await isDue(gameId, summary, count))) return;

    const response = await fetch(`${aiServiceUrl}/summaries/games/${gameId}`, {
      method: 'POST',
      headers: internalApiKey ? { 'X-Internal-Key': internalApiKey } : {},
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) throw new Error(`AI service answered ${response.status}`);
    const result = await response.json();

    const data = {
      summaryText: result.summary,
      aspects: result.aspects,
      overallSentiment: sentimentFromRatings(stats._avg.rating),
      reviewCountAtGen: count,
      generatedAt: new Date(),
    };
    await prisma.gameAISummary.upsert({ where: { gameId }, create: { gameId, ...data }, update: data });
  } catch (error) {
    console.error(`Summary for game ${gameId} failed (kept the old one):`, error.message);
  } finally {
    running.delete(gameId);
  }
};
