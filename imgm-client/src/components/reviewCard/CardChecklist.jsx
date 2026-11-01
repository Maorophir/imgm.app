/**
 * CardChecklist — what's printed on the back of a review card: "The verdict", the
 * reviewer's name, and every checklist answer the review ticked: the category in small
 * capitals (its short cardTitle where it has one), the answer in ivory (N/A in grey
 * italics), and under it a meter of its place on the scale in the rarity ladder's
 * colours (ChecklistMeter).
 *
 * The same back on every review card that has a checklist: a game page's card
 * (RarityCard), and ChecklistBack (CollectibleCard) on the home page's card and the
 * card a player gets at the end of the review quest. It fills the space it's given,
 * spacing the answers out when there's room; all 11 fit on a full card, and if a very
 * small card still can't fit them, it scrolls without showing a scrollbar. Sizes are in cqi, like the cards.
 *
 * Props:
 *   ticks   the ticked answers, from tickedChecklist(review) (reviewDisplay.js)
 *   name    the reviewer's gamer tag
 *   corner  optional, after the name at the top right (a game page's card shows the
 *           arrow that turns it back: a row of its own at the bottom left no room)
 */
import { Fragment } from 'react';
import ChecklistMeter from './ChecklistMeter';

const CardChecklist = ({ ticks, name, corner = null }) => (
  // Left-aligned whatever the page around it does (the quest's done screen centres its text)
  <div className="flex flex-col gap-[3.4cqi] @max-[300px]:gap-[2.6cqi] h-full min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-left">
    <p className="flex items-end justify-between gap-[2cqi]">
      <span className="font-display uppercase leading-[.9] tracking-[.01em] whitespace-nowrap shrink-0 text-[length:max(18px,8cqi)] text-white">
        The verdict
      </span>
      <span className="flex items-center gap-[1.6cqi] min-w-0">
        <span className="text-[length:max(9px,2.9cqi)] uppercase tracking-[.14em] text-slate-400 truncate min-w-0">by {name}</span>
        {corner}
      </span>
    </p>
    {/* Roomy rows when the card has space; on a full or small card the space between
        them shrinks first (the spacers give way, the answers never do), so all 11 fit.
        A small card (a phone's home page) keeps the text at its smallest readable size,
        so it takes more of the card: its lines sit closer too */}
    <div className="flex-1 min-h-0 flex flex-col">
      {ticks.map(({ category, index, option }, i) => (
        <Fragment key={category.field}>
          {i > 0 && <div aria-hidden="true" className="shrink basis-[5cqi] min-h-[1cqi]" />}
          <div className="shrink-0 grid gap-[1.6cqi] @max-[300px]:gap-[1.1cqi]">
            <div className="grid grid-cols-[23cqi_1fr] gap-[2.6cqi] items-baseline leading-snug @max-[300px]:leading-[1.2]">
              <span className="text-[length:max(9px,2.7cqi)] font-medium uppercase tracking-[.14em] text-slate-400">{category.cardTitle ?? category.title}</span>
              <span className={`text-[length:max(11px,3.6cqi)] break-words ${index === 'na' ? 'text-slate-400 italic' : 'text-white'}`}>{option.label}</span>
            </div>
            {index !== 'na' && <ChecklistMeter category={category} index={index} className="gap-[max(2px,.8cqi)]" segmentClassName="h-[max(3px,1.3cqi)]" />}
          </div>
        </Fragment>
      ))}
    </div>
  </div>
);

export default CardChecklist;
