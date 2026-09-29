/**
 * ④ When did it get good? — from "hooked instantly" to "never clicked".
 * The art slots are where the bored → hooked illustrations will go.
 */
import { ChoiceCard } from '../Choice';
import { GOT_GOOD_AFTER } from '../questOptions';

const GotGoodStep = ({ answers, update }) => (
  <div>
    <p className="text-slate-400 text-sm mb-4">Some games grab you right away, others need time. How was this one?</p>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {GOT_GOOD_AFTER.map((o) => (
        <ChoiceCard
          key={o.value}
          {...o}
          selected={answers.gotGoodAfter === o.value}
          onClick={() => update({ gotGoodAfter: answers.gotGoodAfter === o.value ? null : o.value })}
        />
      ))}
    </div>
  </div>
);

export default GotGoodStep;
