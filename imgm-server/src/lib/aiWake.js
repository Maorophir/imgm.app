/**
 * Wake the AI service before it's needed. Cloud Run puts it to sleep after ~15 quiet
 * minutes and waking takes ~15 seconds, so pages that will need it call this as soon
 * as they open (Play Next while the player types; the avatar window while they pick a
 * photo for the safety check), and the real request doesn't wait.
 */
import { aiServiceUrl } from './config.js';

const WAKE_EVERY = 60 * 1000; // one wake-up call a minute is plenty, however many players
let lastWake = 0;

export const wakeAiService = () => {
  if (!aiServiceUrl || Date.now() - lastWake < WAKE_EVERY) return;
  lastWake = Date.now();
  fetch(`${aiServiceUrl}/health`, { signal: AbortSignal.timeout(60 * 1000) }).catch(() => {});
};
