/**
 * Game Guide — the AI recommendation chat. Express is the gatekeeper: it checks the
 * login, then forwards the request to the AI service with the player's id and the
 * shared secret, and streams the AI's live events straight back to the browser.
 */
import { Readable } from 'node:stream';
import { z } from 'zod';
import { aiServiceUrl, internalApiKey } from '../lib/config.js';

const guideSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  // The AI service validates the exact shape (platforms, moods, …)
  preferences: z.record(z.string(), z.any()).default({}),
});

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
    console.error('Game Guide service unreachable:', error.message);
    return res.status(503).json({ error: 'Play Next is offline right now. Please try again later.' });
  }

  if (!upstream.ok || !upstream.body) {
    console.error('Game Guide service error:', upstream.status);
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
