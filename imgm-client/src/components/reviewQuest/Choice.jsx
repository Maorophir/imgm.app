/**
 * Small building blocks shared by the quest screens:
 *   <Chip>       a tappable pill (vibes, platforms, difficulty…)
 *   <ChoiceCard> a big tappable card with art (completion, "got good", worth it…)
 *   <FieldLabel> the small caps label above a group of choices
 */

export const FieldLabel = ({ children, hint }) => (
  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
    {children}
    {hint && <span className="ml-2 normal-case tracking-normal font-medium text-slate-500">{hint}</span>}
  </p>
);

export const Chip = ({ label, art, selected, disabled, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={selected}
    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-sm font-semibold transition-all
      disabled:opacity-35 disabled:cursor-not-allowed
      ${selected
        ? 'bg-brand/15 border-brand text-white shadow-[0_0_14px_rgb(184_240_58/0.3)]'
        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-500 hover:text-white'}`}
  >
    {art && <span aria-hidden="true">{art}</span>}
    {label}
  </button>
);

export const ChoiceCard = ({ label, art, hint, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    className={`flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl border text-center transition-all
      ${selected
        ? 'bg-brand/15 border-brand shadow-[0_0_18px_rgb(184_240_58/0.3)] scale-[1.03]'
        : 'bg-slate-800/50 border-slate-700/60 hover:border-slate-500 hover:bg-slate-800/80'}`}
  >
    {/* The "art slot" — an emoji today, an illustration later */}
    <span className="text-4xl leading-none" aria-hidden="true">{art}</span>
    <span className="font-bold text-white text-sm">{label}</span>
    {hint && <span className="text-xs text-slate-400 leading-snug">{hint}</span>}
  </button>
);
