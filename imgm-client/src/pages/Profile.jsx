/**
 * Profile page — Route: /profile
 *
 * Your level (tier, XP bar, the tier ladder) and your gamer tag, which you can
 * change once every 30 days (changing only its capitals is always allowed).
 */
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '../lib/authClient';
import { setUsername } from '../lib/api';
import GamerTagField from '../components/GamerTagField';
import { useGamerTagCheck } from '../hooks/useGamerTagCheck';
import { useMyProgress } from '../hooks/useMyProgress';
import { TIERS, tierLevels } from '../lib/levels';
import { XpBar } from '../components/LevelBadge';

const COOLDOWN_DAYS = 30;
const formatDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// Your tier and level, the bar to the next level, and every tier you can reach
const LevelCard = ({ progress }) => (
  <section
    className="rounded-2xl border p-6 flex flex-col gap-4"
    style={{ borderColor: `${progress.tier.color}55`, background: `radial-gradient(120% 120% at 0% 0%, ${progress.tier.color}1f, transparent 60%), rgb(15 23 42 / 0.6)` }}
  >
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Your rank</p>
        <p className="text-3xl font-black" style={{ color: progress.tier.color }}>{progress.tier.label}</p>
      </div>
      <p className="text-right">
        <span className="block text-4xl font-black text-white tabular-nums leading-none">{progress.level}</span>
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Level</span>
      </p>
    </div>

    <div>
      <XpBar progress={progress} className="h-3" />
      <p className="mt-1.5 flex justify-between text-xs text-slate-400 tabular-nums">
        <span>{progress.xp.toLocaleString()} XP · {progress.reviews} review{progress.reviews === 1 ? '' : 's'}</span>
        <span>{progress.toNext.toLocaleString()} XP to Level {progress.level + 1}</span>
      </p>
    </div>

    {/* The ladder, worst → best, your tier highlighted */}
    <ol className="grid grid-cols-5 gap-1.5 text-center">
      {TIERS.map((t) => {
        const reached = progress.level >= t.minLevel;
        const isCurrent = t === progress.tier;
        return (
          <li
            key={t.key}
            className={`rounded-lg border px-1 py-2 ${isCurrent ? 'bg-slate-950/60' : 'border-slate-800'} ${reached ? '' : 'opacity-40'}`}
            style={isCurrent ? { borderColor: t.color } : undefined}
          >
            <span className="block text-[11px] font-black leading-tight" style={{ color: t.color }}>{t.label}</span>
            <span className="block text-[10px] text-slate-500 mt-0.5">{tierLevels(t)}</span>
          </li>
        );
      })}
    </ol>
    <p className="text-xs text-slate-500">
      Earn XP by reviewing: 10 XP per quest screen you answer, 50 XP for your final words (up to 130 per review).
    </p>
  </section>
);

function Profile() {
  const { data: session, isPending, refetch } = useSession();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null); // { ok, text } after saving

  const current = session?.user.displayUsername ?? null;
  const check = useGamerTagCheck(name, current);
  const progress = useMyProgress(Boolean(session));

  if (isPending) return <div className="min-h-[70vh] animate-pulse" />;
  if (!session) return <Navigate to="/login?redirect=%2Fprofile" replace />;

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
      <h1 className="text-3xl font-black text-white">Your <span className="text-blue-400">profile</span></h1>

      {progress && <LevelCard progress={progress} />}

      <form onSubmit={save} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Your gamer tag</p>
          <p className="text-3xl font-black text-white mt-1 break-all">{current}</p>
          <p className="text-sm text-slate-400 mt-1">This is the name everyone sees on your reviews. Your real name stays private.</p>
        </div>

        {waiting && (
          <p className="text-sm text-amber-200 bg-amber-500/10 border border-amber-400/30 rounded-xl px-4 py-2.5">
            ⏳ You can pick a new tag on {formatDate(nextChange)}. Until then you can still change its capitals
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
          className="self-start px-6 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save new tag'}
        </button>
      </form>

      <p className="text-sm text-slate-500">Your reviews and stats will show up here soon.</p>
    </div>
  );
}

export default Profile;
