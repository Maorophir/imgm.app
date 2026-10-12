/**
 * Search page — Full results grid for a game search. Route: /search?q=...
 *
 * The Navbar SearchBar sends users here when they press Enter.
 * Results come from IGDB via our backend (/api/games/search).
 *
 * Quest mode (/search?quest=1, from the home page's "Start your first quest"): the page
 * asks which game you played last, and picking one opens its review quest.
 *
 * Noir: the big condensed headline, the search field from the header, and the results
 * on the same shelf as the home page's featured games.
 */
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import { searchGames } from '../lib/api';
import { coverSrcSet, COVER_SIZES } from '../lib/igdbImage';
import { WRAP, GHOST_BUTTON } from '../lib/ui';
import GameCard from '../components/GameCard';
import GameCardSkeleton from '../components/GameCardSkeleton';
import { MAX_XP } from '../components/reviewQuest/questOptions';

const MIN_QUERY_LENGTH = 2;

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
const QuestPick = ({ game }) => {
  const year = game.releaseDate ? new Date(game.releaseDate).getFullYear() : null;
  return (
    <Link to={`/game/${game.id}/review`} className="group flex flex-col min-w-0 text-white">
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
      <p className="mt-auto pt-2 text-sm font-medium underline decoration-1 underline-offset-5 decoration-slate-500/80 group-hover:decoration-current group-hover:text-slate-50 transition-colors duration-120">
        I played this
      </p>
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

  // Quest mode has its own search box: the navbar's would drop ?quest=1
  const searchForQuest = (event) => {
    event.preventDefault();
    const q = String(new FormData(event.currentTarget).get('q') ?? '').trim();
    setSearchParams({ quest: '1', q });
  };

  return (
    <section className={`${WRAP} pt-10 sm:pt-14 pb-12 md:pb-16 min-h-[80vh]`}>
      <div className="mb-8 sm:mb-10">
        <h1 className="font-display text-[34px] sm:text-[54px] leading-[.95] tracking-[.005em] text-white break-words">
          {questMode ? 'What did you play last?' : isSearchable ? `Results for “${query}”` : 'Search games'}
        </h1>
        {questMode && (
          <>
            <p className="mt-3 text-base leading-[1.6] text-white">
              Pick it to start its quest: about two minutes, up to {MAX_XP} XP, and a card at the end.
            </p>
            <form role="search" onSubmit={searchForQuest} className="mt-6 flex gap-2 max-w-xl">
              {/* The header's search field: card stock, a control-grey edge that turns
                  ivory while it has focus */}
              <label className="flex flex-1 min-w-0 items-center gap-2.5 h-11 px-3.5 rounded-sm bg-slate-900 border border-slate-500 focus-within:border-white transition-colors duration-120">
                <span className="sr-only">A game you played</span>
                <SearchIcon className="w-4 h-4 shrink-0 text-slate-400" strokeWidth={1.8} aria-hidden="true" />
                {/* text-base (16px): smaller text makes iPhones zoom in on focus.
                    Focused only on arrival, not when coming back to results. */}
                <input
                  type="search"
                  name="q"
                  defaultValue={query}
                  required
                  minLength={MIN_QUERY_LENGTH}
                  autoFocus={!query}
                  autoComplete="off"
                  placeholder="Search games"
                  className="flex-1 min-w-0 h-10 bg-transparent text-base text-white placeholder:text-slate-400 appearance-none focus:outline-hidden [&::-webkit-search-cancel-button]:appearance-none"
                />
              </label>
              <button type="submit" className={GHOST_BUTTON}>
                Search
              </button>
            </form>
          </>
        )}
        {isSearchable && !isLoading && !results.error && (
          <p className={`text-sm tabular-nums text-slate-400 ${questMode ? 'mt-4' : 'mt-3'}`}>
            {results.games.length} game{results.games.length !== 1 ? 's' : ''} found
          </p>
        )}
      </div>

      {!isSearchable && !questMode && (
        <p className="text-base text-slate-400">Type at least {MIN_QUERY_LENGTH} characters in the search bar above.</p>
      )}

      {isLoading && (
        <div className={SHELF}>
          {Array.from({ length: 10 }, (_, i) => <GameCardSkeleton key={i} />)}
        </div>
      )}

      {!isLoading && results.error && (
        <Notice title={results.error === 'rate-limited' ? 'Too many searches' : 'Search is unavailable right now'}>
          Please try again in a moment.
        </Notice>
      )}

      {isSearchable && !isLoading && !results.error && results.games.length === 0 && (
        <Notice title="No games found">Try a different title or spelling.</Notice>
      )}

      {!isLoading && results.games.length > 0 && (
        <div className={`${SHELF} animate-fade-in`}>
          {results.games.map((game) => questMode ? (
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
          ))}
        </div>
      )}
    </section>
  );
};

export default Search;
