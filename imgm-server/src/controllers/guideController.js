/**
 * Play Next — the AI recommendation chat. Express is the gatekeeper: it checks the
 * login, then forwards the request to the AI service with the player's id and the
 * shared secret, and streams the AI's live events straight back to the browser.
 */
import { Readable } from 'node:stream';
import { z } from 'zod';
import { aiServiceUrl, internalApiKey } from '../lib/config.js';

const guideSchema = z
  .object({
    // The page's id for this conversation. The AI service files the chat under the
    // logged-in player's id + this, so it can only ever reach the player's own chats.
    chat_id: z.string().regex(/^[A-Za-z0-9-]{8,64}$/),
    message: z.string().trim().min(1).max(1000).optional(),
    // "Not for me" on one card: it's remembered for the rest of the chat
    not_for_me: z.object({ game_id: z.int().positive(), title: z.string().trim().min(1).max(200) }).optional(),
    // The AI service validates the exact shape (platforms, moods, …)
    preferences: z.record(z.string(), z.any()).default({}),
    // An edited question: it replaces the chat's question number N (the latest one)
    replace_turn: z.int().min(1).max(50).optional(),
  })
  .refine((body) => body.message || body.not_for_me, { message: 'Send a message or a "not for me".' });

// POST /api/guide/stream — answers with Server-Sent Events (see imgm-ai/src/imgm_ai/server.py)
export const streamGuide = async (req, res) => {
  const parsed = guideSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Please type a message (up to 1,000 characters).' });
  }

  // If the player closes the page, stop waiting on the AI service too
  const upstreamAbort = new AbortController();
  res.on('close', () => upstreamAbort.abort());

  let upstream;
  try {
    upstream = await fetch(`${aiServiceUrl}/guide/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Who is asking comes from the login session, never from the browser
        'X-User-Id': req.user.id,
        ...(internalApiKey && { 'X-Internal-Key': internalApiKey }),
      },
      body: JSON.stringify(parsed.data),
      signal: upstreamAbort.signal,
    });
  } catch (error) {
    if (upstreamAbort.signal.aborted) return;
    console.error('Play Next service unreachable:', error.message);
    return res.status(503).json({ error: 'Play Next is offline right now. Please try again later.' });
  }

  if (!upstream.ok || !upstream.body) {
    console.error('Play Next service error:', upstream.status);
    return res.status(502).json({ error: 'Play Next is unavailable right now. Please try again later.' });
  }

  // Pass the event stream through as it arrives (no buffering anywhere on the way)
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  Readable.fromWeb(upstream.body)
    .on('error', () => res.end()) // the AI service dropped or the player left
    .pipe(res);
};

// POST /api/guide/wake — the Play Next page opened: start the AI service now.
// Google puts it to sleep after ~15 quiet minutes, and waking takes ~15 seconds;
// done while the player is still typing, their first question doesn't wait for it.
const WAKE_EVERY = 60 * 1000; // one wake-up call a minute is plenty, however many players
let lastWake = 0;

export const wakeGuide = (req, res) => {
  if (Date.now() - lastWake > WAKE_EVERY) {
    lastWake = Date.now();
    fetch(`${aiServiceUrl}/health`, { signal: AbortSignal.timeout(60 * 1000) }).catch(() => {});
  }
  res.status(204).end();
};
