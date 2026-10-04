/**
 * ② Your setup — platform, hours, completion, solo/co-op.
 * Every group is optional; tapping a selected choice again un-selects it.
 */
import { Chip, ChoiceCard, FieldLabel } from '../Choice';
import { COMPLETION_STATUSES, PLAY_STYLES } from '../questOptions';

const HOUR_PRESETS = [5, 20, 50, 100];
const MAX_HOURS = 100000;

// The −/+ buttons next to the hours box, styled like the rest of the quest
const StepperButton = ({ label, onClick, disabled, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    className="w-10 h-10 rounded-xl border border-slate-700/60 bg-slate-800/60 text-slate-200 text-lg font-bold
      hover:border-brand/70 hover:text-white hover:bg-brand/10 transition
      disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-slate-700/60 disabled:hover:bg-slate-800/60"
  >
    {children}
  </button>
);

const SetupStep = ({ answers, update, game }) => {
  // Tap once to pick, tap again to clear
  const toggle = (field, value) => update({ [field]: answers[field] === value ? null : value });

  const pickPlatform = (platform) => {
    const next = answers.platform === platform ? null : platform;
    // "PC requirements" only applies to PC — drop that answer if another platform is picked
    update(next && next !== 'PC' ? { platform: next, pcRequirements: null } : { platform: next });
  };

  const setHours = (value) => {
    if (value === '' || value == null) return update({ hoursPlayed: null });
    const hours = Math.floor(Number(value));
    if (Number.isFinite(hours)) update({ hoursPlayed: Math.min(MAX_HOURS, Math.max(0, hours)) });
  };
  const hours = answers.hoursPlayed;

  return (
    <div className="flex flex-col gap-6">
      {/* Only the platforms this game is actually on (the server checks this too) */}
      {game.platforms?.length > 0 && (
        <div>
          <FieldLabel>Platform</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {game.platforms.map((p) => (
              <Chip key={p} label={p} selected={answers.platform === p} onClick={() => pickPlatform(p)} />
            ))}
          </div>
        </div>
      )}

      <div>
        <FieldLabel>Hours played</FieldLabel>
        <div className="flex flex-wrap items-center gap-2">
          <StepperButton label="One hour less" onClick={() => setHours((hours ?? 0) - 1)} disabled={!hours}>−</StepperButton>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max={MAX_HOURS}
            value={hours ?? ''}
            onChange={(e) => setHours(e.target.value)}
            placeholder="0"
            aria-label="Hours played"
            // Hide the browser's built-in arrows — we have our own −/+ buttons
            className="w-20 h-10 text-center bg-slate-950/60 border border-slate-700/50 rounded-xl text-white font-bold tabular-nums
              focus:outline-none focus:border-brand/60
              [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <StepperButton label="One hour more" onClick={() => setHours((hours ?? 0) + 1)} disabled={hours >= MAX_HOURS}>+</StepperButton>
          <span className="text-slate-400 text-sm mx-1">hours</span>
          {HOUR_PRESETS.map((h) => (
            <Chip
              key={h}
              label={h === 100 ? '100h+' : `${h}h`}
              selected={hours === h}
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

      <div>
        <FieldLabel>Played</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {PLAY_STYLES.map((o) => (
            <Chip key={o.value} {...o} selected={answers.playStyle === o.value} onClick={() => toggle('playStyle', o.value)} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SetupStep;
