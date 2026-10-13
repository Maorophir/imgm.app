/**
 * Player profile page — Route: /u/:username
 *
 * Anyone's public profile, found by gamer tag (any capitalisation): their picture, level
 * (tier, XP bar, the tier ladder), the stats their reviews add up to, and their reviews
 * as cards. Built from the same parts as your own profile (components/profile/
 * ProfileParts), with nothing to edit, and with only what the Privacy page calls public:
 * no email address, real name, join date or Game of the Week votes (the server leaves
 * those out, and the XP here counts reviews only, so it can't give votes away: see
 * loadProfile in profileController.js).
 *
 * On your own public profile a quiet link goes back to /profile to change things.
 * Google may index a player's page once they've reviewed a game; an empty profile, or a
 * gamer tag nobody has, stays out of search (hooks/useSearchIndexing).
 */
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useSession } from '../lib/authClient';
import { getPublicProfile, getPublicReviews } from '../lib/api';
import { getProgress } from '../lib/levels';
import { Avatar } from '../components/reviewCard/RarityCard';
import { LevelCard, PlayerReviews, StatsGrid } from '../components/profile/ProfileParts';
import ShareCardButton from '../components/ShareCardButton';
import LoadError from '../components/LoadError';
import { usePageTitle } from '../hooks/usePageTitle';
import { useSearchIndexing } from '../hooks/useSearchIndexing';
import { PRIMARY_BUTTON, SECTION_TITLE, TEXT_LINK } from '../lib/ui';

// The grey line under the page's headline in Google's results
const describe = ({ player, stats }) => {
  const { level, tier } = getProgress(stats.xp);
  const reviews = `${stats.reviews} game review${stats.reviews === 1 ? '' : 's'}`;
  return `${player.name} is a Level ${level} ${tier.label} on IMGM with ${reviews}. See their cards, scores and badges.`;
};

const PlayerProfile = () => {
  const { username } = useParams();
  // Another player: a fresh page, with nothing of the last player's left on it
  return <PlayerProfileContent key={username} username={username} />;
};

const PlayerProfileContent = ({ username }) => {
  const { pathname } = useLocation();
  const { data: session } = useSession();
  // null = loading | { profile } = loaded | { profile: null } = no such player | { error: true } = failed
  const [data, setData] = useState(null);
  // Bumping this number re-runs the fetch below ("Try again")
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getPublicProfile(username, controller.signal)
      .then((profile) => setData({ profile }))
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setData(err.status === 404 ? { profile: null } : { error: true });
      });
    return () => controller.abort();
  }, [username, attempt]);

  const profile = data?.profile ?? null;
  const name = profile?.player.name;
  usePageTitle(
    name ? `${name}: game reviews` : data?.profile === null ? 'Player not found' : undefined,
    profile ? describe(profile) : undefined
  );
  // Indexed only with reviews to show, at the gamer tag's own capitalisation
  useSearchIndexing(profile ? `/u/${name}` : pathname, profile ? profile.stats.reviews > 0 : false);

  if (!data) return <div className="min-h-[70vh] animate-pulse" />;

  if (data.error) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-24">
        <LoadError
          title="Couldn't load this profile"
          onRetry={() => {
            setData(null); // back to the loading state
            setAttempt((n) => n + 1);
          }}
        />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
        <h1 className="font-display text-[88px] leading-[.9] tracking-[.005em] text-slate-400 mb-3">404</h1>
        <p className="text-xl text-white mb-2">Player not found</p>
        <p className="text-slate-400 mb-8 break-all">No one on IMGM goes by “{username}”.</p>
        <Link to="/" className={PRIMARY_BUTTON}>
          Back to Home
        </Link>
      </div>
    );
  }

  const { player, stats } = profile;
  const isYou = session?.user?.id === player.id;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 flex flex-col gap-8">
      <header className="flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="self-center sm:self-auto">
          <Avatar name={name} user={player} size="w-28 h-28 text-5xl" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-slate-400">{isYou ? 'Your public profile' : 'Player profile'}</p>
          <h1 className="font-display text-[54px] leading-[.95] tracking-[.005em] text-white mt-1 break-all">{name}</h1>
          <div className="flex flex-wrap items-center gap-x-6 mt-1">
            {isYou && (
              <Link to="/profile" className={`inline-flex items-center h-11 text-base font-medium text-white ${TEXT_LINK}`}>
                Edit your profile
              </Link>
            )}
            <ShareCardButton
              url={`/u/${name}`}
              title={`${name} on IMGM`}
              text={`${name}'s game reviews and cards on IMGM`}
              label="Share profile"
            />
          </div>
        </div>
      </header>

      <LevelCard progress={{ ...getProgress(stats.xp), reviews: stats.reviews }} />

      <StatsGrid stats={stats} />

      <section className="flex flex-col gap-8">
        <h2 className={SECTION_TITLE}>
          Reviews
          <span className="ml-3 font-sans text-lg font-normal tracking-normal tabular-nums text-slate-400">({stats.reviews})</span>
        </h2>
        <PlayerReviews
          first={profile.reviews}
          total={stats.reviews}
          loadMore={(offset) => getPublicReviews(username, offset)}
          empty={`${name} hasn't reviewed a game yet.`}
        />
      </section>
    </div>
  );
};

export default PlayerProfile;
