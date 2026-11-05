/**
 * dailyGame — what this browser remembers of a logged-out player's daily Guess the
 * game, shared by the page (pages/Daily.jsx) and the home page's strip
 * (components/home/DailySection.jsx), so both ask the server about the same game.
 */
export const DAILY_TIME_ZONE = 'Asia/Jerusalem'; // the puzzle's days (the server's too)
export const DAILY_GAME_KEY = 'imgm.daily'; // a logged-out player's game today: { day, guesses, gaveUp }

// "2026-11-05", today in Israel
export const israelToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: DAILY_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

// Today's game from this browser, if it's today's (a new day starts fresh). Storage can
// be blocked (private windows, strict settings): then there's simply no game yet.
export const localDailyGame = () => {
  try {
    const game = JSON.parse(localStorage.getItem(DAILY_GAME_KEY));
    return game?.day === israelToday() ? game : null;
  } catch {
    return null;
  }
};
