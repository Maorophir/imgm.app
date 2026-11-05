/**
 * The daily Guess the game (/daily): one game a day, the same for everyone, guessed
 * from its screenshots in MAX_TRIES tries.
 *
 * The day runs on Israel's calendar, like Game of the Week. No timer makes the puzzle:
 * the day's first visit picks it (from IGDB's most rated games, never one used before)
 * and saves it, so every later visit gets the same one.
 *
 * Each wrong guess makes the next picture easier (less blurred, then another
 * screenshot, see STAGES), says how close it was (shared genres, newer or older, same
 * studio, same series), and after a few, a clue about the answer itself (CLUES).
 * The answer's name and id never reach the browser before the player finishes or gives
 * up: the server checks every guess. Only the pictures unlocked so far are sent.
 *
 * The blur is drawn by the browser, so a determined player could open a picture on its
 * own and see it sharp. That's fine for a game among friends; the blurred stages load
 * small versions, which are less use on their own (and load faster).
 */
import { randomInt } from 'node:crypto';
import { prisma } from './db.js';
import { TIME_ZONE, israelMidnight } from './gotw.js';
import * as igdb from '../services/igdbService.js';
import { igdbImageUrl } from '../services/igdbService.js';
import { upsertGame } from '../services/gameStore.js';

export const MAX_TRIES = 6;
const SHOTS = 4; // screenshots per puzzle
const POOL_SIZE = 300; // the day's game is one of the 300 most rated games not used yet
// Every third day is a classic (a game from before 2005), so the old favourites come up
// as often as the new ones (the most rated games lean recent)
const CLASSIC_EVERY = 3;
const CLASSIC_BEFORE = 2005;

// The picture before each try (stage n = after n wrong guesses): which screenshot, its
// blur as a share of the picture's width (so a phone and a computer see the same blur),
// and the IGDB size to load
const STAGES = [
  { shot: 0, blur: 3.2, size: 't_screenshot_med' },
  { shot: 0, blur: 1.8, size: 't_screenshot_med' },
  { shot: 1, blur: 1.1, size: 't_screenshot_med' },
  { shot: 1, blur: 0.55, size: 't_screenshot_big' },
  { shot: 2, blur: 0.25, size: 't_screenshot_big' },
  { shot: 3, blur: 0, size: 't_screenshot_huge' },
];

// Clues about the answer, each from this many wrong guesses on
const CLUES = [
  { after: 2, label: 'Genre', value: (answer) => answer.genres.slice(0, 2).join(', ') },
  { after: 3, label: 'Released', value: (answer) => answer.year },
  { after: 4, label: 'Made by', value: (answer) => answer.developers.slice(0, 2).join(', ') },
];

// A guess this close in years counts as "close"
const CLOSE_YEARS = 3;

// ── Days, in Israel time ─────────────────────────────────

// "2026-11-05", the calendar day in Israel at this instant
const DAY_FORMAT = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
export const dayOf = (instant = new Date()) => DAY_FORMAT.format(instant);

// The day `by` days after (or before) a day
const shiftDay = (day, by) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + by)).toISOString().slice(0, 10);
};

// When the next day's game comes: midnight in Israel
const nextPuzzleAt = (day) => {
  const [y, m, d] = shiftDay(day, 1).split('-').map(Number);
  return israelMidnight(y, m, d);
};

// ── The day's puzzle ─────────────────────────────────────

const shuffled = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const makePuzzle = async (day) => {
  const used = new Set((await prisma.dailyPuzzle.findMany({ select: { gameId: true } })).map((p) => p.gameId));
  const pool = (await igdb.getDailyPool())
    .filter((candidate) => candidate.shots.length >= SHOTS && !used.has(candidate.game.id))
    .slice(0, POOL_SIZE);
  if (pool.length === 0) throw new Error('No games left for the daily puzzle');

  const last = await prisma.dailyPuzzle.findFirst({ orderBy: { number: 'desc' }, select: { number: true } });
  const number = (last?.number ?? 0) + 1;
  const classics = pool.filter((c) => c.game.releaseDate && new Date(c.game.releaseDate).getUTCFullYear() < CLASSIC_BEFORE);
  // A classic day with no classics left falls back to the whole pool
  const from = number % CLASSIC_EVERY === 0 && classics.length > 0 ? classics : pool;
  const pick = from[randomInt(from.length)];
  // A remaster looks like its original (and the other way round), so either is right
  const originals = pick.isRemaster ? await igdb.getRemasterOriginals(pick.game.id).catch(() => []) : [];
  await upsertGame(pick.game); // the answer links to its game page
  try {
    return await prisma.dailyPuzzle.create({
      data: {
        day,
        number,
        gameId: pick.game.id,
        acceptIds: [...new Set([...pick.remasters, ...originals])],
        shots: shuffled(pick.shots).slice(0, SHOTS),
      },
    });
  } catch (error) {
    // Another server made it meanwhile
    if (error.code === 'P2002') {
      const made = await prisma.dailyPuzzle.findUnique({ where: { day } });
      if (made) return made;
    }
    throw error;
  }
};

// One pick at a time in this server, however many players arrive at midnight
let making = null;
export const todaysPuzzle = async () => {
  const day = dayOf();
  const existing = await prisma.dailyPuzzle.findUnique({ where: { day } });
  if (existing) return existing;
  making ??= makePuzzle(day).finally(() => {
    making = null;
  });
  return making;
};

// ── Playing ──────────────────────────────────────────────

const isRight = (puzzle, guess) => {
  const right = (id) => id === puzzle.gameId || puzzle.acceptIds.includes(id);
  // An edition ("Game of the Year Edition") is its main game
  return right(guess.id) || (guess.versionParent != null && right(guess.versionParent));
};

// How close a wrong guess was. `answerIs` is the answer next to this guess: "newer"
// means the answer came out later. Only what the guess shares is named, never the
// answer's own genres or year (those are the clues).
const hintFor = (guess, answer, right) => ({
  id: guess.id,
  title: guess.title,
  coverUrl: guess.coverUrl,
  year: guess.year,
  right,
  genres: guess.genres.filter((genre) => answer.genres.includes(genre)),
  answerIs:
    guess.year == null || answer.year == null ? null
      : answer.year === guess.year ? 'same'
        : answer.year > guess.year ? 'newer' : 'older',
  close: guess.year != null && answer.year != null && answer.year !== guess.year && Math.abs(answer.year - guess.year) <= CLOSE_YEARS,
  sameStudio: guess.developers.some((studio) => answer.developers.includes(studio)),
  sameSeries: guess.seriesIds.some((series) => answer.seriesIds.includes(series)),
});

/**
 * Where a player stands after these guesses (IGDB ids, in order):
 *   { status: 'playing' | 'solved' | 'failed', guesses (hints), pictures, clues,
 *     answer (null while playing), ids (the guesses that count) }
 * Throws if IGDB can't tell what the games are.
 */
export const playState = async (puzzle, guessIds, { gaveUp = false } = {}) => {
  const facts = await igdb.getGuessFacts([puzzle.gameId, ...guessIds]);
  const answer = facts.get(puzzle.gameId);
  if (!answer) throw new Error(`IGDB doesn't know the daily answer ${puzzle.gameId}`);

  const guesses = [];
  for (const id of guessIds) {
    const guess = facts.get(id);
    if (!guess) continue;
    const right = isRight(puzzle, guess);
    guesses.push(hintFor(guess, answer, right));
    if (right || guesses.length >= MAX_TRIES) break;
  }
  const solved = guesses.some((g) => g.right);
  const wrong = guesses.filter((g) => !g.right).length;
  const status = solved ? 'solved' : wrong >= MAX_TRIES || gaveUp ? 'failed' : 'playing';
  const finished = status !== 'playing';

  const picture = ({ shot, blur, size }) => ({ url: igdbImageUrl(puzzle.shots[shot], size), blur });
  return {
    status,
    ids: guesses.map((g) => g.id),
    guesses,
    // Every picture unlocked so far (the last one is the current); all of them, sharp, at the end
    pictures: finished
      ? puzzle.shots.map((shot) => ({ url: igdbImageUrl(shot, 't_screenshot_huge'), blur: 0 }))
      : STAGES.slice(0, wrong + 1).map(picture),
    clues: CLUES.filter((clue) => finished || wrong >= clue.after)
      .map((clue) => ({ label: clue.label, value: clue.value(answer) }))
      .filter((clue) => clue.value),
    // The next clue, so the page can say "a clue after 1 more guess"
    nextClueAfter: finished ? null : CLUES.find((clue) => wrong < clue.after)?.after ?? null,
    answer: finished
      ? { id: answer.id, title: answer.title, coverUrl: answer.coverUrl, year: answer.year, genres: answer.genres, developers: answer.developers }
      : null,
  };
};

// ── Results ──────────────────────────────────────────────

// How everyone did today (logged-in players who finished): { players, solvedShare,
// mostTries, byTries: [players who got it in 1, 2, … MAX_TRIES] }
export const todayStats = async (day) => {
  const rows = await prisma.dailyGuess.findMany({
    where: { day, finishedAt: { not: null } },
    select: { solved: true, guesses: true },
  });
  const byTries = Array.from({ length: MAX_TRIES }, () => 0);
  rows.filter((r) => r.solved).forEach((r) => {
    byTries[Math.min(r.guesses.length, MAX_TRIES) - 1] += 1;
  });
  const solved = byTries.reduce((sum, n) => sum + n, 0);
  const most = Math.max(...byTries);
  return {
    players: rows.length,
    solvedShare: rows.length ? Math.round((solved / rows.length) * 100) : 0,
    mostTries: most > 0 ? byTries.indexOf(most) + 1 : null,
    byTries,
  };
};

// A player's record: { played, won, streak, bestStreak }. The streak is days in a row
// solved; it's still alive until today's game is lost (or tomorrow comes unplayed).
export const recordOf = async (userId, today) => {
  const rows = await prisma.dailyGuess.findMany({
    where: { userId, finishedAt: { not: null } },
    select: { day: true, solved: true },
  });
  const won = new Set(rows.filter((r) => r.solved).map((r) => r.day));
  let day = rows.some((r) => r.day === today) ? today : shiftDay(today, -1);
  let streak = 0;
  while (won.has(day)) {
    streak += 1;
    day = shiftDay(day, -1);
  }
  let bestStreak = 0;
  let run = 0;
  let previous = null;
  for (const d of [...won].sort()) {
    run = previous && shiftDay(previous, 1) === d ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
    previous = d;
  }
  return { played: rows.length, won: won.size, streak, bestStreak };
};

export const puzzleInfo = (puzzle) => ({
  number: puzzle.number,
  day: puzzle.day,
  nextAt: nextPuzzleAt(puzzle.day),
  timeZone: TIME_ZONE,
  maxTries: MAX_TRIES,
});
