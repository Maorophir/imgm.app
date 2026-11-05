/**
 * CardSets — a player's cards as a collection, on their profile: hand-picked sets of
 * games (a studio, a series, a year's Game of the Year nominees, a theme) with how many
 * of each the player has collected by rating them. The server decides the sets and
 * what counts (imgm-server lib/cardSets.js): any version of a game collects its card.
 *
 * Each set is a row: its name, "2 of 5", a bar, and the badge it earns. Opening one
 * shows the player's real cards for it (mini cards with their score, a First Edition
 * foil where they were the game's first reviewer) and a locked slot for each game still
 * to rate. Started sets come first, the closest to complete at the top, and the first
 * one opens by itself.
 *
 * Props:
 *   username  a player's gamer tag (their public profile); leave it out for your own
 *   own       your own profile: the empty slots invite you to rate those games
 *
 * A public profile with nothing collected shows no sets at all (there's nothing of
 * theirs to see); your own shows them all, so you can see what there is to collect.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award, ChevronDown, Coffee, Crosshair, Flame, Gamepad2, Gem, Lock, Map as MapIcon, Star, Swords, Triangle, Trophy,
} from 'lucide-react';
import ArtIcon from '../ArtIcon';
import CollectibleCard from '../CollectibleCard';
import { getMySets, getPlayerSets } from '../../lib/api';
import { SECTION_TITLE, SEGMENTS, segment } from '../../lib/ui';

const FILTERS = [
  { key: 'all', label: 'All sets' },
  { key: 'studio', label: 'Studios' },
  { key: 'series', label: 'Series' },
  { key: 'yearly', label: 'Yearly' },
  { key: 'collection', label: 'Collections' },
];

// Each set's badge as a line icon (a set the list doesn't know gets the plain award)
const BADGE_ICONS = {
  fromsoftware: Swords,
  supergiant: Flame,
  rockstar: Crosshair,
  zelda: Triangle,
  mario: Star,
  'goty-2025': Trophy,
  'goty-2024': Trophy,
  metroidvanias: MapIcon,
  'indie-gems': Gem,
  cozy: Coffee,
  playstation: Gamepad2,
};
const badgeIcon = (key) => BADGE_ICONS[key] ?? Award;

// A game still to collect: a dashed outline in the card's shape, with its name
const LockedSlot = ({ game, own }) => (
  <Link
    to={`/game/${game.id}`}
    className="group aspect-[63/88] rounded-[4.76%/3.41%] border border-dashed border-slate-600 hover:border-slate-400 flex flex-col items-center justify-center gap-2 px-2 text-center transition-colors duration-120"
  >
    <Lock className="w-5 h-5 text-slate-500 group-hover:text-slate-300" strokeWidth={1.8} aria-hidden="true" />
    <span className="text-xs sm:text-sm text-slate-300 leading-snug line-clamp-3 break-words">{game.title}</span>
    <span className="text-[11px] sm:text-xs text-slate-400">{own ? 'Rate it to collect' : 'Not collected'}</span>
  </Link>
);

// A collected game: the player's own mini card, linking to the game
const CollectedSlot = ({ game }) => (
  <Link to={`/game/${game.id}`} aria-label={`${game.title}, rated ${game.rating}`} className="block hover:-translate-y-0.5 transition-transform duration-120">
    <CollectibleCard variant="mini" title={game.title} score={game.rating} coverUrl={game.coverUrl} firstEdition={game.firstEdition} />
  </Link>
);

const SetRow = ({ set, open, onToggle, own }) => {
  const started = set.collected > 0;
  const panelId = `card-set-${set.key}`;
  return (
    <article className={`border ${open ? 'border-slate-600 bg-slate-900' : 'border-slate-700'}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center gap-4 sm:gap-6 px-4 sm:px-5 py-4 text-left hover:bg-slate-800/60 transition-colors duration-120"
      >
        <span className="flex-1 min-w-0">
          <span className={`block font-semibold ${started ? 'text-white' : 'text-slate-300'}`}>{set.name}</span>
          <span className="block text-sm text-slate-400 mt-0.5">
            <span className="tabular-nums">{set.collected} of {set.total}</span>
            {' · '}
            {set.complete ? (
              <span className="text-rarity-legendary">{set.badge} badge earned</span>
            ) : (
              <>finish the set for the {set.badge} badge</>
            )}
          </span>
        </span>
        <span className="hidden sm:block w-[180px] h-1.5 bg-slate-700" aria-hidden="true">
          <span
            className={`block h-full ${set.complete ? 'bg-rarity-legendary' : 'bg-white'}`}
            style={{ width: `${(set.collected / set.total) * 100}%` }}
          />
        </span>
        <ArtIcon icon={badgeIcon(set.key)} className={`w-5 h-5 ${set.complete ? 'text-rarity-legendary' : 'text-slate-500'}`} />
        <ChevronDown className={`w-5 h-5 shrink-0 text-slate-400 transition-transform duration-120 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div id={panelId} className="px-4 sm:px-5 pb-5 pt-1">
          {/* The bar again on a phone, where the row has no room for it */}
          <div className="sm:hidden h-1 bg-slate-700 mb-4" aria-hidden="true">
            <div className={`h-full ${set.complete ? 'bg-rarity-legendary' : 'bg-white'}`} style={{ width: `${(set.collected / set.total) * 100}%` }} />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-5">
            {set.games.map((game) =>
              game.rating != null ? <CollectedSlot key={game.id} game={game} /> : <LockedSlot key={game.id} game={game} own={own} />,
            )}
          </div>
        </div>
      )}
    </article>
  );
};

const CardSets = ({ username, own = false }) => {
  const [sets, setSets] = useState(null);
  const [filter, setFilter] = useState('all');
  // The open set's key; undefined until the player picks (then the first started set is open)
  const [openKey, setOpenKey] = useState(undefined);

  useEffect(() => {
    const controller = new AbortController();
    (own ? getMySets(controller.signal) : getPlayerSets(username, controller.signal))
      .then((data) => setSets(data.sets))
      // Quietly left out: the rest of the profile doesn't depend on it
      .catch((error) => error.name !== 'AbortError' && setSets([]));
    return () => controller.abort();
  }, [own, username]);

  if (!sets) return null;
  const anyCollected = sets.some((s) => s.collected > 0);
  if (sets.length === 0 || (!own && !anyCollected)) return null;

  const shown = sets.filter((s) => filter === 'all' || s.kind === filter);
  const open = openKey === undefined ? shown.find((s) => s.collected > 0)?.key ?? null : openKey;
  const complete = sets.filter((s) => s.complete);

  return (
    <section className="flex flex-col gap-6" aria-label="Card sets">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className={SECTION_TITLE}>
          Card sets
          {complete.length > 0 && (
            <span className="ml-3 font-sans text-lg font-normal tracking-normal tabular-nums text-slate-400">({complete.length} complete)</span>
          )}
        </h2>
        <div className={SEGMENTS} role="group" aria-label="Show sets">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)} className={segment(filter === f.key)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* The badges finished sets earned */}
      {complete.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {complete.map((set) => (
            <span key={set.key} className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-xs border border-slate-600 text-sm font-medium text-white">
              <ArtIcon icon={badgeIcon(set.key)} className="w-3.5 h-3.5 text-rarity-legendary" /> {set.badge}
            </span>
          ))}
        </div>
      )}

      {own && !anyCollected && (
        <p className="text-slate-300 -mt-2">Every game you rate becomes a card. Rate the games in a set to collect it, and finish a set for its badge.</p>
      )}

      <div className="flex flex-col gap-3">
        {shown.map((set) => (
          <SetRow
            key={set.key}
            set={set}
            own={own}
            open={open === set.key}
            onToggle={() => setOpenKey(open === set.key ? null : set.key)}
          />
        ))}
      </div>
    </section>
  );
};

export default CardSets;
