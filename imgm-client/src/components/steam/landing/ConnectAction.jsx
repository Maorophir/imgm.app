/**
 * ConnectAction — the Steam page's way in: its one lime button, and the line under it.
 * What it offers depends on who is looking:
 *
 *   loading        a quiet placeholder the size of the button (no jump when it's known)
 *   guest          "Log in to connect Steam" (back here after), and a link to sign up:
 *                  Steam can't make an IMGM account (it shares no email), so a visitor
 *                  needs one first
 *   ready          signed in, Steam not connected: "Connect Steam" sends the player to
 *                  Steam's own sign-in page, and Steam's answer lands on their library
 *   connected      "Open your library", who they're connected as, and where to manage it
 *
 * Connecting can be refused before Steam is ever reached, and then it says why, in the
 * site's words (lib/steam.js): an old login asks them to log in again first (a ghost
 * "Log in again": a stolen login can't quietly attach someone else's Steam), an
 * unconfirmed email points to Settings, which can send the email again.
 *
 * Props:
 *   state      'loading' | 'guest' | 'ready' | 'connected'
 *   status     the player's Steam connection (GET /api/steam/me), when signed in
 *   onRefresh  asks the page to load the connection again (it was already connected)
 *   className  placement, e.g. "mt-8"
 */
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BadgeCheck } from 'lucide-react';
import { signOut } from '../../../lib/authClient';
import { startSteamConnect } from '../../../lib/api';
import { goToSteam, steamStartError } from '../../../lib/steam';
import { GHOST_BUTTON_SM, PRIMARY_BUTTON, TEXT_LINK } from '../../../lib/ui';

// Steam's answer to "Connect" lands on the player's library (the server allows only a
// few addresses here)
const RETURN_TO = '/steam/library';

// A quiet link beside or under the lime button, with a full-size tap target
const SIDE_LINK = `inline-flex items-center min-h-11 font-medium text-white ${TEXT_LINK}`;

const ConnectAction = ({ state, status, onRefresh, className = '' }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null); // { code, text } when Connect was refused

  // Back from Steam's page with the browser's Back button: the browser may show this
  // page exactly as it was left ("Opening Steam…"), so the button works again
  useEffect(() => {
    const reset = (event) => event.persisted && setBusy(false);
    window.addEventListener('pageshow', reset);
    return () => window.removeEventListener('pageshow', reset);
  }, []);

  const connect = async () => {
    setBusy(true);
    setProblem(null);
    try {
      // Leaves for Steam: the button stays busy until the page is gone
      goToSteam(await startSteamConnect(RETURN_TO));
    } catch (error) {
      setBusy(false);
      // Logged out meanwhile (the login ran out): the same way back as an old login
      const code = error?.status === 401 ? 'SESSION_NOT_FRESH' : error?.data?.code ?? null;
      setProblem({ code, text: steamStartError(code === 'SESSION_NOT_FRESH' ? { data: { code } } : error) });
      // Connected in another tab meanwhile: show the connection instead
      if (code === 'STEAM_ALREADY_CONNECTED') onRefresh?.();
    }
  };

  // Connecting needs a recent login: log out, then log in again and come straight back
  const logInAgain = async () => {
    await signOut().catch(() => {});
    navigate(`/login?redirect=${encodeURIComponent(pathname)}`);
  };

  if (state === 'loading') {
    return (
      <div aria-hidden="true" className={className}>
        <div className="h-13 w-full sm:w-64 rounded-sm bg-slate-900/80 motion-safe:animate-pulse" />
        <div className="mt-3 h-5" />
      </div>
    );
  }

  if (state === 'guest') {
    return (
      <div className={className}>
        <div className="flex flex-col items-stretch sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-7 sm:gap-y-3">
          {/* Logged out, this is the page's main action: the one lime button */}
          <Link to="/login?redirect=%2Fsteam" className={PRIMARY_BUTTON}>
            Log in to connect Steam
          </Link>
          <p className="self-center text-base text-slate-300">
            New here?{' '}
            <Link to="/login?mode=signup&redirect=%2Fsteam" className={SIDE_LINK}>
              Sign up
            </Link>
          </p>
        </div>
        <p className="mt-3 text-sm text-slate-400">Steam connects to a free IMGM account, so you need one first.</p>
      </div>
    );
  }

  if (state === 'connected') {
    const persona = status?.library?.personaName;
    const games = status?.library?.gameCount ?? 0;
    return (
      <div className={className}>
        <Link to="/steam/library" className={`${PRIMARY_BUTTON} w-full sm:w-auto`}>
          Open your library
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-x-5 text-sm text-slate-300">
          <p className="inline-flex items-center gap-1.5 min-w-0">
            <BadgeCheck className="w-4 h-4 shrink-0 text-rarity-uncommon" strokeWidth={1.8} aria-hidden="true" />
            {persona ? (
              <span className="min-w-0 truncate">
                Connected as <span className="font-semibold text-white">{persona}</span>
              </span>
            ) : (
              'Steam connected'
            )}
            {games > 0 && <span className="shrink-0 text-slate-400 tabular-nums">· {games.toLocaleString('en-US')} {games === 1 ? 'game' : 'games'}</span>}
          </p>
          <Link to="/settings#steam" className={SIDE_LINK}>
            Manage in Settings
          </Link>
        </div>
      </div>
    );
  }

  // Signed in, Steam not connected yet
  return (
    <div className={className}>
      <button type="button" onClick={connect} disabled={busy} className={`${PRIMARY_BUTTON} w-full sm:w-auto`}>
        {busy ? 'Opening Steam…' : 'Connect Steam'}
      </button>
      <p className="mt-3 text-sm text-slate-400">You'll log in on Steam's own page, so IMGM never sees your password.</p>
      {/* No Steam Web API key on this server: logging in with Steam still works */}
      {status?.libraryEnabled === false && (
        <p className="mt-2 text-sm text-slate-300">Bringing in your games is paused for now. You can still connect Steam and log in with it.</p>
      )}

      {problem && (
        <div role="alert" className="mt-5 max-w-[560px] flex flex-col items-start gap-3 rounded-sm border border-red-400/50 bg-slate-950/85 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-red-200">{problem.text}</p>
          {problem.code === 'SESSION_NOT_FRESH' && (
            <button type="button" onClick={logInAgain} className={`shrink-0 ${GHOST_BUTTON_SM}`}>
              Log in again
            </button>
          )}
          {problem.code === 'EMAIL_NOT_VERIFIED' && (
            <Link to="/settings" className={`shrink-0 ${GHOST_BUTTON_SM}`}>
              Open Settings
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectAction;
