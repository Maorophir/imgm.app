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
        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-full font-semibold text-sm shadow-lg shadow-blue-500/25 transition"
      >
        Try again
      </button>
    )}
  </div>
);

export default LoadError;
