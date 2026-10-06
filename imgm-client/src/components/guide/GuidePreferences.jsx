/**
 * GuidePreferences — the optional "Tune it" questions for Play Next.
 *
 * Every answer is optional: one click picks, a second click un-picks. The values are
 * the keys the AI understands (imgm-ai Preferences); players only see the labels.
 * Text-only chips, the selected ones lit in the brand lime.
 */
import { useState } from "react";
import GamePicker from "../reviewQuest/GamePicker";
import { MAX_CUSTOM, QUESTIONS } from "./preferenceOptions";

const MAX_LOVED = 3;

const Chip = ({ on, disabled, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={on}
    className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition disabled:opacity-35 disabled:cursor-not-allowed ${
      on
        ? "bg-brand/15 border-brand text-white"
        : "border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"
    }`}
  >
    {children}
  </button>
);

// "Something else…": the player types their own answer and presses Enter
const CustomInput = ({ onAdd }) => {
  const [text, setText] = useState("");
  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        e.preventDefault(); // don't send the question
        if (text.trim()) onAdd(text.trim());
        setText("");
      }}
      maxLength={40}
      placeholder="Add your own ↵"
      className="w-40 max-w-full px-3 py-1.5 rounded-full text-sm bg-transparent border border-dashed border-slate-700 text-white placeholder:text-slate-500 outline-none focus:border-brand/60"
    />
  );
};

const GuidePreferences = ({ prefs, onChange }) => {
  const set = (key, value) => onChange({ ...prefs, [key]: value });

  const toggle = ({ key, multi, max }, value) => {
    if (!multi) return set(key, prefs[key] === value ? undefined : value); // click again = un-pick
    const current = prefs[key] ?? [];
    if (current.includes(value))
      return set(
        key,
        current.filter((v) => v !== value),
      );
    if (max && current.length >= max) return;
    set(key, [...current, value]);
  };

  const loved = prefs.loved_games ?? [];

  return (
    <div className="flex flex-col gap-4">
      {QUESTIONS.map((q) => {
        const picked = [prefs[q.key]].flat().filter(Boolean);
        const full = q.multi && q.max && picked.length >= q.max;
        const own = picked.filter((v) => !q.options.some((o) => o.value === v)); // typed by the player
        return (
          <fieldset key={q.key} className="flex flex-col gap-2">
            <legend className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              {q.label}
              {q.multi && (
                <span className="normal-case tracking-normal font-semibold">
                  {" "}
                  · {q.max ? `up to ${q.max}` : "pick any"}
                </span>
              )}
            </legend>
            <div className="flex flex-wrap gap-2">
              {q.options.map((o) => {
                const on = picked.includes(o.value);
                return (
                  <Chip
                    key={o.value}
                    on={on}
                    disabled={full && !on}
                    onClick={() => toggle(q, o.value)}
                  >
                    {o.label}
                    {o.hint && (
                      <span className="ml-1.5 font-normal text-slate-400">
                        {o.hint}
                      </span>
                    )}
                  </Chip>
                );
              })}
              {own.map((value) => (
                <Chip key={value} on onClick={() => toggle(q, value)}>
                  {value} <span className="ml-1 text-slate-400">✕</span>
                </Chip>
              ))}
              {q.custom && own.length < MAX_CUSTOM && (
                <CustomInput
                  onAdd={(value) =>
                    !picked.some(
                      (v) => v.toLowerCase() === value.toLowerCase(),
                    ) && toggle(q, value)
                  }
                />
              )}
            </div>
          </fieldset>
        );
      })}

      {/* Loved recently: up to 3 games, picked with the same search as the Review Quest */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          Loved recently
          <span className="normal-case tracking-normal font-semibold">
            {" "}
            · up to {MAX_LOVED}
          </span>
        </legend>
        {loved.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {loved.map((title) => (
              <Chip
                key={title}
                on
                onClick={() =>
                  set(
                    "loved_games",
                    loved.filter((t) => t !== title),
                  )
                }
              >
                {title} <span className="ml-1 text-slate-400">✕</span>
              </Chip>
            ))}
          </div>
        )}
        {loved.length < MAX_LOVED && (
          <GamePicker
            value={null}
            onChange={(game) =>
              game &&
              !loved.includes(game.title) &&
              set("loved_games", [...loved, game.title])
            }
            placeholder="Search a game you loved…"
          />
        )}
      </fieldset>
    </div>
  );
};

export default GuidePreferences;
