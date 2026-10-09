/**
 * GuideTurn — one question and Play Next's answer, as chat messages.
 *
 *   the player's question  a lime-tinted bubble on the right
 *   Play Next              a glowing avatar ("digging…" while it works), its steps,
 *                          then the answer with a strip of the 5 pick covers
 *   quick replies          under the latest answer: one tap asks a common follow-up
 * On small screens the latest turn also shows the full picks (the side panel is hidden).
 */
import { useState } from "react";
import { Link } from "react-router-dom";
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

// The 5 picks as covers, Best Pick first with its gold ring: each one opens the game
const PicksStrip = ({ games }) => {
  const picks = [...games].sort((a, b) => b.best_pick - a.best_pick);
  return (
    <div className="mt-4 flex gap-2.5 overflow-x-auto pb-1">
      {picks.map((pick) => (
        <Link
          key={pick.game_id}
          to={`/game/${pick.game_id}`}
          title={pick.title}
          className={`group relative w-16 sm:w-20 shrink-0 rounded-lg overflow-hidden transition hover:-translate-y-0.5 ${
            pick.best_pick
              ? "ring-2 ring-amber-300 shadow-[0_0_18px_-4px_#fbbf24]"
              : "ring-1 ring-white/10 hover:ring-brand/70"
          }`}
        >
          {pick.cover ? (
            <img
              src={pick.cover}
              alt={pick.title}
              loading="lazy"
              className="w-full aspect-[3/4] object-cover"
            />
          ) : (
            <div className="w-full aspect-[3/4] bg-slate-800" />
          )}
          {pick.best_pick && (
            <span className="absolute top-1 left-1 rounded px-1 text-[9px] font-black text-slate-900 bg-amber-300">
              ★
            </span>
          )}
        </Link>
      ))}
    </div>
  );
};

// One tap = one common follow-up
const quickReplies = (cards) => {
  const best = cards.games.find((g) => g.best_pick);
  return [
    best && `More like ${best.title}`,
    "Shorter ones please",
    "Something completely different",
  ].filter(Boolean);
};

const GuideTurn = ({ turn, isLatest, running, onNotForMe, onAsk, canAsk }) => {
  const [showFull, setShowFull] = useState(false);
  const working = turn.status === "running";

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* The player's question */}
      <p className="self-end max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-brand/25 to-brand/10 border border-brand/40 text-white px-4 py-2.5 font-semibold shadow-[0_8px_28px_-14px_var(--color-brand)]">
        {turn.question}
      </p>

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

              {/* Large screens: the full cards are in the side panel; the latest small-screen turn shows them below */}
              <div className={isLatest ? "hidden lg:block" : ""}>
                <PicksStrip games={turn.cards.games} />
              </div>

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

          {turn.error && (
            <p className="rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm px-4 py-2.5">
              {turn.error}
            </p>
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
