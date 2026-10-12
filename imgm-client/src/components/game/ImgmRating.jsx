/**
 * ImgmRating — a game's average IMGM score, the way a card prints it: the numeral in
 * the display face and the tier's ink (8.3), "/10" in grey, then the tier's mark and
 * name and how many reviews it's from. No box: it sits straight on the page.
 */
import RarityMark from '../RarityMark';
import { getRarity } from '../reviewQuest/questOptions';

const ImgmRating = ({ average, count }) => {
  if (!count) {
    return (
      <p className="text-sm text-slate-400">
        <span className="font-medium text-white">No IMGM rating yet.</span> Be the first to review it!
      </p>
    );
  }

  const rarity = getRarity(average);

  return (
    // The tier's ink, for the numeral and the mark
    <div className="flex items-end gap-4" style={{ '--ink': rarity.color }}>
      {/* Screen readers get it as one sentence; the layout below is for the eyes */}
      <p className="sr-only">
        IMGM rating {average.toFixed(1)} out of 10, {rarity.label}, from {count} review{count === 1 ? '' : 's'}
      </p>
      <p className="flex items-baseline gap-1.5" aria-hidden="true">
        <span className="font-display text-[54px] leading-[.78] tabular-nums text-(--ink)">{average.toFixed(1)}</span>
        <span className="text-sm tabular-nums text-slate-400">/10</span>
      </p>
      <div className="flex flex-col gap-0.5 pb-0.5" aria-hidden="true">
        <span className="text-sm text-slate-400">IMGM score</span>
        <p className="flex items-center gap-2 text-sm">
          <RarityMark tier={rarity.key} className="text-(--ink)" />
          <span className="font-semibold text-(--ink)">{rarity.label}</span>
          <span className="text-slate-400">· from {count} review{count === 1 ? '' : 's'}</span>
        </p>
      </div>
    </div>
  );
};

export default ImgmRating;
