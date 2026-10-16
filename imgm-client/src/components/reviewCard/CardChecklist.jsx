/**
 * CardChecklist — what's printed on the back of a review card: "The checklist", the
 * reviewer's name, and every checklist answer the review ticked, each with a tick box
 * in its place on the red → green ladder (N/A answers get a grey dash).
 *
 * The same back on every review card that has a checklist: a game page's card
 * (RarityCard), and ChecklistBack (CollectibleCard) on the home page's card and the
 * card a player gets at the end of the review quest. It fills the space it's given,
 * scrolling if a small card can't fit every answer. Sizes are in cqi, like the cards.
 *
 * Props:
 *   ticks   the ticked answers, from tickedChecklist(review) (reviewDisplay.js)
 *   name    the reviewer's gamer tag
 *   footer  optional, printed at the bottom (a game page's card says "Flip back")
 */
import { Check, ListChecks, Minus } from 'lucide-react';
import { checklistColor } from '../reviewQuest/questOptions';

const CardChecklist = ({ ticks, name, footer = null }) => (
  // Left-aligned whatever the page around it does (the quest's done screen centres its text)
  <div className="flex flex-col gap-[2.4cqi] h-full min-h-0 overflow-y-auto text-left">
    <p className="flex items-center justify-between gap-[2cqi]">
      <span className="inline-flex items-center gap-[1.4cqi] whitespace-nowrap shrink-0 text-[length:max(12px,4.4cqi)] font-semibold">
        <ListChecks className="w-[max(14px,4.6cqi)] h-[max(14px,4.6cqi)] text-slate-400" strokeWidth={1.8} aria-hidden="true" /> The checklist
      </span>
      <span className="text-[length:max(10px,3.4cqi)] text-slate-400 truncate min-w-0">{name}</span>
    </p>
    <div className="grid gap-[1.8cqi]">
      {ticks.map(({ category, index, option }) => (
        <div key={category.field} className="grid grid-cols-[max(13px,4.6cqi)_26cqi_1fr] gap-[2cqi] items-start leading-snug">
          {/* The tick box, in the answer's place on the red → green ladder */}
          <span
            className="w-[max(13px,4.6cqi)] h-[max(13px,4.6cqi)] mt-[.3cqi] rounded-xs flex items-center justify-center text-slate-950"
            style={{ background: checklistColor(category, index).solid }}
            aria-hidden="true"
          >
            {index === 'na' ? <Minus className="w-[80%] h-[80%]" strokeWidth={3} /> : <Check className="w-[80%] h-[80%]" strokeWidth={3} />}
          </span>
          <span className="text-[length:max(10px,3.4cqi)] text-slate-400 mt-[.2cqi]">{category.title}</span>
          <span className={`text-[length:max(11px,3.8cqi)] break-words ${index === 'na' ? 'text-slate-400 italic' : 'text-white'}`}>{option.label}</span>
        </div>
      ))}
    </div>
    {footer}
  </div>
);

export default CardChecklist;
