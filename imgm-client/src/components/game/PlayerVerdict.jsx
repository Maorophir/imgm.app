/**
 * PlayerVerdict — "What players think" on a game page (inspired by IMDb's user reviews):
 *
 *   score       the IMGM average, big, with the review count
 *   histogram   how many players gave each rating 1-10 (worst left), in rarity colours;
 *               click a bar to filter the reviews below to that score
 *   summary     what players praise, criticize and disagree on: written by AI from the
 *               reviews (imgm-ai summary.py), saved by the server once there are 3+
 *   aspects     chips: praised (+), mixed (•) or criticized (−), each backed by 2+ reviews
 *
 * Hidden while a game has no reviews (the reviews section invites the first one).
 *
 * Noir: no box. The score is printed like a card's (the numeral in the tier's ink),
 * the bars are square, and a hairline divides the score from the summary.
 */
import { CircleDot, CircleMinus, CirclePlus, Sparkles } from 'lucide-react';
import RarityMark from '../RarityMark';
import { getRarity } from '../reviewQuest/questOptions';
import { timeAgo } from '../../lib/timeAgo';
import { WRAP, SECTION_TITLE } from '../../lib/ui';

const MIN_REVIEWS = 3; // the server's rule for writing a summary (lib/aiSummary.js)

const ASPECT_STYLE = {
  positive: { Icon: CirclePlus, color: 'text-rarity-uncommon', verb: 'Praised' },
  mixed: { Icon: CircleDot, color: 'text-slate-400', verb: 'Mixed feelings' },
  negative: { Icon: CircleMinus, color: 'text-red-400', verb: 'Criticized' },
};

// One bar per score, 1 (left) to 10. Click a bar to see only the reviews with that score
// (without onSelect it's read-only, e.g. a player's own scores on their profile).
export const Histogram = ({ byRating, selected, onSelect }) => {
  const counts = Array.from({ length: 10 }, (_, i) => byRating?.[i + 1] ?? 0);
  const most = Math.max(...counts, 1);
  return (
    <div className="flex-1 min-w-0 grid grid-cols-10 gap-1.5 sm:gap-2 items-end" role="group" aria-label="Show the reviews with one score">
      {counts.map((count, i) => {
        const rating = i + 1;
        const active = selected === rating;
        return (
          <button
            key={rating}
            type="button"
            disabled={count === 0 || !onSelect}
            onClick={() => onSelect?.(rating)}
            aria-pressed={active}
            title={`${count} ${count === 1 ? 'player' : 'players'} rated it ${rating}/10${count && onSelect ? ' · click to read them' : ''}`}
            className="group flex flex-col items-center gap-1.5 disabled:cursor-default"
          >
            <span className="w-full h-20 flex items-end">
              <span
                className="w-full transition-[filter,opacity] duration-120 group-enabled:group-hover:brightness-75"
                style={{
                  height: count ? `${Math.max((count / most) * 100, 6)}%` : '3px',
                  background: count ? getRarity(rating).color : '#2e2a25', // slate-700, an empty bar
                  opacity: selected && !active ? 0.3 : 1,
                }}
              />
            </span>
            <span className={`text-xs tabular-nums ${active ? 'text-white font-semibold' : 'text-slate-400'}`}>{rating}</span>
          </button>
        );
      })}
    </div>
  );
};

// embedded: placed inside another page's layout (no outer width/padding of its own)
// title: the heading's words (default "What players think")
const PlayerVerdict = ({ game, selectedRating, onRatingClick, embedded = false, title = 'What players think' }) => {
  const count = game.reviewStats?.count ?? 0;
  if (count === 0) return null;
  const average = game.ratings?.imgm;
  const rarity = getRarity(Math.round(average));

  return (
    <section className={embedded ? '' : `${WRAP} py-10`}>
      <h2 className={`${SECTION_TITLE} mb-8`}>{title}</h2>
      <div className="flex flex-col gap-8">
        {/* Score + histogram */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-6 sm:gap-10">
          <div className="flex flex-col items-start shrink-0" style={{ '--ink': rarity.color }}>
            <p className="flex items-baseline gap-1.5">
              <span className="font-display text-[88px] leading-[.78] tabular-nums text-(--ink)">{average.toFixed(1)}</span>
              <span className="text-sm tabular-nums text-slate-400">/10</span>
            </p>
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-400">
              <RarityMark tier={rarity.key} className="text-(--ink)" />
              <span className="font-semibold text-(--ink)">{rarity.label}</span> · {count}{' '}
              {count === 1 ? 'review' : 'reviews'}
            </p>
          </div>
          <Histogram byRating={game.reviewStats?.byRating} selected={selectedRating} onSelect={onRatingClick} />
        </div>

        {/* The AI summary */}
        {game.aiSummary ? (
          <div className="flex flex-col gap-4 border-t border-slate-700 pt-6">
            <h3 className="text-lg font-semibold text-white">Summary</h3>
            <p className="text-white leading-[1.6] max-w-[80ch]">{game.aiSummary}</p>
            <p className="inline-flex items-center gap-1.5 text-sm text-slate-400">
              <Sparkles className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" />
              AI-generated from IMGM reviews
              {game.aiSummaryReviews && ` · based on ${game.aiSummaryReviews} reviews`}
              {game.aiSummaryAt && ` · updated ${timeAgo(game.aiSummaryAt) === 'just now' ? 'just now' : `${timeAgo(game.aiSummaryAt)} ago`}`}
            </p>
            {game.aiAspects?.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="What players talk about">
                {game.aiAspects.map((aspect) => {
                  const style = ASPECT_STYLE[aspect.sentiment] ?? ASPECT_STYLE.mixed;
                  return (
                    <li
                      key={aspect.label}
                      title={`${style.verb} in ${aspect.support} reviews`}
                      className="inline-flex items-center gap-2 h-9 px-3 rounded-sm border border-slate-600 text-sm font-medium text-white"
                    >
                      <style.Icon className={`w-4 h-4 ${style.color}`} strokeWidth={1.8} aria-hidden="true" />
                      <span className="sr-only">{style.verb}: </span>
                      {aspect.label}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : (
          <p className="flex items-center gap-2 border-t border-slate-700 pt-6 text-sm text-slate-400">
            <Sparkles className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
            {count < MIN_REVIEWS
              ? `An AI summary of what players think appears once ${MIN_REVIEWS} players have reviewed ${game.title}.`
              : 'The AI summary of these reviews is on its way. Check back soon.'}
          </p>
        )}
      </div>
    </section>
  );
};

export default PlayerVerdict;
