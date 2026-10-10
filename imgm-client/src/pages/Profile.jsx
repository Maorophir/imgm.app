/**
 * Profile page — Route: /profile
 *
 * Your picture, level (tier, XP bar, the tier ladder), stats and reviews. The cog
 * opens Settings (gamer tag, password, delete account).
 */
import { Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useSession } from '../lib/authClient';
import { getMyProfile } from '../lib/api';
import { MyReviews, ProfilePicture, StatsGrid } from '../components/profile/ProfileParts';
import { useMyProgress } from '../hooks/useMyProgress';
import { TIERS, tierLevels } from '../lib/levels';
import { XpBar } from '../components/LevelBadge';


// Your tier and level, the bar to the next level, and every tier you can reach
const LevelCard = ({ progress }) => (
  <section
    className="rounded-2xl border p-6 flex flex-col gap-4"
    style={{ borderColor: `${progress.tier.color}55`, background: `radial-gradient(120% 120% at 0% 0%, ${progress.tier.color}1f, transparent 60%), rgb(22 24 29 / 0.6)` }}
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

  const current = session?.user.displayUsername ?? null;
  const progress = useMyProgress(Boolean(session));
  const [profile, setProfile] = useState(null); // { player, stats, reviews }
  const [reload, setReload] = useState(0);
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return undefined;
    const controller = new AbortController();
    getMyProfile(controller.signal).then(setProfile).catch(() => {});
    return () => controller.abort();
  }, [userId, reload]);

  // A new or removed picture: refresh the menu (session) and this page
  const pictureChanged = async () => {
    await refetch();
    setReload((n) => n + 1);
  };

  if (isPending) return <div className="min-h-[70vh] animate-pulse" />;
  if (!session) return <Navigate to="/login?redirect=%2Fprofile" replace />;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 flex flex-col gap-8">
      <header className="flex flex-col sm:flex-row sm:items-center gap-6">
        <ProfilePicture
          player={{ id: session.user.id, name: current, avatarUpdatedAt: session.user.avatarUpdatedAt }}
          onChanged={pictureChanged}
        />
        <div className="flex-1">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-brand">Your profile</p>
          <h1 className="text-4xl font-black text-white mt-1 break-all">{current}</h1>
          {profile && (
            <p className="text-sm text-slate-400 mt-1">
              Joined {new Date(profile.player.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
        <Link
          to="/settings"
          aria-label="Settings"
          title="Settings: gamer tag, password, account"
          className="self-start sm:self-center w-11 h-11 grid place-items-center rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 hover:rotate-45 transition"
        >
          <Settings className="w-5 h-5" aria-hidden="true" />
        </Link>
      </header>

      {progress && <LevelCard progress={progress} />}

      {profile && <StatsGrid stats={profile.stats} />}

      {profile && (
        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-white">
            Your <span className="text-brand">reviews</span>
            <span className="text-slate-500 text-lg font-normal ml-2">({profile.stats.reviews})</span>
          </h2>
          <MyReviews key={reload} first={profile.reviews} total={profile.stats.reviews} />
        </section>
      )}

    </div>
  );
}

export default Profile;
