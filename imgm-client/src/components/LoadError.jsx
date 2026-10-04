/**
 * LoadError — Shown when data couldn't be fetched from the server.
 * Used by pages that load data (Home, GameDetails) so the message looks the same everywhere.
 */
const LoadError = ({ title = "Couldn't load this right now", onRetry }) => (
  <div className="text-center py-16 px-4 bg-slate-900/30 rounded-2xl border border-slate-800/50">
    <p className="text-slate-300 text-lg mb-2">{title}</p>
    <p className="text-slate-500 text-sm mb-6">Please check your connection and try again.</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-6 py-2.5 bg-brand hover:brightness-110 text-slate-950 shadow-[0_8px_24px_-8px_var(--color-brand)] rounded-full font-semibold text-sm transition"
      >
        Try again
      </button>
    )}
  </div>
);

export default LoadError;
