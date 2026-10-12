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
import { SECTION_TITLE } from '../lib/ui';


// Your tier and level, the bar to the next level, and every tier you can reach
const LevelCard = ({ progress }) => (
  // Card stock on a hairline in the tier's ink
  <section
    className="rounded-sm border bg-slate-900 p-6 flex flex-col gap-4"
    style={{ borderColor: `${progress.tier.color}55` }}
  >
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-sm text-slate-400">Your rank</p>
        <p className="font-display text-[34px] leading-none tracking-[.005em] mt-1" style={{ color: progress.tier.color }}>{progress.tier.label}</p>
      </div>
      <p className="text-right">
        <span className="block font-display text-[54px] text-white tabular-nums leading-[.8]">{progress.level}</span>
        <span className="text-sm text-slate-400">Level</span>
      </p>
    </div>

    <div>
      <XpBar progress={progress} />
      <p className="mt-2 flex justify-between gap-3 text-sm text-slate-400 tabular-nums">
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
            className={`rounded-sm border px-1 py-2 ${isCurrent ? 'bg-slate-950' : 'border-slate-700'} ${reached ? '' : 'opacity-40'}`}
            style={isCurrent ? { borderColor: t.color } : undefined}
          >
            <span className="block text-xs font-semibold leading-tight" style={{ color: t.color }}>{t.label}</span>
            <span className="block text-xs tabular-nums text-slate-400 mt-0.5">{tierLevels(t)}</span>
          </li>
        );
      })}
    </ol>
    <p className="text-sm text-slate-400">
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 flex flex-col gap-8">
      <header className="flex flex-col sm:flex-row sm:items-center gap-6">
        <ProfilePicture
          player={{ id: session.user.id, name: current, avatarUpdatedAt: session.user.avatarUpdatedAt }}
          onChanged={pictureChanged}
        />
        <div className="flex-1">
          <p className="text-sm text-slate-400">Your profile</p>
          <h1 className="font-display text-[54px] leading-[.95] tracking-[.005em] text-white mt-1 break-all">{current}</h1>
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
          className="self-start sm:self-center w-11 h-11 grid place-items-center rounded-sm border border-slate-500 text-white hover:border-white transition-colors duration-120"
        >
          <Settings className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
        </Link>
      </header>

      {progress && <LevelCard progress={progress} />}

      {profile && <StatsGrid stats={profile.stats} />}

      {profile && (
        <section className="flex flex-col gap-4">
          <h2 className={SECTION_TITLE}>
            Your reviews
            <span className="ml-3 font-sans text-lg font-normal tracking-normal tabular-nums text-slate-400">({profile.stats.reviews})</span>
          </h2>
          <MyReviews key={reload} first={profile.reviews} total={profile.stats.reviews} />
        </section>
      )}

    </div>
  );
}

export default Profile;
