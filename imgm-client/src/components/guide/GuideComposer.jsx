/**
 * GuideComposer — where the player asks: a text box, the optional "Tune it" questions
 * (length, mood, platforms…), and (before the first question) a few ideas to start from.
 */
import { useState } from "react";
import GuidePreferences from "./GuidePreferences";
import { summarize } from "./preferenceOptions";

const STARTERS = [
  "Something cozy to wind down with",
  "Beautiful but brutally hard",
  "A great co-op night with friends",
  "A story that will make me cry",
  "Short sessions, big fun",
];

// Remembered in this browser: once a player has opened "Tune it", the arrow stops pointing at it
const TUNE_SEEN_KEY = "playNext.tuneItSeen";
const readTuneSeen = () => {
  try {
    return localStorage.getItem(TUNE_SEEN_KEY) === "true";
  } catch {
    return false; // private window / blocked storage: just show the arrow
  }
};

const GuideComposer = ({
  onAsk,
  disabled,
  prefs,
  onPrefsChange,
  showStarters,
  followUp,
}) => {
  const [text, setText] = useState("");
  const [tuning, setTuning] = useState(false);
  const [tuneSeen, setTuneSeen] = useState(readTuneSeen);
  const summary = summarize(prefs);

  const toggleTuning = () => {
    setTuning((t) => !t);
    if (tuneSeen) return;
    setTuneSeen(true);
    try {
      localStorage.setItem(TUNE_SEEN_KEY, "true");
    } catch {
      // not saved: the arrow comes back next visit, nothing breaks
    }
  };

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

      {showStarters && (
        <div className="flex flex-wrap gap-2">
          {STARTERS.map((starter) => (
            <button
              key={starter}
              type="button"
              onClick={() => submit(starter)}
              disabled={disabled}
              className="px-3.5 py-2 rounded-full text-sm font-semibold text-slate-200 bg-slate-800/80 border border-slate-700 hover:border-brand/70 hover:text-white transition disabled:opacity-40"
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
        className="flex items-center gap-2 rounded-2xl bg-slate-900 border border-slate-700 focus-within:border-brand/60 p-2 transition"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          placeholder={
            disabled
              ? "Picking your games…"
              : followUp
                ? 'Ask a follow-up, e.g. "shorter ones please"'
                : "What are you in the mood for?"
          }
          disabled={disabled}
          aria-label="Ask Play Next"
          className="flex-1 min-w-0 bg-transparent px-3 py-2 text-white placeholder:text-slate-500 outline-none"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="px-5 py-2.5 rounded-xl font-bold bg-brand hover:brightness-110 text-slate-950 shadow-[0_8px_24px_-8px_var(--color-brand)] transition disabled:opacity-40"
        >
          Ask
        </button>
      </form>

      <div className="flex items-center gap-3 text-sm">
        <button
          type="button"
          onClick={toggleTuning}
          aria-expanded={tuning}
          className="shrink-0 px-4 py-2 rounded-full font-extrabold uppercase tracking-wider text-xs border-2 border-brand text-white bg-brand/10 hover:bg-brand/20 shadow-[0_0_18px_-6px_var(--color-brand)] transition"
        >
          {tuning ? "Done tuning" : "Tune it"}{" "}
          <span className="text-brand">{tuning ? "▴" : "▾"}</span>
        </button>
        {!tuneSeen && !tuning ? (
          // First visit only: point at it until they've opened it once
          <span className="flex min-w-0 items-center gap-2 font-bold text-brand">
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 shrink-0 animate-nudge"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span className="truncate">Start here for a much better match</span>
          </span>
        ) : (
          <span
            className={`min-w-0 truncate ${summary ? "text-slate-400" : "text-slate-500"}`}
          >
            {summary || "Length, mood, platforms, games you loved"}
          </span>
        )}
      </div>
    </div>
  );
};

export default GuideComposer;
