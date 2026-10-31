/**
 * Discover's thumbs up / down on games (routes/discover.js).
 *
 * The feeds themselves are the same for everyone and cached at the edge
 * (GET /api/games/discover), so the votes come separately: counts for the games on
 * screen, and the player's own vote, which no cache may share.
 */
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { getSessionUser } from '../lib/session.js';

const MAX_IDS = 60; // a feed is 40 games; a little room
const IGDB_ID = z.coerce.number().int().positive().max(2_147_483_647);

// { [gameId]: { up, down, mine } } for the given games (mine: 1, -1 or 0)
const tally = async (gameIds, userId) => {
  const [counts, mine] = await Promise.all([
    prisma.discoverVote.groupBy({ by: ['gameId', 'value'], where: { gameId: { in: gameIds } }, _count: { _all: true } }),
    userId ? prisma.discoverVote.findMany({ where: { userId, gameId: { in: gameIds } }, select: { gameId: true, value: true } }) : [],
  ]);
  const votes = Object.fromEntries(gameIds.map((id) => [id, { up: 0, down: 0, mine: 0 }]));
  for (const row of counts) votes[row.gameId][row.value > 0 ? 'up' : 'down'] = row._count._all;
  for (const row of mine) votes[row.gameId].mine = row.value;
  return votes;
};

// GET /api/discover/votes?ids=1,2,3
export const getVotes = async (req, res) => {
  const ids = z.array(IGDB_ID).max(MAX_IDS).safeParse(String(req.query.ids ?? '').split(',').filter(Boolean));
  if (!ids.success) return res.status(400).json({ error: 'Bad game ids' });
  try {
    const user = await getSessionUser(req);
    res.set('Cache-Control', 'private, no-store'); // it carries the player's own votes
    res.json(await tally([...new Set(ids.data)], user?.id ?? null));
  } catch (error) {
    console.error('Error loading Discover votes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/discover/votes/:gameId  { value: 1 | -1 | 0 }  (0 takes the vote back)
export const setVote = async (req, res) => {
  const gameId = IGDB_ID.safeParse(req.params.gameId);
  const body = z.object({ value: z.union([z.literal(1), z.literal(-1), z.literal(0)]) }).safeParse(req.body ?? {});
  if (!gameId.success || !body.success) return res.status(400).json({ error: 'Bad vote' });
  const userId = req.user.id;
  try {
    const where = { userId_gameId: { userId, gameId: gameId.data } };
    if (body.data.value === 0) await prisma.discoverVote.deleteMany({ where: { userId, gameId: gameId.data } });
    else await prisma.discoverVote.upsert({ where, create: { userId, gameId: gameId.data, value: body.data.value }, update: { value: body.data.value } });
    res.json((await tally([gameId.data], userId))[gameId.data]);
  } catch (error) {
    console.error('Error saving a Discover vote:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
