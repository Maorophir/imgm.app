/**
 * AuthCard — the centered card used by the password pages (same look as Login).
 */
const AuthCard = ({ title, subtitle, children }) => (
  <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
    <div className="w-full max-w-md p-8 bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-slate-700/50">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-wide mb-2">{title}</h1>
        {subtitle && <p className="text-slate-400 font-medium">{subtitle}</p>}
      </div>
      {children}
    </div>
  </div>
);

export const inputClass =
  'w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/40 transition placeholder-slate-500';

export const buttonClass =
  'w-full bg-brand hover:brightness-110 text-slate-950 shadow-[0_8px_24px_-8px_var(--color-brand)] font-bold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed';

export const ErrorBox = ({ children }) => (
  <div role="alert" className="mb-6 p-4 bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg text-sm font-medium">
    {children}
  </div>
);

export default AuthCard;
