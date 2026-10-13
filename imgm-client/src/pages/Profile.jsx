/**
 * Profile page — Route: /profile
 *
 * Your picture, level (tier, XP bar, the tier ladder), stats and reviews (as their
 * cards). The cog opens Settings (gamer tag, password, delete account). Under your
 * name, "View your public profile" opens the page everyone else sees (/u/<gamer tag>,
 * pages/PlayerProfile.jsx) and Share sends its link.
 */
import { Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useSession } from '../lib/authClient';
import { getMyProfile, getMyReviews } from '../lib/api';
import { LevelCard, PlayerReviews, ProfilePicture, StatsGrid } from '../components/profile/ProfileParts';
import ShareCardButton from '../components/ShareCardButton';
import { useMyProgress } from '../hooks/useMyProgress';
import { SECTION_TITLE, TEXT_LINK } from '../lib/ui';

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
          {/* Your page as everyone else sees it, and its link to send */}
          {current && (
            <div className="flex flex-wrap items-center gap-x-6 mt-1">
              <Link to={`/u/${current}`} className={`inline-flex items-center h-11 text-base font-medium text-white ${TEXT_LINK}`}>
                View your public profile
              </Link>
              <ShareCardButton
                url={`/u/${current}`}
                title={`${current} on IMGM`}
                text="My game reviews and cards on IMGM"
                label="Share profile"
              />
            </div>
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

      {progress && <LevelCard progress={progress} own />}

      {profile && <StatsGrid stats={profile.stats} own />}

      {profile && (
        <section className="flex flex-col gap-8">
          <h2 className={SECTION_TITLE}>
            Your reviews
            <span className="ml-3 font-sans text-lg font-normal tracking-normal tabular-nums text-slate-400">({profile.stats.reviews})</span>
          </h2>
          <PlayerReviews
            key={reload}
            first={profile.reviews}
            total={profile.stats.reviews}
            loadMore={getMyReviews}
            empty={<>No reviews yet. Find a game you've played and start your first <span className="text-white font-medium">Review Quest</span>.</>}
          />
        </section>
      )}

    </div>
  );
}

export default Profile;
