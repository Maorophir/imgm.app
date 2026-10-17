/**
 * FindMyGame — the "Find my game" quest that starts every new Play Next chat.
 *
 * One question per screen (QUEST_SCREENS), with a progress bar and Back. Every screen
 * needs an answer, but each has a way out ("Surprise me", "Doesn't matter"…), so
 * nobody gets stuck; the loved game and the last words are optional.
 * A screen with one single-choice question moves on as soon as it's tapped.
 * The answers live in the chat's prefs (so "Tune it" can edit them later); the
 * last screen's button sends them as the chat's first question.
 * A player who'd rather just type can skip the questions ("Skip the questions…" on
 * the first screen, "Skip to the end" on the others): straight to the last screen's
 * box, keeping whatever they answered so far.
 * Noir: the screen's title in Big Shoulders, a thin ivory progress line, square answer
 * cards, and lime only on "Find my next game" (the quest's one main action).
 */
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { CustomInput, LovedGames } from "./GuidePreferences";
import {
  MAX_CUSTOM,
  QUEST_SCREENS,
  hasAnswer,
  questionFor,
  toggleAnswer,
} from "./preferenceOptions";

const LAST = QUEST_SCREENS.length - 1;
const AUTO_NEXT_MS = 260; // long enough to see the pick light up

// One big tappable answer: its label, plus (on some questions) a line and example games
const OptionCard = ({ option, on, disabled, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={on}
    className={`flex flex-col gap-1 rounded-sm border p-4 lg:p-5 text-left transition-colors duration-120 disabled:opacity-35 disabled:cursor-not-allowed ${
      on
        ? "bg-slate-800 border-white"
        : "bg-slate-900 border-slate-600 hover:border-white"
    }`}
  >
    <span className="font-semibold text-white lg:text-lg">{option.label}</span>
    {option.hint && (
      <span className="text-sm text-slate-300 leading-snug">{option.hint}</span>
    )}
    {option.examples && (
      <span className="text-sm text-slate-400">{option.examples}</span>
    )}
  </button>
);

const Question = ({ question, prefs, onPick, onChange, showLabel }) => {
  const picked = [prefs[question.key]].flat().filter(Boolean);
  const full = question.multi && question.max && picked.length >= question.max;
  const own = picked.filter(
    (v) => !question.options.some((o) => o.value === v),
  ); // typed by the player
  return (
    <fieldset className="flex flex-col gap-3">
      {showLabel && (
        <legend className="mb-3 text-sm font-medium text-white">
          {question.label}
          {question.multi && (
            <span className="font-normal text-slate-400">
              {" "}
              · pick any
            </span>
          )}
        </legend>
      )}
      <div
        className={`grid gap-3 ${question.options.length > 4 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}
      >
        {question.options.map((option) => {
          const on = picked.includes(option.value);
          return (
            <OptionCard
              key={option.value}
              option={option}
              on={on}
              disabled={full && !on}
              onClick={() => onPick(question, option.value)}
            />
          );
        })}
      </div>
      {question.custom && (
        <div className="flex flex-wrap items-center gap-2">
          {own.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange(toggleAnswer(prefs, question, value))}
              className="inline-flex items-center min-h-9 px-3 py-1.5 rounded-sm text-sm font-medium border bg-slate-800 border-white text-white"
            >
              {value} <X className="ml-1.5 w-3.5 h-3.5 text-slate-400" strokeWidth={1.8} aria-label="remove" />
            </button>
          ))}
          {own.length < MAX_CUSTOM && (
            <CustomInput
              onAdd={(value) =>
                !picked.some((v) => v.toLowerCase() === value.toLowerCase()) &&
                onChange(toggleAnswer(prefs, question, value))
              }
            />
          )}
        </div>
      )}
    </fieldset>
  );
};

const FindMyGame = ({ prefs, onChange, onReveal, lastAnswers, disabled }) => {
  const [step, setStep] = useState(0);
  const [passed, setPassed] = useState(() => new Set()); // screens answered with their way out
  const [note, setNote] = useState("");
  const autoNext = useRef(null);

  const screen = QUEST_SCREENS[step];
  const questions = (screen.keys ?? []).map(questionFor);
  const answered =
    screen.optional ||
    passed.has(screen.id) ||
    (screen.keys ?? []).some((key) => hasAnswer(prefs, key));

  const go = (to) => {
    clearTimeout(autoNext.current);
    setStep(Math.max(0, Math.min(LAST, to)));
  };

  const pick = (question, value) => {
    const next = toggleAnswer(prefs, question, value);
    onChange(next);
    // A one-tap screen: on to the next one (unless that tap un-picked it)
    if (questions.length === 1 && !question.multi && next[question.key]) {
      clearTimeout(autoNext.current);
      autoNext.current = setTimeout(
        () => setStep((s) => Math.min(LAST, s + 1)),
        AUTO_NEXT_MS,
      );
    }
  };

  // "Surprise me" / "Doesn't matter": no preference on this screen
  const passScreen = () => {
    onChange(
      Object.fromEntries(
        Object.entries(prefs).filter(([key]) => !screen.keys.includes(key)),
      ),
    );
    setPassed((s) => new Set(s).add(screen.id));
    go(step + 1);
  };

  const applyLast = () => {
    onChange(lastAnswers);
    setPassed(new Set(QUEST_SCREENS.map((s) => s.id)));
    go(LAST);
  };

  // Nothing picked (they skipped the questions, or passed on every one): "Anything
  // else?" would follow answers they never gave, so the last screen asks plainly (and
  // doesn't call the box optional: it's all there is to go on)
  const nothingPicked = !Object.values(prefs).flat().some(Boolean);

  return (
    <div className="flex-1 flex flex-col rounded-sm border border-slate-700 bg-slate-900 p-5 md:p-8 lg:border-0 lg:bg-transparent lg:p-0">
      {/* Progress */}
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-white">Find my game</span>
        <span className="text-slate-400 tabular-nums">
          {step + 1} / {QUEST_SCREENS.length}
        </span>
      </div>
      <div className="mt-2 h-1 bg-slate-700">
        <div
          className="h-full bg-white transition-[width] duration-300"
          style={{ width: `${((step + 1) / QUEST_SCREENS.length) * 100}%` }}
        />
      </div>

      {/* The screen — key={step} replays the fade-in on every screen change */}
      <div key={step} className="animate-fade-in mt-7 lg:my-auto lg:py-8">
        <h2 className="font-display text-[34px] md:text-[54px] leading-[.95] uppercase tracking-[.005em] text-white">
          {step === LAST && nothingPicked
            ? "What do you want to play?"
            : screen.title}
        </h2>
        {step === LAST && nothingPicked ? (
          <p className="mt-1 text-slate-400">Say it in your own words.</p>
        ) : (
          screen.subtitle && <p className="mt-1 text-slate-400">{screen.subtitle}</p>
        )}

        {step === 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-x-6">
            {lastAnswers && (
              <button
                type="button"
                onClick={applyLast}
                className="inline-flex items-center gap-1.5 h-11 text-sm font-medium text-white underline decoration-1 underline-offset-5 decoration-slate-500/80 hover:decoration-current hover:text-slate-50 transition-colors duration-120"
              >
                Use my last answers <ArrowRight className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
              </button>
            )}
            {/* For players who already know what they're after: no questions, just the box */}
            <button
              type="button"
              onClick={() => go(LAST)}
              className="inline-flex items-center gap-1.5 min-h-11 text-left text-sm font-medium text-white underline decoration-1 underline-offset-5 decoration-slate-500/80 hover:decoration-current hover:text-slate-50 transition-colors duration-120"
            >
              Skip the questions, just tell me what you want <ArrowRight className="shrink-0 w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-6">
          {questions.map((question) => (
            <Question
              key={question.key}
              question={question}
              prefs={prefs}
              onPick={pick}
              onChange={onChange}
              showLabel={questions.length > 1}
            />
          ))}

          {screen.id === "loved" && (
            <LovedGames prefs={prefs} onChange={onChange} />
          )}

          {screen.id === "note" && (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder='e.g. "Something like Hades, but calmer"'
              className="w-full rounded-sm bg-slate-950 border border-slate-500 focus:border-white px-3.5 py-3 text-base text-white placeholder:text-slate-400 outline-none transition-colors duration-120"
            />
          )}
        </div>
      </div>

      {/* Back · the way out · Next */}
      <div className="mt-auto lg:mt-0 pt-8 lg:sticky lg:-bottom-5 lg:z-10 lg:-mx-6 lg:px-6 lg:py-4 lg:bg-slate-950/95 lg:border-t lg:border-white/5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => go(step - 1)}
          disabled={step === 0}
          className="inline-flex items-center gap-1.5 h-11 text-sm font-medium text-slate-400 hover:text-white transition-colors duration-120 disabled:invisible"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> Back
        </button>
        {/* Had enough questions: on to the last screen with what's answered so far (not
            on an optional screen, whose own Next already says "Skip") */}
        {step > 0 && step < LAST && !screen.optional && (
          <button
            type="button"
            onClick={() => go(LAST)}
            className="ml-3 inline-flex items-center h-11 text-sm font-medium text-slate-400 hover:text-white transition-colors duration-120"
          >
            Skip to the end
          </button>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {screen.any && (
            <button
              type="button"
              onClick={passScreen}
              className="inline-flex items-center h-11 px-4 rounded-sm text-sm font-medium text-white border border-slate-500 hover:border-white transition-colors duration-120"
            >
              {screen.any}
            </button>
          )}
          {step < LAST ? (
            <button
              type="button"
              onClick={() => go(step + 1)}
              disabled={!answered}
              // Ivory: the lime waits for "Find my next game" at the end
              className="inline-flex items-center gap-1.5 h-11 px-5 rounded-sm font-semibold bg-white text-slate-950 hover:bg-slate-50 transition-colors duration-120 disabled:opacity-40"
            >
              {screen.optional && !hasAnswer(prefs, "loved_games")
                ? "Skip"
                : "Next"}
              <ArrowRight className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onReveal(note.trim())}
              disabled={disabled}
              className="inline-flex items-center gap-2 h-13 px-7 rounded-sm font-semibold whitespace-nowrap bg-brand hover:brightness-107 text-slate-950 transition-[filter] duration-120 disabled:opacity-40"
            >
              Find my next game <ArrowRight className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FindMyGame;
