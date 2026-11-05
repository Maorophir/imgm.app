/**
 * Deleting a review, the same way when its player deletes it and when an admin removes
 * it: Play Next's search forgets it, and the game's AI summary is refreshed if that
 * changed enough. The player's XP and the game's score are sums and averages of the
 * reviews left, so they follow by themselves.
 *
 * `alsoDo`: more writes that must happen together with the delete, or not at all (the
 * admin's log entry, with its copy of the review).
 */
import { prisma } from './db.js';
import { notifyReviewChanged } from './aiIndex.js';
import { refreshGameSummary } from './aiSummary.js';

export const removeReview = async ({ id, gameId }, alsoDo = []) => {
  await prisma.$transaction([prisma.review.delete({ where: { id } }), ...alsoDo]);
  notifyReviewChanged(id);
  refreshGameSummary(gameId);
};
