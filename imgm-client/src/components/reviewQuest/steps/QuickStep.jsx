/**
 * Quick review — for people in a hurry: their score plus one optional line.
 */
import { Zap } from 'lucide-react';
import RarityStars from '../../RarityStars';
import RarityMark from '../../RarityMark';
import { RATING_LABELS, getRarity } from '../questOptions';
import { SECTION_TITLE, TEXT_BOX } from '../../../lib/ui';

const MAX_LENGTH = 280;

const QuickStep = ({ answers, update }) => {
  const rarity = getRarity(answers.rating);

  return (
    <div>
      <h1 className={`flex items-center gap-3 mb-4 ${SECTION_TITLE}`}>
        <Zap className="w-7 h-7 sm:w-9 sm:h-9 shrink-0 text-slate-400" strokeWidth={1.8} aria-hidden="true" /> Quick review
      </h1>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-6">
        <RarityStars value={answers.rating} size="sm" readOnly />
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: rarity.color }}>
          <RarityMark tier={rarity.key} />
          {rarity.label}
        </span>
        <span className="text-slate-400 text-sm">
          {answers.rating}/10 · {RATING_LABELS[answers.rating]} — anything to add? (optional)
        </span>
      </div>
      <textarea
        rows={3}
        maxLength={MAX_LENGTH}
        value={answers.reviewText}
        onChange={(e) => update({ reviewText: e.target.value })}
        placeholder="One line about it… e.g. “Best boss fights I've ever played.”"
        className={`${TEXT_BOX} resize-none`}
      />
      <p className="text-right text-xs tabular-nums text-slate-400 mt-1">{answers.reviewText.length}/{MAX_LENGTH}</p>
    </div>
  );
};

export default QuickStep;
