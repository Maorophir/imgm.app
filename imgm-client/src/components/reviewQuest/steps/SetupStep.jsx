/**
 * ② Your setup — platform, hours, completion, difficulty, solo/co-op.
 * Every group is optional; tapping a selected choice again un-selects it.
 */
import { Chip, ChoiceCard, FieldLabel } from '../Choice';
import { COMPLETION_STATUSES, DIFFICULTIES, PLAY_STYLES } from '../questOptions';

const HOUR_PRESETS = [5, 20, 50, 100];
const MAX_HOURS = 100000;

const SetupStep = ({ answers, update, game }) => {
  // Tap once to pick, tap again to clear
  const toggle = (field, value) => update({ [field]: answers[field] === value ? null : value });

  const setHours = (text) => {
    if (text === '') return update({ hoursPlayed: null });
    const hours = Math.floor(Number(text));
    if (Number.isFinite(hours)) update({ hoursPlayed: Math.min(MAX_HOURS, Math.max(0, hours)) });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Only the platforms this game is actually on (the server checks this too) */}
      {game.platforms?.length > 0 && (
        <div>
          <FieldLabel>Platform</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {game.platforms.map((p) => (
              <Chip key={p} label={p} selected={answers.platform === p} onClick={() => toggle('platform', p)} />
            ))}
          </div>
        </div>
      )}

      <div>
        <FieldLabel>Hours played</FieldLabel>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max={MAX_HOURS}
            value={answers.hoursPlayed ?? ''}
            onChange={(e) => setHours(e.target.value)}
            placeholder="0"
            aria-label="Hours played"
            className="w-24 bg-slate-950/60 border border-slate-700/50 rounded-xl px-3 py-2 text-white font-bold tabular-nums focus:outline-none focus:border-blue-500/50"
          />
          <span className="text-slate-400 text-sm mr-2">hours</span>
          {HOUR_PRESETS.map((h) => (
            <Chip
              key={h}
              label={h === 100 ? '100h+' : `${h}h`}
              selected={answers.hoursPlayed === h}
              onClick={() => toggle('hoursPlayed', h)}
            />
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>Where are you at?</FieldLabel>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {COMPLETION_STATUSES.map((o) => (
            <ChoiceCard key={o.value} {...o} selected={answers.completionStatus === o.value} onClick={() => toggle('completionStatus', o.value)} />
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <FieldLabel>Difficulty</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTIES.map((o) => (
              <Chip key={o.value} {...o} selected={answers.difficulty === o.value} onClick={() => toggle('difficulty', o.value)} />
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>Played</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {PLAY_STYLES.map((o) => (
              <Chip key={o.value} {...o} selected={answers.playStyle === o.value} onClick={() => toggle('playStyle', o.value)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupStep;
