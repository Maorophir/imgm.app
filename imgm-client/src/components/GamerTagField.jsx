/**
 * GamerTagField — the gamer tag input with a live "is it available?" check.
 * Used by the Welcome page (first tag) and the Profile page (changing it).
 *
 *   const check = useGamerTagCheck(name, currentTag);  // from hooks/useGamerTagCheck
 *   <GamerTagField value={name} onChange={setName} check={check} />
 */
import { TAG_RULES } from '../hooks/useGamerTagCheck';

// The message under the field: green when the tag is free (the Uncommon ink), red when
// it can't be used, grey while checking
const STATE_COLOR = { ok: 'text-rarity-uncommon', bad: 'text-red-400', checking: 'text-slate-400', current: 'text-slate-400', empty: '' };

const GamerTagField = ({ value, onChange, check, id = 'gamer-tag', autoFocus = false }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-white mb-1.5">Gamer tag</label>
    <input
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={20}
      autoFocus={autoFocus}
      autoComplete="off"
      spellCheck={false}
      placeholder="e.g. Tarnished_Tom"
      aria-describedby={`${id}-status`}
      aria-invalid={check.state === 'bad'}
      // The edge says how the tag is doing: red (can't use it), green (free), or the
      // control grey that turns ivory on focus
      className={`w-full h-12 px-3.5 rounded-sm bg-slate-950 border text-lg font-semibold text-white placeholder:text-slate-400 placeholder:font-normal focus:outline-none transition-colors duration-120 ${
        check.state === 'bad' ? 'border-red-400/70'
          : check.state === 'ok' ? 'border-rarity-uncommon-edge'
            : 'border-slate-500 focus:border-white'
      }`}
    />
    <p id={`${id}-status`} role="status" className={`min-h-5 mt-1.5 text-sm font-medium ${STATE_COLOR[check.state]}`}>
      {check.message}
    </p>
    <p className="text-sm text-slate-400">{TAG_RULES}</p>
  </div>
);

export default GamerTagField;
