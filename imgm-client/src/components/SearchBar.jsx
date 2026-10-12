/**
 * SearchBar — Navbar game search with an instant-results dropdown.
 *
 * - Debounced (300ms) queries to /api/games/search once 2+ characters are typed
 * - Stale requests are cancelled with an AbortController
 * - Clicking a result opens /game/:id; Enter opens the full /search?q= results page
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import useGameSearch from '../hooks/useGameSearch';

const MAX_DROPDOWN_RESULTS = 6;

const SearchBar = () => {
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  // Debounced IGDB search (see hooks/useGameSearch.js)
  const search = useGameSearch(query);
  const { trimmed, searchable: isSearchable, loading: isLoading } = search;
  const results = { games: search.games, error: search.error };

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
    <div ref={containerRef} className="relative w-full">
      {/* The field: a filled box with a control-grey edge that turns ivory while it has focus */}
      <form
        onSubmit={handleSubmit}
        role="search"
        className="flex items-center gap-2.5 h-11 px-3.5 rounded-sm bg-slate-900 border border-slate-500 focus-within:border-white transition-colors duration-120"
      >
        <Search className="w-4 h-4 shrink-0 text-slate-400" strokeWidth={1.8} aria-hidden="true" />
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
          placeholder="Search games"
          aria-label="Search games"
          autoComplete="off"
          // 16px text, so phones don't zoom in when the field gets focus. The box's
          // border shows focus, so the input itself draws no outline, and the
          // browser's own clear button is hidden (it can't take our colours).
          className="flex-1 min-w-0 h-10 bg-transparent text-base text-white placeholder:text-slate-400 appearance-none focus:outline-hidden [&::-webkit-search-cancel-button]:appearance-none"
        />
      </form>

      {showDropdown && (
        // Floats like a printed slip over the page: card stock, a hairline edge, a soft
        // shadow underneath (no glow), and a quick fade in
        <div className="absolute left-0 right-0 top-full mt-2.5 z-50 p-2 rounded-sm bg-slate-900 border border-slate-600 shadow-[0_32px_64px_-24px_rgba(0,0,0,.85)] transition-[opacity,translate] duration-160 ease-out translate-y-0 starting:opacity-0 starting:-translate-y-1">
          {isLoading && (
            <p className="px-2 py-2.5 text-sm text-slate-400 animate-pulse">Searching…</p>
          )}

          {!isLoading && results.error && (
            <p className="px-2 py-2.5 text-sm text-red-400">
              {results.error === 'rate-limited'
                ? 'Too many searches — wait a moment and try again.'
                : 'Search is unavailable right now.'}
            </p>
          )}

          {!isLoading && !results.error && games.length === 0 && (
            <p className="px-2 py-2.5 text-sm text-slate-400">No games found for “{trimmed}”</p>
          )}

          {!isLoading && games.length > 0 && (
            <ul>
              {games.map((game) => {
                const year = game.releaseDate ? new Date(game.releaseDate).getFullYear() : null;
                const subtitle = [year, game.genres?.[0]].filter(Boolean).join(' · ');

                return (
                  <li key={game.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(game.id)}
                      className="w-full flex items-center gap-3.5 p-2 rounded-sm text-left hover:bg-slate-800 transition-colors duration-120"
                    >
                      {game.coverUrl ? (
                        <img
                          src={game.coverUrl}
                          alt=""
                          loading="lazy"
                          className="w-9 h-12 object-cover rounded-sm bg-slate-800 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-12 rounded-sm bg-slate-800 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-base font-medium leading-snug text-white truncate">{game.title}</p>
                        {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
                      </div>
                    </button>
                  </li>
                );
              })}
              <li className="mt-1 pt-1 border-t border-slate-700">
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="w-full flex items-center gap-1.5 px-2 h-11 rounded-sm text-sm font-medium text-white text-left hover:bg-slate-800 transition-colors duration-120"
                >
                  <span className="truncate">See all results for “{trimmed}”</span>
                  <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
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
