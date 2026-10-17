/**
 * RarityLegend — The rarity index: every tier with its mark and score range, the
 * current one picked out. Pass `onPick` to make tiers clickable (jumps to the tier's
 * lowest score). Clickable tiers are buttons a screen reader names in words ("Epic:
 * scores 8 to 9"), pressed while their tier is the current one.
 */
import RarityMark from './RarityMark';
import { RARITIES } from './reviewQuest/questOptions';

// A tier's name with its range in words: "8–9" on its own is read as "8 dash 9", or
// skipped, so the button would only say "Epic"
const spokenName = (tier) =>
  `${tier.label}: ${tier.range.includes('–') ? `scores ${tier.range.replace('–', ' to ')}` : `score ${tier.range}`}`;

const RarityLegend = ({ activeKey, onPick }) => (
  <div
    className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 w-full"
    role={onPick ? 'group' : undefined}
    aria-label={onPick ? 'Rarity tiers: pick one to jump to its lowest score' : undefined}
  >
    {RARITIES.map((tier) => {
      const active = tier.key === activeKey;
      const Tag = onPick ? 'button' : 'div';
      return (
        <Tag
          key={tier.key}
          type={onPick ? 'button' : undefined}
          onClick={onPick ? () => onPick(tier) : undefined}
          aria-label={onPick ? spokenName(tier) : undefined}
          aria-pressed={onPick ? active : undefined}
          // The tier's name in its ink, with its mark; the current one gets an edge in
          // the ink and the others step back
          className={`flex flex-col items-center gap-0.5 rounded-sm border px-1.5 py-2 text-center transition-colors duration-120 ${
            active ? 'bg-slate-950' : 'border-slate-700'
          } ${onPick && !active ? 'hover:border-slate-500 cursor-pointer' : ''}`}
          style={{
            color: tier.color,
            borderColor: active ? tier.color : undefined,
            opacity: activeKey && !active ? 0.55 : 1,
          }}
        >
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <RarityMark tier={tier.key} className="w-3 h-3" />
            {tier.label}
          </span>
          <span className="block text-xs text-slate-400 tabular-nums">{tier.range}</span>
        </Tag>
      );
    })}
  </div>
);

export default RarityLegend;
