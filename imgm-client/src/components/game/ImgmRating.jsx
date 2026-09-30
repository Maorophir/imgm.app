/**
 * ImgmRating — a game's average IMGM score, in the same loot-rarity style as
 * the reviews: the number and 10 stars in the rarity colour (filled to the
 * exact average, e.g. 8.3), the rarity name, and how many reviews it's from.
 */
import RarityStars from '../RarityStars';
import { getRarity } from '../reviewQuest/questOptions';

const ImgmRating = ({ average, count }) => {
  if (!count) {
    return (
      <p className="inline-flex items-center gap-2 text-sm text-slate-400 border border-slate-700/60 bg-slate-900/50 rounded-xl px-4 py-2.5">
        <span className="font-bold tracking-wider text-slate-300">IMGM</span>
        No IMGM rating yet. Be the first to review it!
      </p>
    );
  }

  const rarity = getRarity(average);

  return (
    <div
      className="inline-flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border px-4 py-3"
      style={{ borderColor: `${rarity.color}66`, background: `${rarity.color}14`, boxShadow: `0 0 22px ${rarity.color}22` }}
      aria-label={`IMGM rating ${average.toFixed(1)} out of 10, ${rarity.label}, from ${count} review${count === 1 ? '' : 's'}`}
    >
      <span className="text-xs font-black tracking-[0.2em] text-slate-300">IMGM</span>
      <span className="text-4xl font-black tabular-nums leading-none" style={{ color: rarity.color, textShadow: `0 0 18px ${rarity.color}55` }}>
        {average.toFixed(1)}
      </span>
      <div className="flex flex-col gap-1">
        <RarityStars value={average} size="md" readOnly />
        <p className="text-xs text-slate-300">
          <span className="font-black uppercase tracking-[0.2em]" style={{ color: rarity.color }}>{rarity.label}</span>
          <span className="text-slate-400"> · from {count} review{count === 1 ? '' : 's'}</span>
        </p>
      </div>
    </div>
  );
};

export default ImgmRating;
