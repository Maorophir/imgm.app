/**
 * ⑨ Worth it? — the price verdict, plus "would you replay it?".
 */
import { Chip, ChoiceCard, FieldLabel } from '../Choice';
import { WORTH_PRICE, REPLAY } from '../questOptions';

const WorthStep = ({ answers, update }) => {
  const toggle = (field, value) => update({ [field]: answers[field] === value ? null : value });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <FieldLabel>Is it worth the money?</FieldLabel>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {WORTH_PRICE.map((o) => (
            <ChoiceCard key={o.value} {...o} selected={answers.worthPrice === o.value} onClick={() => toggle('worthPrice', o.value)} />
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Would you play it again?</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {REPLAY.map((o) => (
            <Chip key={o.value} {...o} selected={answers.replay === o.value} onClick={() => toggle('replay', o.value)} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default WorthStep;
