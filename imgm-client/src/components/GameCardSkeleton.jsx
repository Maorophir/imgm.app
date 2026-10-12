/**
 * GameCardSkeleton — Pulsing placeholder with the same footprint as GameCard.
 * Shown in grids while game data is loading.
 */
const GameCardSkeleton = () => (
  <div aria-hidden="true" className="flex flex-col min-w-0 motion-safe:animate-pulse">
    {/* the cover, then the 4px rarity strip's space */}
    <div className="aspect-[3/4] rounded-sm bg-slate-900" />
    <div className="h-1" />
    {/* title (two lines tall), the meta line, then the verdict row */}
    <div className="mt-3.5 min-h-[2.6em] text-base leading-[1.3]">
      <div className="h-4 mt-0.5 w-3/4 rounded-sm bg-slate-800" />
    </div>
    <div className="h-[21px] mt-1 flex items-center">
      <div className="h-3 w-1/2 rounded-sm bg-slate-800/70" />
    </div>
    <div className="h-5 mt-2 flex items-center">
      <div className="h-3 w-1/3 rounded-sm bg-slate-800/70" />
    </div>
  </div>
);

export default GameCardSkeleton;
