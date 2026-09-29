/**
 * ⑤ Rate the parts — one rarity slider per part. A part starts as N/A
 * (a racing game has no story) until the user touches its slider.
 */
import { PART_SCORES, getRarity } from '../questOptions';

const EMPTY = '#475569';

const PartSlider = ({ label, art, value, onChange }) => {
  const rarity = value ? getRarity(value) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-slate-200">
          <span className="mr-1.5" aria-hidden="true">{art}</span>{label}
        </span>
        {rarity ? (
          <span className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: rarity.color }}>{rarity.label}</span>
            <span className="font-black tabular-nums w-5 text-right" style={{ color: rarity.color }}>{value}</span>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-200 border border-slate-700 rounded px-1.5 py-0.5"
              title="Doesn't apply to this game"
            >
              N/A
            </button>
          </span>
        ) : (
          <span className="text-xs text-slate-500">N/A · drag to rate</span>
        )}
      </div>
      <input
        type="range"
        min="1"
        max="10"
        step="1"
        value={value ?? 5}
        onChange={(e) => onChange(Number(e.target.value))}
        // Clicking the untouched slider right on its resting spot (5) doesn't fire onChange
        onClick={(e) => value == null && onChange(Number(e.currentTarget.value))}
        aria-label={`${label} score`}
        aria-valuetext={value ? `${value} out of 10, ${rarity.label}` : 'Not rated'}
        className={`rarity-range ${value == null ? 'is-empty' : ''}`}
        style={{
          '--rc': rarity?.color ?? EMPTY,
          '--fill': value ? `${((value - 1) / 9) * 100}%` : '0%',
        }}
      />
    </div>
  );
};

const ScoresStep = ({ answers, update }) => (
  <div className="flex flex-col gap-6">
    <p className="text-slate-400 text-sm -mb-2">Drag to score each part. Leave a part on N/A if it doesn't apply.</p>
    {PART_SCORES.map(({ field, label, art }) => (
      <PartSlider
        key={field}
        label={label}
        art={art}
        value={answers[field]}
        onChange={(v) => update({ [field]: v })}
      />
    ))}
  </div>
);

export default ScoresStep;
