/**
 * RarityLegend — The rarity index: every tier with its score range, the current
 * one lit up. Pass `onPick` to make tiers clickable (jumps to the tier's lowest score).
 */
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
          className={`rounded-lg border px-1.5 py-1.5 text-center transition-all duration-300 ${onPick ? 'hover:brightness-125 cursor-pointer' : ''}`}
          style={{
            color: tier.color,
            borderColor: active ? tier.color : `${tier.color}33`,
            background: active ? `${tier.color}22` : 'transparent',
            opacity: activeKey && !active ? 0.55 : 1,
            boxShadow: active ? `0 0 14px ${tier.color}44` : 'none',
          }}
        >
          <span className="block text-[11px] font-black uppercase tracking-wider">{tier.label}</span>
          <span className="block text-[11px] text-slate-400 tabular-nums">{tier.range}</span>
        </Tag>
      );
    })}
  </div>
);

export default RarityLegend;
