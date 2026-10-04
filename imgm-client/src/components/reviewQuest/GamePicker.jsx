/**
 * GamePicker — search IGDB and pick one game (for "It's like ___ meets ___").
 * Shows the picked game as a small card with a ✕ to change it.
 */
import { useState } from 'react';
import useGameSearch from '../../hooks/useGameSearch';

const MAX_RESULTS = 5;

const GamePicker = ({ value, onChange, excludeIds = [], placeholder = 'Search a game…' }) => {
  const [query, setQuery] = useState('');
  const { searchable, loading, games, error } = useGameSearch(query);

  // A game is picked → show it
  if (value) {
    return (
      <div className="flex items-center gap-3 p-2 pr-3 rounded-xl bg-brand/10 border border-brand/60 animate-fade-in">
        {value.coverUrl
          ? <img src={value.coverUrl} alt="" className="w-10 h-14 object-cover rounded-md shrink-0" />
          : <div className="w-10 h-14 rounded-md bg-slate-800 shrink-0" />}
        <p className="flex-1 min-w-0 font-bold text-white text-sm leading-tight line-clamp-2">{value.title}</p>
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label={`Remove ${value.title}`}
          className="text-slate-400 hover:text-white text-lg px-1"
        >
          ✕
        </button>
      </div>
    );
  }

  const options = games.filter((g) => !excludeIds.includes(g.id)).slice(0, MAX_RESULTS);

  return (
    <div className="relative">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full bg-slate-950/60 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand/60 focus:ring-1 focus:ring-brand/30"
      />

      {searchable && (
        <div className="absolute left-0 right-0 mt-1.5 z-20 bg-slate-900/95 backdrop-blur-md border border-slate-700/60 rounded-xl shadow-2xl overflow-hidden">
          {loading && <p className="px-3 py-2.5 text-sm text-slate-400 animate-pulse">Searching…</p>}
          {!loading && error && (
            <p className="px-3 py-2.5 text-sm text-red-400">
              {error === 'rate-limited' ? 'Too many searches, wait a moment.' : 'Search is unavailable right now.'}
            </p>
          )}
          {!loading && !error && options.length === 0 && <p className="px-3 py-2.5 text-sm text-slate-500">No games found</p>}
          {!loading && options.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                onChange({ id: g.id, title: g.title, coverUrl: g.coverUrl });
                setQuery('');
              }}
              className="w-full flex items-center gap-3 px-2.5 py-1.5 text-left hover:bg-white/5 transition"
            >
              {g.coverUrl
                ? <img src={g.coverUrl} alt="" loading="lazy" className="w-7 h-10 object-cover rounded shrink-0" />
                : <div className="w-7 h-10 rounded bg-slate-800 shrink-0" />}
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-white truncate">{g.title}</span>
                {g.releaseDate && <span className="block text-xs text-slate-500">{new Date(g.releaseDate).getFullYear()}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GamePicker;
