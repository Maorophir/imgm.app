/**
 * Search page — Full results grid for a game search. Route: /search?q=...
 *
 * The Navbar SearchBar sends users here when they press Enter.
 * Results come from IGDB via our backend (/api/games/search).
 *
 * Quest mode (/search?quest=1, from the home page's "Start your first quest"): the page
 * asks which game you played last, and picking one opens its review quest.
 */
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Gamepad2, Search as SearchIcon } from 'lucide-react';
import { searchGames } from '../lib/api';
import GameCard from '../components/GameCard';
import GameCardSkeleton from '../components/GameCardSkeleton';
import { MAX_XP } from '../components/reviewQuest/questOptions';

const MIN_QUERY_LENGTH = 2;

// Quest mode: each result is one link, straight into that game's review quest
const QuestPick = ({ game }) => {
  const year = game.releaseDate ? new Date(game.releaseDate).getFullYear() : null;
  return (
    <Link
      to={`/game/${game.id}/review`}
      className="group flex flex-col rounded-2xl overflow-hidden bg-slate-900/60 border border-slate-800 transition duration-300 hover:-translate-y-1 hover:border-white/40 active:scale-[.98]"
    >
      <div className="aspect-[3/4] bg-slate-800">
        {game.coverUrl && <img src={game.coverUrl} alt="" loading="lazy" className="w-full h-full object-cover" />}
      </div>
      <div className="flex flex-col gap-1 p-3.5 flex-1">
        <p className="text-[15px] font-bold text-white leading-tight line-clamp-2">{game.title}</p>
        {year && <p className="text-xs text-slate-400">{year}</p>}
        <p className="mt-auto pt-2 inline-flex items-center gap-1.5 text-xs font-bold text-white">
          <Gamepad2 className="w-3.5 h-3.5" aria-hidden="true" />
          I played this
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </p>
      </div>
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
    <section className="px-6 py-12 max-w-7xl mx-auto min-h-[80vh]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          {questMode ? (
            'What did you play last?'
          ) : isSearchable ? (
            <>Results for <span className="text-brand">"{query}"</span></>
          ) : (
            <>Search <span className="text-brand">Games</span></>
          )}
        </h1>
        {questMode && (
          <>
            <p className="text-slate-300 mt-2">
              Pick it to start its quest: about 2 minutes, <span className="font-semibold text-amber-300">up to {MAX_XP} XP</span>.
            </p>
            <form role="search" onSubmit={searchForQuest} className="mt-5 flex gap-2 max-w-xl">
              <label className="relative flex-1">
                <span className="sr-only">A game you played</span>
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" aria-hidden="true" />
                {/* text-base (16px): smaller text makes iPhones zoom in on focus.
                    Focused only on arrival, not when coming back to results. */}
                <input
                  type="search"
                  name="q"
                  defaultValue={query}
                  required
                  minLength={MIN_QUERY_LENGTH}
                  autoFocus={!query}
                  placeholder="Type a game..."
                  className="w-full bg-slate-800/60 border border-slate-700/50 rounded-full pl-11 pr-4 py-3 text-base text-white placeholder-slate-500 focus:border-slate-500 transition"
                />
              </label>
              <button type="submit" className="px-5 rounded-full bg-white text-slate-950 font-bold hover:bg-slate-200 transition">
                Search
              </button>
            </form>
          </>
        )}
        {isSearchable && !isLoading && !results.error && (
          <p className={`text-slate-400 text-sm ${questMode ? 'mt-3' : 'mt-1'}`}>
            {results.games.length} game{results.games.length !== 1 ? 's' : ''} found
          </p>
        )}
      </div>

      {!isSearchable && !questMode && (
        <p className="text-slate-500">Type at least {MIN_QUERY_LENGTH} characters in the search bar above.</p>
      )}

      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {Array.from({ length: 10 }, (_, i) => <GameCardSkeleton key={i} />)}
        </div>
      )}

      {!isLoading && results.error && (
        <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-red-500/20">
          <p className="text-red-400 text-lg mb-2">
            {results.error === 'rate-limited' ? 'Too many searches' : 'Search is unavailable right now'}
          </p>
          <p className="text-slate-500 text-sm">Please try again in a moment.</p>
        </div>
      )}

      {isSearchable && !isLoading && !results.error && results.games.length === 0 && (
        <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800/30">
          <p className="text-slate-500 text-lg mb-2">No games found</p>
          <p className="text-slate-700 text-sm">Try a different title or spelling.</p>
        </div>
      )}

      {!isLoading && results.games.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
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
