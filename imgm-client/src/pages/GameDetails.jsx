/**
 * GameDetails — The core page of IMGM. Route: /game/:id
 *
 * Layout (top to bottom):
 *   1. Hero Section — full-width background artwork with game title
 *   2. Game Details — cover art, metadata, multi-source ratings
 *   3. Videos — embedded YouTube trailers
 *   4. AI Summary — the glassmorphism AISummaryPanel
 *   5. User Reviews — list of ReviewCards + "Write Review" modal trigger
 */
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { mockGames, mockReviews } from '../utils/mockData';
import { getGame } from '../lib/api';
import AISummaryPanel from '../components/AISummaryPanel';
import ReviewCard from '../components/ReviewCard';
import SentimentBadge from '../components/SentimentBadge';
import StarRating from '../components/StarRating';

/**
 * Rating source config — same as GameCard but with full labels for the detail view.
 */
const RATING_SOURCES = [
  { key: 'imgm', label: 'IMGM', color: 'text-blue-400', bgColor: 'bg-blue-500/15', borderColor: 'border-blue-500/30' },
  { key: 'metacritic', label: 'Metacritic', color: 'text-yellow-400', bgColor: 'bg-yellow-400/10', borderColor: 'border-yellow-400/20', format: (v) => Math.round(v) },
  { key: 'ign', label: 'IGN', color: 'text-red-400', bgColor: 'bg-red-400/10', borderColor: 'border-red-400/20', format: (v) => v.toFixed(1) },
  { key: 'steam', label: 'Steam', color: 'text-sky-400', bgColor: 'bg-sky-400/10', borderColor: 'border-sky-400/20', format: (v) => `${Math.round(v)}%` },
];

/**
 * Maps a review from our API (Review + ReviewAnalysis + User) to ReviewCard props.
 */
const toReviewCardProps = (review) => ({
  ...review,
  username: review.user?.name ?? 'Anonymous',
  sentiment: review.analysis?.sentiment,
});

/**
 * Dev fallback: the mock game + reviews for this id, when the API is unreachable.
 */
const getMockFallback = (id) => {
  const game = mockGames.find((g) => g.id === Number(id));
  if (!game) return { game: null, reviews: [] };
  return { game, reviews: mockReviews.filter((r) => r.gameId === game.id) };
};

// Keyed by id so all page state (fetched data, video tab, modal) resets on navigation
const GameDetails = () => {
  const { id } = useParams();
  return <GameDetailsContent key={id} id={id} />;
};

const GameDetailsContent = ({ id }) => {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);

  // { game, reviews } once loaded; null while loading
  const [data, setData] = useState(null);

  // Fetch the game from our backend (which pulls from IGDB if it isn't cached locally)
  useEffect(() => {
    const controller = new AbortController();

    getGame(id, controller.signal)
      .then((game) => setData({ game, reviews: game.reviews.map(toReviewCardProps) }))
      .catch((error) => {
        if (error.name === 'AbortError') return;
        if (error.status !== 404) {
          console.warn(`Falling back to mock data — game ${id} request failed:`, error);
        }
        setData(getMockFallback(id));
      });

    return () => controller.abort();
  }, [id]);

  // Loading state
  if (!data) {
    return (
      <div className="min-h-screen animate-pulse">
        <div className="h-[70vh] bg-gradient-to-t from-slate-950 to-slate-900" />
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row gap-8">
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

  const { game, reviews } = data;

  // 404 state
  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
        <h1 className="text-6xl font-black text-slate-700 mb-4">404</h1>
        <p className="text-xl text-slate-400 mb-8">Game not found</p>
        <Link
          to="/"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-full font-semibold transition"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  const releaseYear = game.releaseDate ? new Date(game.releaseDate).getFullYear() : null;
  const availableRatings = RATING_SOURCES.filter((src) => game.ratings?.[src.key] != null);

  return (
    <div className="min-h-screen">
      {/* ══════════════════════════════════════════════════════════
          SECTION 1: HERO — Full-width background with game title
         ══════════════════════════════════════════════════════════ */}
      <section className="relative h-[70vh] flex items-end overflow-hidden">
        {/* Background artwork */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${game.artworks?.[0] || game.coverUrl})` }}
        >
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-transparent" />
        </div>

        {/* Title overlay at the bottom of the hero */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pb-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
            <Link to="/" className="hover:text-blue-400 transition">Home</Link>
            <span className="text-slate-700">›</span>
            <span className="text-slate-300">{game.title}</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight drop-shadow-2xl mb-3">
            {game.title}
          </h1>

          <div className="flex items-center flex-wrap gap-3 text-sm">
            {game.developer && (
              <span className="text-slate-300">
                <span className="text-slate-500">by </span>
                <span className="font-semibold">{game.developer}</span>
              </span>
            )}
            {releaseYear && (
              <span className="text-slate-500">• {releaseYear}</span>
            )}
            {game.aiSentiment && (
              <SentimentBadge sentiment={game.aiSentiment} size="sm" />
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 2: GAME DETAILS — Cover, metadata, ratings
         ══════════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Cover art */}
          <div className="shrink-0">
            <img
              src={game.coverUrl}
              alt={`${game.title} cover`}
              className="w-48 md:w-56 rounded-xl shadow-2xl shadow-black/50 border border-slate-800/50"
            />
          </div>

          {/* Details column */}
          <div className="flex-1 flex flex-col gap-5">
            {/* Description */}
            <p className="text-slate-300 leading-relaxed">
              {game.description}
            </p>

            {/* Metadata grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {game.developer && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Developer</p>
                  <p className="text-sm text-white font-medium">{game.developer}</p>
                </div>
              )}
              {game.publisher && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Publisher</p>
                  <p className="text-sm text-white font-medium">{game.publisher}</p>
                </div>
              )}
              {game.releaseDate && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Release Date</p>
                  <p className="text-sm text-white font-medium">
                    {new Date(game.releaseDate).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* Genres */}
            {game.genres?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {game.genres.map((genre) => (
                  <span
                    key={genre}
                    className="text-xs font-semibold uppercase tracking-wider text-slate-300 bg-slate-800/60 border border-slate-700/40 px-3 py-1 rounded-lg"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* Platforms */}
            {game.platforms?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {game.platforms.map((platform) => (
                  <span
                    key={platform}
                    className="text-xs font-bold uppercase tracking-widest text-blue-300/80 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-lg"
                  >
                    {platform}
                  </span>
                ))}
              </div>
            )}

            {/* ── Multi-source Ratings Bar ── */}
            {availableRatings.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-1">
                {availableRatings.map((src) => {
                  const value = game.ratings[src.key];
                  const display = src.format ? src.format(value) : value.toFixed(1);
                  const isImgm = src.key === 'imgm';

                  return (
                    <div
                      key={src.key}
                      className={`
                        flex items-center gap-2
                        ${src.bgColor} ${src.borderColor}
                        border rounded-xl px-4 py-2.5
                        ${isImgm ? 'ring-1 ring-blue-500/30' : ''}
                      `}
                    >
                      <span className={`text-xs font-bold ${src.color} ${isImgm ? '' : 'opacity-70'}`}>
                        {src.label}
                      </span>
                      <span className={`text-lg font-black ${src.color}`}>
                        {display}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 3: VIDEOS — Embedded YouTube trailers
         ══════════════════════════════════════════════════════════ */}
      {game.videos?.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-10">
          <h2 className="text-2xl font-bold text-white mb-6">
            Videos & <span className="text-blue-400">Trailers</span>
          </h2>

          {/* Video player */}
          <div className="aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-800/50 shadow-2xl shadow-black/30 mb-4">
            <iframe
              key={game.videos[activeVideoIndex].youtubeId}
              src={`https://www.youtube.com/embed/${game.videos[activeVideoIndex].youtubeId}`}
              title={game.videos[activeVideoIndex].name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>

          {/* Video selector tabs — only if more than 1 video */}
          {game.videos.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {game.videos.map((video, index) => (
                <button
                  key={video.youtubeId}
                  onClick={() => setActiveVideoIndex(index)}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                    ${index === activeVideoIndex
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-slate-900/60 text-slate-400 border border-slate-800/50 hover:text-white hover:border-slate-700'
                    }
                  `}
                >
                  {video.name}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════
          SECTION 4: AI SUMMARY — The core feature
         ══════════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-bold text-white mb-6">
          What the <span className="text-blue-400">AI</span> thinks
        </h2>
        {game.aiSummary ? (
          <AISummaryPanel
            aiSummary={game.aiSummary}
            aiSentiment={game.aiSentiment}
            reviewCount={reviews.length}
          />
        ) : (
          <div className="bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-blue-900/20 backdrop-blur-xl border border-blue-500/20 rounded-2xl p-6 md:p-8 text-center">
            <p className="text-slate-300 mb-1">No AI summary yet</p>
            <p className="text-slate-500 text-sm">
              Once the community has shared a few reviews, our AI will summarize what players think.
            </p>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════
          SECTION 5: USER REVIEWS
         ══════════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-6 py-10 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            Community <span className="text-blue-400">Reviews</span>
            <span className="text-slate-500 text-lg font-normal ml-2">({reviews.length})</span>
          </h2>

          <button
            onClick={() => setShowReviewModal(true)}
            className="
              px-5 py-2.5 rounded-xl font-semibold text-sm
              bg-blue-600 hover:bg-blue-700
              shadow-lg shadow-blue-500/25
              transition-all duration-200
              hover:scale-105
            "
          >
            ✍️ Write a Review
          </button>
        </div>

        {reviews.length > 0 ? (
          <div className="flex flex-col gap-4">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                username={review.username}
                rating={review.rating}
                reviewText={review.reviewText}
                createdAt={review.createdAt}
                sentiment={review.sentiment}
                hoursPlayed={review.hoursPlayed}
                platform={review.platform}
                completionStatus={review.completionStatus}
                playStyle={review.playStyle}
                difficulty={review.difficulty}
                subScores={review.subScores}
                recommendation={review.recommendation}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800/30">
            <p className="text-slate-500 text-lg mb-2">No reviews yet</p>
            <p className="text-slate-700 text-sm">Be the first to share your thoughts!</p>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════
          REVIEW MODAL
         ══════════════════════════════════════════════════════════ */}
      {showReviewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0F19]/70 backdrop-blur-sm"
          onClick={() => setShowReviewModal(false)}
        >
          <div
            className="
              bg-slate-900 border border-slate-800/50 rounded-2xl
              p-6 md:p-8 w-full max-w-lg
              shadow-2xl
              transform transition-all
            "
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Write a Review</h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-slate-400 hover:text-white transition text-xl"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-slate-400 mb-4">
              Reviewing <span className="text-blue-400 font-semibold">{game.title}</span>
            </p>

            {/* Rating input */}
            <div className="mb-5">
              <label className="text-sm font-medium text-slate-300 block mb-2">Your Rating</label>
              <div className="flex items-center gap-3">
                <StarRating rating={0} size="md" />
                <span className="text-slate-500 text-sm">Click to rate (coming soon)</span>
              </div>
            </div>

            {/* Review text */}
            <div className="mb-6">
              <label className="text-sm font-medium text-slate-300 block mb-2">Your Review</label>
              <textarea
                rows={4}
                placeholder="Share your experience with this game..."
                className="
                  w-full bg-slate-950/60 border border-slate-700/50
                  rounded-xl px-4 py-3 text-sm text-slate-200
                  placeholder:text-slate-700
                  focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30
                  resize-none transition
                "
              />
            </div>

            {/* Context Fields (Mocked for UI preview) */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Platform</label>
                <select className="w-full bg-slate-950/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50 appearance-none">
                  <option>PC</option>
                  <option>PlayStation 5</option>
                  <option>Xbox Series X|S</option>
                  <option>Nintendo Switch</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Time Played</label>
                <input type="text" placeholder="e.g. 45 hrs" className="w-full bg-slate-950/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Status</label>
                <select className="w-full bg-slate-950/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50 appearance-none">
                  <option>Finished Main Story</option>
                  <option>100% Completed</option>
                  <option>Still Playing</option>
                  <option>Dropped</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Recommendation</label>
                <select className="w-full bg-slate-950/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50 appearance-none">
                  <option>👍 Yes</option>
                  <option>👎 No</option>
                  <option>⏳ Wait for Sale</option>
                </select>
              </div>
            </div>

            {/* Submit (disabled for now — no backend yet) */}
            <button
              disabled
              className="
                w-full py-3 rounded-xl font-semibold
                bg-blue-600/50 text-blue-200/60
                cursor-not-allowed
              "
            >
              Submit Review (Backend coming in Phase 2)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameDetails;
