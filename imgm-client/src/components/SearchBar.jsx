/**
 * SearchBar — Navbar game search with an instant-results dropdown.
 *
 * - Debounced (300ms) queries to /api/games/search once 2+ characters are typed
 * - Stale requests are cancelled with an AbortController
 * - Clicking a result opens /game/:id; Enter opens the full /search?q= results page
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchGames } from '../lib/api';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;
const MAX_DROPDOWN_RESULTS = 6;

const SearchBar = () => {
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  // Results are tagged with the query they belong to, so stale ones are never shown
  const [results, setResults] = useState({ query: '', games: [], error: false });

  const trimmed = query.trim();
  const isSearchable = trimmed.length >= MIN_QUERY_LENGTH;
  const isLoading = isSearchable && results.query !== trimmed;

  // Debounced search
  useEffect(() => {
    if (!isSearchable) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      searchGames(trimmed, controller.signal)
        .then((games) => setResults({ query: trimmed, games, error: false }))
        .catch((error) => {
          if (error.name === 'AbortError') return;
          setResults({ query: trimmed, games: [], error: error.status === 429 ? 'rate-limited' : true });
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [trimmed, isSearchable]);

  // Close the dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const reset = () => {
    setIsOpen(false);
    setQuery('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isSearchable) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    reset();
  };

  const handleSelect = (id) => {
    navigate(`/game/${id}`);
    reset();
  };

  const showDropdown = isOpen && isSearchable;
  const games = results.games.slice(0, MAX_DROPDOWN_RESULTS);

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md mx-6">
      <form onSubmit={handleSubmit} role="search">
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsOpen(false);
            }}
            placeholder="Search games..."
            aria-label="Search games"
            className="
              w-full bg-slate-800/60 border border-slate-700/50
              rounded-full pl-11 pr-4 py-2 text-sm text-slate-200
              placeholder:text-slate-500
              focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30
              transition
            "
          />
        </div>
      </form>

      {showDropdown && (
        <div className="
          absolute left-0 right-0 mt-2 z-50
          bg-slate-900/90 backdrop-blur-md
          border border-slate-700/50 rounded-2xl
          shadow-2xl shadow-black/40
          overflow-hidden
        ">
          {isLoading && (
            <p className="px-4 py-3 text-sm text-slate-400 animate-pulse">Searching…</p>
          )}

          {!isLoading && results.error && (
            <p className="px-4 py-3 text-sm text-red-400">
              {results.error === 'rate-limited'
                ? 'Too many searches — wait a moment and try again.'
                : 'Search is unavailable right now.'}
            </p>
          )}

          {!isLoading && !results.error && games.length === 0 && (
            <p className="px-4 py-3 text-sm text-slate-500">No games found for "{trimmed}"</p>
          )}

          {!isLoading && games.length > 0 && (
            <ul>
              {games.map((game) => {
                const year = game.releaseDate ? new Date(game.releaseDate).getFullYear() : null;
                const subtitle = [year, game.genres?.[0]].filter(Boolean).join(' • ');

                return (
                  <li key={game.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(game.id)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-blue-500/10 transition"
                    >
                      {game.coverUrl ? (
                        <img
                          src={game.coverUrl}
                          alt=""
                          loading="lazy"
                          className="w-9 h-12 object-cover rounded-md border border-slate-700/50 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-12 rounded-md bg-slate-800 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{game.title}</p>
                        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
                      </div>
                    </button>
                  </li>
                );
              })}
              <li className="border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="w-full px-4 py-2.5 text-sm font-semibold text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 text-left transition"
                >
                  See all results for "{trimmed}" →
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
