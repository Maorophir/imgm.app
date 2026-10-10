/**
 * What happens around an account deletion (Better Auth's deleteUser hooks, auth.js).
 * The database removes the player's own rows by itself (onDelete: Cascade); this
 * handles what depends on them elsewhere:
 *   before  their helpful votes are taken off (and those reviews recounted), and the
 *           AI service forgets their Play Next chats
 *   after   the games they reviewed get their AI summary refreshed, if it's due
 */
import { prisma } from './db.js';
import { recountVotes } from './reviewVotes.js';
import { refreshGameSummary } from './aiSummary.js';
import { aiServiceUrl, internalApiKey } from './config.js';

const reviewedGames = new Map(); // userId → game ids, from "before" to "after"

const forgetChat = (userId, chatId) =>
  fetch(`${aiServiceUrl}/chats/${chatId}`, {
    method: 'DELETE',
    headers: { 'X-User-Id': userId, ...(internalApiKey && { 'X-Internal-Key': internalApiKey }) },
    signal: AbortSignal.timeout(30_000),
  }).catch(() => {});

export const beforeAccountDeleted = async (user) => {
  const [votes, reviews, chats] = await Promise.all([
    prisma.reviewVote.findMany({ where: { userId: user.id }, select: { reviewId: true } }),
    prisma.review.findMany({ where: { userId: user.id }, select: { gameId: true } }),
    prisma.playNextChat.findMany({ where: { userId: user.id }, select: { id: true } }),
  ]);
  await prisma.reviewVote.deleteMany({ where: { userId: user.id } });
  for (const { reviewId } of votes) await recountVotes(reviewId);
  if (process.env.AI_SERVICE_URL) chats.forEach((chat) => forgetChat(user.id, chat.id));
  reviewedGames.set(user.id, reviews.map((r) => r.gameId));
};

export const afterAccountDeleted = async (user) => {
  const games = reviewedGames.get(user.id) ?? [];
  reviewedGames.delete(user.id);
  games.forEach((gameId) => refreshGameSummary(gameId)); // fire-and-forget
};
