/**
 * GamePicker — search IGDB and pick one game (for "It's like ___ meets ___", and the
 * Game of the Week nomination). Shows the picked game as a small row with an X to
 * change it. The results float under the field like the header search's.
 */
import { useState } from 'react';
import { X } from 'lucide-react';
import useGameSearch from '../../hooks/useGameSearch';
import { FIELD } from '../../lib/ui';

const MAX_RESULTS = 5;

const GamePicker = ({ value, onChange, excludeIds = [], placeholder = 'Search a game…' }) => {
  const [query, setQuery] = useState('');
  const { searchable, loading, games, error } = useGameSearch(query);

  // A game is picked → show it
  if (value) {
    return (
      <div className="flex items-center gap-3 p-2 rounded-sm bg-slate-800 border border-white animate-fade-in">
        {value.coverUrl
          ? <img src={value.coverUrl} alt="" className="w-10 h-14 object-cover rounded-sm shrink-0" />
          : <div className="w-10 h-14 rounded-sm bg-slate-900 shrink-0" />}
        <p className="flex-1 min-w-0 font-semibold text-white text-sm leading-tight line-clamp-2">{value.title}</p>
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label={`Remove ${value.title}`}
          className="w-11 h-11 shrink-0 grid place-items-center rounded-sm text-slate-400 hover:text-white transition-colors duration-120"
        >
          <X className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
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
        className={FIELD}
      />

      {searchable && (
        <div className="absolute left-0 right-0 mt-1.5 z-20 p-2 rounded-sm bg-slate-900 border border-slate-600 shadow-[0_32px_64px_-24px_rgba(0,0,0,.85)]">
          {loading && <p className="px-2 py-2.5 text-sm text-slate-400 animate-pulse">Searching…</p>}
          {!loading && error && (
            <p className="px-2 py-2.5 text-sm text-red-400">
              {error === 'rate-limited' ? 'Too many searches, wait a moment.' : 'Search is unavailable right now.'}
            </p>
          )}
          {!loading && !error && options.length === 0 && <p className="px-2 py-2.5 text-sm text-slate-400">No games found</p>}
          {!loading && options.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                onChange({ id: g.id, title: g.title, coverUrl: g.coverUrl });
                setQuery('');
              }}
              className="w-full flex items-center gap-3 p-2 rounded-sm text-left hover:bg-slate-800 transition-colors duration-120"
            >
              {g.coverUrl
                ? <img src={g.coverUrl} alt="" loading="lazy" className="w-7 h-10 object-cover rounded-sm shrink-0" />
                : <div className="w-7 h-10 rounded-sm bg-slate-800 shrink-0" />}
              <span className="min-w-0">
                <span className="block text-sm font-medium text-white truncate">{g.title}</span>
                {g.releaseDate && <span className="block text-sm tabular-nums text-slate-400">{new Date(g.releaseDate).getFullYear()}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GamePicker;
