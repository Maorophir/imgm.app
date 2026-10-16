/**
 * GuideComposer — follow-ups after the quest: a text box, and "Tune it" to change
 * the quest's answers (length, vibe, platforms…) for the next question.
 * While Play Next works, the Ask button turns into Stop.
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";
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
        <div className="max-h-[45vh] overflow-y-auto rounded-sm border border-slate-600 bg-slate-900 p-4">
          <p className="mb-4 text-sm text-slate-300">
            <span className="font-semibold text-white">Get a better match.</span> A
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
        className="flex items-center gap-2 rounded-sm bg-slate-900 border border-slate-500 focus-within:border-white p-1.5 transition-colors duration-120"
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
          className="flex-1 min-w-0 bg-transparent px-2.5 py-2 text-base text-white placeholder:text-slate-400 outline-none"
        />
        {running ? (
          <button
            type="button"
            onClick={onStop}
            className="flex items-center gap-2 h-11 px-5 rounded-sm font-medium text-white border border-slate-500 hover:border-white transition-colors duration-120"
          >
            <span
              className="block w-2.5 h-2.5 rounded-xs bg-white"
              aria-hidden="true"
            />
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={disabled || !text.trim()}
            // Play Next's one lime action
            className="h-11 px-6 rounded-sm font-semibold bg-brand hover:brightness-107 text-slate-950 transition-[filter] duration-120 disabled:opacity-40 disabled:hover:brightness-100"
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
          className="shrink-0 inline-flex items-center gap-1.5 h-11 px-4 rounded-sm font-medium border border-slate-500 text-white hover:border-white transition-colors duration-120"
        >
          {tuning ? "Done tuning" : "Tune it"}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-120 ${tuning ? "rotate-180" : ""}`} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <span
          className="min-w-0 truncate text-slate-400"
        >
          {summary || "Change your answers for the next question"}
        </span>
      </div>
    </div>
  );
};

export default GuideComposer;
