/**
 * GameDetails — The core page of IMGM. Route: /game/:id
 *
 * Layout (top to bottom):
 *   1. Header — cover, title and details, with the game's artwork behind them
 *   2. Screenshots & Videos — tabs; screenshots first, videos filtered to the relevant few
 *   3. AI Summary — the glassmorphism AISummaryPanel
 *   4. User Reviews — each review as a rarity card + written review, and the Review Quest button
 */
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getGame } from '../lib/api';
import { useSession } from '../lib/authClient';
import AISummaryPanel from '../components/AISummaryPanel';
import LoadError from '../components/LoadError';
import ReviewEntry from '../components/reviewCard/ReviewEntry';
import StartQuestButton from '../components/reviewQuest/StartQuestButton';
import { useStrongLanguage } from '../hooks/useStrongLanguage';
import GameHeader from '../components/game/GameHeader';
import MediaSection from '../components/game/MediaSection';

// Card art for a review: a medium-size version of the game's artworks + screenshots
const cardArt = (game, i) => {
  const pool = [...(game.artworks ?? []), ...(game.screenshots ?? [])];
  if (pool.length === 0) return game.coverUrl;
  return pool[i % pool.length].replace('/t_1080p/', '/t_screenshot_big/');
};

// Keyed by id so all page state (fetched data, media tabs…) resets on navigation
// "Show strong language" — off = swearing shows as "f***"
const StrongLanguageSwitch = () => {
  const [shown, setShown] = useStrongLanguage();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={shown}
      onClick={() => setShown(!shown)}
      className="flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white"
    >
      <span className={`relative w-9 h-5 rounded-full transition ${shown ? 'bg-rose-500' : 'bg-slate-700'}`}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${shown ? 'translate-x-4' : ''}`} />
      </span>
      🤬 Show strong language
    </button>
  );
};

const GameDetails = () => {
  const { id } = useParams();
  return <GameDetailsContent key={id} id={id} />;
};

const GameDetailsContent = ({ id }) => {
  const { data: session } = useSession();

  // null = loading | { game, reviews } = loaded | { game: null } = not found | { error: true } = failed
  const [data, setData] = useState(null);
  // Bumping this number re-runs the fetch effect below ("Try again")
  const [attempt, setAttempt] = useState(0);

  // Fetch the game from our backend (which pulls from IGDB if it isn't cached locally)
  useEffect(() => {
    const controller = new AbortController();

    getGame(id, controller.signal)
      .then((game) => setData({ game, reviews: game.reviews }))
      .catch((err) => {
        if (err.name === 'AbortError') return;
        if (err.status === 404) {
          setData({ game: null });
        } else {
          console.error(`Game ${id} request failed:`, err);
          setData({ error: true });
        }
      });

    return () => controller.abort();
  }, [id, attempt]);

  // Loading state
  if (!data) {
    return (
      <div className="min-h-screen animate-pulse">
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-10 flex flex-col md:flex-row gap-8">
          <div className="w-48 md:w-56 aspect-[3/4] bg-slate-800/60 rounded-xl" />
          <div className="flex-1 flex flex-col gap-3">
            <div className="h-4 bg-slate-800/70 rounded w-full" />
            <div className="h-4 bg-slate-800/70 rounded w-5/6" />
            <div className="h-4 bg-slate-800/70 rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  // Server unreachable / failed
  if (data.error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24">
        <LoadError
          title="Couldn't load this game"
          onRetry={() => {
            setData(null); // back to the loading state
            setAttempt((n) => n + 1);
          }}
        />
      </div>
    );
  }

  const { game, reviews } = data;

  // 404 state
  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
        <h1 className="text-6xl font-black text-slate-700 mb-4">404</h1>
        <p className="text-xl text-slate-400 mb-8">Game not found</p>
        <Link
          to="/"
          className="px-6 py-3 bg-brand hover:brightness-110 text-slate-950 shadow-[0_8px_24px_-8px_var(--color-brand)] rounded-full font-semibold transition"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <GameHeader game={game} />
      <MediaSection game={game} />

      {/* ══════════════════════════════════════════════════════════
          AI SUMMARY — The core feature
         ══════════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-bold text-white mb-6">
          What the <span className="text-brand">AI</span> thinks
        </h2>
        {game.aiSummary ? (
          <AISummaryPanel
            aiSummary={game.aiSummary}
            aiSentiment={game.aiSentiment}
            reviewCount={reviews.length}
          />
        ) : (
          <div className="bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 md:p-8 text-center">
            <p className="text-slate-300 mb-1">No AI summary yet</p>
            <p className="text-slate-500 text-sm">
              Once the community has shared a few reviews, our AI will summarize what players think.
            </p>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════
          USER REVIEWS
         ══════════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-10 pb-20">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex flex-col items-start gap-2">
            <h2 className="text-2xl font-bold text-white">
              Community <span className="text-brand">Reviews</span>
              <span className="text-slate-500 text-lg font-normal ml-2">({reviews.length})</span>
            </h2>
            {/* Only offered when some review actually has masked swearing */}
            {reviews.some((r) => r.masked) && <StrongLanguageSwitch />}
          </div>

          {/* When there are no reviews yet, the button lives in the empty state below */}
          {reviews.length > 0 && (
            reviews.some((r) => r.user?.id === session?.user?.id)
              ? <StartQuestButton gameId={id} label="Edit your review" reward="Change any answer · keeps your badges" />
              : <StartQuestButton gameId={id} />
          )}
        </div>

        {reviews.length > 0 ? (
          <div className="flex flex-col gap-10">
            {reviews.map((review, i) => (
              <ReviewEntry
                key={review.id}
                review={review}
                game={game}
                // A different artwork/screenshot per review, so the cards don't all look the same
                artUrl={cardArt(game, i)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-14 px-6 bg-gradient-to-b from-brand/5 to-slate-900/30 rounded-2xl border border-slate-800">
            <p className="text-5xl mb-3">🥇</p>
            <p className="text-white text-xl font-bold mb-1">Be the first reviewer</p>
            <p className="text-slate-400 text-sm mb-6">
              Nobody has reviewed {game.title} yet — go first and earn the <span className="text-amber-300 font-semibold">First Reviewer</span> badge.
            </p>
            <StartQuestButton gameId={id} />
          </div>
        )}
      </section>

    </div>
  );
};

export default GameDetails;
