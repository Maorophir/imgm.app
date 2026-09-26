/**
 * GameCardSkeleton — Pulsing placeholder with the same footprint as GameCard.
 * Shown in grids while game data is loading.
 */
const GameCardSkeleton = () => (
  <div className="flex flex-col bg-slate-900/60 border border-slate-800/50 rounded-2xl overflow-hidden animate-pulse">
    <div className="aspect-[3/4] bg-slate-800/60" />
    <div className="flex flex-col gap-3 p-4">
      <div className="h-4 w-3/4 bg-slate-800 rounded" />
      <div className="h-3 w-1/4 bg-slate-800/70 rounded" />
      <div className="flex gap-1.5">
        <div className="h-4 w-14 bg-slate-800/70 rounded-md" />
        <div className="h-4 w-12 bg-slate-800/70 rounded-md" />
      </div>
    </div>
  </div>
);

export default GameCardSkeleton;
