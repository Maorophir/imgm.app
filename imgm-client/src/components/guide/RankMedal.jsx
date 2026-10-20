/**
 * RankMedal — a pick's place in the 5: a gold, silver or bronze medal for the top
 * three, a plain dark disc for #4 and #5, with the number on it. The frame around a
 * pick shows its IMGM score (its rarity); the medal is what shows its rank. The words
 * that go with it ("2nd pick") come from pickName.js.
 */
const METALS = {
  1: 'var(--gradient-medal-gold)',
  2: 'var(--gradient-medal-silver)',
  3: 'var(--gradient-medal-bronze)',
};

// Size and text size come from className (the Sort cards scale theirs with the card)
const RankMedal = ({ rank, className = '' }) => {
  const metal = METALS[rank];
  return (
    <span
      aria-hidden="true"
      className={`inline-grid place-items-center shrink-0 rounded-full font-display leading-none tabular-nums ${
        metal
          ? 'text-slate-950 shadow-[inset_0_0_0_2px_rgba(0,0,0,.22)]'
          : 'bg-slate-800 text-slate-300 border border-slate-600'
      } ${className}`}
      style={metal ? { backgroundImage: metal, backgroundSize: '220% 220%', backgroundPosition: '50% 50%' } : undefined}
    >
      {rank}
    </span>
  );
};

export default RankMedal;
