/**
 * GameDetails — The core page of IMGM. Route: /game/:id
 *
 * Layout (top to bottom):
 *   1. Header — cover, title and details, with the game's artwork behind them
 *   2. Screenshots & Videos — tabs; screenshots first, videos filtered to the relevant few
 *   3. What players think — PlayerVerdict: score, rating histogram, AI summary + chips
 *   4. User Reviews — ReviewsSection: rating breakdown, sort, pages of rarity-card reviews
 */
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getGame } from '../lib/api';
import PlayerVerdict from '../components/game/PlayerVerdict';
import LoadError from '../components/LoadError';
import ReviewsSection from '../components/reviewCard/ReviewsSection';
import GameHeader from '../components/game/GameHeader';
import MediaSection from '../components/game/MediaSection';

// Keyed by id so all page state (fetched data, media tabs…) resets on navigation
const GameDetails = () => {
  const { id } = useParams();
  return <GameDetailsContent key={id} id={id} />;
};

const GameDetailsContent = ({ id }) => {
  // null = loading | { game } = loaded | { game: null } = not found | { error: true } = failed
  const [data, setData] = useState(null);
  // Bumping this number re-runs the fetch effect below ("Try again")
  const [attempt, setAttempt] = useState(0);
  // Which reviews to show: one rarity tier, or one exact score (from the histogram)
  const [reviewFilter, setReviewFilter] = useState({ tier: null, rating: null });

  // Fetch the game from our backend (which pulls from IGDB if it isn't cached locally)
  useEffect(() => {
    const controller = new AbortController();

    getGame(id, controller.signal)
      .then((game) => setData({ game }))
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

  const { game } = data;

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

      {/* What players think: score, rating histogram, the AI summary and its chips */}
      <PlayerVerdict
        game={game}
        selectedRating={reviewFilter.rating}
        onRatingClick={(rating) => {
          // Same bar again = show every review
          setReviewFilter((current) => ({ tier: null, rating: current.rating === rating ? null : rating }));
          document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      />

      <ReviewsSection game={game} gameId={id} filter={reviewFilter} onFilterChange={setReviewFilter} />
    </div>
  );
};

export default GameDetails;
