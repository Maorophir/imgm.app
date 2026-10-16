/**
 * Small building blocks shared by the quest screens, in the Noir look:
 *   <Chip>       a small tappable choice (vibes, platforms, difficulty…)
 *   <ChoiceCard> a big tappable card with art (completion, "got good", worth it…)
 *   <FieldLabel> the quiet label above a group of choices
 * A picked choice is raised card stock with an ivory edge; the rest sit on a
 * control-grey edge that turns ivory on hover.
 */
import ArtIcon from '../ArtIcon';

export const FieldLabel = ({ children, hint }) => (
  <p className="text-sm text-slate-400 mb-2">
    <span className="font-medium text-white">{children}</span>
    {hint && <span className="ml-2">{hint}</span>}
  </p>
);

export const Chip = ({ label, art, selected, disabled, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={selected}
    className={`inline-flex items-center gap-1.5 min-h-11 px-3.5 py-2 rounded-sm border text-sm font-medium transition-colors duration-120
      disabled:opacity-35 disabled:cursor-not-allowed
      ${selected
        ? 'bg-slate-800 border-white text-white'
        : 'border-slate-500 text-white hover:border-white'}`}
  >
    <ArtIcon icon={art} className={`w-4 h-4 ${selected ? '' : 'text-slate-400'}`} />
    {label}
  </button>
);

export const ChoiceCard = ({ label, art, hint, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    className={`flex flex-col items-center justify-center gap-1.5 p-4 rounded-sm border text-center transition-colors duration-120
      ${selected
        ? 'bg-slate-800 border-white'
        : 'bg-slate-900 border-slate-600 hover:border-white'}`}
  >
    {/* The "art slot": a Lucide icon, quiet grey until it's picked */}
    <ArtIcon icon={art} className={`w-9 h-9 ${selected ? 'text-white' : 'text-slate-400'}`} />
    <span className="font-semibold text-white text-sm">{label}</span>
    {hint && <span className="text-xs text-slate-400 leading-snug">{hint}</span>}
  </button>
);
