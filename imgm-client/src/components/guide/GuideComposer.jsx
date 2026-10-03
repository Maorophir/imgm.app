/**
 * GuideComposer — where the player asks: a text box, the platforms they play on,
 * and (before the first question) a few ideas to start from.
 */
import { useState } from 'react';

// Names match the game catalog (IGDB), so the guide can check availability
const PLATFORMS = [
  { value: 'PC', label: 'PC' },
  { value: 'PlayStation 5', label: 'PS5' },
  { value: 'Xbox Series X|S', label: 'Xbox' },
  { value: 'Nintendo Switch', label: 'Switch' },
];

const STARTERS = [
  'Something cozy to wind down with',
  'Beautiful but brutally hard',
  'A great co-op night with friends',
  'A story that will make me cry',
  'Short sessions, big fun',
];

const GuideComposer = ({ onAsk, disabled, platforms, onPlatformsChange, showStarters }) => {
  const [text, setText] = useState('');

  const submit = (question) => {
    const q = question.trim();
    if (!q || disabled) return;
    onAsk(q);
    setText('');
  };

  const togglePlatform = (value) =>
    onPlatformsChange(platforms.includes(value) ? platforms.filter((p) => p !== value) : [...platforms, value]);

  return (
    <div className="flex flex-col gap-3">
      {showStarters && (
        <div className="flex flex-wrap gap-2">
          {STARTERS.map((starter) => (
            <button
              key={starter}
              type="button"
              onClick={() => submit(starter)}
              disabled={disabled}
              className="px-3.5 py-2 rounded-full text-sm font-semibold text-slate-200 bg-slate-800/80 border border-slate-700 hover:border-indigo-400 hover:text-white transition disabled:opacity-40"
            >
              {starter}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
        className="flex items-center gap-2 rounded-2xl bg-slate-900 border border-slate-700 focus-within:border-indigo-400 p-2 transition"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          placeholder={disabled ? 'The guide is working…' : 'What are you in the mood for?'}
          disabled={disabled}
          aria-label="Ask the Game Guide"
          className="flex-1 min-w-0 bg-transparent px-3 py-2 text-white placeholder:text-slate-500 outline-none"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition disabled:opacity-40"
        >
          Ask
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-500 font-semibold">I play on</span>
        {PLATFORMS.map(({ value, label }) => {
          const on = platforms.includes(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => togglePlatform(value)}
              aria-pressed={on}
              className={`px-2.5 py-1 rounded-full font-bold border transition ${
                on ? 'bg-indigo-500/20 border-indigo-400 text-indigo-200' : 'border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default GuideComposer;
