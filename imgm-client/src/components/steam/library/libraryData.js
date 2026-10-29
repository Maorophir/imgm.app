/**
 * The Steam library page's plain helpers (no React): which list each game goes in, the
 * links out of the page, and its small words ("updated 2 minutes ago").
 */
import { steamHours } from '../../../lib/steam';

// Rows (or cards) a list shows at first, and how many more each "Show more" adds
export const PAGE_SIZE = 50;

// The lists, in order. `key` is what ?tab= holds.
export const TABS = [
  { key: 'to-rate', label: 'To rate' },
  { key: 'rated', label: 'Rated' },
  { key: 'not-played', label: 'Not played' },
  { key: 'not-on-imgm', label: 'Not on IMGM' },
];

// The tabs' ids, and their panel's (the list under them), for LibraryTabs and the page
export const LIBRARY_PANEL = 'steam-library-list';
export const tabId = (key) => `steam-library-tab-${key}`;

// The most hours a review takes (the quest and the server both stop there)
const MAX_HOURS = 100000;

/**
 * The library's games in their lists (keyed like TABS):
 *   to-rate      played on Steam and not rated yet, most played first (the server's order).
 *                A game that isn't out yet stays here too: early access has hours, but
 *                IGDB's date is the full release. Its row offers the Backlog instead.
 *   rated        the ones with your score, as cards: the highest score first, then the
 *                most played
 *   not-played   never started on Steam, not rated
 *   not-on-imgm  Steam apps IMGM can't rate (DLC, bundles, tools, games IGDB doesn't know)
 * With Steam's playtime hidden every playtime is 0, which says nothing about playing:
 * then every unrated game is To rate, and Not played stays empty.
 */
export const sortLibrary = ({ games, others, hoursHidden }) => {
  const toRate = [];
  const rated = [];
  const notPlayed = [];
  for (const game of games ?? []) {
    if (game.myRating != null) rated.push(game);
    else if (hoursHidden || game.minutes > 0) toRate.push(game);
    else notPlayed.push(game);
  }
  rated.sort((a, b) => b.myRating - a.myRating || b.minutes - a.minutes);
  return { 'to-rate': toRate, rated, 'not-played': notPlayed, 'not-on-imgm': others ?? [] };
};

// For "Find a game": capitals and accents don't matter ("pokemon" finds Pokémon)
const fold = (text) => String(text ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// The items whose `field` holds the query (all of them for an empty query)
export const filterByName = (items, query, field) => {
  const wanted = fold(query.trim());
  return wanted ? items.filter((item) => fold(item[field]).includes(wanted)) : items;
};

/**
 * A game's review quest, from the library. With `setup`, Steam's hours (whole hours;
 * none for 0 or for hidden playtime) and PC when the game is on PC go along, and the
 * quest fills them in when the player starts it (pages/ReviewQuest.jsx). from=steam
 * brings the player back here when they leave the quest.
 */
export const questLink = (game, { hoursHidden = false, setup = true } = {}) => {
  const params = new URLSearchParams({ from: 'steam' });
  if (setup) {
    const hours = hoursHidden ? 0 : steamHours(game.minutes ?? 0);
    if (hours > 0 && hours <= MAX_HOURS) params.set('hours', String(hours));
    if (game.platforms?.includes('PC')) params.set('platform', 'PC');
  }
  return `/game/${game.gameId}/review?${params}`;
};

// An app's page on the Steam store. A plain link: never nofollow (Steam's API terms ask
// for that). Null for anything but a real appid.
export const steamStoreUrl = (appid) =>
  Number.isSafeInteger(appid) && appid > 0 ? `https://store.steampowered.com/app/${appid}` : null;

// The player's Steam profile, only ever on steamcommunity.com (the server builds the
// address; it's checked here too, so the link can't lead anywhere else)
export const steamProfileLink = (url) =>
  typeof url === 'string' && url.startsWith('https://steamcommunity.com/') ? url : null;

// "312 games", "1 game"
export const countOf = (count, word) => `${count.toLocaleString('en-US')} ${word}${count === 1 ? '' : 's'}`;

// "just now", "2 minutes ago", "yesterday", "on 4 Sep 2026": when the library was last
// brought in from Steam
const RELATIVE = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
export const timeSince = (date) => {
  const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (!(minutes >= 1)) return 'just now';
  if (minutes < 60) return RELATIVE.format(-minutes, 'minute');
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return RELATIVE.format(-hours, 'hour');
  const days = Math.floor(hours / 24);
  if (days < 30) return RELATIVE.format(-days, 'day');
  return `on ${new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
};

// "in a minute", "in 4 minutes": how long until Steam can be asked again (the server
// says how many seconds)
const waitText = (seconds) => {
  const minutes = Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds / 60) : null;
  if (!minutes) return 'in a few minutes';
  return minutes === 1 ? 'in a minute' : `in ${minutes} minutes`;
};

// Why asking Steam again didn't work, in the site's words. `error` says whether it went
// wrong (red), rather than just being too soon.
export const importProblem = (error) => {
  const code = error?.data?.code;
  if (code === 'TOO_SOON') return { text: `Steam was asked a moment ago. Try again ${waitText(error.data.retryAfter)}.`, error: false };
  if (error?.status === 429) return { text: 'Too many tries. Please wait a few minutes and try again.', error: false };
  if (code === 'STEAM_UNAVAILABLE' || error?.status === 502) {
    return { text: "Steam isn't answering right now. Please try again in a few minutes.", error: true };
  }
  return { text: "Couldn't update your library right now. Please check your connection and try again.", error: true };
};
