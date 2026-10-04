/**
 * ⑦ Pros & cons — short phrases added as chips (up to 5 each).
 */
import { useState } from 'react';

const MAX_ITEMS = 5;
const MAX_LENGTH = 60;

const TONES = {
  pro: { sign: '+', chip: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200', button: 'bg-emerald-600 hover:bg-emerald-500' },
  con: { sign: '−', chip: 'bg-red-500/15 border-red-500/40 text-red-200', button: 'bg-red-600 hover:bg-red-500' },
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
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
        {title} <span className="tabular-nums text-slate-500">{items.length}/{MAX_ITEMS}</span>
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
          className="flex-1 min-w-0 bg-slate-950/60 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand/60 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!draft.trim() || full}
          className={`px-3 rounded-xl text-sm font-bold text-white transition disabled:opacity-30 disabled:cursor-not-allowed ${style.button}`}
        >
          Add
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className={`inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full border text-sm animate-fade-in ${style.chip}`}>
            <span className="font-black">{style.sign}</span>
            {item}
            <button
              type="button"
              onClick={() => onChange(items.filter((i) => i !== item))}
              aria-label={`Remove ${item}`}
              className="w-5 h-5 rounded-full hover:bg-white/10 text-xs"
            >
              ✕
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
