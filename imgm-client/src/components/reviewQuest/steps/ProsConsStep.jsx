/**
 * ⑦ Pros & cons — short phrases added as chips (up to 5 each).
 */
import { useState } from 'react';
import { X } from 'lucide-react';
import { FIELD, GHOST_BUTTON_SM } from '../../../lib/ui';

const MAX_ITEMS = 5;
const MAX_LENGTH = 60;

// The + and − are the only colour: the uncommon green and a muted red, on plain chips
const TONES = {
  pro: { sign: '+', ink: 'text-rarity-uncommon' },
  con: { sign: '−', ink: 'text-red-400' },
};

const ChipList = ({ title, tone, placeholder, items, onChange }) => {
  const [draft, setDraft] = useState('');
  const style = TONES[tone];
  const full = items.length >= MAX_ITEMS;

  const add = () => {
    const text = draft.trim();
    if (!text || full || items.includes(text)) return;
    onChange([...items, text]);
    setDraft('');
  };

  return (
    <div>
      <p className="text-sm text-slate-400 mb-2">
        <span className="font-medium text-white">{title}</span> <span className="tabular-nums">{items.length}/{MAX_ITEMS}</span>
      </p>
      {/* A form, so pressing Enter adds the phrase */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="flex gap-2 mb-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={MAX_LENGTH}
          disabled={full}
          placeholder={full ? `That's ${MAX_ITEMS}!` : placeholder}
          aria-label={title}
          className={`${FIELD} flex-1 min-w-0 disabled:opacity-50`}
        />
        <button type="submit" disabled={!draft.trim() || full} className={GHOST_BUTTON_SM}>
          Add
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="inline-flex items-center gap-1.5 pl-3 pr-0.5 rounded-sm border border-slate-600 bg-slate-950 text-sm text-white animate-fade-in">
            <span className={`font-semibold ${style.ink}`}>{style.sign}</span>
            {item}
            <button
              type="button"
              onClick={() => onChange(items.filter((i) => i !== item))}
              aria-label={`Remove ${item}`}
              className="w-9 h-9 grid place-items-center rounded-sm text-slate-400 hover:text-white transition-colors duration-120"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
};

const ProsConsStep = ({ answers, update }) => (
  <div className="grid sm:grid-cols-2 gap-6">
    <ChipList title="Pros" tone="pro" placeholder="e.g. Amazing boss fights" items={answers.pros} onChange={(pros) => update({ pros })} />
    <ChipList title="Cons" tone="con" placeholder="e.g. Stutters on PC" items={answers.cons} onChange={(cons) => update({ cons })} />
  </div>
);

export default ProsConsStep;
