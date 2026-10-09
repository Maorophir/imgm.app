/**
 * "Was this review helpful?" — votes, the ranking score, and what they earn the author.
 *
 * After every vote the review's counters are recounted from the votes themselves
 * (never +1/-1), so they can't drift. The ranking score is the Wilson score: the
 * lowest the true "helpful" share could plausibly be. It's how Reddit's "Best" sort
 * works: 3 of 3 helpful ranks below 95 of 100, because 3 votes prove little.
 */
import { prisma } from './db.js';

export const HELPFUL_XP_EACH = 2; // XP for the author per "helpful" vote…
export const HELPFUL_XP_MAX = 50; // …up to this much per review (no farming with friends)
export const TRUSTED_VOICE_AT = 10; // "helpful" votes on one review → the Trusted Voice badge

// The Wilson score (95% confidence): 0 with no votes, close to the share with many
export const wilsonScore = (helpful, unhelpful) => {
  const n = helpful + unhelpful;
  if (n === 0) return 0;
  const z = 1.96;
  const p = helpful / n;
  return (p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)) / (1 + (z * z) / n);
};

/**
 * Recounts one review's votes into its counters, score and helpful XP (and awards
 * Trusted Voice). Votes vanish without a vote call when a voter's account is deleted,
 * so whatever deletes accounts must recount the reviews they voted on.
 */
export const recountVotes = async (reviewId, tx = prisma) => {
  const [helpfulCount, unhelpfulCount, review] = await Promise.all([
    tx.reviewVote.count({ where: { reviewId, helpful: true } }),
    tx.reviewVote.count({ where: { reviewId, helpful: false } }),
    tx.review.findUnique({ where: { id: reviewId }, select: { badges: true } }),
  ]);
  const badges =
    helpfulCount >= TRUSTED_VOICE_AT && !review.badges.includes('trusted_voice')
      ? [...review.badges, 'trusted_voice'] // once earned, it stays (like First Reviewer)
      : review.badges;
  await tx.review.update({
    where: { id: reviewId },
    data: {
      helpfulCount,
      unhelpfulCount,
      helpfulScore: wilsonScore(helpfulCount, unhelpfulCount),
      helpfulXp: Math.min(helpfulCount * HELPFUL_XP_EACH, HELPFUL_XP_MAX),
      badges,
    },
  });
  return { helpfulCount, unhelpfulCount };
};

/**
 * One player's vote: helpful = true / false, or null to take it back.
 * Returns the review's new counts, or null if there's no such review.
 * Players can't vote on their own review (the caller checks).
 */
export const castVote = (userId, reviewId, helpful) =>
  prisma.$transaction(async (tx) => {
    const key = { userId_reviewId: { userId, reviewId } };
    if (helpful === null) await tx.reviewVote.deleteMany({ where: { userId, reviewId } });
    else await tx.reviewVote.upsert({ where: key, create: { userId, reviewId, helpful }, update: { helpful } });

    return { ...(await recountVotes(reviewId, tx)), myVote: helpful };
  });
