/**
 * The password rules under a new-password field, ticking off live as the player types
 * (lime = met). Shown once they start typing.
 */
import { Check } from 'lucide-react';
import { passwordChecklist } from '../lib/passwordRules';

const PasswordChecklist = ({ password }) => {
  if (!password) return null;
  return (
    <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs" aria-label="Password rules">
      {passwordChecklist(password).map((rule) => (
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
  );
};

export default PasswordChecklist;
