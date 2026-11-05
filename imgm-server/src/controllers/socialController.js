/**
 * Players and players: following someone, and how much two players' taste agrees.
 *
 *   follows        a profile's follower and following counts (and whether you follow it)
 *   follow         follow / unfollow a player by gamer tag
 *   followingFeed  the newest reviews by the players you follow (the home page's strip)
 *   tasteMatch     you and another player: the games you both rated and how close
 *   compareGames   a player's best-known rated games, for their /compare/<tag> link
 *
 * Everything here comes from what a public profile already shows (gamer tag, picture,
 * reviews and their scores). Who follows whom is never sent: only the counts.
 */
import { prisma } from '../lib/db.js';
import { getSessionUser } from '../lib/session.js';
import { withMaskedText } from '../lib/reviewText.js';
import { normalizeUsername, USERNAME_MAX } from '../lib/usernameRules.js';

// A match needs this many games you both rated: fewer, and one game decides it
export const MATCH_MIN = 3;
const FEED_COUNT = 4; // reviews in the home page's strip, like Fresh from the community
const COMPARE_POOL = 12; // games a compare link offers (5 at a time, skips bring the next)
const LOVED = 8; // a score of 8 or more is "love" (Epic and Legendary)
const SPLIT = 3; // scores 3 or more apart are a split worth naming

// The player behind a gamer tag (any capitalisation), or null: only public fields
const findPlayer = (tag) => {
  const name = String(tag ?? '').trim();
  if (!name || name.length > USERNAME_MAX) return null;
  return prisma.user.findUnique({
    where: { username: normalizeUsername(name) },
    select: { id: true, username: true, displayUsername: true, avatarUpdatedAt: true },
  });
};
const asPlayer = (user) => ({ id: user.id, name: user.displayUsername ?? user.username, avatarUpdatedAt: user.avatarUpdatedAt ?? null });

const fail = (res, what, error) => {
  console.error(`Error ${what}:`, error);
  res.status(500).json({ error: 'Internal server error' });
};

// GET /api/users/:username/follows — { followers, following, youFollow }
export const getFollows = async (req, res) => {
  try {
    const [player, viewer] = await Promise.all([findPlayer(req.params.username), getSessionUser(req)]);
    if (!player) return res.status(404).json({ error: 'No player has that gamer tag.' });
    const [followers, following, mine] = await Promise.all([
      prisma.follow.count({ where: { followingId: player.id } }),
      prisma.follow.count({ where: { followerId: player.id } }),
      viewer && viewer.id !== player.id
        ? prisma.follow.findUnique({ where: { followerId_followingId: { followerId: viewer.id, followingId: player.id } } })
        : null,
    ]);
    res.json({ followers, following, youFollow: Boolean(mine) });
  } catch (error) {
    fail(res, 'loading follows', error);
  }
};

// PUT /api/users/:username/follow (follow) and DELETE (unfollow), logged in
// (requireUser). Both are safe to repeat. → the new { followers, youFollow }
const setFollow = (on) => async (req, res) => {
  try {
    const player = await findPlayer(req.params.username);
    if (!player) return res.status(404).json({ error: 'No player has that gamer tag.' });
    if (player.id === req.user.id) return res.status(400).json({ error: "You can't follow yourself." });
    const pair = { followerId: req.user.id, followingId: player.id };
    if (on) await prisma.follow.upsert({ where: { followerId_followingId: pair }, create: pair, update: {} });
    else await prisma.follow.deleteMany({ where: pair });
    const followers = await prisma.follow.count({ where: { followingId: player.id } });
    res.json({ followers, youFollow: on });
  } catch (error) {
    fail(res, 'following a player', error);
  }
};
export const follow = setFollow(true);
export const unfollow = setFollow(false);

// A review's words for a small card: masked swearing, cut at a word near 160 characters
const snippetOf = (review) => {
  const { masked, reviewText } = withMaskedText(review);
  const text = (masked?.reviewText ?? reviewText)?.trim();
  if (!text) return null;
  if (text.length <= 160) return text;
  const cut = text.slice(0, 160);
  const space = cut.lastIndexOf(' ');
  return `${(space > 112 ? cut.slice(0, space) : cut).trimEnd()}…`;
};

// GET /api/users/me/following/reviews — { following, reviews }: how many players you
// follow, and their newest reviews in the shape of Fresh from the community's cards
export const getFollowingFeed = async (req, res) => {
  try {
    const ids = (await prisma.follow.findMany({ where: { followerId: req.user.id }, select: { followingId: true } }))
      .map((f) => f.followingId);
    if (ids.length === 0) return res.json({ following: 0, reviews: [] });
    const reviews = await prisma.review.findMany({
      where: { userId: { in: ids } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: FEED_COUNT,
      select: {
        id: true, rating: true, reviewText: true, createdAt: true,
        user: { select: { displayUsername: true } },
        game: { select: { id: true, title: true, coverUrl: true } },
      },
    });
    res.json({
      following: ids.length,
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        snippet: snippetOf(review),
        createdAt: review.createdAt,
        author: review.user?.displayUsername ?? null,
        game: review.game,
      })),
    });
  } catch (error) {
    fail(res, 'loading the following feed', error);
  }
};

/**
 * How two players' scores agree, from the games they both rated.
 *
 * The match is 100% minus the average gap between their scores, as a share of the
 * biggest gap there can be (9: a 1 against a 10). So scores 1.2 apart on average make
 * an 87% match, the same scores every time make 100%, and opposite ends make 0%. Easy
 * to explain, and a single wild disagreement moves it only as much as its share.
 *
 * Also: the genres both players love (games both scored 8+, the commonest two first),
 * and the game they split on most (only when 3 or more apart).
 */
const matchOf = (both) => {
  const gaps = both.map((g) => Math.abs(g.you - g.them));
  const percent = Math.round(100 * (1 - gaps.reduce((a, b) => a + b, 0) / gaps.length / 9));
  const loved = {};
  for (const g of both) {
    if (g.you >= LOVED && g.them >= LOVED) for (const genre of g.genres) loved[genre] = (loved[genre] ?? 0) + 1;
  }
  const split = both.reduce((worst, g) => (Math.abs(g.you - g.them) > Math.abs(worst.you - worst.them) ? g : worst), both[0]);
  return {
    percent,
    bothLove: Object.entries(loved).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([genre]) => genre),
    split: Math.abs(split.you - split.them) >= SPLIT ? { id: split.id, title: split.title, you: split.you, them: split.them } : null,
  };
};

// The games two players both rated: [{ id, title, coverUrl, genres, you, them }], the
// ones you scored highest first
const gamesBothRated = async (youId, themId) => {
  const [yours, theirs] = await Promise.all([
    prisma.review.findMany({ where: { userId: youId }, select: { gameId: true, rating: true } }),
    prisma.review.findMany({
      where: { userId: themId },
      select: { rating: true, game: { select: { id: true, title: true, coverUrl: true, genres: true } } },
    }),
  ]);
  const yourScore = new Map(yours.map((r) => [r.gameId, r.rating]));
  return theirs
    .filter((r) => yourScore.has(r.game.id))
    .map((r) => ({ ...r.game, you: yourScore.get(r.game.id), them: r.rating }))
    .sort((a, b) => b.you - a.you || b.them - a.them || a.title.localeCompare(b.title));
};

// GET /api/users/:username/taste — you and this player, logged in (requireUser):
// { player, shared, needed, match?, games }. Under MATCH_MIN games there's no match yet,
// only how many more it needs.
export const getTasteMatch = async (req, res) => {
  try {
    const player = await findPlayer(req.params.username);
    if (!player) return res.status(404).json({ error: 'No player has that gamer tag.' });
    if (player.id === req.user.id) return res.status(400).json({ error: "That's you." });
    const games = await gamesBothRated(req.user.id, player.id);
    res.json({
      player: asPlayer(player),
      shared: games.length,
      needed: Math.max(0, MATCH_MIN - games.length),
      match: games.length >= MATCH_MIN ? matchOf(games) : null,
      games: games.map(({ genres, ...game }) => game),
    });
  } catch (error) {
    fail(res, 'matching taste', error);
  }
};

// GET /api/users/:username/compare — the page behind a player's compare link:
// { player, games, yours }. games: the games they rated that most IMGM players rated too
// (the likeliest to be played by a friend), then their newest; their scores stay out
// until you've rated (the taste match shows them). yours: your scores for those games,
// when you're logged in.
export const getCompareGames = async (req, res) => {
  try {
    const [player, viewer] = await Promise.all([findPlayer(req.params.username), getSessionUser(req)]);
    if (!player) return res.status(404).json({ error: 'No player has that gamer tag.' });
    const theirs = await prisma.review.findMany({
      where: { userId: player.id },
      orderBy: { createdAt: 'desc' },
      select: { game: { select: { id: true, title: true, coverUrl: true, releaseDate: true, genres: true } } },
    });
    const ids = theirs.map((r) => r.game.id);
    const counts = ids.length
      ? await prisma.review.groupBy({ by: ['gameId'], where: { gameId: { in: ids } }, _count: { _all: true } })
      : [];
    const countOf = new Map(counts.map((c) => [c.gameId, c._count._all]));
    // A stable sort, so equal counts keep the newest-first order
    const games = theirs.map((r) => r.game).sort((a, b) => (countOf.get(b.id) ?? 0) - (countOf.get(a.id) ?? 0)).slice(0, COMPARE_POOL);
    let yours = {};
    if (viewer && viewer.id !== player.id && games.length) {
      const mine = await prisma.review.findMany({
        where: { userId: viewer.id, gameId: { in: games.map((g) => g.id) } },
        select: { gameId: true, rating: true },
      });
      yours = Object.fromEntries(mine.map((r) => [r.gameId, r.rating]));
    }
    res.json({ player: asPlayer(player), games, yours, isYou: viewer?.id === player.id });
  } catch (error) {
    fail(res, 'loading a compare link', error);
  }
};
