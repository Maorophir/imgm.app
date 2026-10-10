/**
 * ReviewsSection — the game page's community reviews.
 *
 *   header      title + count, "Show strong language", the Review Quest button
 *   tiers       a chip per rarity tier with its count (worst left, best right);
 *               click one to show only its reviews
 *   sort        Most helpful (default) / Newest / Highest / Lowest
 *   list        your own review pinned on top, then 5 reviews, then "Show 10 more"
 *
 * Reviews come page by page from /api/reviews/game/:id (the game itself only
 * carries the counts, in game.reviewStats).
 */
import { useEffect, useState } from 'react';
import { Medal, MessageSquareWarning, X } from 'lucide-react';
import { getGameReviews } from '../../lib/api';
import { useStrongLanguage } from '../../hooks/useStrongLanguage';
import { RARITIES, getRarity } from '../reviewQuest/questOptions';
import ReviewEntry from './ReviewEntry';
import StartQuestButton from '../reviewQuest/StartQuestButton';

const FIRST_PAGE = 5;
const NEXT_PAGE = 10;
const SORTS = [
  { value: 'helpful', label: 'Most helpful' },
  { value: 'newest', label: 'Newest' },
  { value: 'highest', label: 'Highest' },
  { value: 'lowest', label: 'Lowest' },
];

// Card art for a review: a medium-size version of the game's artworks + screenshots
const cardArt = (game, i) => {
  const pool = [...(game.artworks ?? []), ...(game.screenshots ?? [])];
  if (pool.length === 0) return game.coverUrl;
  return pool[i % pool.length].replace('/t_1080p/', '/t_screenshot_big/');
};

// How many reviews each tier got, from the game's { rating: count } summary
const tierCounts = (byRating = {}) =>
  RARITIES.map((tier) => ({
    ...tier,
    count: Object.entries(byRating)
      .filter(([rating]) => getRarity(Number(rating)).key === tier.key)
      .reduce((sum, [, n]) => sum + n, 0),
  }));

// "Show strong language": off = swearing shows as "f***"
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
      <MessageSquareWarning className="w-4 h-4" aria-hidden="true" />
      Show strong language
    </button>
  );
};

// A chip per tier (worst → best) with its count: click one to see only those reviews.
// (The rating histogram above, in PlayerVerdict, shows the spread.)
const RatingBreakdown = ({ tiers, selected, rating, onSelect, onClearRating }) => (
  <div className="flex flex-col gap-3">
    <div className="flex flex-wrap gap-2" role="group" aria-label="Show only one rarity">
      {/* A score picked in the histogram above: shown here, click to clear */}
      {rating && (
        <button
          type="button"
          onClick={onClearRating}
          aria-pressed="true"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border bg-white/10 transition"
          style={{ borderColor: getRarity(rating).color, color: getRarity(rating).color }}
        >
          Rated {rating}/10
          <X className="w-3.5 h-3.5 text-slate-300" aria-label="Show every review" />
        </button>
      )}
      {tiers.map((tier) => {
        const active = selected === tier.key;
        return (
          <button
            key={tier.key}
            type="button"
            disabled={tier.count === 0}
            aria-pressed={active}
            onClick={() => onSelect(active ? null : tier.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition disabled:opacity-30 disabled:cursor-not-allowed ${
              active ? 'bg-white/10' : 'border-slate-700 hover:border-slate-500'
            }`}
            style={active ? { borderColor: tier.color } : undefined}
          >
            <span className="uppercase tracking-wider" style={{ color: tier.color }}>{tier.label}</span>
            <span className="ml-1.5 text-slate-400 tabular-nums">{tier.count}</span>
          </button>
        );
      })}
    </div>
  </div>
);

const ReviewsSection = ({ game, gameId, filter, onFilterChange }) => {
  const { tier, rating } = filter; // one tier, or one exact score (from the histogram above)
  const total = game.reviewStats?.count ?? 0;
  const tiers = tierCounts(game.reviewStats?.byRating);
  const [sort, setSort] = useState('helpful');
  // { key, reviews, mine, total, hasMore } for the current sort + filter (key = which one)
  const [list, setList] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const key = `${sort}|${tier ?? ''}|${rating ?? ''}`;

  // A new sort or filter starts over from the first page
  useEffect(() => {
    if (total === 0) return undefined;
    const controller = new AbortController();
    getGameReviews(gameId, { sort, tier, rating, offset: 0, limit: FIRST_PAGE }, controller.signal)
      .then((page) => {
        setError(false);
        setList({ key: `${sort}|${tier ?? ''}|${rating ?? ''}`, ...page });
      })
      .catch((err) => err.name !== 'AbortError' && setError(true));
    return () => controller.abort();
  }, [gameId, sort, tier, rating, total]);

  const showMore = async () => {
    setLoadingMore(true);
    try {
      const page = await getGameReviews(gameId, { sort, tier, rating, offset: list.reviews.length, limit: NEXT_PAGE });
      setList((current) => ({ ...current, reviews: [...current.reviews, ...page.reviews], hasMore: page.hasMore }));
    } catch {
      setError(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const current = list?.key === key ? list : null; // null while a new sort/filter loads
  const mine = list?.mine ?? null;
  const matches = (review) => (rating ? review.rating === rating : !tier || getRarity(review.rating).key === tier);
  const pinned = mine && matches(mine) ? mine : null;
  const shown = current ? [...(pinned ? [pinned] : []), ...current.reviews] : [];
  const left = current ? current.total - current.reviews.length : 0;

  return (
    <section id="reviews" className="max-w-7xl mx-auto px-6 py-10 pb-20 scroll-mt-20">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-col items-start gap-2">
          <h2 className="text-2xl font-bold text-white">
            Community <span className="text-brand">Reviews</span>
            <span className="text-slate-500 text-lg font-normal ml-2">({total})</span>
          </h2>
          {/* Only offered when a review on screen actually has masked swearing */}
          {shown.some((r) => r.masked) && <StrongLanguageSwitch />}
        </div>
        {total > 0 &&
          (mine ? (
            <StartQuestButton gameId={gameId} label="Edit your review" reward="Change any answer · keeps your badges" />
          ) : (
            <StartQuestButton gameId={gameId} />
          ))}
      </div>

      {total === 0 ? (
        <div className="text-center py-14 px-6 bg-gradient-to-b from-brand/5 to-slate-900/30 rounded-2xl border border-slate-800">
          <span className="mx-auto mb-4 w-14 h-14 rounded-2xl grid place-items-center bg-amber-300/10 border border-amber-300/30 text-amber-300">
            <Medal className="w-7 h-7" aria-hidden="true" />
          </span>
          <p className="text-white text-xl font-bold mb-1">Be the first reviewer</p>
          <p className="text-slate-400 text-sm mb-6">
            Nobody has reviewed {game.title} yet — go first and earn the <span className="text-amber-300 font-semibold">First Reviewer</span> badge.
          </p>
          <StartQuestButton gameId={gameId} />
        </div>
      ) : (
        <>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-8">
            <div className="flex-1 max-w-2xl">
              <RatingBreakdown tiers={tiers} selected={tier} rating={rating} onSelect={(next) => onFilterChange({ tier: next, rating: null })} onClearRating={() => onFilterChange({ tier: null, rating: null })} />
            </div>
            <div className="flex rounded-xl border border-slate-700 p-1 self-start lg:self-auto" role="group" aria-label="Sort reviews">
              {SORTS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={sort === option.value}
                  onClick={() => setSort(option.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold transition ${
                    sort === option.value ? 'bg-brand text-slate-950' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-300 text-sm mb-6">Couldn't load the reviews. Please refresh the page.</p>}

          {!current && !error ? (
            <div className="h-64 rounded-2xl bg-slate-900/50 animate-pulse" />
          ) : shown.length === 0 ? (
            <p className="text-slate-400 py-10 text-center">
              {rating ? `No ${rating}/10 reviews yet.` : `No ${RARITIES.find((t) => t.key === tier)?.label} reviews yet.`}
            </p>
          ) : (
            <div className="flex flex-col gap-10">
              {shown.map((review, i) => (
                <div key={review.id}>
                  {review === pinned && (
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-brand">Your review</p>
                  )}
                  {/* A different artwork/screenshot per review, so the cards don't all look the same */}
                  <ReviewEntry review={review} game={game} artUrl={cardArt(game, i)} />
                </div>
              ))}
            </div>
          )}

          {current?.hasMore && (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={showMore}
                disabled={loadingMore}
                className="px-6 py-3 rounded-full font-bold text-white border border-slate-700 hover:border-brand/60 hover:bg-white/5 transition disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : `Show ${Math.min(NEXT_PAGE, left)} more`}
                <span className="ml-2 text-slate-500 font-semibold">({left} left)</span>
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default ReviewsSection;
