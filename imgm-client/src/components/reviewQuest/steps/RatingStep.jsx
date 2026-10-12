/**
 * ① Rating — the only required screen. Rarity stars: the stars and the stage
 * take the colour of the score's loot rarity as the user picks.
 */
import RarityStars from '../../RarityStars';
import RarityLegend from '../../RarityLegend';
import RarityMark from '../../RarityMark';
import { RATING_LABELS, getRarity } from '../questOptions';

const RatingStep = ({ answers, update }) => {
  const { rating } = answers;
  const rarity = rating ? getRarity(rating) : null;

  return (
    <div
      className="rounded-sm border px-4 py-8 flex flex-col items-center gap-5 transition-colors duration-300"
      style={{
        // The stage takes the rarity: its edge in the tier's ink, its ground the tier's deep colour
        borderColor: rarity ? `${rarity.color}55` : '#2e2a25',
        background: rarity ? rarity.deep : 'transparent',
      }}
    >
      <RarityStars value={rating} onChange={(v) => update({ rating: v })} />

      <div className="h-16 flex flex-col items-center justify-center text-center">
        {rarity ? (
          <div key={rarity.key} className="animate-fade-in">
            <p
              className="inline-flex items-center gap-2 font-display text-[34px] leading-none tracking-[.005em]"
              style={{ color: rarity.color }}
            >
              <RarityMark tier={rarity.key} className="w-5 h-5" />
              {rarity.label}
            </p>
            <p className="text-slate-300 font-medium tabular-nums mt-1">
              {rating}/10 · {RATING_LABELS[rating]}
            </p>
          </div>
        ) : (
          <p className="text-slate-400">Tap a star, or drag across them</p>
        )}
      </div>

      {/* The rarity index — tap a tier to jump to its lowest score */}
      <RarityLegend activeKey={rarity?.key} onPick={(tier) => update({ rating: tier.min })} />
    </div>
  );
};

export default RatingStep;
