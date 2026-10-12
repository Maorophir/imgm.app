/**
 * ⑧ Best & worst moment — one line each, with a spoiler switch.
 */
import { Sparkles, ThumbsDown, TriangleAlert } from 'lucide-react';
import ArtIcon from '../../ArtIcon';
import SwitchTrack from '../../SwitchTrack';
import { TEXT_BOX } from '../../../lib/ui';

const MAX_LENGTH = 280;

const MomentField = ({ label, art, placeholder, value, onChange }) => (
  <div>
    <p className="flex items-center gap-1.5 text-sm font-medium text-white mb-2">
      <ArtIcon icon={art} className="w-4 h-4 text-slate-400" />{label}
    </p>
    <textarea
      rows={2}
      maxLength={MAX_LENGTH}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={label}
      className={`${TEXT_BOX} resize-none`}
    />
    <p className="text-right text-xs text-slate-400 tabular-nums">{value.length}/{MAX_LENGTH}</p>
  </div>
);

const MomentsStep = ({ answers, update }) => {
  const spoilers = answers.hasSpoilers;

  return (
    <div className="flex flex-col gap-4">
      <MomentField label="Best moment" art={Sparkles} placeholder="The moment that made you go “wow”…" value={answers.bestMoment} onChange={(bestMoment) => update({ bestMoment })} />
      <MomentField label="Worst moment" art={ThumbsDown} placeholder="The part you'd rather forget…" value={answers.worstMoment} onChange={(worstMoment) => update({ worstMoment })} />

      {/* On/off switch — a button with role="switch" */}
      <button
        type="button"
        role="switch"
        aria-checked={spoilers}
        onClick={() => update({ hasSpoilers: !spoilers })}
        className="flex items-center gap-3 min-h-11 text-left self-start"
      >
        <SwitchTrack on={spoilers} />
        <span className="text-sm">
          <span className="inline-flex items-center gap-1.5 font-medium text-white"><TriangleAlert className="w-4 h-4 text-slate-400" aria-hidden="true" /> Contains spoilers</span>
          <span className="block text-xs text-slate-400">Readers will have to tap to reveal your moments</span>
        </span>
      </button>
    </div>
  );
};

export default MomentsStep;
