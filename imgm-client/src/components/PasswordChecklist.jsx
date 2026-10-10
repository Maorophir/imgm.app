/**
 * The password rules under a new-password field, ticking off live as the player types
 * (lime = met). Shown once they start typing. "Hard to guess" says why when it's the
 * only one missing (too common, or your email's name).
 */
import { Check } from 'lucide-react';
import { passwordChecklist, passwordProblems } from '../lib/passwordRules';

const PasswordChecklist = ({ password, email }) => {
  if (!password) return null;
  const rules = passwordChecklist(password, email);
  const why = rules.slice(0, -1).every((r) => r.ok) && !rules.at(-1).ok && passwordProblems(password, email)[0];
  return (
    <>
    <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs" aria-label="Password rules">
      {rules.map((rule) => (
        <li key={rule.label} className={`flex items-center gap-1.5 ${rule.ok ? 'text-brand' : 'text-slate-500'}`}>
          {rule.ok ? (
            <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={3} aria-hidden="true" />
          ) : (
            <span className="w-3.5 h-3.5 shrink-0 grid place-items-center" aria-hidden="true">
              <span className="w-1 h-1 rounded-full bg-current" />
            </span>
          )}
          {rule.label}
          <span className="sr-only">{rule.ok ? '(done)' : '(not yet)'}</span>
        </li>
      ))}
    </ul>
    {why && <p className="mt-1.5 text-xs text-amber-300">{why}</p>}
    </>
  );
};

export default PasswordChecklist;
