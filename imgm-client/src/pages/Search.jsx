/**
 * Search page — Full results grid for a game search. Route: /search?q=...
 *
 * The Navbar SearchBar sends users here when they press Enter.
 * Results come from IGDB via our backend (/api/games/search).
 */
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchGames } from '../lib/api';
import GameCard from '../components/GameCard';
import GameCardSkeleton from '../components/GameCardSkeleton';

const MIN_QUERY_LENGTH = 2;

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = (searchParams.get('q') ?? '').trim();
  const isSearchable = query.length >= MIN_QUERY_LENGTH;

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

  return (
    <section className="px-6 py-12 max-w-7xl mx-auto min-h-[80vh]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          {isSearchable ? (
            <>Results for <span className="text-blue-400">"{query}"</span></>
          ) : (
            <>Search <span className="text-blue-400">Games</span></>
          )}
        </h1>
        {isSearchable && !isLoading && !results.error && (
          <p className="text-slate-400 text-sm mt-1">
            {results.games.length} game{results.games.length !== 1 ? 's' : ''} found
          </p>
        )}
      </div>

      {!isSearchable && (
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
          {results.games.map((game) => (
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
