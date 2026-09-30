/**
 * Level UI pieces, coloured by the player's tier:
 *   <LevelBadge level tier />  — a small "Lv 7" pill
 *   <XpBar progress />         — the bar towards the next level
 */
export const LevelBadge = ({ level, tier, small = false, className = '' }) => (
  <span
    className={`inline-flex items-center rounded-md font-black tabular-nums border bg-slate-950 ${
      small ? 'px-1 text-[8px] leading-3' : 'px-1.5 py-px text-[10px]'
    } ${className}`}
    style={{ color: tier.color, borderColor: `${tier.color}80` }}
    title={`${tier.label} · Level ${level}`}
  >
    Lv {level}
  </span>
);

export const XpBar = ({ progress, className = '' }) => (
  <div
    className={`h-2 rounded-full bg-slate-800 overflow-hidden ${className}`}
    role="progressbar"
    aria-valuenow={progress.pct}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-label={`${progress.pct}% of the way to level ${progress.level + 1}`}
  >
    <div
      className="h-full rounded-full transition-[width] duration-700"
      style={{ width: `${progress.pct}%`, background: progress.tier.color }}
    />
  </div>
);
