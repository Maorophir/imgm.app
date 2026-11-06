/**
 * A player's card sets (lib/cardSets.js) for their profile: each set with the games in
 * it, which of them the player has rated (their score, and whether that review's card
 * is a First Edition), and whether the set is complete. Worked out from the player's
 * reviews each time, so a new review counts at once and nothing can drift.
 *
 * The games' titles and covers come from our Game table. Set games nobody has opened
 * yet are fetched from IGDB once (and saved, like any game page does), then kept in
 * memory for a day.
 */
import { prisma } from '../lib/db.js';
import { getSessionUser } from '../lib/session.js';
import { CARD_SETS, SET_GAME_IDS } from '../lib/cardSets.js';
import { getGamesByIds } from '../services/igdbService.js';
import { upsertGame } from '../services/gameStore.js';
import { findPlayer } from './profileController.js';

const GAMES_FOR = 24 * 60 * 60 * 1000;
const FAILED_FOR = 5 * 60 * 1000;
// The version each slot shows (the first of its ids)
const SHOWN_IDS = [...new Set(CARD_SETS.flatMap((set) => set.games.map((s) => s.ids[0])))];

let shownGames = { expiresAt: 0, byId: new Map() };
let loading = null;

// Map(id -> { title, coverUrl }) for every slot's shown game. Never throws: a game we
// can't look up shows its slot's own title and no cover.
const loadShownGames = async () => {
  const rows = await prisma.game.findMany({ where: { id: { in: SHOWN_IDS } }, select: { id: true, title: true, coverUrl: true } });
  const byId = new Map(rows.map((g) => [g.id, g]));
  const missing = SHOWN_IDS.filter((id) => !byId.has(id));
  let failed = false;
  if (missing.length > 0) {
    try {
      for (const game of await getGamesByIds(missing)) {
        const saved = await upsertGame(game);
        byId.set(saved.id, { id: saved.id, title: saved.title, coverUrl: saved.coverUrl });
      }
    } catch (error) {
      failed = true;
      console.error(`Card sets: IGDB lookup of ${missing.length} games failed:`, error.message);
    }
  }
  return { expiresAt: Date.now() + (failed ? FAILED_FOR : GAMES_FOR), byId };
};

const getShownGames = async () => {
  if (Date.now() < shownGames.expiresAt) return shownGames.byId;
  // One lookup at a time: profiles opened together wait for the same one
  loading ??= loadShownGames()
    .then((loaded) => (shownGames = loaded))
    .finally(() => (loading = null));
  return (await loading).byId;
};

const setsFor = async (userId) => {
  const [games, reviews] = await Promise.all([
    getShownGames(),
    prisma.review.findMany({
      where: { userId, gameId: { in: SET_GAME_IDS } },
      select: { gameId: true, rating: true, badges: true },
    }),
  ]);
  const mine = new Map(reviews.map((r) => [r.gameId, r]));

  const sets = CARD_SETS.map((set) => {
    const slots = set.games.map((s) => {
      const shown = games.get(s.ids[0]);
      // Any version of the game collects the card (the first one found, in the set's order)
      const review = s.ids.map((id) => mine.get(id)).find(Boolean);
      return {
        id: s.ids[0],
        title: shown?.title ?? s.title,
        coverUrl: shown?.coverUrl ?? null,
        rating: review?.rating ?? null,
        firstEdition: Boolean(review?.badges.includes('first_reviewer')),
      };
    });
    const collected = slots.filter((s) => s.rating != null).length;
    return {
      key: set.key,
      name: set.name,
      kind: set.kind,
      badge: set.badge,
      total: slots.length,
      collected,
      complete: collected === slots.length,
      games: slots,
    };
  });

  // Started sets first, the closest to complete at the top; then the rest in the file's order
  const order = new Map(sets.map((s, i) => [s.key, i]));
  sets.sort((a, b) => {
    const started = Number(b.collected > 0) - Number(a.collected > 0);
    if (started) return started;
    if (a.collected > 0) return b.collected / b.total - a.collected / a.total || b.collected - a.collected || order.get(a.key) - order.get(b.key);
    return order.get(a.key) - order.get(b.key);
  });
  return sets;
};

// GET /api/users/me/sets — your card sets
export const getMySets = async (req, res) => {
  try {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: 'Log in first.' });
    res.json({ sets: await setsFor(user.id) });
  } catch (error) {
    console.error('Error loading your card sets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/users/:username/sets — a player's card sets, by gamer tag (404 if no player
// has it). The same as their reviews show publicly: only which games and the scores.
export const getPublicSets = async (req, res) => {
  try {
    const player = await findPlayer(req.params.username);
    if (!player) return res.status(404).json({ error: 'No player has that gamer tag.' });
    res.json({ sets: await setsFor(player.id) });
  } catch (error) {
    console.error("Error loading a player's card sets:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
