/**
 * Account settings on the profile: change your password, and delete your account.
 *
 * Google accounts have no IMGM password: Google manages it, so there's nothing to
 * change here, and deleting works within a day of logging in (Better Auth's safety
 * rule). Deleting asks why (anonymous) and is permanent.
 */
import { useEffect, useState } from 'react';
import { BadgeCheck, KeyRound, Mail, TriangleAlert } from 'lucide-react';
import { authClient, useSession } from '../../lib/authClient';
import { deleteMyAccount, getMyAccount } from '../../lib/api';
import { passwordProblems } from '../../lib/passwordRules';
import PasswordChecklist from '../PasswordChecklist';

const field = 'w-full rounded-xl bg-slate-950 border border-slate-700 focus:border-brand outline-none px-3 py-2.5 text-white placeholder:text-slate-500';

const REASONS = [
  { value: 'not_using', label: "I don't use it anymore" },
  { value: 'better_site', label: 'I found a better site' },
  { value: 'broken', label: "Something isn't working" },
  { value: 'privacy', label: 'Privacy concerns' },
  { value: 'other', label: 'Something else' },
];

const ChangePassword = () => {
  const { data: session } = useSession();
  const email = session?.user?.email ?? '';
  const [form, setForm] = useState({ current: '', next: '', again: '' });
  const [state, setState] = useState(null); // { ok, text }
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const weak = form.next && passwordProblems(form.next, email).length > 0; // the checklist says what's missing
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
        <PasswordChecklist password={form.next} email={email} />
      </div>
      <input type="password" autoComplete="new-password" placeholder="New password again" value={form.again} onChange={set('again')} className={field} />
      {(problem || state) && (
        <p role="status" className={`text-sm ${state?.ok && !problem ? 'text-emerald-300' : 'text-red-300'}`}>{problem ?? state.text}</p>
      )}
      <button type="submit" disabled={busy || weak || !!problem || !form.current || !form.next || !form.again} className="self-start px-5 py-2.5 rounded-xl font-bold bg-brand text-slate-950 hover:brightness-110 transition disabled:opacity-40">
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
      <button type="button" onClick={() => setOpen(true)} className="self-start px-5 py-2.5 rounded-xl font-bold border border-red-500/50 text-red-300 hover:bg-red-500/10 transition">
        Delete my account…
      </button>
    );
  }
  return (
    <form onSubmit={remove} className="flex flex-col gap-4 animate-fade-in">
      <p className="text-sm text-red-200 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
        <TriangleAlert className="inline w-4 h-4 mr-1.5 -mt-0.5" aria-hidden="true" />
        This deletes your account, reviews, votes, Backlog and Play Next chats for good. It can't be undone.
      </p>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-bold text-white mb-2">Why are you leaving?</legend>
        {REASONS.map((r) => (
          <label key={r.value} className="flex items-center gap-2.5 text-sm text-slate-200 cursor-pointer">
            <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="accent-[var(--color-brand)]" />
            {r.label}
          </label>
        ))}
      </fieldset>
      <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={1000} placeholder="Anything we could do better? (optional, anonymous)" className={field} />
      {hasPassword ? (
        <input type="password" autoComplete="current-password" placeholder="Your password, to confirm" value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
      ) : (
        <p className="text-xs text-slate-400">You log in with Google, so no password is needed. For your safety, this works within a day of logging in.</p>
      )}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy || !reason || (hasPassword && !password)} className="px-5 py-2.5 rounded-xl font-bold bg-red-500 text-white hover:bg-red-400 transition disabled:opacity-40">
          {busy ? 'Deleting…' : 'Delete my account forever'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-5 py-2.5 rounded-xl font-bold border border-slate-700 text-slate-200 hover:text-white transition">
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
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col gap-2">
      <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><Mail className="w-3.5 h-3.5" aria-hidden="true" /> Email</p>
      <p className="text-white font-semibold break-all">{user.email}</p>
      {user.emailVerified ? (
        <p className="inline-flex items-center gap-1.5 text-sm text-emerald-300"><BadgeCheck className="w-4 h-4" aria-hidden="true" /> Confirmed</p>
      ) : (
        <p className="text-sm text-amber-200">
          Not confirmed yet.{' '}
          {sent === 'sent' ? (
            <span className="text-emerald-300">Sent! Check your inbox.</span>
          ) : (
            <button type="button" onClick={resend} className="font-bold underline underline-offset-2 hover:text-white">Send the email again</button>
          )}
          {sent === 'error' && <span className="text-red-300"> Couldn't send it, please try later.</span>}
        </p>
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
  return (
    <>
      <EmailStatus />
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><KeyRound className="w-3.5 h-3.5" aria-hidden="true" /> Password</p>
          {!account.hasPassword && (
            <p className="text-sm text-slate-300 mt-2">You log in with {google ? 'Google' : 'another service'}, so your password is managed there, not on IMGM.</p>
          )}
        </div>
        {account.hasPassword && <ChangePassword />}
      </div>
      <div className="bg-slate-900/60 border border-red-500/20 rounded-2xl p-6 flex flex-col gap-4">
        <p className="text-xs font-bold uppercase tracking-wider text-red-300/80">Delete account</p>
        <DeleteAccount hasPassword={account.hasPassword} />
      </div>
    </>
  );
};

export default AccountSettings;
