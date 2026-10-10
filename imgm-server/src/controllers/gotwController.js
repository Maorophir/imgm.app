/**
 * Game of the Week: the ballot, voting, and the current winner (lib/gotw.js).
 * Results stay hidden until you've voted, so everyone picks for themselves.
 */
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { getSessionUser } from '../lib/session.js';
import { currentWeek, tallyOf, voterStats, TIME_ZONE } from '../lib/gotw.js';
import { rankGames } from '../lib/ranking.js';
import { ensureGame } from '../services/gameStore.js';
import { GOTW_VOTE_XP } from '../lib/playerXp.js';

const GAME_SELECT = { id: true, title: true, coverUrl: true, artworks: true, releaseDate: true, genres: true, platforms: true };

// The page's data: this week's ballot, your vote, and last week's winner
const ballotFor = async (user) => {
  const week = await currentWeek();
  const ids = week.candidates.map((c) => c.gameId);
  const [games, tally, mine, nomination, crowned] = await Promise.all([
    prisma.game.findMany({ where: { id: { in: ids } }, select: GAME_SELECT }),
    tallyOf(week.id),
    user ? prisma.gotwVote.findUnique({ where: { weekId_userId: { weekId: week.id, userId: user.id } } }) : null,
    user
      ? prisma.gotwNomination.findUnique({
          where: { weekId_userId: { weekId: week.id, userId: user.id } },
          include: { game: { select: { id: true, title: true, coverUrl: true } } },
        })
      : null,
    prisma.gotwWeek.findFirst({
      where: { closedAt: { not: null }, winnerId: { not: null } },
      orderBy: { startsAt: 'desc' },
      include: { winner: { select: GAME_SELECT } },
    }),
  ]);
  const gameById = new Map(games.map((g) => [g.id, g]));
  const showResults = Boolean(mine);
  const totalVotes = [...tally.values()].reduce((sum, n) => sum + n, 0);

  let gameOfTheWeek = null;
  let pickedWinner = false;
  if (crowned) {
    const [crownedTally, ranked, myCrownedVote] = await Promise.all([
      tallyOf(crowned.id),
      rankGames(),
      user ? prisma.gotwVote.findUnique({ where: { weekId_userId: { weekId: crowned.id, userId: user.id } } }) : null,
    ]);
    const crownedTotal = [...crownedTally.values()].reduce((sum, n) => sum + n, 0);
    pickedWinner = myCrownedVote?.gameId === crowned.winnerId;
    gameOfTheWeek = {
      topRank: ranked.find((r) => r.gameId === crowned.winnerId)?.rank ?? null, // its place in Top Games
      votedIn: crowned.id, // the week the votes were cast…
      reignsFrom: crowned.endsAt, // …it's the Game of the Week for the 7 days after
      game: crowned.winner,
      votes: crownedTally.get(crowned.winnerId) ?? 0,
      totalVotes: crownedTotal,
    };
  }

  return {
    week: { id: week.id, startsAt: week.startsAt, endsAt: week.endsAt, timeZone: TIME_ZONE },
    candidates: week.candidates.map((c) => ({
      slot: c.slot,
      game: gameById.get(c.gameId),
      votes: showResults ? tally.get(c.gameId) ?? 0 : null,
    })),
    totalVotes: showResults ? totalVotes : null,
    myVote: mine?.gameId ?? null,
    gameOfTheWeek,
    // The viewer's record: streak, winners picked, this week's nomination
    me: user
      ? { ...(await voterStats(user.id, week.id)), pickedWinner, nomination: nomination?.game ?? null, voteXp: GOTW_VOTE_XP }
      : null,
  };
};

// GET /api/gotw
export const getBallot = async (req, res) => {
  try {
    const user = await getSessionUser(req).catch(() => null);
    res.json(await ballotFor(user));
  } catch (error) {
    console.error('Error loading Game of the Week:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/gotw/vote  { gameId } — vote for this week. Final: no switching to the leader
// after the results show (the page asks you to confirm first)
const voteSchema = z.object({ gameId: z.number().int().positive() });
export const castGotwVote = async (req, res) => {
  const body = voteSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Invalid vote' });
  try {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: 'Log in to vote.' });
    const week = await currentWeek();
    if (!week.candidates.some((c) => c.gameId === body.data.gameId)) {
      return res.status(400).json({ error: "That game isn't on this week's ballot." });
    }
    try {
      await prisma.gotwVote.create({ data: { weekId: week.id, userId: user.id, gameId: body.data.gameId } });
    } catch (error) {
      if (error.code === 'P2002') return res.status(409).json({ error: "You've already voted this week." });
      throw error;
    }
    res.json(await ballotFor(user));
  } catch (error) {
    console.error('Error voting for Game of the Week:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/gotw/nominate  { gameId | null } — nominate a game for next week's ballot
// ("Player pick": the most-nominated game). Changeable; null takes it back.
const nominateSchema = z.object({ gameId: z.number().int().positive().nullable() });
export const nominateGame = async (req, res) => {
  const body = nominateSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Invalid nomination' });
  try {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: 'Log in to nominate.' });
    const week = await currentWeek();
    const key = { weekId_userId: { weekId: week.id, userId: user.id } };
    if (body.data.gameId === null) {
      await prisma.gotwNomination.deleteMany({ where: { weekId: week.id, userId: user.id } });
    } else {
      const game = await ensureGame(body.data.gameId); // a real game (fetched from IGDB if new)
      if (!game) return res.status(404).json({ error: 'Game not found' });
      await prisma.gotwNomination.upsert({
        where: key,
        create: { weekId: week.id, userId: user.id, gameId: game.id },
        update: { gameId: game.id },
      });
    }
    res.json(await ballotFor(user));
  } catch (error) {
    console.error('Error nominating a game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/gotw/history — past Games of the Week, newest first (not the one reigning now)
export const getHistory = async (req, res) => {
  try {
    await currentWeek(); // a week that just ended is counted first
    const weeks = await prisma.gotwWeek.findMany({
      where: { closedAt: { not: null }, winnerId: { not: null } },
      orderBy: { startsAt: 'desc' },
      skip: 1, // the newest winner reigns this week: it's the Game of the Week, not a past one
      take: 12,
      include: { winner: { select: { id: true, title: true, coverUrl: true } } },
    });
    const winners = await Promise.all(
      weeks.map(async (week) => {
        const tally = await tallyOf(week.id);
        const total = [...tally.values()].reduce((sum, n) => sum + n, 0);
        return { votedIn: week.id, reignsFrom: week.endsAt, game: week.winner, votes: tally.get(week.winnerId) ?? 0, totalVotes: total };
      })
    );
    res.json(winners);
  } catch (error) {
    console.error('Error loading past Games of the Week:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
