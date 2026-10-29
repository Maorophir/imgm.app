/**
 * Account settings on the profile: your email, change your password, connect or
 * disconnect Steam, and delete your account.
 *
 * Accounts that log in with Google have no IMGM password: Google manages it, so there's
 * nothing to change here, and deleting works within a day of logging in (Better Auth's
 * safety rule). Deleting asks why (anonymous) and is permanent.
 *
 * Steam: connecting sends the player to Steam's own sign-in page and back here
 * (?steam=connected, which the Settings page announces). After that they can log in
 * with Steam, and their Steam games show in their Steam library. Connecting needs a
 * confirmed email and a recent login; disconnecting asks first, because it also
 * deletes the library IMGM brought in from Steam (reviews and the Backlog stay).
 *
 * Noir: each part is flat card stock on a hairline, with a quiet sentence-case label;
 * saves are ghost buttons (the settings page has no single main action), and only the
 * final "Delete my account forever" is red.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BadgeCheck, Gamepad2, KeyRound, Mail, TriangleAlert } from 'lucide-react';
import { authClient, signOut, useSession } from '../../lib/authClient';
import { deleteMyAccount, disconnectSteam, getMyAccount, getSteamStatus, startSteamConnect } from '../../lib/api';
import { goToSteam, steamStartError } from '../../lib/steam';
import { steamProfileLink } from '../steam/library/libraryData';
import { passwordProblems } from '../../lib/passwordRules';
import { FIELD, TEXT_BOX, GHOST_BUTTON, TEXT_LINK } from '../../lib/ui';
import PasswordChecklist from '../PasswordChecklist';

const field = FIELD;
// A settings part: card stock on a hairline
const PANEL = 'bg-slate-900 border border-slate-700 rounded-sm p-6 flex flex-col';
const PANEL_LABEL = 'inline-flex items-center gap-2 text-sm text-slate-400';

const REASONS = [
  { value: 'not_using', label: "I don't use it anymore" },
  { value: 'better_site', label: 'I found a better site' },
  { value: 'broken', label: "Something isn't working" },
  { value: 'privacy', label: 'Privacy concerns' },
  { value: 'other', label: 'Something else' },
];

const ChangePassword = () => {
  const [form, setForm] = useState({ current: '', next: '', again: '' });
  const [state, setState] = useState(null); // { ok, text }
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const weak = form.next && passwordProblems(form.next).length > 0; // the checklist says what's missing
  const problem = form.again && form.again !== form.next ? "The new passwords don't match." : null;

  const save = async (e) => {
    e.preventDefault();
    if (weak || problem || !form.current || !form.next) return;
    setBusy(true);
    setState(null);
    const { error } = await authClient.changePassword({ currentPassword: form.current, newPassword: form.next, revokeOtherSessions: true });
    setBusy(false);
    if (error) {
      setState({ ok: false, text: error.code === 'INVALID_PASSWORD' ? 'Your current password is wrong.' : error.message || "Couldn't change it." });
    } else {
      setForm({ current: '', next: '', again: '' });
      setState({ ok: true, text: 'Password changed. Your other devices were logged out.' });
    }
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <input type="password" autoComplete="current-password" placeholder="Current password" value={form.current} onChange={set('current')} className={field} />
      <div>
        <input type="password" autoComplete="new-password" placeholder="New password" value={form.next} onChange={set('next')} className={field} />
        <PasswordChecklist password={form.next} />
      </div>
      <input type="password" autoComplete="new-password" placeholder="New password again" value={form.again} onChange={set('again')} className={field} />
      {(problem || state) && (
        <p role="status" className={`text-sm ${state?.ok && !problem ? 'text-rarity-uncommon' : 'text-red-300'}`}>{problem ?? state.text}</p>
      )}
      <button type="submit" disabled={busy || weak || !!problem || !form.current || !form.next || !form.again} className={`${GHOST_BUTTON} self-start`}>
        {busy ? 'Saving…' : 'Change password'}
      </button>
    </form>
  );
};

const DeleteAccount = ({ hasPassword }) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(null);
  const [details, setDetails] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const remove = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await deleteMyAccount({ reason, details: details.trim() || undefined, ...(hasPassword && { password }) });
      await authClient.signOut().catch(() => {});
      window.location.assign('/?goodbye=1'); // a fresh start, with a goodbye on the home page
      return;
    } catch (err) {
      setError(err.message || "Couldn't delete the account. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="self-start inline-flex items-center h-11 px-4.5 rounded-sm font-medium border border-red-400/50 text-red-300 hover:border-red-300 transition-colors duration-120">
        Delete my account…
      </button>
    );
  }
  return (
    <form onSubmit={remove} className="flex flex-col gap-4 animate-fade-in">
      <p className="text-sm text-red-200 border border-red-400/40 rounded-sm px-4 py-3">
        <TriangleAlert className="inline w-4 h-4 mr-1.5 -mt-0.5" strokeWidth={1.8} aria-hidden="true" />
        This deletes your account, reviews, votes, Backlog and Play Next chats for good. It can't be undone.
      </p>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-white mb-2">Why are you leaving?</legend>
        {REASONS.map((r) => (
          <label key={r.value} className="flex items-center gap-2.5 text-sm text-slate-200 cursor-pointer">
            <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="accent-[var(--color-white)]" />
            {r.label}
          </label>
        ))}
      </fieldset>
      <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={1000} placeholder="Anything we could do better? (optional, anonymous)" className={`${TEXT_BOX} resize-y`} />
      {hasPassword ? (
        <input type="password" autoComplete="current-password" placeholder="Your password, to confirm" value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
      ) : (
        <p className="text-sm text-slate-400">Your account has no IMGM password, so none is needed here. For your safety, this works within a day of logging in.</p>
      )}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy || !reason || (hasPassword && !password)} className="inline-flex items-center h-11 px-4.5 rounded-sm font-semibold bg-red-700 text-white hover:bg-red-600 transition-colors duration-120 disabled:opacity-40">
          {busy ? 'Deleting…' : 'Delete my account forever'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={GHOST_BUTTON}>
          Keep my account
        </button>
      </div>
    </form>
  );
};

// Your email, and whether it's confirmed (with "send it again")
const EmailStatus = () => {
  const { data: session } = useSession();
  const [sent, setSent] = useState(null); // 'sent' | 'error'
  const user = session?.user;
  if (!user) return null;
  const resend = async () => {
    const { error } = await authClient.sendVerificationEmail({ email: user.email, callbackURL: `${window.location.origin}/?verified=1` });
    setSent(error ? 'error' : 'sent');
  };
  return (
    <div className={`${PANEL} gap-2`}>
      <p className={PANEL_LABEL}><Mail className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" /> Email</p>
      <p className="text-white font-semibold break-all">{user.email}</p>
      {user.emailVerified ? (
        <p className="inline-flex items-center gap-1.5 text-sm text-rarity-uncommon"><BadgeCheck className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> Confirmed</p>
      ) : (
        <p className="text-sm text-slate-300">
          Not confirmed yet.{' '}
          {sent === 'sent' ? (
            <span className="text-rarity-uncommon">Sent! Check your inbox.</span>
          ) : (
            <button type="button" onClick={resend} className={`font-medium text-white ${TEXT_LINK}`}>Send the email again</button>
          )}
          {sent === 'error' && <span className="text-red-300"> Couldn't send it, please try later.</span>}
        </p>
      )}
    </div>
  );
};

// Steam's answer to "Connect" comes back to this page
const STEAM_RETURN_TO = '/settings';

// Steam: connected (who as, a link to the Steam profile, and Disconnect, which asks
// first), or not (one sentence and "Connect Steam")
const SteamConnection = ({ connected, onDisconnected }) => {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null); // GET /api/steam/me, while connected
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null); // { code, text }
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false); // just disconnected

  // Who they're connected as, and their Steam profile's address (the panel works without)
  useEffect(() => {
    if (!connected) return undefined;
    const controller = new AbortController();
    getSteamStatus(controller.signal).then(setStatus).catch(() => {});
    return () => controller.abort();
  }, [connected]);

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
    setDone(false);
    try {
      goToSteam(await startSteamConnect(STEAM_RETURN_TO)); // stays busy until the page is gone
    } catch (error) {
      setBusy(false);
      // Logged out meanwhile (the login ran out): the same way back as an old login
      const code = error?.status === 401 ? 'SESSION_NOT_FRESH' : error?.data?.code ?? null;
      // The email is right above, with its "Send the email again"
      const text = code === 'EMAIL_NOT_VERIFIED'
        ? 'Confirm your email first (you can send the email again above), then connect Steam.'
        : steamStartError(code === 'SESSION_NOT_FRESH' ? { data: { code } } : error);
      setProblem({ code, text });
    }
  };

  // Connecting needs a recent login: log out, then log in again and come straight back
  const logInAgain = async () => {
    await signOut().catch(() => {});
    navigate(`/login?redirect=${encodeURIComponent(STEAM_RETURN_TO)}`);
  };

  const disconnect = async () => {
    setBusy(true);
    setProblem(null);
    try {
      await disconnectSteam();
      setConfirming(false);
      setStatus(null);
      setDone(true);
      onDisconnected();
    } catch (error) {
      const code = error?.status === 401 ? 'SESSION_NOT_FRESH' : error?.data?.code ?? null;
      setProblem(code === 'SESSION_NOT_FRESH'
        ? { code, text: 'For your safety, log in again to disconnect Steam.' }
        : { code, text: "Couldn't disconnect Steam. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  const label = <p className={PANEL_LABEL}><Gamepad2 className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" /> Steam</p>;
  const problemLine = problem && (
    <div className="flex flex-col items-start gap-2">
      <p role="alert" className="text-sm text-red-300">{problem.text}</p>
      {problem.code === 'SESSION_NOT_FRESH' && (
        <button type="button" onClick={logInAgain} className={GHOST_BUTTON}>Log in again</button>
      )}
    </div>
  );

  if (!connected) {
    return (
      <div className={`${PANEL} gap-4`}>
        <div>
          {label}
          <p className="text-sm text-slate-300 mt-2">
            Connect Steam to log in with it, and to see every game you own with your hours, ready to rate.{' '}
            {session?.user && !session.user.emailVerified && 'Confirm your email first. '}
            <Link to="/steam" className={`font-medium text-white ${TEXT_LINK}`}>How it works</Link>
          </p>
        </div>
        {done && <p role="status" className="text-sm text-rarity-uncommon">Steam disconnected. Your Steam library is deleted from IMGM.</p>}
        {problemLine}
        <button type="button" onClick={connect} disabled={busy} className={`${GHOST_BUTTON} self-start`}>
          {busy ? 'Opening Steam…' : 'Connect Steam'}
        </button>
      </div>
    );
  }

  const persona = status?.library?.personaName;
  const profileUrl = steamProfileLink(status?.profileUrl); // only ever a steamcommunity.com page
  return (
    <div className={`${PANEL} gap-4`}>
      <div className="flex flex-col gap-2">
        {label}
        {persona && <p className="text-white font-semibold break-all">{persona}</p>}
        <p className="inline-flex items-center gap-1.5 text-sm text-rarity-uncommon"><BadgeCheck className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> Connected</p>
        <p className="text-sm text-slate-300">
          You can log in with Steam, and your games are in your{' '}
          <Link to="/steam/library" className={`font-medium text-white ${TEXT_LINK}`}>Steam library</Link>.
        </p>
        {profileUrl && (
          // A plain link to Steam (never nofollow: Steam's API terms ask for that)
          <a href={profileUrl} target="_blank" rel="noopener noreferrer" className={`self-start inline-flex items-center min-h-11 text-sm font-medium text-white ${TEXT_LINK}`}>
            Your Steam profile<span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
      </div>
      {problemLine}
      {confirming ? (
        <div className="flex flex-col gap-3 animate-fade-in">
          <p className="text-sm text-slate-200 border border-slate-600 rounded-sm px-4 py-3">
            Disconnecting means you can't log in with Steam anymore, and it deletes the Steam library IMGM brought in.
            Your reviews and Backlog stay.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={disconnect} disabled={busy} className={GHOST_BUTTON}>
              {busy ? 'Disconnecting…' : 'Disconnect Steam'}
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={busy} className={GHOST_BUTTON}>
              Keep it connected
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className={`${GHOST_BUTTON} self-start`}>
          Disconnect Steam…
        </button>
      )}
    </div>
  );
};

const AccountSettings = () => {
  const [account, setAccount] = useState(null); // { hasPassword, providers }
  useEffect(() => {
    const controller = new AbortController();
    getMyAccount(controller.signal).then(setAccount).catch(() => {});
    return () => controller.abort();
  }, []);
  if (!account) return null;
  const google = account.providers.includes('google');
  const steam = account.providers.includes('steam');
  return (
    <>
      <EmailStatus />
      <div className={`${PANEL} gap-4`}>
        <div>
          <p className={PANEL_LABEL}><KeyRound className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" /> Password</p>
          {!account.hasPassword && (
            <p className="text-sm text-slate-300 mt-2">You log in with {google ? 'Google' : 'another service'}, so your password is managed there, not on IMGM.</p>
          )}
        </div>
        {account.hasPassword && <ChangePassword />}
      </div>
      {/* /settings#steam (the Steam library page links here) lands on it below the sticky header */}
      <div id="steam" className="scroll-mt-24">
        <SteamConnection
          connected={steam}
          onDisconnected={() => setAccount((a) => ({ ...a, providers: a.providers.filter((p) => p !== 'steam') }))}
        />
      </div>
      <div className="bg-slate-900 border border-red-400/30 rounded-sm p-6 flex flex-col gap-4">
        <p className="text-sm text-red-300">Delete account</p>
        <DeleteAccount hasPassword={account.hasPassword} />
      </div>
    </>
  );
};

export default AccountSettings;
