/**
 * FollowBar — a profile's follower and following counts, and (on another player's
 * profile) the Follow / Following button. Only the counts are public: who follows whom
 * is never shown. A logged-out visitor's Follow goes to log in first, then back here.
 *
 * Props:
 *   username  the profile's gamer tag
 *   isYou     your own profile: the counts only
 *   loggedIn  is anyone logged in (Follow asks to log in otherwise)
 *   onChange  called with the new { followers, youFollow } after a follow or unfollow
 */
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, UserPlus } from 'lucide-react';
import { getFollows, setFollowing } from '../../lib/api';
import { GHOST_BUTTON_SM } from '../../lib/ui';

const FollowBar = ({ username, isYou = false, loggedIn = false, onChange }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [counts, setCounts] = useState(null); // { followers, following, youFollow }
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    getFollows(username, controller.signal).then(setCounts).catch(() => {});
    return () => controller.abort();
  }, [username, loggedIn]);

  const toggle = async () => {
    if (!loggedIn) return navigate(`/login?redirect=${encodeURIComponent(pathname)}`);
    setBusy(true);
    setProblem(null);
    try {
      const next = await setFollowing(username, !counts.youFollow);
      setCounts((c) => ({ ...c, ...next }));
      onChange?.(next);
    } catch (error) {
      setProblem(error?.data?.error ?? "Couldn't do that. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!counts) return <div className="h-11" aria-hidden="true" />;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {!isYou && (
        <button type="button" onClick={toggle} disabled={busy} aria-pressed={counts.youFollow} className={GHOST_BUTTON_SM}>
          {counts.youFollow ? (
            <><Check className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> Following</>
          ) : (
            <><UserPlus className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> Follow</>
          )}
        </button>
      )}
      <p className="text-sm text-slate-400 tabular-nums">
        <span className="text-white font-medium">{counts.followers.toLocaleString()}</span> {counts.followers === 1 ? 'follower' : 'followers'}
        <span aria-hidden="true"> · </span>
        <span className="text-white font-medium">{counts.following.toLocaleString()}</span> following
      </p>
      {problem && <p role="alert" className="w-full text-sm text-red-200">{problem}</p>}
    </div>
  );
};

export default FollowBar;
