/**
 * Settings — Route: /settings (the cog on your profile, or the player menu)
 *
 *   gamer tag       change it once every 30 days (changing only its capitals: any time)
 *   password        change it (Google accounts manage theirs at Google)
 *   delete account  for good, with an anonymous reason
 */
import { Hourglass, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useSession } from '../lib/authClient';
import { setUsername } from '../lib/api';
import GamerTagField from '../components/GamerTagField';
import { useGamerTagCheck } from '../hooks/useGamerTagCheck';
import AccountSettings from '../components/profile/AccountSettings';

const COOLDOWN_DAYS = 30;
const formatDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function Settings() {
  const { data: session, isPending, refetch } = useSession();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null); // { ok, text } after saving
  const current = session?.user.displayUsername ?? null;
  const check = useGamerTagCheck(name, current);

  if (isPending) return <div className="min-h-[70vh] animate-pulse" />;
  if (!session) return <Navigate to="/login?redirect=%2Fsettings" replace />;

  // The 30-day wait since the last rename
  const changedAt = session.user.usernameChangedAt ? new Date(session.user.usernameChangedAt) : null;
  const nextChange = changedAt && new Date(changedAt.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  const waiting = Boolean(nextChange && nextChange > new Date());
  const trimmed = name.trim();
  const capitalsOnly = Boolean(current) && trimmed !== current && trimmed.toLowerCase() === current.toLowerCase();
  const canSave = check.ok && !saving && (!waiting || capitalsOnly);

  const save = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setResult(null);
    try {
      await setUsername(trimmed);
      await refetch(); // the menu and the page pick up the new tag
      setName('');
      setResult({ ok: true, text: `Saved! You're now ${trimmed}.` });
    } catch (err) {
      setResult({ ok: false, text: err.message || "Couldn't save your tag. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 flex flex-col gap-6">
      <header>
        <Link to="/profile" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Your profile
        </Link>
        <h1 className="font-display text-5xl uppercase tracking-tight text-white mt-3">Settings<span className="text-brand">.</span></h1>
      </header>
      <form onSubmit={save} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Your gamer tag</p>
          <p className="text-3xl font-black text-white mt-1 break-all">{current}</p>
          <p className="text-sm text-slate-400 mt-1">This is the name everyone sees on your reviews. Your real name stays private.</p>
        </div>

        {waiting && (
          <p className="text-sm text-amber-200 bg-amber-500/10 border border-amber-400/30 rounded-xl px-4 py-2.5">
            <Hourglass className="inline w-4 h-4 mr-1.5 -mt-0.5" aria-hidden="true" />You can pick a new tag on {formatDate(nextChange)}. Until then you can still change its capitals
            (e.g. “{current?.toLowerCase()}” → “{current}”).
          </p>
        )}

        <GamerTagField id="new-gamer-tag" value={name} onChange={setName} check={check} />

        {result && (
          <p role="status" className={`text-sm rounded-xl px-4 py-2.5 border ${result.ok ? 'text-emerald-200 bg-emerald-500/10 border-emerald-400/30' : 'text-red-300 bg-red-500/10 border-red-500/30'}`}>
            {result.text}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSave}
          className="self-start px-6 py-3 rounded-xl font-bold bg-brand hover:brightness-110 text-slate-950 shadow-[0_8px_24px_-8px_var(--color-brand)] transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save new tag'}
        </button>
      </form>

      <AccountSettings />
    </div>
  );
}

export default Settings;
