/**
 * GuideComposer — follow-ups after the quest: a text box, and "Tune it" to change
 * the quest's answers (length, vibe, platforms…) for the next question.
 * While Play Next works, the Ask button turns into Stop.
 */
import { useState } from "react";
import GuidePreferences from "./GuidePreferences";
import { summarize } from "./preferenceOptions";

const GuideComposer = ({
  onAsk,
  onStop,
  running,
  disabled,
  prefs,
  onPrefsChange,
}) => {
  const [text, setText] = useState("");
  const [tuning, setTuning] = useState(false);
  const summary = summarize(prefs);

  const submit = (question) => {
    const q = question.trim();
    if (!q || disabled) return;
    onAsk(q);
    setText("");
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Tune it: optional questions, folded away so the page stays clean */}
      {tuning && (
        <div className="max-h-[45vh] overflow-y-auto rounded-2xl border border-brand/30 bg-slate-900/60 p-4">
          <p className="mb-4 text-sm text-slate-300">
            <span className="font-bold text-white">Get a better match.</span> A
            few quick picks tell it what you're after. Skip any you don't care
            about.
          </p>
          <GuidePreferences prefs={prefs} onChange={onPrefsChange} />
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
        className="flex items-center gap-2 rounded-2xl bg-slate-900 border border-slate-700 focus-within:border-brand/60 p-2 transition"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          placeholder={
            disabled
              ? "Picking your games…"
              : 'Ask a follow-up, e.g. "shorter ones please"'
          }
          disabled={disabled}
          aria-label="Ask Play Next"
          className="flex-1 min-w-0 bg-transparent px-3 py-2 text-white placeholder:text-slate-500 outline-none"
        />
        {running ? (
          <button
            type="button"
            onClick={onStop}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white bg-slate-800 border border-slate-600 hover:border-brand/70 transition"
          >
            <span
              className="block w-2.5 h-2.5 rounded-[3px] bg-brand"
              aria-hidden="true"
            />
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={disabled || !text.trim()}
            className="px-5 py-2.5 rounded-xl font-bold bg-brand hover:brightness-110 text-slate-950 shadow-[0_8px_24px_-8px_var(--color-brand)] transition disabled:opacity-40"
          >
            Ask
          </button>
        )}
      </form>

      <div className="flex items-center gap-3 text-sm">
        <button
          type="button"
          onClick={() => setTuning((t) => !t)}
          aria-expanded={tuning}
          className="shrink-0 px-4 py-2 rounded-full font-extrabold uppercase tracking-wider text-xs border-2 border-brand text-white bg-brand/10 hover:bg-brand/20 shadow-[0_0_18px_-6px_var(--color-brand)] transition"
        >
          {tuning ? "Done tuning" : "Tune it"}{" "}
          <span className="text-brand">{tuning ? "▴" : "▾"}</span>
        </button>
        <span
          className={`min-w-0 truncate ${summary ? "text-slate-400" : "text-slate-500"}`}
        >
          {summary || "Change your answers for the next question"}
        </span>
      </div>
    </div>
  );
};

export default GuideComposer;
