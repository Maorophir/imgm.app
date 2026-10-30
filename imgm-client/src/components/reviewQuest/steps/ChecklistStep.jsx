/**
 * ⑤ The checklist — the fun, Steam-meme-style part of the quest.
 * One page, many categories, every one optional. Options read left → right,
 * worst → best (or less → more for neutral ones); tap again to un-pick.
 * The picked answer takes its colour on the rarity ladder, and a meter by the
 * category's name shows its place on the scale, as the card's back will print it.
 */
import ArtIcon from '../../ArtIcon';
import ChecklistMeter from '../../reviewCard/ChecklistMeter';
import { CHECKLIST, checklistColor } from '../questOptions';

const CheckChip = ({ label, checked, color, onClick }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    onClick={onClick}
    className={`inline-flex items-center min-h-11 px-3 py-1.5 rounded-sm border text-sm text-left transition-colors duration-120 ${
      checked ? 'text-white font-medium' : 'border-slate-600 text-slate-200 hover:border-white hover:text-white'
    }`}
    style={checked ? { borderColor: color.solid, background: color.soft } : undefined}
  >
    {label}
  </button>
);

const ChecklistStep = ({ answers, update }) => {
  const categories = CHECKLIST.filter((c) => !c.showIf || c.showIf(answers));
  const ticked = categories.filter((c) => answers[c.field]).length;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-slate-400 text-sm -mb-1">
        Pick what fits. Answer as many or as few as you like.
        <span className="ml-2 font-medium tabular-nums text-white">{ticked}/{categories.length}</span>
      </p>

      {categories.map((category) => {
        const value = answers[category.field];
        const picked = category.na && value === category.na.value ? 'na' : category.options.findIndex((o) => o.value === value);
        return (
        <section key={category.field} aria-label={category.title}>
          {/* The category's name on a hairline, e.g. "Graphics", and the answer's meter */}
          <h2 className="flex items-center gap-2 pt-3 mb-2.5 border-t border-slate-700 text-sm font-medium text-white">
            <ArtIcon icon={category.art} className="w-4 h-4 text-slate-400" />{category.title}
            <ChecklistMeter category={category} index={picked === -1 ? null : picked} className="ml-auto w-20 sm:w-28 gap-[3px]" segmentClassName="h-1" />
          </h2>
          <div className="flex flex-wrap gap-2">
            {category.options.map((option, index) => {
              const checked = answers[category.field] === option.value;
              return (
                <CheckChip
                  key={option.value}
                  label={option.label}
                  checked={checked}
                  color={checklistColor(category, index)}
                  onClick={() => update({ [category.field]: checked ? null : option.value })}
                />
              );
            })}
            {/* "Not applicable" sits apart from the ladder, after a thin divider, in grey */}
            {category.na && (
              <>
                <span className="self-center w-px h-5 bg-slate-700 mx-1" aria-hidden="true" />
                <CheckChip
                  label={category.na.label}
                  checked={answers[category.field] === category.na.value}
                  color={checklistColor(category, 'na')}
                  onClick={() =>
                    update({ [category.field]: answers[category.field] === category.na.value ? null : category.na.value })
                  }
                />
              </>
            )}
          </div>
        </section>
        );
      })}
    </div>
  );
};

export default ChecklistStep;
