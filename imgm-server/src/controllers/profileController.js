/**
 * The player's profile: their picture (checked before it's saved), their stats and
 * their reviews.
 *
 * Profile pictures arrive already shrunk to 256px by the browser. They're saved only
 * after the AI service's SafeSearch check says they're fine (imgm-ai moderation.py);
 * if the check can't run, the picture isn't saved. A picture's address carries
 * avatarUpdatedAt, so it can be cached forever and a new one still shows at once.
 */
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { getSessionUser } from '../lib/session.js';
import { aiServiceUrl, internalApiKey } from '../lib/config.js';
import { getPlayerXp } from '../lib/playerXp.js';
import { withMaskedText } from '../lib/reviewText.js';
import { voterStats, weekOf } from '../lib/gotw.js';

const MAX_PICTURE = 300_000; // bytes
const PICTURE = /^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/=]+)$/;
const checksEnabled = Boolean(process.env.AI_SERVICE_URL);

const requireLogin = async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) res.status(401).json({ error: 'Log in first.' });
  return user;
};

// PUT /api/users/me/avatar  { image: "data:image/webp;base64,…" }
export const uploadAvatar = async (req, res) => {
  try {
    const user = await requireLogin(req, res);
    if (!user) return;
    const match = PICTURE.exec(req.body?.image ?? '');
    const data = match && Buffer.from(match[2], 'base64');
    if (!data || data.length === 0 || data.length > MAX_PICTURE) {
      return res.status(400).json({ error: 'Please choose a JPG, PNG or WebP picture.' });
    }
    if (!checksEnabled) {
      return res.status(503).json({ error: "Profile pictures can't be checked right now. Please try again later." });
    }

    // The safety check first: nothing is saved unless it passes
    let verdict;
    try {
      const response = await fetch(`${aiServiceUrl}/moderation/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(internalApiKey && { 'X-Internal-Key': internalApiKey }) },
        body: JSON.stringify({ image_base64: data.toString('base64') }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`moderation answered ${response.status}`);
      verdict = await response.json();
    } catch (error) {
      console.error('Profile picture check failed:', error.message);
      return res.status(503).json({ error: "We couldn't check the picture right now. Please try again in a bit." });
    }
    if (!verdict.allowed) {
      return res.status(422).json({ error: "This picture can't be used as a profile picture. Please choose another one." });
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.userAvatar.upsert({
        where: { userId: user.id },
        create: { userId: user.id, data, mime: match[1] },
        update: { data, mime: match[1] },
      }),
      prisma.user.update({ where: { id: user.id }, data: { avatarUpdatedAt: now } }),
    ]);
    res.json({ avatarUpdatedAt: now });
  } catch (error) {
    console.error('Error saving a profile picture:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/users/me/avatar — back to the coloured initial
export const deleteAvatar = async (req, res) => {
  try {
    const user = await requireLogin(req, res);
    if (!user) return;
    await prisma.$transaction([
      prisma.userAvatar.deleteMany({ where: { userId: user.id } }),
      prisma.user.update({ where: { id: user.id }, data: { avatarUpdatedAt: null } }),
    ]);
    res.status(204).end();
  } catch (error) {
    console.error('Error removing a profile picture:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/users/:id/avatar — the picture itself (cached for good: its URL changes with it)
export const getAvatar = async (req, res) => {
  try {
    const avatar = await prisma.userAvatar.findUnique({ where: { userId: req.params.id } });
    if (!avatar) return res.status(404).end();
    res.set({ 'Content-Type': avatar.mime, 'Cache-Control': 'public, max-age=31536000, immutable' });
    res.send(Buffer.from(avatar.data));
  } catch (error) {
    console.error('Error sending a profile picture:', error);
    res.status(500).end();
  }
};

// A review as the profile lists it: the game, the score, a short masked snippet
const REVIEW_SELECT = {
  id: true, rating: true, reviewText: true, createdAt: true, badges: true, helpfulCount: true,
  game: { select: { id: true, title: true, coverUrl: true } },
};
const asListItem = (review) => {
  const { masked, reviewText, ...rest } = withMaskedText(review);
  const text = (masked?.reviewText ?? reviewText)?.trim() || null;
  return { ...rest, snippet: text && (text.length > 180 ? `${text.slice(0, 180).trimEnd()}…` : text) };
};

// GET /api/users/me/profile — stats + the newest reviews
export const getMyProfile = async (req, res) => {
  try {
    const user = await requireLogin(req, res);
    if (!user) return;
    const [all, progress, gotw, latest] = await Promise.all([
      prisma.review.findMany({
        where: { userId: user.id },
        select: { rating: true, hoursPlayed: true, badges: true, helpfulCount: true, game: { select: { genres: true } } },
      }),
      getPlayerXp(user.id),
      voterStats(user.id, weekOf().id),
      prisma.review.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 12, select: REVIEW_SELECT }),
    ]);
    const byRating = {};
    const badges = {};
    const genres = {};
    for (const review of all) {
      byRating[review.rating] = (byRating[review.rating] ?? 0) + 1;
      for (const badge of review.badges) badges[badge] = (badges[badge] ?? 0) + 1;
      for (const genre of review.game?.genres ?? []) genres[genre] = (genres[genre] ?? 0) + 1;
    }
    const sum = (key) => all.reduce((total, r) => total + (r[key] ?? 0), 0);
    res.json({
      player: { id: user.id, name: user.displayUsername ?? user.username, avatarUpdatedAt: user.avatarUpdatedAt ?? null, joinedAt: user.createdAt },
      stats: {
        xp: progress.xp,
        reviews: all.length,
        averageGiven: all.length ? sum('rating') / all.length : null,
        byRating,
        hoursLogged: sum('hoursPlayed'),
        helpfulVotes: sum('helpfulCount'),
        badges,
        topGenres: Object.entries(genres).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([genre]) => genre),
        gotw,
      },
      reviews: latest.map(asListItem),
    });
  } catch (error) {
    console.error('Error loading the profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/users/me/reviews?offset=&limit= — more of your reviews ("Show more")
const pageQuery = z.object({
  offset: z.coerce.number().int().min(0).max(10000).default(0),
  limit: z.coerce.number().int().min(1).max(24).default(12),
});
export const getMyReviews = async (req, res) => {
  const query = pageQuery.safeParse(req.query);
  if (!query.success) return res.status(400).json({ error: 'Invalid request' });
  try {
    const user = await requireLogin(req, res);
    if (!user) return;
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, skip: query.data.offset, take: query.data.limit, select: REVIEW_SELECT }),
      prisma.review.count({ where: { userId: user.id } }),
    ]);
    res.json({ reviews: reviews.map(asListItem), total, hasMore: query.data.offset + reviews.length < total });
  } catch (error) {
    console.error('Error loading your reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
