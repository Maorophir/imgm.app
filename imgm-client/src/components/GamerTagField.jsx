/**
 * GamerTagField — the gamer tag input with a live "is it available?" check.
 * Used by the Welcome page (first tag) and the Profile page (changing it).
 *
 *   const check = useGamerTagCheck(name, currentTag);  // from hooks/useGamerTagCheck
 *   <GamerTagField value={name} onChange={setName} check={check} />
 */
import { TAG_RULES } from '../hooks/useGamerTagCheck';

const STATE_COLOR = { ok: 'text-emerald-400', bad: 'text-red-400', checking: 'text-slate-400', current: 'text-slate-400', empty: '' };

const GamerTagField = ({ value, onChange, check, id = 'gamer-tag', autoFocus = false }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-semibold text-slate-300 mb-1.5">Gamer tag</label>
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
      className={`w-full bg-slate-950/60 border rounded-xl px-4 py-3 text-lg font-bold text-white placeholder:text-slate-600 placeholder:font-normal focus:outline-none focus:ring-1 transition ${
        check.state === 'bad' ? 'border-red-500/60 focus:ring-red-500/40'
          : check.state === 'ok' ? 'border-emerald-500/60 focus:ring-emerald-500/40'
            : 'border-slate-700/60 focus:border-blue-500/50 focus:ring-blue-500/30'
      }`}
    />
    <p id={`${id}-status`} role="status" className={`min-h-5 mt-1.5 text-sm font-semibold ${STATE_COLOR[check.state]}`}>
      {check.message}
    </p>
    <p className="text-xs text-slate-500">{TAG_RULES}</p>
  </div>
);

export default GamerTagField;
