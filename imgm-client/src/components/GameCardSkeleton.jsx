/**
 * GameCardSkeleton — Pulsing placeholder with the same footprint as GameCard.
 * Shown in grids while game data is loading.
 */
const GameCardSkeleton = () => (
  <div className="flex flex-col bg-slate-900/60 border border-slate-800/50 rounded-2xl overflow-hidden motion-safe:animate-pulse">
    <div className="aspect-[3/4] bg-slate-800/60" />
    <div className="flex flex-col gap-1 p-3.5">
      {/* title (two lines tall), the meta line, then the verdict row */}
      <div className="min-h-[2.5em] text-[15px]">
        <div className="h-4 w-3/4 bg-slate-800 rounded" />
      </div>
      <div className="h-4 flex items-center">
        <div className="h-3 w-1/2 bg-slate-800/70 rounded" />
      </div>
      <div className="pt-2 h-7 flex items-center">
        <div className="h-3 w-1/3 bg-slate-800/70 rounded" />
      </div>
    </div>
  </div>
);

export default GameCardSkeleton;
