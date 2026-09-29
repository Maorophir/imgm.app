/**
 * useGameSearch — search IGDB games as the user types.
 *
 * Waits until typing pauses (debounce), cancels outdated requests, and only
 * returns results that belong to the current text. Used by the navbar search
 * and the Review Quest's "It's like ___ meets ___" pickers.
 *
 *   const { trimmed, searchable, loading, games, error } = useGameSearch(query);
 */
import { useState, useEffect } from 'react';
import { searchGames } from '../lib/api';

const useGameSearch = (query, { minLength = 2, delay = 300 } = {}) => {
  const trimmed = query.trim();
  const searchable = trimmed.length >= minLength;
  // Results are tagged with the query they belong to, so stale ones are never shown
  const [results, setResults] = useState({ query: '', games: [], error: false });

  useEffect(() => {
    if (!searchable) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      searchGames(trimmed, controller.signal)
        .then((games) => setResults({ query: trimmed, games, error: false }))
        .catch((err) => {
          if (err.name === 'AbortError') return;
          setResults({ query: trimmed, games: [], error: err.status === 429 ? 'rate-limited' : true });
        });
    }, delay);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [trimmed, searchable, delay]);

  return {
    trimmed,
    searchable,
    loading: searchable && results.query !== trimmed,
    games: results.games,
    error: results.error,
  };
};

export default useGameSearch;
