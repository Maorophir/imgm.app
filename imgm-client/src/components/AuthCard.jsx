/**
 * AuthCard — the centered card used by the password pages (same look as Login), plus
 * the pieces those forms share: the field, the submit button and the error box.
 * Noir: flat card stock on a hairline (no frosted glass, no glow), a Big Shoulders
 * heading, fields whose edge turns ivory on focus, and the lime submit.
 */
import { FIELD, PRIMARY_BUTTON } from '../lib/ui';

// The card on its own (the Login page puts it over its moving covers)
export const AUTH_PANEL = 'w-full max-w-md p-8 bg-slate-900 border border-slate-700 rounded-sm';
export const AUTH_TITLE = 'font-display text-[54px] leading-[.95] tracking-[.005em] text-white mb-3';

const AuthCard = ({ title, subtitle, children }) => (
  <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
    <div className={AUTH_PANEL}>
      <div className="text-center mb-8">
        <h1 className={AUTH_TITLE}>{title}</h1>
        {subtitle && <p className="text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  </div>
);

export const inputClass = `${FIELD}`;

// The form's one action: the lime primary, full width
export const buttonClass = `${PRIMARY_BUTTON} w-full`;

export const ErrorBox = ({ children }) => (
  <div role="alert" className="mb-6 px-4 py-3 border border-red-400/50 text-red-200 rounded-sm text-sm">
    {children}
  </div>
);

export default AuthCard;
