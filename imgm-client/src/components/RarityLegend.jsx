/**
 * RarityLegend — The rarity index: every tier with its mark and score range, the
 * current one picked out. Pass `onPick` to make tiers clickable (jumps to the tier's lowest score).
 */
import RarityMark from './RarityMark';
import { RARITIES } from './reviewQuest/questOptions';

const RarityLegend = ({ activeKey, onPick }) => (
  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 w-full">
    {RARITIES.map((tier) => {
      const active = tier.key === activeKey;
      const Tag = onPick ? 'button' : 'div';
      return (
        <Tag
          key={tier.key}
          type={onPick ? 'button' : undefined}
          onClick={onPick ? () => onPick(tier) : undefined}
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
