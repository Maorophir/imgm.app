/**
 * Seed script — fills a LOCAL database with fake players and reviews (scripts/seedData.js).
 *
 *   docker exec imgm-server npm run seed
 *
 * Safe to run again: it first deletes the previous seed players (emails ending in
 * @seed.imgm.test; their reviews go with them) and never touches real accounts.
 * Refuses to run in production.
 *
 * Seeded reviews go through the same rules as real ones: games come from IGDB,
 * answers are validated by the review schema, and XP and badges are computed by
 * the same code as the review routes.
 */
import { isProduction } from '../src/lib/config.js';
import { prisma } from '../src/lib/db.js';
import { reviewSchema } from '../src/lib/reviewSchema.js';
import { EMPTY_ANSWERS, reviewXp, awardBadges } from '../src/lib/reviewScoring.js';
import * as igdb from '../src/services/igdbService.js';
import { ensureGame } from '../src/services/gameStore.js';
import { SEED_PLAYERS } from './seedData.js';

const SEED_EMAIL_DOMAIN = '@seed.imgm.test';
const DAY = 24 * 60 * 60 * 1000;

// Two locks: the environment says production, or the URL points at Neon
if (isProduction || process.env.DATABASE_URL?.includes('neon.tech')) {
  console.error('✗ Refusing to seed: this looks like the production database.');
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const normalize = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// ── Games: title → our Game row (fetched from IGDB and cached in the DB) ──

const gamesByTitle = new Map();

// `year` picks between games with the same title (e.g. a remake: Silent Hill 2, 2024)
const resolveGame = async (title, year) => {
  const key = `${title}|${year ?? ''}`;
  if (gamesByTitle.has(key)) return gamesByTitle.get(key);

  const results = await igdb.searchGames(title);
  const sameTitle = results.filter((g) => normalize(g.title) === normalize(title));
  const sameYear = sameTitle.find((g) => year && g.releaseDate && new Date(g.releaseDate).getFullYear() === year);
  // Prefer the exact title (and year); otherwise trust the search ranking (popular games first)
  const match = sameYear ?? sameTitle[0] ?? results[0];
  const game = match ? await ensureGame(match.id) : null;
  await sleep(300); // stay well under IGDB's 4 requests per second

  gamesByTitle.set(key, game);
  if (!game) console.warn(`  ⚠ No IGDB game found for "${title}"`);
  return game;
};

// ── One seed review → the answers a real quest would send ──

const toAnswers = async (review, game) => {
  const [comparedA, comparedB] = await Promise.all(
    (review.meets ?? []).map((title) => resolveGame(title))
  );
  // Keep the platform only if this game is really on it (as the review route requires)
  const platform = review.platform && game.platforms.includes(review.platform) ? review.platform : null;

  return {
    gameId: game.id,
    rating: review.rating,
    platform,
    hoursPlayed: review.hours ?? null,
    completionStatus: review.completion ?? null,
    playStyle: review.style ?? null,
    vibes: review.vibes ?? [],
    gotGoodAfter: review.gotGood ?? null,
    ...review.checklist,
    comparedAId: comparedA?.id ?? null,
    comparedBId: comparedB?.id ?? null,
    pros: review.pros ?? [],
    cons: review.cons ?? [],
    bestMoment: review.best ?? null,
    worstMoment: review.worst ?? null,
    hasSpoilers: review.spoilers ?? false,
    reviewText: review.text ?? null,
  };
};

const seed = async () => {
  // 1. Start clean: remove the previous seed players (their reviews cascade)
  const { count: removed } = await prisma.user.deleteMany({
    where: { email: { endsWith: SEED_EMAIL_DOMAIN } },
  });
  console.log(`Removed ${removed} previous seed players`);

  let reviewCount = 0;
  let reviewIndex = 0;

  for (const player of SEED_PLAYERS) {
    // 2. The player: a gamer tag, no password (seed players can't log in)
    const user = await prisma.user.create({
      data: {
        email: `${player.tag.toLowerCase()}${SEED_EMAIL_DOMAIN}`,
        name: player.tag,
        username: player.tag.toLowerCase(),
        displayUsername: player.tag,
      },
    });
    console.log(`\n${player.tag}`);

    // 3. Their reviews
    for (const review of player.reviews) {
      reviewIndex += 1;
      const game = await resolveGame(review.game, review.year);
      if (!game) continue;

      const parsed = reviewSchema.safeParse(await toAnswers(review, game));
      if (!parsed.success) {
        console.warn(`  ✗ ${review.game}: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
        continue;
      }

      const { gameId, rating, ...answers } = { ...EMPTY_ANSWERS, ...parsed.data };
      const isFirstForGame = (await prisma.review.count({ where: { gameId } })) === 0;

      await prisma.review.create({
        data: {
          rating,
          ...answers,
          badges: awardBadges(answers, { isFirstForGame }),
          xp: reviewXp(answers),
          userId: user.id,
          gameId,
          // Spread over the last ~60 days, so review dates look natural
          createdAt: new Date(Date.now() - (reviewIndex * 37 % 60) * DAY),
        },
      });
      reviewCount += 1;
      console.log(`  ✓ ${game.title}: ${rating}/10`);
    }
  }

  console.log(`\nSeeded ${SEED_PLAYERS.length} players, ${reviewCount} reviews, ${gamesByTitle.size} games looked up.`);
  console.log('Next: rebuild the AI index → cd imgm-ai && uv run python -m imgm_ai.rag index');
};

seed()
  .catch((error) => {
    console.error('✗ Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
