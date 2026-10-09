/**
 * FindMyGame — the "Find my game" quest that starts every new Play Next chat.
 *
 * One question per screen (QUEST_SCREENS), with a progress bar and Back. Every screen
 * needs an answer, but each has a way out ("Surprise me", "Doesn't matter"…), so
 * nobody gets stuck; the loved game and the last words are optional.
 * A screen with one single-choice question moves on as soon as it's tapped.
 * The answers live in the chat's prefs (so "Tune it" can edit them later); the
 * last screen's button sends them as the chat's first question.
 */
import { useRef, useState } from "react";
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
    className={`flex flex-col gap-1 rounded-2xl border p-4 text-left transition-all disabled:opacity-35 disabled:cursor-not-allowed ${
      on
        ? "bg-brand/15 border-brand shadow-[0_0_18px_rgb(184_240_58/0.25)]"
        : "bg-slate-800/50 border-slate-700/60 hover:border-slate-500 hover:bg-slate-800/80"
    }`}
  >
    <span className="font-bold text-white">{option.label}</span>
    {option.hint && (
      <span className="text-sm text-slate-300 leading-snug">{option.hint}</span>
    )}
    {option.examples && (
      <span className="text-xs text-slate-500">{option.examples}</span>
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
        <legend className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
          {question.label}
          {question.multi && (
            <span className="normal-case tracking-normal font-semibold">
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
              className="px-3 py-1.5 rounded-full text-sm font-semibold border bg-brand/15 border-brand text-white"
            >
              {value} <span className="ml-1 text-slate-400">✕</span>
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

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 md:p-8">
      {/* Progress */}
      <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.2em]">
        <span className="text-brand">Find my game</span>
        <span className="text-slate-500 tabular-nums">
          {step + 1} / {QUEST_SCREENS.length}
        </span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full bg-brand transition-all duration-300"
          style={{ width: `${((step + 1) / QUEST_SCREENS.length) * 100}%` }}
        />
      </div>

      {/* The screen — key={step} replays the fade-in on every screen change */}
      <div key={step} className="animate-fade-in mt-7">
        <h2 className="font-display text-3xl md:text-4xl uppercase tracking-tight text-white">
          {screen.title}
        </h2>
        {screen.subtitle && (
          <p className="mt-1 text-slate-400">{screen.subtitle}</p>
        )}

        {step === 0 && lastAnswers && (
          <button
            type="button"
            onClick={applyLast}
            className="mt-3 text-sm font-bold text-brand hover:underline"
          >
            Use my last answers →
          </button>
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
              className="w-full rounded-2xl bg-slate-950/60 border border-slate-700 focus:border-brand/60 px-4 py-3 text-white placeholder:text-slate-500 outline-none transition"
            />
          )}
        </div>
      </div>

      {/* Back · the way out · Next */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => go(step - 1)}
          disabled={step === 0}
          className="text-sm font-semibold text-slate-400 hover:text-white transition disabled:invisible"
        >
          ← Back
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {screen.any && (
            <button
              type="button"
              onClick={passScreen}
              className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-200 border border-slate-700 hover:border-slate-500 hover:text-white transition"
            >
              {screen.any}
            </button>
          )}
          {step < LAST ? (
            <button
              type="button"
              onClick={() => go(step + 1)}
              disabled={!answered}
              className="px-5 py-2.5 rounded-xl font-bold bg-brand hover:brightness-110 text-slate-950 transition disabled:opacity-40"
            >
              {screen.optional && !hasAnswer(prefs, "loved_games")
                ? "Skip"
                : "Next"}{" "}
              →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onReveal(note.trim())}
              disabled={disabled}
              className="px-6 py-3 rounded-xl font-bold bg-brand hover:brightness-110 text-slate-950 shadow-[0_8px_24px_-8px_var(--color-brand)] transition disabled:opacity-40"
            >
              I know just the game for you →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FindMyGame;
