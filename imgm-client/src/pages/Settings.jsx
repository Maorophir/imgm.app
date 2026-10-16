/**
 * Settings — Route: /settings (reached from the cog on your profile)
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
import { GHOST_BUTTON, TEXT_LINK } from '../lib/ui';

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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 flex flex-col gap-6">
      <header>
        <Link to="/profile" className={`inline-flex items-center gap-1.5 min-h-11 text-sm font-medium text-white ${TEXT_LINK}`}>
          <ArrowLeft className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> Your profile
        </Link>
        <h1 className="font-display text-[54px] md:text-[88px] leading-[.9] uppercase tracking-[.005em] text-white mt-2">Settings</h1>
      </header>
      <form onSubmit={save} className="bg-slate-900 border border-slate-700 rounded-sm p-6 flex flex-col gap-5">
        <div>
          <p className="text-sm text-slate-400">Your gamer tag</p>
          <p className="font-display text-[34px] leading-none tracking-[.005em] text-white mt-1 break-all">{current}</p>
          <p className="text-sm text-slate-400 mt-1">This is the name everyone sees on your reviews. Your real name stays private.</p>
        </div>

        {waiting && (
          <p className="text-sm text-slate-200 border border-slate-600 rounded-sm px-4 py-2.5">
            <Hourglass className="inline w-4 h-4 mr-1.5 -mt-0.5 text-slate-400" strokeWidth={1.8} aria-hidden="true" />You can pick a new tag on {formatDate(nextChange)}. Until then you can still change its capitals
            (e.g. “{current?.toLowerCase()}” → “{current}”).
          </p>
        )}

        <GamerTagField id="new-gamer-tag" value={name} onChange={setName} check={check} />

        {result && (
          <p role="status" className={`text-sm rounded-sm px-4 py-2.5 border ${result.ok ? 'text-rarity-uncommon border-rarity-uncommon-edge' : 'text-red-300 border-red-400/40'}`}>
            {result.text}
          </p>
        )}

        {/* A ghost: the page has several saves, so none of them takes the lime */}
        <button type="submit" disabled={!canSave} className={`${GHOST_BUTTON} self-start`}>
          {saving ? 'Saving…' : 'Save new tag'}
        </button>
      </form>

      <AccountSettings />
    </div>
  );
}

export default Settings;
