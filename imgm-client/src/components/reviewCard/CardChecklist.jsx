/**
 * CardChecklist — what's printed on the back of a review card: "The verdict", the
 * reviewer's name, and every checklist answer the review ticked: the category in small
 * capitals, the answer in ivory (N/A in grey italics), and under it a meter of its place
 * on the scale in the rarity ladder's colours (ChecklistMeter).
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
import ChecklistMeter from './ChecklistMeter';

const CardChecklist = ({ ticks, name, footer = null }) => (
  // Left-aligned whatever the page around it does (the quest's done screen centres its text)
  <div className="flex flex-col gap-[3cqi] h-full min-h-0 overflow-y-auto text-left">
    <p className="flex items-end justify-between gap-[2cqi]">
      <span className="font-display uppercase leading-[.9] tracking-[.01em] whitespace-nowrap shrink-0 text-[length:max(18px,8cqi)] text-white">
        The verdict
      </span>
      <span className="text-[length:max(9px,2.9cqi)] uppercase tracking-[.14em] text-slate-400 truncate min-w-0">by {name}</span>
    </p>
    <div className="grid gap-[2.4cqi]">
      {ticks.map(({ category, index, option }) => (
        <div key={category.field} className="grid gap-[1.3cqi]">
          <div className="grid grid-cols-[23cqi_1fr] gap-[2.6cqi] items-baseline leading-snug">
            <span className="text-[length:max(9px,2.7cqi)] font-medium uppercase tracking-[.14em] text-slate-400">{category.title}</span>
            <span className={`text-[length:max(11px,3.6cqi)] break-words ${index === 'na' ? 'text-slate-400 italic' : 'text-white'}`}>{option.label}</span>
          </div>
          {index !== 'na' && <ChecklistMeter category={category} index={index} className="gap-[max(2px,.8cqi)]" segmentClassName="h-[max(3px,1.3cqi)]" />}
        </div>
      ))}
    </div>
    {footer}
  </div>
);

export default CardChecklist;
