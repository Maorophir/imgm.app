/**
 * ① Rating — the only required screen. Rarity stars: the stars and the stage
 * take the colour of the score's loot rarity as the user picks.
 */
import RarityStars from '../../RarityStars';
import RarityLegend from '../../RarityLegend';
import { RATING_LABELS, getRarity } from '../questOptions';

const RatingStep = ({ answers, update }) => {
  const { rating } = answers;
  const rarity = rating ? getRarity(rating) : null;

  return (
    <div
      className="rounded-2xl border px-4 py-8 flex flex-col items-center gap-5 transition-colors duration-300"
      style={{
        // The stage glows in the rarity colour (a see-through tint of it)
        borderColor: rarity ? `${rarity.color}55` : 'rgb(51 65 85 / 0.5)',
        background: rarity
          ? `radial-gradient(120% 90% at 50% 100%, ${rarity.color}26, transparent 70%)`
          : 'transparent',
      }}
    >
      <RarityStars value={rating} onChange={(v) => update({ rating: v })} />

      <div className="h-16 flex flex-col items-center justify-center text-center">
        {rarity ? (
          <div key={rarity.key} className="animate-fade-in">
            <p
              className="text-2xl font-black uppercase tracking-[0.2em]"
              style={{ color: rarity.color, textShadow: `0 0 18px ${rarity.color}66` }}
            >
              {rarity.label}
            </p>
            <p className="text-slate-300 font-semibold mt-1">
              {rating}/10 · {RATING_LABELS[rating]}
            </p>
          </div>
        ) : (
          <p className="text-slate-500">Tap a star, or drag across them</p>
        )}
      </div>

      {/* The rarity index — tap a tier to jump to its lowest score */}
      <RarityLegend activeKey={rarity?.key} onPick={(tier) => update({ rating: tier.min })} />
    </div>
  );
};

export default RatingStep;
