/**
 * ⑨ Final words — the free-text review. Everyone passes through here before
 * posting, and writing something is worth the most XP.
 */
import { XP_WRITTEN } from '../questOptions';

const MAX_LENGTH = 5000;
const PROMPTS = ['What surprised you?', 'Who would love this game?', 'What would you change?'];

const WordsStep = ({ answers, update }) => (
  <div>
    <p className="text-slate-400 text-sm mb-3">
      Anything the quest didn't cover? A written review earns{' '}
      <span className="font-bold text-amber-300">+{XP_WRITTEN} XP</span>. Need ideas:
    </p>
    <div className="flex flex-wrap gap-2 mb-4">
      {PROMPTS.map((p) => (
        <span key={p} className="text-xs text-slate-300 bg-slate-800/60 border border-slate-700/50 rounded-full px-3 py-1">
          {p}
        </span>
      ))}
    </div>
    <textarea
      rows={6}
      maxLength={MAX_LENGTH}
      value={answers.reviewText}
      onChange={(e) => update({ reviewText: e.target.value })}
      placeholder="Write as much or as little as you like…"
      aria-label="Your review"
      className="w-full bg-slate-950/60 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand/60 focus:ring-1 focus:ring-brand/30 resize-y"
    />
    <p className="text-right text-xs text-slate-500 tabular-nums">{answers.reviewText.length}/{MAX_LENGTH}</p>
  </div>
);

export default WordsStep;
