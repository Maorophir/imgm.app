/**
 * The daily Guess the game (lib/daily.js): today's puzzle, a guess, giving up.
 *
 * A logged-in player's guesses are saved here (DailyGuess), so the streak counts and
 * the game carries on across devices. A logged-out player's stay in their browser: the
 * page sends them along (?guesses=1,2,3), and the server also keeps them in a signed
 * cookie (lib/dailyCookie.js), so logging out or clearing the page's storage can't
 * start the day over once the answer is known. Every account starts the day clean;
 * logging in keeps the game only if it was played logged out (the first visit logged in
 * saves it).
 */
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { getSessionUser } from '../lib/session.js';
import { MAX_TRIES, SKIP, playState, puzzleInfo, recordOf, todaysPuzzle, todayStats } from '../lib/daily.js';
import { readBrowserGame, writeBrowserGame } from '../lib/dailyCookie.js';

const gameId = z.number().int().positive();
// Earlier guesses, from a logged-out player's browser: unique ids (skips can repeat),
// at most MAX_TRIES
const guessList = z.array(z.number().int().nonnegative()).max(MAX_TRIES).refine((ids) => {
  const games = ids.filter((id) => id !== SKIP);
  return new Set(games).size === games.length;
});
const listFromQuery = (text) =>
  guessList.safeParse(String(text ?? '').split(',').filter(Boolean).map(Number)).data ?? [];

// This browser's game today, { guesses, owner }: the server's cookie, or what the page
// kept (localStorage), whichever has more tries, so clearing only one of the two
// changes nothing. The page's copy is only ever a logged-out visitor's (the page clears
// it while logged in), so its owner is null.
const browserGame = (req, puzzle, sent = []) => {
  const cookie = readBrowserGame(req, puzzle.day);
  const kept = guessList.safeParse(cookie?.guesses ?? []).data ?? [];
  return kept.length > 0 && kept.length >= sent.length ? { guesses: kept, owner: cookie.owner } : { guesses: sent, owner: null };
};

// The page's data: the puzzle, where the player stands, and (once finished) how
// everyone did today. The headline numbers (how many finished, the share who got it)
// come always: the home page's strip shows them before anyone plays, and they give
// nothing away.
const answerFor = async (puzzle, state, user) => {
  const finished = state.status !== 'playing';
  const { ids, ...shown } = state;
  const stats = await todayStats(puzzle.day);
  return {
    ...puzzleInfo(puzzle),
    ...shown,
    played: ids, // the ids to keep (a logged-out player's browser stores them)
    results: { players: stats.players, solvedShare: stats.solvedShare },
    today: finished ? stats : null,
    me: user ? await recordOf(user.id, puzzle.day) : null,
  };
};

// A saved game's state
const savedState = (puzzle, row) => playState(puzzle, row.guesses);

const save = (puzzle, user, state) => {
  const data = {
    guesses: state.ids,
    solved: state.status === 'solved',
    finishedAt: state.status === 'playing' ? null : new Date(),
  };
  return prisma.dailyGuess.upsert({
    where: { day_userId: { day: puzzle.day, userId: user.id } },
    create: { day: puzzle.day, userId: user.id, ...data },
    update: data,
  });
};

const failed = (res, error, what) => {
  console.error(`Daily game: ${what} failed:`, error);
  res.status(503).json({ error: "Today's game couldn't load. Try again in a minute." });
};

// GET /api/daily?guesses=1,2 (the query is only read for logged-out players,
// or to keep a game a player started before logging in)
export const getDaily = async (req, res) => {
  try {
    const user = await getSessionUser(req).catch(() => null);
    const puzzle = await todaysPuzzle();
    const browser = browserGame(req, puzzle, listFromQuery(req.query.guesses));

    // Logged out: the game this browser played, whoever played it (logging out doesn't
    // start the day over)
    if (!user) {
      const state = await playState(puzzle, browser.guesses);
      if (state.ids.length > 0) writeBrowserGame(res, puzzle.day, state.ids, browser.owner);
      return res.json(await answerFor(puzzle, state, null));
    }

    // Logged in: the account's own game. With none yet, the browser's game only if it
    // was played logged out (progress before logging in); another account's game stays
    // theirs, and this account starts clean. The browser remembers it as this account's.
    const row = await prisma.dailyGuess.findUnique({ where: { day_userId: { day: puzzle.day, userId: user.id } } });
    const state = row ? await savedState(puzzle, row) : await playState(puzzle, browser.owner == null ? browser.guesses : []);
    if (!row && state.ids.length > 0) await save(puzzle, user, state);
    if (state.ids.length > 0) writeBrowserGame(res, puzzle.day, state.ids, user.id);
    res.json(await answerFor(puzzle, state, user));
  } catch (error) {
    failed(res, error, 'loading');
  }
};

// One more try: a guess (an IGDB id) or SKIP. The player's game so far comes from the
// server (logged in) or from the request (logged out).
const playOn = async (req, res, next, earlier, what) => {
  try {
    const user = await getSessionUser(req).catch(() => null);
    const puzzle = await todaysPuzzle();
    const row = user ? await prisma.dailyGuess.findUnique({ where: { day_userId: { day: puzzle.day, userId: user.id } } }) : null;
    const browser = user ? null : browserGame(req, puzzle, earlier ?? []);
    const before = row ? await savedState(puzzle, row) : await playState(puzzle, user ? [] : browser.guesses);
    if (before.status !== 'playing') return res.status(409).json({ error: "You've finished today's game. A new one comes at midnight." });
    if (next !== SKIP && before.ids.includes(next)) return res.status(400).json({ error: 'You already guessed that one.' });

    const state = await playState(puzzle, [...before.ids, next]);
    if (state.ids.length === before.ids.length) return res.status(404).json({ error: 'Game not found' });
    if (user) await save(puzzle, user, state);
    writeBrowserGame(res, puzzle.day, state.ids, user ? user.id : browser.owner);
    res.json(await answerFor(puzzle, state, user));
  } catch (error) {
    failed(res, error, what);
  }
};

// POST /api/daily/guess  { gameId, guesses? } (guesses: a logged-out player's earlier ones)
const guessSchema = z.object({ gameId, guesses: guessList.optional() });
export const guessDaily = (req, res) => {
  const body = guessSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Invalid guess' });
  return playOn(req, res, body.data.gameId, body.data.guesses, 'a guess');
};

// POST /api/daily/skip  { guesses? } — uses up a try for the next picture and clues
// (skipping the last try ends the game: there's no separate Give up)
const skipSchema = z.object({ guesses: guessList.optional() });
export const skipDaily = (req, res) => {
  const body = skipSchema.safeParse(req.body ?? {});
  if (!body.success) return res.status(400).json({ error: 'Invalid request' });
  return playOn(req, res, SKIP, body.data.guesses, 'a skip');
};
