/**
 * StylePreview — a small switcher in the bottom-left corner for trying button-and-type
 * styles on the real pages before one is chosen (the styles and how they're applied are
 * in lib/styles.js). Local development only: App renders it only when
 * import.meta.env.DEV, so a production build never includes it.
 */
import { useState } from 'react';
import { STYLES, setStyle, rememberStyle } from '../lib/styles';

const StylePreview = () => {
  const [current, setCurrent] = useState(() => document.documentElement.dataset.style ?? '');

  const pick = (key) => {
    setStyle(key);
    setCurrent(key);
    rememberStyle(key);
  };

  return (
    <div
      role="group"
      aria-label="Style preview"
      className="fixed left-4 bottom-4 z-50 max-w-[calc(100%-2rem)] flex flex-wrap items-center gap-1 p-1.5 rounded-sm bg-slate-900 border border-slate-600 text-sm"
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      <span className="px-2 text-slate-400">Style</span>
      {STYLES.map((s) => (
        <button
          key={s.key || 'now'}
          type="button"
          aria-pressed={current === s.key}
          onClick={() => pick(s.key)}
          className={`h-8 px-2.5 rounded-xs transition-colors duration-120 ${
            current === s.key ? 'bg-white text-slate-950' : 'text-white hover:bg-slate-800'
          }`}
        >
          {s.name}
        </button>
      ))}
    </div>
  );
};

export default StylePreview;
