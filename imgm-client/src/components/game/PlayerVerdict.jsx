/**
 * PlayerVerdict — "What players think" on a game page (inspired by IMDb's user reviews):
 *
 *   score       the IMGM average, big, with the review count
 *   histogram   how many players gave each rating 1-10 (worst left), in rarity colours
 *   summary     what players praise, criticize and disagree on: written by AI from the
 *               reviews (imgm-ai summary.py), saved by the server once there are 3+
 *   aspects     chips: praised (+), mixed (•) or criticized (−), each backed by 2+ reviews
 *
 * Hidden while a game has no reviews (the reviews section invites the first one).
 */
import { CircleDot, CircleMinus, CirclePlus, Sparkles, Star } from 'lucide-react';
import { getRarity } from '../reviewQuest/questOptions';
import { timeAgo } from '../../lib/timeAgo';

const MIN_REVIEWS = 3; // the server's rule for writing a summary (lib/aiSummary.js)

const ASPECT_STYLE = {
  positive: { Icon: CirclePlus, color: 'text-emerald-400', verb: 'Praised' },
  mixed: { Icon: CircleDot, color: 'text-slate-400', verb: 'Mixed feelings' },
  negative: { Icon: CircleMinus, color: 'text-orange-400', verb: 'Criticized' },
};

const Histogram = ({ byRating }) => {
  const counts = Array.from({ length: 10 }, (_, i) => byRating?.[i + 1] ?? 0);
  const most = Math.max(...counts, 1);
  return (
    <div className="flex-1 min-w-0 grid grid-cols-10 gap-1.5 sm:gap-2 items-end" role="img" aria-label="How many players gave each rating, 1 to 10">
      {counts.map((count, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5" title={`${count} ${count === 1 ? 'player' : 'players'} rated it ${i + 1}/10`}>
          <div className="w-full h-20 flex items-end">
            <div
              className="w-full rounded-t-md transition-all"
              style={{ height: count ? `${Math.max((count / most) * 100, 6)}%` : '3px', background: count ? getRarity(i + 1).color : 'rgb(51 65 85)' }}
            />
          </div>
          <span className="text-xs text-slate-400 tabular-nums">{i + 1}</span>
        </div>
      ))}
    </div>
  );
};

const PlayerVerdict = ({ game }) => {
  const count = game.reviewStats?.count ?? 0;
  if (count === 0) return null;
  const average = game.ratings?.imgm;
  const rarity = getRarity(Math.round(average));

  return (
    <section className="max-w-7xl mx-auto px-6 py-10">
      <h2 className="text-2xl font-bold text-white mb-6">
        What <span className="text-brand">players</span> think
      </h2>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 md:p-8 flex flex-col gap-7">
        {/* Score + histogram */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-6 sm:gap-10">
          <div className="flex flex-col items-start shrink-0">
            <div className="flex items-center gap-3">
              <Star className="w-11 h-11" style={{ color: rarity.color, fill: rarity.color }} aria-hidden="true" />
              <span className="text-6xl font-black text-white tabular-nums leading-none">{average.toFixed(1)}</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              <span className="font-bold uppercase tracking-wider" style={{ color: rarity.color }}>{rarity.label}</span> · {count}{' '}
              {count === 1 ? 'review' : 'reviews'}
            </p>
          </div>
          <Histogram byRating={game.reviewStats?.byRating} />
        </div>

        {/* The AI summary */}
        {game.aiSummary ? (
          <div className="flex flex-col gap-4 border-t border-slate-800 pt-6">
            <h3 className="text-lg font-bold text-white">Summary</h3>
            <p className="text-slate-200 leading-relaxed max-w-[80ch]">{game.aiSummary}</p>
            <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
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
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-700 bg-slate-900/80 text-sm font-semibold text-slate-200"
                    >
                      <style.Icon className={`w-4 h-4 ${style.color}`} aria-hidden="true" />
                      <span className="sr-only">{style.verb}: </span>
                      {aspect.label}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : (
          <p className="inline-flex items-center gap-2 border-t border-slate-800 pt-6 text-sm text-slate-400">
            <Sparkles className="w-4 h-4 text-slate-500" aria-hidden="true" />
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
