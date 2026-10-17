/**
 * GuidePreferences — the "Tune it" panel: the quest's answers, editable during the chat.
 *
 * One click picks, a second click un-picks. The values are the keys the AI
 * understands (imgm-ai Preferences); players only see the labels.
 * Text-only square chips; a picked one is raised card stock with an ivory edge.
 * Also home to two pieces the quest reuses: <CustomInput> and <LovedGames>.
 */
import { useState } from "react";
import { X } from "lucide-react";
import GamePicker from "../reviewQuest/GamePicker";
import {
  MAX_CUSTOM,
  MAX_LOVED,
  QUESTIONS,
  toggleAnswer,
} from "./preferenceOptions";

const Chip = ({ on, disabled, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={on}
    className={`inline-flex items-center min-h-9 px-3 py-1.5 rounded-sm text-sm font-medium border transition-colors duration-120 disabled:opacity-35 disabled:cursor-not-allowed ${
      on
        ? "bg-slate-800 border-white text-white"
        : "border-slate-500 text-white hover:border-white"
    }`}
  >
    {children}
  </button>
);

// "Something else…": the player types their own answer and presses Enter
export const CustomInput = ({ onAdd }) => {
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
      className="w-40 max-w-full min-h-9 px-3 py-1.5 rounded-sm text-base bg-transparent border border-dashed border-slate-500 text-white placeholder:text-slate-400 outline-none focus:border-white transition-colors duration-120"
    />
  );
};

// Loved recently: up to 3 games, picked with the same search as the Review Quest
export const LovedGames = ({ prefs, onChange }) => {
  const loved = prefs.loved_games ?? [];
  const set = (titles) => onChange({ ...prefs, loved_games: titles });
  return (
    <div className="flex flex-col gap-2">
      {loved.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {loved.map((title) => (
            <Chip
              key={title}
              on
              onClick={() => set(loved.filter((t) => t !== title))}
            >
              {title} <X className="ml-1.5 w-3.5 h-3.5 text-slate-400" strokeWidth={1.8} aria-label="remove" />
            </Chip>
          ))}
        </div>
      )}
      {loved.length < MAX_LOVED && (
        <GamePicker
          value={null}
          onChange={(game) =>
            game && !loved.includes(game.title) && set([...loved, game.title])
          }
          placeholder="Search a game you loved…"
        />
      )}
    </div>
  );
};

const GuidePreferences = ({ prefs, onChange }) => (
  <div className="flex flex-col gap-4">
    {QUESTIONS.map((q) => {
      const picked = [prefs[q.key]].flat().filter(Boolean);
      const full = q.multi && q.max && picked.length >= q.max;
      const own = picked.filter((v) => !q.options.some((o) => o.value === v)); // typed by the player
      return (
        <fieldset key={q.key} className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-white mb-2">
            {q.label}
            {q.multi && (
              <span className="font-normal text-slate-400">
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
                  onClick={() => onChange(toggleAnswer(prefs, q, o.value))}
                >
                  {o.label}
                </Chip>
              );
            })}
            {own.map((value) => (
              <Chip
                key={value}
                on
                onClick={() => onChange(toggleAnswer(prefs, q, value))}
              >
                {value} <X className="ml-1.5 w-3.5 h-3.5 text-slate-400" strokeWidth={1.8} aria-label="remove" />
              </Chip>
            ))}
            {q.custom && own.length < MAX_CUSTOM && (
              <CustomInput
                onAdd={(value) =>
                  !picked.some(
                    (v) => v.toLowerCase() === value.toLowerCase(),
                  ) && onChange(toggleAnswer(prefs, q, value))
                }
              />
            )}
          </div>
        </fieldset>
      );
    })}

    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-white mb-2">
        Loved recently
        <span className="font-normal text-slate-400">
          {" "}
          · up to {MAX_LOVED}
        </span>
      </legend>
      <LovedGames prefs={prefs} onChange={onChange} />
    </fieldset>
  </div>
);

export default GuidePreferences;
