/**
 * ⑤ The checklist — the fun, Steam-meme-style part of the quest.
 * One page, many categories, every one optional. Options read left → right,
 * worst → best (or less → more for neutral ones); tap again to un-tick.
 */
import { CHECKLIST } from '../questOptions';

// Colour of a ticked option. Scales go red (worst) → yellow → green (best);
// neutral categories (difficulty, grind…) are always blue.
const colorFor = (category, index) => {
  if (category.kind === 'neutral') return { solid: 'rgb(96 165 250)', soft: 'rgb(96 165 250 / 0.15)' };
  const hue = Math.round((index / (category.options.length - 1)) * 130); // 0 = red … 130 = green
  return { solid: `hsl(${hue} 75% 58%)`, soft: `hsl(${hue} 75% 58% / 0.15)` };
};

const CheckChip = ({ label, checked, color, onClick }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    onClick={onClick}
    className={`inline-flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg border text-sm text-left transition-all ${
      checked ? 'text-white font-semibold' : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:border-slate-500 hover:text-white'
    }`}
    style={checked ? { borderColor: color.solid, background: color.soft, boxShadow: `0 0 12px ${color.soft}` } : undefined}
  >
    {/* The tick box — ☐ / ☑ like the classic Steam review checklists */}
    <span
      aria-hidden="true"
      className="w-4 h-4 shrink-0 rounded-[4px] border flex items-center justify-center text-[11px] font-black leading-none"
      style={checked ? { borderColor: color.solid, background: color.solid, color: '#0f172a' } : { borderColor: '#64748b' }}
    >
      {checked ? '✓' : ''}
    </span>
    {label}
  </button>
);

const ChecklistStep = ({ answers, update }) => {
  const categories = CHECKLIST.filter((c) => !c.showIf || c.showIf(answers));
  const ticked = categories.filter((c) => answers[c.field]).length;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-slate-400 text-sm -mb-1">
        Tick what fits. Answer as many or as few as you like.
        <span className="ml-2 font-bold tabular-nums text-blue-300">{ticked}/{categories.length}</span>
      </p>

      {categories.map((category) => (
        <section key={category.field} aria-label={category.title}>
          {/* ── 🎨 GRAPHICS ── */}
          <h2 className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-2.5">
            <span className="h-px flex-1 bg-slate-700/70" />
            <span><span className="mr-1.5" aria-hidden="true">{category.art}</span>{category.title}</span>
            <span className="h-px flex-1 bg-slate-700/70" />
          </h2>
          <div className="flex flex-wrap gap-2">
            {category.options.map((option, index) => {
              const checked = answers[category.field] === option.value;
              return (
                <CheckChip
                  key={option.value}
                  label={option.label}
                  checked={checked}
                  color={colorFor(category, index)}
                  onClick={() => update({ [category.field]: checked ? null : option.value })}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};

export default ChecklistStep;
