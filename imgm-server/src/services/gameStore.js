/**
 * Game Store — keeps IGDB games cached in our database.
 * Shared by the games and reviews controllers.
 */
import { prisma } from '../lib/db.js';
import * as igdb from './igdbService.js';

/**
 * Inserts or updates a game (already mapped to our Game shape) by its IGDB id.
 */
export const upsertGame = (mapped) =>
  prisma.game.upsert({
    where: { id: mapped.id },
    create: mapped,
    update: mapped,
  });

/**
 * Returns the game from our DB, fetching and saving it from IGDB first if we
 * don't have it yet. Returns null if the game doesn't exist on IGDB either.
 */
export const ensureGame = async (id) => {
  const existing = await prisma.game.findUnique({ where: { id } });
  if (existing) return existing;

  const mapped = await igdb.getGameDetails(id);
  if (!mapped) return null;
  return upsertGame(mapped);
};
