/**
 * The player's profile: their picture (checked before it's saved), their stats and
 * their reviews. The same profile, minus what's private, is public at /u/<gamer tag>
 * (getPublicProfile / getPublicReviews): see loadProfile for what each one shows.
 *
 * Profile pictures arrive already shrunk to 256px by the browser. They're saved only
 * after the AI service's SafeSearch check says they're fine (imgm-ai moderation.py);
 * if the check can't run, the picture isn't saved. A picture's address carries
 * avatarUpdatedAt, so it can be cached forever and a new one still shows at once.
 */
import { z } from 'zod';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../lib/auth.js';
import { prisma } from '../lib/db.js';
import { getSessionUser } from '../lib/session.js';
import { aiServiceUrl, internalApiKey } from '../lib/config.js';
import { getPlayerXp } from '../lib/playerXp.js';
import { withMaskedText } from '../lib/reviewText.js';
import { voterStats, weekOf } from '../lib/gotw.js';
import { AVATAR_PRESETS, presetByKey } from '../lib/avatarPresets.js';
import { normalizeUsername, USERNAME_MAX } from '../lib/usernameRules.js';

const MAX_PICTURE = 300_000; // bytes
const PICTURE = /^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/=]+)$/;
const checksEnabled = Boolean(process.env.AI_SERVICE_URL);

const requireLogin = async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) res.status(401).json({ error: 'Log in first.' });
  return user;
};

// GET /api/users/avatars/presets — the ready-made character avatars
export const getAvatarPresets = (req, res) => {
  res.set('Cache-Control', 'public, max-age=86400');
  res.json(AVATAR_PRESETS.map(({ key, name, game, url }) => ({ key, name, game, url })));
};

// Saves the avatar row and its time (the time is in the picture's address)
const saveAvatar = async (userId, row) => {
  const now = new Date();
  await prisma.$transaction([
    prisma.userAvatar.upsert({ where: { userId }, create: { userId, ...row }, update: row }),
    prisma.user.update({ where: { id: userId }, data: { avatarUpdatedAt: now } }),
  ]);
  return now;
};

// PUT /api/users/me/avatar  { image: "data:image/webp;base64,…" } or { preset: "geralt" }
export const uploadAvatar = async (req, res) => {
  try {
    const user = await requireLogin(req, res);
    if (!user) return;
    // A ready-made character: official art, nothing to check
    if (req.body?.preset !== undefined) {
      if (!presetByKey.has(req.body.preset)) return res.status(400).json({ error: 'Unknown avatar.' });
      return res.json({ avatarUpdatedAt: await saveAvatar(user.id, { preset: req.body.preset, data: null, mime: null }) });
    }
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

    res.json({ avatarUpdatedAt: await saveAvatar(user.id, { data, mime: match[1], preset: null }) });
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
    // A character avatar lives on IGDB: send the browser there (cached like a picture)
    if (avatar.preset) {
      const preset = presetByKey.get(avatar.preset);
      if (!preset) return res.status(404).end();
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
      return res.redirect(302, preset.url);
    }
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

// One page of a player's reviews, newest first (ties by id, so pages never overlap)
const reviewsPage = (userId, offset, limit) =>
  prisma.review.findMany({
    where: { userId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    skip: offset,
    take: limit,
    select: REVIEW_SELECT,
  });

/**
 * A player's profile: { player, stats, reviews }. Your own profile and anyone's public
 * one both come from here, so they always show the same numbers.
 *
 * `own` adds what only the player sees about themselves: when they joined and their
 * Game of the Week record. Votes are private (the Privacy page lists what's public:
 * gamer tag, picture, level, reviews and badges), so the public profile leaves them
 * out, and its XP (so its level) counts reviews only: with the XP each vote earns in
 * it, the number would give away how often the player votes. That's the same XP a
 * game page shows next to their reviews (withAuthorXp). Neither profile ever carries
 * an email address or real name.
 */
const loadProfile = async (user, { own }) => {
  const [all, progress, gotw, latest] = await Promise.all([
    prisma.review.findMany({
      where: { userId: user.id },
      select: {
        rating: true, hoursPlayed: true, badges: true, helpfulCount: true, xp: true, helpfulXp: true,
        game: { select: { genres: true } },
      },
    }),
    own ? getPlayerXp(user.id) : null,
    own ? voterStats(user.id, weekOf().id) : null,
    reviewsPage(user.id, 0, 12),
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
  return {
    player: {
      id: user.id,
      name: user.displayUsername ?? user.username,
      avatarUpdatedAt: user.avatarUpdatedAt ?? null,
      ...(own && { joinedAt: user.createdAt }),
    },
    stats: {
      xp: own ? progress.xp : sum('xp') + sum('helpfulXp'), // public: without the votes' XP
      reviews: all.length,
      averageGiven: all.length ? sum('rating') / all.length : null,
      byRating,
      hoursLogged: sum('hoursPlayed'),
      helpfulVotes: sum('helpfulCount'),
      badges,
      topGenres: Object.entries(genres).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([genre]) => genre),
      ...(own && { gotw }),
    },
    reviews: latest.map(asListItem),
  };
};

// The player behind a public gamer tag (any capitalisation), or null. Only what a public
// profile needs is read: never the email address or the real name.
const findPlayer = (tag) => {
  const name = String(tag ?? '').trim();
  if (!name || name.length > USERNAME_MAX) return null;
  return prisma.user.findUnique({
    where: { username: normalizeUsername(name) },
    select: { id: true, username: true, displayUsername: true, avatarUpdatedAt: true },
  });
};

// GET /api/users/me/profile — your stats + your newest reviews
export const getMyProfile = async (req, res) => {
  try {
    const user = await requireLogin(req, res);
    if (!user) return;
    res.json(await loadProfile(user, { own: true }));
  } catch (error) {
    console.error('Error loading the profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/users/:username/profile — anyone's public profile, by gamer tag (404 if no
// player has it)
export const getPublicProfile = async (req, res) => {
  try {
    const player = await findPlayer(req.params.username);
    if (!player) return res.status(404).json({ error: 'No player has that gamer tag.' });
    res.json(await loadProfile(player, { own: false }));
  } catch (error) {
    console.error('Error loading a public profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// More reviews, page by page ("Show more"): ?offset=&limit=
const pageQuery = z.object({
  offset: z.coerce.number().int().min(0).max(10000).default(0),
  limit: z.coerce.number().int().min(1).max(24).default(12),
});
const sendReviewsPage = async (res, userId, { offset, limit }) => {
  const [reviews, total] = await Promise.all([
    reviewsPage(userId, offset, limit),
    prisma.review.count({ where: { userId } }),
  ]);
  res.json({ reviews: reviews.map(asListItem), total, hasMore: offset + reviews.length < total });
};

// GET /api/users/me/reviews?offset=&limit= — more of your reviews
export const getMyReviews = async (req, res) => {
  const query = pageQuery.safeParse(req.query);
  if (!query.success) return res.status(400).json({ error: 'Invalid request' });
  try {
    const user = await requireLogin(req, res);
    if (!user) return;
    await sendReviewsPage(res, user.id, query.data);
  } catch (error) {
    console.error('Error loading your reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/users/:username/reviews?offset=&limit= — more of a player's reviews
export const getPublicReviews = async (req, res) => {
  const query = pageQuery.safeParse(req.query);
  if (!query.success) return res.status(400).json({ error: 'Invalid request' });
  try {
    const player = await findPlayer(req.params.username);
    if (!player) return res.status(404).json({ error: 'No player has that gamer tag.' });
    await sendReviewsPage(res, player.id, query.data);
  } catch (error) {
    console.error("Error loading a player's reviews:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/users/me/account — how the player logs in (a password, Google, or both)
export const getMyAccount = async (req, res) => {
  try {
    const user = await requireLogin(req, res);
    if (!user) return;
    const accounts = await prisma.account.findMany({ where: { userId: user.id }, select: { providerId: true, password: true } });
    res.json({
      hasPassword: accounts.some((a) => a.providerId === 'credential' && a.password),
      providers: accounts.map((a) => a.providerId),
    });
  } catch (error) {
    console.error('Error reading the account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/users/me  { password?, reason, details? } — delete the account for good.
// Better Auth checks the password (or, for Google accounts, a login from the last day);
// the reason is kept anonymously.
const deleteSchema = z.object({
  password: z.string().min(1).max(200).optional(),
  reason: z.enum(['not_using', 'privacy', 'better_site', 'broken', 'other']),
  details: z.string().trim().max(1000).optional(),
});
export const deleteMyAccount = async (req, res) => {
  const body = deleteSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Please choose a reason.' });
  try {
    const user = await requireLogin(req, res);
    if (!user) return;
    const reviews = await prisma.review.count({ where: { userId: user.id } });
    try {
      await auth.api.deleteUser({
        body: body.data.password ? { password: body.data.password } : {},
        headers: fromNodeHeaders(req.headers),
      });
    } catch (error) {
      const code = error?.body?.code ?? error?.code;
      if (code === 'INVALID_PASSWORD') return res.status(400).json({ error: "That password isn't right." });
      if (code === 'SESSION_EXPIRED') {
        return res.status(403).json({ error: 'For your safety, log out and log back in, then delete your account within a day.' });
      }
      throw error;
    }
    await prisma.accountDeletion.create({ data: { reason: body.data.reason, details: body.data.details || null, reviews } });
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting an account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
