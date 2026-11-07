/**
 * Search page — Full results grid for a game search. Route: /search?q=...
 *
 * The Navbar SearchBar sends users here when they press Enter, and the header's
 * "Games" link opens it with no query. Results come from IGDB via our backend
 * (/api/games/search).
 *
 * The search box searches as you type (a moment after the last key, 2+ letters) and
 * stays on the page with the results.
 *
 * With no query the page is a way in, not a dead end: shelves of games to browse
 * (GameShelf, built 2026-11-06 when the user found the page "quite dull, just popular
 * games"): Hot right now and Coming soon (Discover's feeds), Top rated on IMGM (the Hall
 * of Fame), Just reviewed, and Picked for you (the all-time greats for visitors). Each
 * shelf loads on its own and steps aside if it can't.
 *
 * Quest mode (/search?quest=1, from the home page's "Rate a game you played"): the page
 * asks which game you played last, and picking one opens its review quest. A game
 * that isn't out yet says when it will be instead, and opens its game page.
 *
 * Google doesn't index this page, with or without a query (hooks/useSearchIndexing).
 *
 * Noir: the big condensed headline, the search field from the header, and the games
 * on the same shelf as the home page's featured games.
 */
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import { getDiscoverGames, getFeaturedGames, getRecentReviews, getReviewPicks, getTopGames, searchGames } from '../lib/api';
import { coverSrcSet, COVER_SIZES } from '../lib/igdbImage';
import { isUnreleased, releaseLabel } from '../lib/release';
import { WRAP, GHOST_BUTTON, SECTION_TITLE } from '../lib/ui';
import GameCard from '../components/GameCard';
import GameCardSkeleton from '../components/GameCardSkeleton';
import GameShelf from '../components/games/GameShelf';
import { releaseLine } from '../components/discover/feedText';

const MIN_QUERY_LENGTH = 2;
const TYPING_PAUSE = 300; // ms after the last key before the search runs
const SHELF_SIZE = 20;

// The shelves' lists, each loaded on its own: null while loading, false if it failed
// (that shelf then steps aside)
const SHELF_SOURCES = {
  hot: (signal) => getDiscoverGames('hot', signal),
  top: (signal) => getTopGames({ sort: 'rank' }, signal).then((d) =>
    d.games.map((g) => ({ ...g, ratings: { imgm: g.average } }))),
  upcoming: (signal) => getDiscoverGames('upcoming', signal),
  // The newest reviews' games, each once, with who rated it what
  recent: (signal) => getRecentReviews(signal).then((reviews) => {
    const seen = new Set();
    return (Array.isArray(reviews) ? reviews : reviews.reviews ?? [])
      .filter((r) => r.game && !seen.has(r.game.id) && seen.add(r.game.id))
      .map((r) => ({ ...r.game, reviewNote: `${r.author} · ${r.rating}/10` }));
  }),
  picks: (signal) => getReviewPicks(signal),
};

// The shelves when there's no search
const useShelves = (wanted) => {
  const [lists, setLists] = useState({});
  useEffect(() => {
    if (!wanted) return undefined;
    const controller = new AbortController();
    for (const [key, load] of Object.entries(SHELF_SOURCES)) {
      load(controller.signal)
        .then((list) => setLists((old) => ({ ...old, [key]: list })))
        .catch((error) => error.name !== 'AbortError' && setLists((old) => ({ ...old, [key]: false })));
    }
    return () => controller.abort();
  }, [wanted]);
  return lists;
};

const firstOf = (list) => (Array.isArray(list) ? list.slice(0, SHELF_SIZE) : list);
// Popular games on the page with no query: two of the home page's pages of them
const POPULAR_COUNT = 20;

// The home page's shelf: tiles at least 128px on phones (two columns even at 320px),
// 160px from tablets up
const SHELF =
  'grid grid-cols-[repeat(auto-fill,minmax(min(128px,100%),1fr))] gap-x-4 gap-y-9 sm:grid-cols-[repeat(auto-fill,minmax(min(160px,100%),1fr))] sm:gap-x-6 sm:gap-y-13';

// A message where results would be (nothing found, search down): no box, two lines
const Notice = ({ title, children }) => (
  <div className="py-16 text-center">
    <p className="text-lg font-medium text-white">{title}</p>
    <p className="mt-1 text-sm text-slate-400">{children}</p>
  </div>
);

// Quest mode: each result is one link, straight into that game's review quest. A Noir
// tile like the game cards: the cover with 2px corners, no box, the title underlined on
// hover, the year in quiet grey, and "I played this" as a text link along the bottom.
// A game that isn't out yet can't be reviewed: its tile says when it's out instead (in
// place of the year too) and opens the game page.
const QuestPick = ({ game }) => {
  const notOut = isUnreleased(game.releaseDate);
  // IGDB dates are midnight UTC, so the year is read in UTC (not the visitor's time zone)
  const year = game.releaseDate && !notOut ? new Date(game.releaseDate).getUTCFullYear() : null;
  return (
    <Link to={notOut ? `/game/${game.id}` : `/game/${game.id}/review`} className="group flex flex-col min-w-0 text-white">
      <div className="aspect-[3/4] overflow-hidden rounded-sm bg-slate-900">
        {game.coverUrl && (
          <img
            src={game.coverUrl}
            srcSet={coverSrcSet(game.coverUrl)}
            sizes={COVER_SIZES}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <p className="mt-3.5 text-base font-medium leading-[1.3] line-clamp-2 underline decoration-1 underline-offset-4 decoration-transparent group-hover:decoration-white transition-[text-decoration-color] duration-120">
        {game.title}
      </p>
      {year && <p className="mt-1 text-sm tabular-nums text-slate-400">{year}</p>}
      {/* mt-auto: lines up along the bottom of a grid row, whatever the title's length */}
      {notOut ? (
        <p className="mt-auto pt-2 text-sm tabular-nums text-slate-400">{releaseLabel(game.releaseDate)}</p>
      ) : (
        <p className="mt-auto pt-2 text-sm font-medium underline decoration-1 underline-offset-5 decoration-slate-500/80 group-hover:decoration-current group-hover:text-slate-50 transition-colors duration-120">
          I played this
        </p>
      )}
    </Link>
  );
};

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = (searchParams.get('q') ?? '').trim();
  const isSearchable = query.length >= MIN_QUERY_LENGTH;
  // Quest mode: picking a game starts its review instead of opening its page
  const questMode = searchParams.get('quest') === '1';

  // Results are tagged with their query so a new search shows the loading state
  const [results, setResults] = useState({ query: null, games: [], error: false });
  const isLoading = isSearchable && results.query !== query;

  useEffect(() => {
    if (!isSearchable) return;

    const controller = new AbortController();
    searchGames(query, controller.signal)
      .then((games) => setResults({ query, games, error: false }))
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setResults({ query, games: [], error: error.status === 429 ? 'rate-limited' : true });
      });

    return () => controller.abort();
  }, [query, isSearchable]);

  // The popular games, fetched the first time the page has no query (null = loading,
  // false = they couldn't be loaded: the section then steps aside)
  const [popular, setPopular] = useState(null);
  useEffect(() => {
    if (isSearchable || !questMode || popular !== null) return;

    const controller = new AbortController();
    getFeaturedGames(controller.signal)
      .then((games) => setPopular(games.slice(0, POPULAR_COUNT)))
      .catch((error) => error.name !== 'AbortError' && setPopular(false));

    return () => controller.abort();
  }, [isSearchable, questMode, popular]);

  // The page's own search box, always there (the navbar's field hides behind a button
  // on phones, and would drop ?quest=1). It searches as you type: the address follows
  // the text a moment after the last key, replacing the history entry (no Back through
  // every letter). A search from the header changes the address: the box follows it.
  const [text, setText] = useState(query);
  const [shownQuery, setShownQuery] = useState(query);
  if (query !== shownQuery) {
    setShownQuery(query);
    if (query !== text.trim()) setText(query);
  }
  const paramsFor = (q) => ({ ...(questMode && { quest: '1' }), ...(q && { q }) });
  useEffect(() => {
    const q = text.trim();
    if (q === query || (q.length > 0 && q.length < MIN_QUERY_LENGTH)) return undefined;
    const timer = setTimeout(() => setSearchParams(paramsFor(q), { replace: true }), TYPING_PAUSE);
    return () => clearTimeout(timer);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps -- only the typing starts a search
  const searchHere = (event) => {
    event.preventDefault();
    const q = text.trim();
    if (q.length >= MIN_QUERY_LENGTH && q !== query) setSearchParams(paramsFor(q));
  };

  // The shelves, when there's no search (quest mode keeps its popular picks)
  const shelves = useShelves(!isSearchable && !questMode);
  const [now] = useState(() => Date.now()); // for "Out tomorrow" and the like

  // One game on the shelf: a quest pick in quest mode, otherwise its game card
  const tile = (game) => questMode ? (
    <QuestPick key={game.id} game={game} />
  ) : (
    <GameCard
      key={game.id}
      id={game.id}
      title={game.title}
      coverUrl={game.coverUrl}
      genres={game.genres}
      platforms={game.platforms}
      ratings={game.ratings}
      reviewCount={game.reviewCount}
      releaseDate={game.releaseDate}
    />
  );

  return (
    <section className={`${WRAP} pt-10 sm:pt-14 pb-12 md:pb-16 min-h-[80vh]`}>
      <div className="mb-8 sm:mb-10">
        <h1 className="font-display text-[34px] sm:text-[54px] leading-[.95] tracking-[.005em] text-white break-words">
          {questMode ? 'What did you play last?' : isSearchable ? `Results for “${query}”` : 'Search games'}
        </h1>
        {/* Many people here are new: what they get is the card (XP comes up inside the
            quest, where it's explained) */}
        {questMode && (
          <p className="mt-3 text-base leading-[1.6] text-white">
            Pick it to start its quest: about two minutes, and you get a card at the end.
          </p>
        )}
        {(
          <form role="search" onSubmit={searchHere} className="mt-6 flex gap-2 max-w-xl">
            {/* The header's search field: card stock, a control-grey edge that turns
                ivory while it has focus */}
            <label className="flex flex-1 min-w-0 items-center gap-2.5 h-11 px-3.5 rounded-sm bg-slate-900 border border-slate-500 focus-within:border-white transition-colors duration-120">
              <span className="sr-only">{questMode ? 'A game you played' : 'Search games'}</span>
              <SearchIcon className="w-4 h-4 shrink-0 text-slate-400" strokeWidth={1.8} aria-hidden="true" />
              {/* text-base (16px): smaller text makes iPhones zoom in on focus.
                  Quest mode focuses it on arrival (not when coming back to results);
                  the plain page doesn't, as people may come to browse. */}
              <input
                type="search"
                name="q"
                value={text}
                onChange={(event) => setText(event.target.value)}
                autoFocus={questMode && !query}
                autoComplete="off"
                placeholder="Search games"
                className="flex-1 min-w-0 h-10 bg-transparent text-base text-white placeholder:text-slate-400 appearance-none focus:outline-hidden [&::-webkit-search-cancel-button]:appearance-none"
              />
            </label>
            <button type="submit" className={GHOST_BUTTON}>
              Search
            </button>
          </form>
        )}
        {isSearchable && !isLoading && !results.error && (
          <p className={`text-sm tabular-nums text-slate-400 ${questMode ? 'mt-4' : 'mt-3'}`}>
            {results.games.length} game{results.games.length !== 1 ? 's' : ''} found
          </p>
        )}
      </div>

      {/* No query: shelves of games to browse */}
      {!isSearchable && !questMode && (
        <div className="mt-6 sm:mt-10">
          {shelves.hot !== false && (
            <GameShelf title="Hot right now" link={{ to: '/discover', label: 'Watch the trailers' }} games={firstOf(shelves.hot)} />
          )}
          {shelves.top !== false && shelves.top?.length !== 0 && (
            <GameShelf title="Top rated on IMGM" link={{ to: '/hall-of-fame', label: 'Hall of Fame' }} games={firstOf(shelves.top)} />
          )}
          {shelves.upcoming !== false && (
            <GameShelf
              title="Coming soon"
              link={{ to: '/discover?feed=upcoming', label: 'Watch the trailers' }}
              games={firstOf(shelves.upcoming)}
              note={(game) => releaseLine(game.releaseDate, now)}
            />
          )}
          {shelves.recent !== false && shelves.recent?.length !== 0 && (
            <GameShelf title="Just reviewed" games={firstOf(shelves.recent)} note={(game) => game.reviewNote} />
          )}
          {shelves.picks !== false && shelves.picks?.games?.length !== 0 && (
            <GameShelf
              title={shelves.picks?.personal ? 'Picked for you' : 'All-time greats'}
              intro={shelves.picks?.personal && shelves.picks.genres?.length ? `From the genres you rate most: ${shelves.picks.genres.slice(0, 2).join(', ')}` : undefined}
              games={shelves.picks ? firstOf(shelves.picks.games) : null}
            />
          )}
        </div>
      )}

      {/* Quest mode with no query: popular games to pick from */}
      {!isSearchable && questMode && popular !== false && (
        <section aria-labelledby="popular-title" className="mt-6 sm:mt-10">
          <h2 id="popular-title" className={`${SECTION_TITLE} mb-6 sm:mb-8`}>Popular right now</h2>
          {popular === null ? (
            <div className={SHELF}>
              {Array.from({ length: POPULAR_COUNT }, (_, i) => <GameCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className={`${SHELF} animate-fade-in`}>
              {popular.map(tile)}
            </div>
          )}
        </section>
      )}

      {isLoading && (
        <div className={SHELF}>
          {Array.from({ length: 10 }, (_, i) => <GameCardSkeleton key={i} />)}
        </div>
      )}

      {isSearchable && !isLoading && results.error && (
        <Notice title={results.error === 'rate-limited' ? 'Too many searches' : 'Search is unavailable right now'}>
          Please try again in a moment.
        </Notice>
      )}

      {isSearchable && !isLoading && !results.error && results.games.length === 0 && (
        <Notice title="No games found">Try a different title or spelling.</Notice>
      )}

      {isSearchable && !isLoading && results.games.length > 0 && (
        <div className={`${SHELF} animate-fade-in`}>
          {results.games.map(tile)}
        </div>
      )}
    </section>
  );
};

export default Search;
