/**
 * Home page: what the community is saying right now, and games waiting for a review.
 *
 *   FreshReviews   the 8 newest reviews on any game (cover, score, who, a snippet)
 *   NeedsReview    popular games (from the featured list) nobody has reviewed yet,
 *                  each a shortcut into the review quest and the First Reviewer badge
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Medal } from 'lucide-react';
import { getRecentReviews } from '../../lib/api';
import { timeAgo } from '../../lib/timeAgo';
import { getRarity } from '../reviewQuest/questOptions';

const SectionTitle = ({ first, accent, subtitle }) => (
  <div className="mb-6">
    <h2 className="text-3xl font-bold text-white">
      {first} <span className="text-brand">{accent}</span>
    </h2>
    <p className="text-slate-400 text-sm mt-1">{subtitle}</p>
  </div>
);

const ReviewTile = ({ review }) => {
  const rarity = getRarity(review.rating);
  return (
    <Link
      to={`/game/${review.game.id}`}
      className="group flex gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-600 transition animate-fade-in"
      style={{ boxShadow: `inset 3px 0 0 ${rarity.color}` }}
    >
      {review.game.coverUrl ? (
        <img src={review.game.coverUrl} alt="" loading="lazy" className="w-16 h-[5.5rem] rounded-lg object-cover bg-slate-800 shrink-0" />
      ) : (
        <div className="w-16 h-[5.5rem] rounded-lg bg-slate-800 shrink-0" />
      )}
      <div className="min-w-0 flex flex-col gap-1">
        <p className="font-bold text-white leading-tight truncate group-hover:text-brand transition">{review.game.title}</p>
        <p className="text-xs font-bold" style={{ color: rarity.color }}>
          <span className="uppercase tracking-wider">{rarity.label}</span> <span className="tabular-nums">{review.rating}/10</span>
        </p>
        {review.snippet && <p className="text-sm text-slate-300 leading-snug line-clamp-2">“{review.snippet}”</p>}
        <p className="mt-auto text-[11px] text-slate-500">
          {review.author ?? 'A player'} · {timeAgo(review.createdAt)}
        </p>
      </div>
    </Link>
  );
};

export const FreshReviews = () => {
  const [reviews, setReviews] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    getRecentReviews(controller.signal)
      .then(setReviews)
      .catch(() => setReviews([])); // the section just stays hidden
    return () => controller.abort();
  }, []);

  if (reviews?.length === 0) return null;
  return (
    <section className="relative z-10 px-6 py-12 max-w-7xl mx-auto">
      <SectionTitle first="Fresh from the" accent="community" subtitle="The newest reviews on IMGM" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {reviews === null
          ? Array.from({ length: 4 }, (_, i) => <div key={i} className="h-28 rounded-2xl bg-slate-900/50 animate-pulse" />)
          : reviews.map((review) => <ReviewTile key={review.id} review={review} />)}
      </div>
    </section>
  );
};

export const NeedsReview = ({ games }) => {
  const waiting = (games ?? []).filter((game) => !game.reviewCount).slice(0, 6);
  if (waiting.length === 0) return null;
  return (
    <section className="relative z-10 px-6 py-12 pb-20 max-w-7xl mx-auto">
      <SectionTitle first="Be the first" accent="reviewer" subtitle="Popular games nobody on IMGM has reviewed yet. Go first and earn the First Reviewer badge." />
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
        {waiting.map((game) => (
          <Link key={game.id} to={`/game/${game.id}/review`} className="group flex flex-col gap-2 animate-fade-in">
            <div className="relative">
              {game.coverUrl ? (
                <img src={game.coverUrl} alt="" loading="lazy" className="w-full aspect-[3/4] rounded-xl object-cover bg-slate-800 group-hover:ring-2 group-hover:ring-amber-300/70 transition" />
              ) : (
                <div className="w-full aspect-[3/4] rounded-xl bg-slate-800" />
              )}
              <span className="absolute top-2 right-2 w-8 h-8 rounded-lg grid place-items-center bg-slate-950/80 border border-amber-300/40 text-amber-300">
                <Medal className="w-4 h-4" aria-hidden="true" />
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-200 leading-tight line-clamp-2 group-hover:text-white">{game.title}</p>
            <p className="text-xs font-bold text-amber-300">Write the first review →</p>
          </Link>
        ))}
      </div>
    </section>
  );
};
