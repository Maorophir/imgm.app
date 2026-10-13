/**
 * GameDetails — The core page of IMGM. Route: /game/:id
 *
 * Layout (top to bottom): what players think comes before the media, since the
 * cards are what IMGM has that no store page does.
 *   1. Header — cover, title, the verdict line and details, with the game's artwork behind them
 *   2. What players think — PlayerVerdict: score, rating histogram, AI summary + chips
 *   3. Community reviews — ReviewsSection: rating breakdown, sort, pages of rarity-card reviews
 *   4. Screenshots & Videos — tabs; screenshots first, videos filtered to the relevant few
 */
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getGame } from '../lib/api';
import PlayerVerdict from '../components/game/PlayerVerdict';
import LoadError from '../components/LoadError';
import ReviewsSection from '../components/reviewCard/ReviewsSection';
import GameHeader from '../components/game/GameHeader';
import MediaSection from '../components/game/MediaSection';
import { usePageTitle } from '../hooks/usePageTitle';
import { WRAP, PRIMARY_BUTTON } from '../lib/ui';

// Keyed by id so all page state (fetched data, media tabs…) resets on navigation
// The game's line in Google: its IMGM numbers when it has reviews, an invitation when not
const gameDescription = (game) => {
  // IGDB dates are midnight UTC, so the year is read in UTC
  const year = game.releaseDate ? ` (${new Date(game.releaseDate).getUTCFullYear()})` : '';
  const count = game.reviewStats?.count ?? 0;
  const average = game.ratings?.imgm;
  if (count > 0 && average != null) {
    return `${game.title}${year}: ${count} player review${count === 1 ? '' : 's'}, ${average.toFixed(1)}/10 average on IMGM. What players love, what they don't, and where to buy it.`;
  }
  return `${game.title}${year}: no IMGM reviews yet. Played it? Be the first to rate it and earn the First Reviewer badge.`;
};

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
  usePageTitle(data?.game && `${data.game.title}: reviews and ratings`, data?.game && gameDescription(data.game));

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
      <div className="min-h-screen motion-safe:animate-pulse">
        {/* The header's shape: on phones a small cover beside the title, from 768px a big one */}
        <div className={`${WRAP} pt-16 pb-10 flex gap-4 sm:gap-6 md:gap-8`}>
          <div className="w-24 sm:w-32 md:w-56 shrink-0 aspect-[3/4] bg-slate-900 rounded-sm" />
          <div className="flex-1 flex flex-col gap-3">
            <div className="h-4 bg-slate-800 rounded-sm w-full" />
            <div className="h-4 bg-slate-800 rounded-sm w-5/6" />
            <div className="h-4 bg-slate-800 rounded-sm w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  // Server unreachable / failed
  if (data.error) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-24">
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
        <h1 className="font-display text-[88px] leading-[.9] tracking-[.005em] text-slate-400 mb-3">404</h1>
        <p className="text-xl text-white mb-8">Game not found</p>
        <Link to="/" className={PRIMARY_BUTTON}>
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    // The bottom padding ends the page under whichever section comes last
    <div className="min-h-screen pb-10">
      <GameHeader game={game} />

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

      {/* The screenshots and videos come after the reviews */}
      <MediaSection game={game} />
    </div>
  );
};

export default GameDetails;
