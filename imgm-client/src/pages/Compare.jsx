/**
 * Compare page — Route: /compare/:username
 *
 * A player's compare link, sent to a friend: "How close is your taste to <tag>'s?". It
 * shows five of the player's best-known rated games (the ones most IMGM players rated
 * too, so the likeliest a friend played). The friend rates each with one tap on 1–10,
 * saved as a quick review the same way as Discover's "Played it?" (a game they already
 * rated counts as it is), or skips it with "Haven't played it", which brings the next
 * game. The player's own scores stay hidden until the match shows them.
 *
 * The match (components/profile/TasteMatch's MatchResult) needs 3 games both rated. It
 * shows once every game on screen is rated or skipped, or straight away with "See your
 * match now". Logged out, the games show without the scores, and signing up or logging
 * in comes back here (?redirect). Opened by the player themself, it offers their link
 * to copy. Not for search engines (noindex): it's an invite, not content.
 */
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useSession } from '../lib/authClient';
import { getCompareGames, getMyReview, getTasteMatch, saveReview } from '../lib/api';
import { getRarity } from '../components/reviewQuest/questOptions';
import { Avatar } from '../components/reviewCard/RarityCard';
import { MatchResult } from '../components/profile/TasteMatch';
import FollowBar from '../components/profile/FollowBar';
import CompareInvite from '../components/profile/CompareInvite';
import LoadError from '../components/LoadError';
import { usePageTitle } from '../hooks/usePageTitle';
import { useSearchIndexing } from '../hooks/useSearchIndexing';
import { PRIMARY_BUTTON, TEXT_BUTTON_SM, TEXT_LINK } from '../lib/ui';

const SHOWN = 5; // games on screen at once

const Compare = () => {
  const { username } = useParams();
  // Another player's link: a fresh page, with nothing of the last one's left on it
  return <CompareContent key={username} username={username} />;
};

// One tap on a score, like Discover's "Played it?"
const ScorePicker = ({ title, busy, picked, onPick }) => (
  <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Your score for ${title}`}>
    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
      const tier = getRarity(n);
      return (
        <button
          key={n}
          type="button"
          onClick={() => onPick(n)}
          disabled={busy}
          className={`grid place-items-center w-10 h-10 rounded-sm border text-sm font-semibold tabular-nums transition-colors duration-120 hover:border-(--ink) hover:text-(--ink) disabled:opacity-50 ${
            picked === n ? 'border-(--ink) text-(--ink)' : 'border-slate-500 text-white'
          }`}
          style={{ '--ink': tier.color }}
          aria-label={`${n} out of 10, ${tier.label}`}
        >
          {n}
        </button>
      );
    })}
  </div>
);

const CompareContent = ({ username }) => {
  const { pathname } = useLocation();
  const { data: session, isPending } = useSession();
  const userId = session?.user?.id ?? null;
  // null = loading | { page } = loaded | { page: null } = no such player | { error: true }
  const [data, setData] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [yours, setYours] = useState({}); // gameId → your score
  const [skipped, setSkipped] = useState(() => new Set());
  const [saving, setSaving] = useState(null); // { gameId, score } being saved
  const [problem, setProblem] = useState(null);
  const [taste, setTaste] = useState(null); // the taste endpoint's answer
  const [reveal, setReveal] = useState(false); // "See your match now"

  useEffect(() => {
    if (isPending) return undefined;
    const controller = new AbortController();
    getCompareGames(username, controller.signal)
      .then((page) => {
        setData({ page });
        setYours(page.yours ?? {});
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setData(error.status === 404 ? { page: null } : { error: true });
      });
    return () => controller.abort();
  }, [username, userId, isPending, attempt]);

  const page = data?.page ?? null;
  const name = page?.player.name ?? username;
  const ratedCount = Object.keys(yours).length;
  const canMatch = Boolean(userId && page && !page.isYou);

  // The match, again after each new score (it counts every game you both rated, not only these)
  useEffect(() => {
    if (!canMatch) return undefined;
    const controller = new AbortController();
    getTasteMatch(username, controller.signal).then(setTaste).catch(() => {});
    return () => controller.abort();
  }, [username, canMatch, ratedCount]);

  usePageTitle(
    page ? `Compare your taste with ${name}` : data?.page === null ? 'Player not found' : undefined,
    page ? `How close is your taste in games to ${name}'s? Rate a few of their games on IMGM and see.` : undefined
  );
  useSearchIndexing(pathname, false);

  if (!data) return <div className="min-h-[70vh] animate-pulse" />;

  if (data.error) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-24">
        <LoadError title="Couldn't load this page" onRetry={() => { setData(null); setAttempt((n) => n + 1); }} />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
        <h1 className="font-display text-[88px] leading-[.9] tracking-[.005em] text-slate-400 mb-3">404</h1>
        <p className="text-xl text-white mb-2">Player not found</p>
        <p className="text-slate-400 mb-8 break-all">No one on IMGM goes by “{username}”.</p>
        <Link to="/" className={PRIMARY_BUTTON}>Back to Home</Link>
      </div>
    );
  }

  const visible = page.games.filter((game) => !skipped.has(game.id)).slice(0, SHOWN);
  const done = visible.every((game) => yours[game.id] != null);
  const match = taste?.match ? taste : null;
  const showMatch = match && (done || reveal);
  const back = encodeURIComponent(pathname);

  const rate = async (game, score) => {
    setSaving({ gameId: game.id, score });
    setProblem(null);
    try {
      // A review written since the page loaded is never replaced: checked again here
      const existing = await getMyReview(game.id).catch(() => null);
      if (!existing?.rating) await saveReview({ gameId: game.id, rating: score });
      setYours((current) => ({ ...current, [game.id]: existing?.rating ?? score }));
    } catch (error) {
      setProblem(error?.data?.error ?? "Couldn't save your score. Please try again.");
    } finally {
      setSaving(null);
    }
  };
  const skip = (game) => setSkipped((current) => new Set(current).add(game.id));

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 flex flex-col gap-8">
      <header className="flex items-center gap-5">
        <Link to={`/u/${encodeURIComponent(name)}`} aria-label={`${name}'s profile`} className="shrink-0">
          <Avatar name={name} user={page.player} size="w-16 h-16 sm:w-20 sm:h-20 text-3xl" />
        </Link>
        <div className="min-w-0">
          <p className="text-sm text-slate-400">Taste match</p>
          <h1 className="font-display text-[38px] sm:text-[54px] leading-[.95] tracking-[.005em] text-white mt-1 break-words">
            {page.isYou ? 'Your compare link' : `How close is your taste to ${name}'s?`}
          </h1>
        </div>
      </header>

      {page.isYou ? (
        <>
          <p className="text-base text-slate-300">
            This is the page your friends see. They rate a few of your games with one tap each, then see how much you agree.
          </p>
          <CompareInvite name={name} hasReviews={page.games.length > 0} />
        </>
      ) : page.games.length === 0 ? (
        <p className="text-base text-slate-300">
          {name} hasn't rated any games yet, so there's nothing to compare.{' '}
          <Link to={`/u/${encodeURIComponent(name)}`} className={`font-medium text-white ${TEXT_LINK}`}>See their profile</Link>
        </p>
      ) : (
        <>
          <p className="text-base text-slate-300">
            {userId
              ? `Rate the ones you've played, one tap each. ${name}'s scores show after.`
              : `${name} rated these games. Rate the ones you've played and see how much you agree.`}
          </p>

          <ol className="flex flex-col border-t border-slate-700">
            {visible.map((game) => {
              const mine = yours[game.id];
              const year = game.releaseDate ? new Date(game.releaseDate).getUTCFullYear() : null;
              return (
                <li key={game.id} className="flex gap-4 py-4 border-b border-slate-700 animate-fade-in">
                  {game.coverUrl ? (
                    <img src={game.coverUrl} alt="" loading="lazy" className="w-14 sm:w-16 aspect-[3/4] object-cover rounded-sm bg-slate-900 shrink-0" />
                  ) : (
                    <div aria-hidden="true" className="w-14 sm:w-16 aspect-[3/4] rounded-sm bg-slate-900 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <div>
                      <Link to={`/game/${game.id}`} className="font-medium text-white hover:underline underline-offset-4">{game.title}</Link>
                      <p className="text-sm text-slate-400">{[game.genres?.[0], year].filter(Boolean).join(' · ')}</p>
                    </div>
                    {mine != null ? (
                      <p className="text-sm text-slate-300">
                        Your score <span className="font-display text-2xl align-middle ml-1" style={{ color: getRarity(mine).color }}>{mine}</span>
                      </p>
                    ) : userId ? (
                      <div className="flex flex-col gap-1">
                        <ScorePicker
                          title={game.title}
                          busy={saving !== null}
                          picked={saving?.gameId === game.id ? saving.score : null}
                          onPick={(n) => rate(game, n)}
                        />
                        <button type="button" onClick={() => skip(game)} disabled={saving !== null} className={`${TEXT_BUTTON_SM} self-start text-slate-300`}>
                          Haven't played it
                        </button>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
          {visible.length === 0 && <p className="text-base text-slate-300">You haven't played any of {name}'s games yet.</p>}
          {problem && <p role="alert" className="text-sm text-red-200">{problem}</p>}

          {!userId && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link to={`/login?mode=signup&redirect=${back}`} className={PRIMARY_BUTTON}>Sign up to see how much you agree</Link>
              <Link to={`/login?redirect=${back}`} className={`inline-flex items-center min-h-11 font-medium text-white ${TEXT_LINK}`}>Log in</Link>
            </div>
          )}

          {userId && match && !showMatch && (
            <button type="button" onClick={() => setReveal(true)} className={`${PRIMARY_BUTTON} self-start`}>See your match now</button>
          )}
          {userId && taste && !match && done && (
            <p className="text-base text-slate-300">
              {taste.shared === 0 ? "You haven't rated any of the same games yet." : `You've both rated ${taste.shared} game${taste.shared === 1 ? '' : 's'}.`}{' '}
              A match needs {taste.needed} more: rate games you've played on IMGM, then come back.
            </p>
          )}

          {showMatch && (
            <section aria-labelledby="match-title" className="flex flex-col gap-5 animate-fade-in">
              <h2 id="match-title" className="font-display text-[34px] leading-[.95] text-white">Your match</h2>
              <MatchResult name={name} data={match} />
              <FollowBar username={name} loggedIn />
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default Compare;
