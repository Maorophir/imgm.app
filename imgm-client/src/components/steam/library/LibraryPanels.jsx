/**
 * What the Steam library page says when there's no list to show, or something to know
 * about the list:
 *   PrivatePanel     Steam shares no games: what to change in Steam, and Try again
 *   LibraryOffPanel  this IMGM server can't read Steam libraries yet (no Steam Web API
 *                    key): Steam is connected, and search is the way to rate meanwhile
 *   NotImported      the first import didn't work: why, and Try again
 *   Importing        the first import is running
 *   EmptyLibrary     a real, empty Steam library
 *   HoursHiddenNote  Steam sent the games without hours: where to switch them back on
 *   StatusText       what the last Refresh or Try again said (the page also announces it)
 *   RowsSkeleton     rows on hairlines while the list loads
 *
 * Noir: no boxes but the one quiet notice, and lime only where one thing is the way on
 * (Steam's privacy settings, or search).
 */
import { Link } from 'react-router-dom';
import { EyeOff, ExternalLink, Gamepad2 } from 'lucide-react';
import { GHOST_BUTTON, GHOST_BUTTON_TALL, PRIMARY_BUTTON, TEXT_LINK } from '../../../lib/ui';

// Steam's own privacy page (signed out, Steam asks them to sign in first, then opens it)
const STEAM_PRIVACY_SETTINGS = 'https://steamcommunity.com/my/edit/settings';

const PANEL = 'border-t border-slate-700 pt-8';
const PANEL_TITLE = 'font-display text-[34px] leading-none tracking-[.005em] text-white text-balance';
const NEW_TAB = <span className="sr-only"> (opens in a new tab)</span>;

export const StatusText = ({ status, className = '' }) =>
  status && !status.quiet ? (
    <p className={`text-sm ${status.error ? 'text-red-300' : 'text-slate-200'} ${className}`}>{status.text}</p>
  ) : null;

export const PrivatePanel = ({ kept, busy, status, onRetry }) => (
  <section aria-labelledby="steam-private-title" className={PANEL}>
    <h2 id="steam-private-title" className={PANEL_TITLE}>Steam isn't sharing your games yet</h2>
    <p className="mt-4 max-w-[560px] text-base leading-[1.6] text-white">
      In Steam's privacy settings, set both <span className="font-semibold">My profile</span> and{' '}
      <span className="font-semibold">Game details</span> to Public. A public profile on its own isn't enough: Game
      details is what shows your games and hours.
    </p>
    <p className="mt-2 text-sm text-slate-400">Steam can take a few minutes to pass the change on. Then try again.</p>
    {/* Fixing it in Steam is the way on, so it's the lime one; trying again is its ghost */}
    <div className="mt-6 flex flex-wrap gap-3">
      <a href={STEAM_PRIVACY_SETTINGS} target="_blank" rel="noopener noreferrer" className={PRIMARY_BUTTON}>
        Open Steam privacy settings
        {/* From sm up: on a 320px phone the words alone just fit */}
        <ExternalLink className="hidden sm:block w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
        {NEW_TAB}
      </a>
      <button type="button" onClick={onRetry} disabled={busy} className={GHOST_BUTTON_TALL}>
        {busy ? 'Checking…' : 'Try again'}
      </button>
    </div>
    <StatusText status={status} className="mt-3" />
    <p className="mt-6 text-sm text-slate-400">
      Want your hours too? On the same page, untick “Always keep my total playtime private”.
    </p>
    {kept && <p className="mt-2 text-sm text-slate-400">Below are your games from the last time Steam shared them.</p>}
  </section>
);

export const LibraryOffPanel = ({ kept }) => (
  <section aria-labelledby="steam-off-title" className={PANEL}>
    <h2 id="steam-off-title" className={PANEL_TITLE}>Steam is connected</h2>
    <p className="mt-4 max-w-[560px] text-base leading-[1.6] text-white">
      Reading Steam libraries isn't switched on at IMGM yet, so your games can't show up here for now. Until it is,
      find the games you played with search: rating one takes about two minutes, and it becomes a card.
    </p>
    <Link to="/search?quest=1" className={`${PRIMARY_BUTTON} mt-6`}>
      Find a game to rate
    </Link>
    {kept && <p className="mt-6 text-sm text-slate-400">Below are the games IMGM brought in from Steam before.</p>}
  </section>
);

export const NotImported = ({ busy, status, onRetry }) => (
  <div className="py-12 text-center border-t border-slate-700">
    <p className="text-xl font-semibold text-white">Your games aren't here yet</p>
    <p className={`mt-1 ${status?.error ? 'text-red-300' : 'text-slate-400'}`}>
      {status && !status.quiet ? status.text : "IMGM couldn't bring them in from Steam."}
    </p>
    {/* A retry is a way back, not the page's main action: a ghost */}
    <button type="button" onClick={onRetry} disabled={busy} className={`${GHOST_BUTTON} mt-6`}>
      {busy ? 'Trying…' : 'Try again'}
    </button>
  </div>
);

export const RowsSkeleton = ({ rows = 5 }) => (
  <div className="flex flex-col" aria-hidden="true">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="h-[121px] border-t border-slate-700 bg-slate-900/50 motion-safe:animate-pulse" />
    ))}
  </div>
);

export const Importing = () => (
  <div className="flex flex-col gap-4">
    <p className="text-slate-200">Bringing in your games from Steam. This can take a few seconds.</p>
    <RowsSkeleton />
  </div>
);

export const EmptyLibrary = () => (
  <div className="py-12 text-center border-t border-slate-700">
    <Gamepad2 className="w-8 h-8 mx-auto mb-3 text-slate-400" strokeWidth={1.8} aria-hidden="true" />
    <p className="text-xl font-semibold text-white">No games on this Steam account yet</p>
    <p className="text-slate-400 mt-1">Free games only count once you've played them. Got something new? Press Refresh.</p>
  </div>
);

export const HoursHiddenNote = () => (
  <p className="flex items-start gap-2.5 rounded-sm border border-slate-600 px-4 py-3 text-sm text-slate-200">
    <EyeOff className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" strokeWidth={1.8} aria-hidden="true" />
    <span>
      Steam is keeping your hours private, so they can't show here or fill in your reviews. To share them, untick
      “Always keep my total playtime private” in your{' '}
      <a href={STEAM_PRIVACY_SETTINGS} target="_blank" rel="noopener noreferrer" className={`font-medium text-white ${TEXT_LINK}`}>
        Steam privacy settings{NEW_TAB}
      </a>
      , then press Refresh.
    </span>
  </p>
);
