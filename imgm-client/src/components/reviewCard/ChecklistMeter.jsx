/**
 * ChecklistMeter — where a checklist answer sits on its scale, as a row of segments, one
 * per option, worst on the left and best on the right. A scale lights every segment up
 * to the answer, each in its own rarity colour (checklistColor), so a great answer climbs
 * to Legendary gold; a neutral category (no better or worse) lights only the answer's
 * own segment, in grey. No answer, or N/A, lights none.
 *
 * On the back of every review card (CardChecklist) and by each category's name in the
 * review quest's checklist. Only a picture: the answer itself is always written beside it.
 *
 * Props:
 *   category          the CHECKLIST category
 *   index             the answer's place in category.options, 'na', or null
 *   className         the row's size and spacing (its gap), e.g. "w-24 gap-[3px]"
 *   segmentClassName  each segment's height, e.g. "h-1"
 */
import { checklistColor } from '../reviewQuest/questOptions';

const ChecklistMeter = ({ category, index, className = 'gap-[3px]', segmentClassName = 'h-[5px]' }) => {
  const answered = typeof index === 'number';
  return (
    <span aria-hidden="true" className={`flex ${className}`}>
      {category.options.map((option, step) => {
        const lit = answered && (category.kind === 'neutral' ? step === index : step <= index);
        return (
          <span
            key={option.value}
            className={`flex-1 rounded-[1px] transition-colors duration-120 ${segmentClassName}`}
            style={{ background: lit ? checklistColor(category, step).solid : 'var(--color-slate-700)' }}
          />
        );
      })}
    </span>
  );
};

export default ChecklistMeter;
