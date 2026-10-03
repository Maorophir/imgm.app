/**
 * GuidePanel — the side panel. While the guide works it shows every game it is
 * considering (covers appear as they're found, with a ✓ once checked); when it's
 * done, the final 5 take over, Best Pick first.
 */
import PickCard from './PickCard';

const ConsideringTile = ({ game }) => (
  <div className="relative animate-fade-in" title={game.title}>
    {game.cover ? (
      <img src={game.cover} alt="" className={`w-full aspect-[3/4] object-cover rounded-lg transition ${game.verified ? '' : 'opacity-60 saturate-50'}`} />
    ) : (
      <div className="w-full aspect-[3/4] rounded-lg bg-slate-800" />
    )}
    {game.verified && (
      <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black flex items-center justify-center shadow">
        ✓
      </span>
    )}
    <p className="mt-1 text-[11px] text-slate-400 truncate">{game.title}</p>
  </div>
);

const GuidePanel = ({ turn }) => {
  // Nothing asked yet: a quiet preview of what will appear here
  if (!turn) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-700 p-6 text-center">
        <p className="text-4xl mb-3" aria-hidden="true">🎯</p>
        <p className="font-bold text-white">Your picks will appear here</p>
        <p className="text-sm text-slate-400 mt-1">
          Five games chosen for you, with a Best Pick and exactly why each one fits.
        </p>
      </div>
    );
  }

  if (turn.cards) {
    const picks = [...turn.cards.games].sort((a, b) => b.best_pick - a.best_pick);
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Your 5 picks</h2>
        {picks.map((pick, i) => (
          <PickCard key={pick.game_id} pick={pick} rank={i + 1} />
        ))}
      </div>
    );
  }

  // Working (or failed before the picks): show what it's considering
  return (
    <div className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
        {turn.status === 'running' && <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" aria-hidden="true" />}
        Considering {turn.games.length > 0 && `${turn.games.length} games`}
      </h2>
      {turn.games.length > 0 ? (
        <div className="grid grid-cols-4 gap-2.5">
          {turn.games.map((game) => (
            <ConsideringTile key={game.id} game={game} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2.5" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="aspect-[3/4] rounded-lg bg-slate-800/60 animate-pulse" />
          ))}
        </div>
      )}
      <p className="text-xs text-slate-500">✓ = checked in the full game catalog</p>
    </div>
  );
};

export default GuidePanel;
