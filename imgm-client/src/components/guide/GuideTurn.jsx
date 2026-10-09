/**
 * GuideTurn — one question and Play Next's answer, as chat messages.
 *
 *   the player's question  a lime-tinted bubble on the right
 *   Play Next              a glowing avatar ("digging…" while it works), its steps,
 *                          then the answer (the picks themselves are in the side panel)
 *   quick replies          under the latest answer: one tap asks a common follow-up
 *   edit                   the latest question can be edited and asked again (it
 *                          replaces the old one, in the AI's memory too)
 *   stopped / failed       a quiet "You stopped this answer" divider (or the error),
 *                          and a redo button that asks the same question again
 * On small screens the latest turn also shows the full picks (the side panel is hidden).
 */
import { useState } from "react";
import GuideTimeline from "./GuideTimeline";
import GuidePanel from "./GuidePanel";
import RichText from "./RichText";
import { PowerIcon } from "../Logo";

// While the guide writes, its draft isn't shown (the cards replace it moments later):
// the timeline gets a "Writing up your picks" step instead, just before the formatting
const withWritingStep = (turn) => {
  if (!turn.answer || turn.status === "error") return turn.steps;
  const formatAt = turn.steps.findIndex((s) => s.id.startsWith("format-"));
  const writing = {
    id: "writing",
    label: "Writing up your picks",
    state: formatAt === -1 && turn.status === "running" ? "running" : "done",
  };
  return formatAt === -1
    ? [...turn.steps, writing]
    : [
        ...turn.steps.slice(0, formatAt),
        writing,
        ...turn.steps.slice(formatAt),
      ];
};

const Avatar = ({ working }) => (
  <span
    className={`relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-brand/25 to-slate-900 ring-1 ring-brand/40 shadow-[0_0_22px_-6px_var(--color-brand)] ${
      working ? "animate-pulse" : ""
    }`}
    aria-hidden="true"
  >
    <PowerIcon className="w-4.5 h-4.5 text-brand" />
  </span>
);

// One tap = one common follow-up
const quickReplies = (cards) => {
  const best = cards.games.find((g) => g.best_pick);
  return [
    best && `More like ${best.title}`,
    "Shorter ones please",
    "Something completely different",
  ].filter(Boolean);
};

// The player's question: a bubble, or (while editing) a text box with Cancel / Send
const Question = ({ text, editable, onEdit }) => {
  const [draft, setDraft] = useState(null); // null = not editing
  const send = () => {
    const question = draft.trim();
    if (!question) return;
    setDraft(null);
    if (question !== text) onEdit(question);
  };

  if (draft !== null) {
    return (
      <div className="self-end w-full max-w-[85%] flex flex-col gap-2 animate-fade-in">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
            if (e.key === "Escape") setDraft(null);
          }}
          maxLength={1000}
          rows={2}
          autoFocus
          aria-label="Edit your question"
          className="w-full rounded-2xl rounded-br-md bg-slate-900 border border-brand/60 text-white px-4 py-2.5 font-semibold outline-none resize-y"
        />
        <div className="self-end flex gap-2">
          <button
            type="button"
            onClick={() => setDraft(null)}
            className="px-4 py-1.5 rounded-xl text-sm font-bold text-slate-300 border border-slate-700 hover:text-white hover:border-slate-500 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={send}
            disabled={!draft.trim()}
            className="px-4 py-1.5 rounded-xl text-sm font-bold bg-brand text-slate-950 hover:brightness-110 transition disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group self-end max-w-[85%] flex flex-col items-end gap-1">
      <p className="rounded-2xl rounded-br-md bg-gradient-to-br from-brand/25 to-brand/10 border border-brand/40 text-white px-4 py-2.5 font-semibold shadow-[0_8px_28px_-14px_var(--color-brand)]">
        {text}
      </p>
      {editable && (
        <button
          type="button"
          onClick={() => setDraft(text)}
          className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold text-slate-500 hover:text-brand transition"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          Edit
        </button>
      )}
    </div>
  );
};

// The redo button: an arrow going round, like Gemini's
const RetryButton = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    title="Try again"
    aria-label="Try again"
    className="self-start w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-brand hover:bg-white/5 transition"
  >
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  </button>
);

const GuideTurn = ({
  turn,
  isLatest,
  running,
  onNotForMe,
  onAsk,
  onEdit,
  onRetry,
  canAsk,
}) => {
  const [showFull, setShowFull] = useState(false);
  const working = turn.status === "running";

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* The player's question: the latest one can be edited ("Not for me" turns can't) */}
      <Question
        text={turn.question}
        editable={isLatest && !running && turn.kind !== "not_for_me"}
        onEdit={onEdit}
      />

      {/* Play Next: its steps, then its answer */}
      <div className="flex gap-3">
        <Avatar working={working} />
        <div className="min-w-0 flex-1 flex flex-col gap-3">
          <p className="text-sm font-bold text-white leading-9">
            Play Next
            {working && (
              <span className="ml-2 font-semibold text-brand/90">
                is digging…
              </span>
            )}
          </p>

          <GuideTimeline
            steps={withWritingStep(turn)}
            running={working}
            collapsible={Boolean(turn.cards)}
          />

          {turn.cards ? (
            <div className="rounded-2xl rounded-tl-md bg-slate-900/85 border border-white/10 px-5 py-4 shadow-xl shadow-black/30 backdrop-blur">
              <p className="text-[17px] leading-relaxed text-slate-100">
                {turn.cards.intro}
              </p>

              {turn.cards.follow_up && (
                <p className="mt-4 text-slate-300">{turn.cards.follow_up}</p>
              )}

              {turn.answer && (
                <button
                  type="button"
                  onClick={() => setShowFull((s) => !s)}
                  className="mt-3 text-xs font-bold text-slate-500 hover:text-white transition"
                >
                  {showFull
                    ? "Hide the full answer ▴"
                    : "Read the full answer ▾"}
                </button>
              )}
              {showFull && (
                <p className="mt-2 text-sm text-slate-300 whitespace-pre-line border-t border-white/10 pt-3">
                  <RichText text={turn.answer} />
                </p>
              )}
            </div>
          ) : (
            // No cards: the guide's own words, once it's finished (e.g. it asked you something)
            turn.answer &&
            !working && (
              <div className="rounded-2xl rounded-tl-md bg-slate-900/85 border border-white/10 px-5 py-4 text-slate-100 leading-relaxed whitespace-pre-line">
                <RichText text={turn.answer} />
              </div>
            )
          )}

          {/* Stopping is the player's choice, not a failure: one quiet line, like other AI chats */}
          {turn.stopped ? (
            <p className="flex items-center gap-4 py-1 text-sm text-slate-500">
              <span className="h-px flex-1 bg-white/10" aria-hidden="true" />
              You stopped this answer
              <span className="h-px flex-1 bg-white/10" aria-hidden="true" />
            </p>
          ) : (
            turn.error && (
              <p className="rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm px-4 py-2.5">
                {turn.error}
              </p>
            )
          )}
          {isLatest && turn.error && !running && (
            <RetryButton onClick={onRetry} />
          )}

          {/* Small screens: the picks right here, under the answer */}
          {isLatest && (turn.cards || turn.games.length > 0) && (
            <div className="lg:hidden">
              <GuidePanel
                turn={turn}
                onNotForMe={onNotForMe}
                disabled={running}
              />
            </div>
          )}

          {isLatest && turn.cards && canAsk && (
            <div className="flex flex-wrap gap-2">
              {quickReplies(turn.cards).map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => onAsk(reply)}
                  className="px-3.5 py-1.5 rounded-full text-sm font-semibold text-slate-200 bg-white/5 border border-white/10 hover:border-brand/60 hover:text-white transition"
                >
                  {reply}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuideTurn;
