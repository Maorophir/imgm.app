/**
 * Quick review — for people in a hurry: their score plus one optional line.
 */
import { Zap } from 'lucide-react';
import RarityStars from '../../RarityStars';
import { RATING_LABELS, getRarity } from '../questOptions';

const MAX_LENGTH = 280;

const QuickStep = ({ answers, update }) => {
  const rarity = getRarity(answers.rating);

  return (
    <div>
      <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-black text-white mb-3"><Zap className="w-7 h-7 text-brand" aria-hidden="true" /> Quick review</h1>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-6">
        <RarityStars value={answers.rating} size="sm" readOnly />
        <span className="font-black uppercase tracking-widest text-sm" style={{ color: rarity.color }}>
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
        className="w-full bg-slate-950/60 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand/60 focus:ring-1 focus:ring-brand/30 resize-none"
      />
      <p className="text-right text-xs text-slate-500 mt-1">{answers.reviewText.length}/{MAX_LENGTH}</p>
    </div>
  );
};

export default QuickStep;
