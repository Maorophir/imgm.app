/**
 * Keeps Play Next's review search up to date: after a review is saved or deleted,
 * tell the AI service so it re-embeds (or removes) just that review.
 *
 * Fire-and-forget: the player never waits for it, and a failure is only logged,
 * because the AI service catches up on every review when it starts.
 */
import { aiServiceUrl, internalApiKey } from './config.js';

// Only when an AI service is configured (locally via docker-compose, live via Render)
const enabled = Boolean(process.env.AI_SERVICE_URL);

export const notifyReviewChanged = (reviewId) => {
  if (!enabled) return;
  fetch(`${aiServiceUrl}/index/reviews/${encodeURIComponent(reviewId)}`, {
    method: 'POST',
    headers: internalApiKey ? { 'X-Internal-Key': internalApiKey } : {},
    signal: AbortSignal.timeout(15_000),
  })
    .then((response) => {
      if (!response.ok) console.error(`Review index update for ${reviewId} failed: ${response.status}`);
    })
    .catch((error) =>
      console.error(`Review index update for ${reviewId} failed (the startup catch-up will fix it):`, error.message)
    );
};
