/**
 * ⑧ Best & worst moment — one line each, with a spoiler switch.
 */
import { Sparkles, ThumbsDown, TriangleAlert } from 'lucide-react';
import ArtIcon from '../../ArtIcon';
const MAX_LENGTH = 280;

const MomentField = ({ label, art, placeholder, value, onChange }) => (
  <div>
    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
      <ArtIcon icon={art} className="w-3.5 h-3.5 mr-1 -mt-0.5" />{label}
    </p>
    <textarea
      rows={2}
      maxLength={MAX_LENGTH}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={label}
      className="w-full bg-slate-950/60 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand/60 resize-none"
    />
    <p className="text-right text-xs text-slate-500 tabular-nums">{value.length}/{MAX_LENGTH}</p>
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
        className="flex items-center gap-3 text-left self-start"
      >
        <span className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${spoilers ? 'bg-amber-500' : 'bg-slate-700'}`}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${spoilers ? 'translate-x-5' : ''}`} />
        </span>
        <span className="text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-200"><TriangleAlert className="w-4 h-4 text-amber-400" aria-hidden="true" /> Contains spoilers</span>
          <span className="block text-xs text-slate-500">Readers will have to tap to reveal your moments</span>
        </span>
      </button>
    </div>
  );
};

export default MomentsStep;
