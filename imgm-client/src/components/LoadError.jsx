/**
 * LoadError — Shown when data couldn't be fetched from the server.
 * Used by pages that load data (Home, GameDetails…) so the message looks the same everywhere.
 * Noir: no box, and "Try again" is a ghost button: a retry is a way back, not the page's
 * main action, so it never takes the lime.
 */
import { GHOST_BUTTON } from '../lib/ui';

const LoadError = ({ title = "Couldn't load this right now", onRetry }) => (
  <div className="text-center py-16 px-4">
    <p className="text-lg font-medium text-white mb-1">{title}</p>
    <p className="text-slate-400 text-sm mb-6">Please check your connection and try again.</p>
    {onRetry && (
      <button type="button" onClick={onRetry} className={GHOST_BUTTON}>
        Try again
      </button>
    )}
  </div>
);

export default LoadError;
