/**
 * The Hall of Fame (top games) — Route: /hall-of-fame (/top redirects here)
 *
 * IMGM's own chart (inspired by IMDb's Top 250): games ranked by what IMGM players
 * scored them, with a weighted score so one glowing review can't top it (the server
 * explains the formula, controllers/chartsController.js). Rank numerals wear the rarity
 * inks: #1 Legendary, #2-3 Epic, #4-10 Rare. Logged-in players see their own
 * score on each game and how much of the chart they've reviewed.
 *
 * Noir: the chart is a list of rows on hairlines (no boxes), ranks are big condensed
 * numerals, the platform filter is a segmented control, and the bars are thin.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PenLine, Sparkles } from 'lucide-react';
import { getTopGames } from '../lib/api';
import { useSession } from '../lib/authClient';
import { usePlayNextAccess } from '../hooks/usePlayNextAccess';
import { getRarity, RARITIES } from '../components/reviewQuest/questOptions';
import { WRAP, TEXT_LINK, SEGMENTS, segment } from '../lib/ui';
import RarityMark from '../components/RarityMark';
import BacklogButton from '../components/BacklogButton';
import LoadError from '../components/LoadError';

const SORTS = [
  { value: 'rank', label: 'Ranking' },
  { value: 'score', label: 'IMGM score' },
  { value: 'reviews', label: 'Most reviewed' },
  { value: 'newest', label: 'Release date' },
];
// Groups on the server: PlayStation includes PS4 games, Xbox the One, Switch the Switch 2
const PLATFORMS = [
  { value: '', label: 'All' },
  { value: 'pc', label: 'PC' },
  { value: 'playstation', label: 'PlayStation' },
  { value: 'xbox', label: 'Xbox' },
  { value: 'switch', label: 'Switch' },
];
const tierColor = (key) => RARITIES.find((t) => t.key === key).color;

// The rank numeral's ink: #1 Legendary gold, #2-3 Epic purple, #4-10 Rare blue, the rest quiet
const rankColor = (rank) => {
  if (rank === 1) return tierColor('legendary');
  if (rank <= 3) return tierColor('epic');
  if (rank <= 10) return tierColor('rare');
  return 'var(--color-slate-400)';
};

// A score as the tiles print it: the tier's mark, then the number, in the tier's ink
const Score = ({ value }) => {
  const rarity = getRarity(Math.round(value));
  return (
    <span className="inline-flex items-center gap-1.5 font-medium tabular-nums" style={{ color: rarity.color }}>
      <RarityMark tier={rarity.key} />
      {value.toFixed(1)}
    </span>
  );
};

const ChartRow = ({ game, loggedIn }) => {
  const year = game.releaseDate ? new Date(game.releaseDate).getFullYear() : null;
  const platforms = (game.platforms ?? []).slice(0, 3).join(' · ') + ((game.platforms?.length ?? 0) > 3 ? ` +${game.platforms.length - 3}` : '');
  return (
    <li className="flex items-center gap-3 sm:gap-4 px-2 py-4 border-t border-slate-700 hover:bg-slate-800 transition-colors duration-120 animate-fade-in">
      {/* The rank, as a big condensed numeral in its tier's ink */}
      <span className="w-9 sm:w-12 shrink-0 text-right font-display text-[34px] leading-none tabular-nums" style={{ color: rankColor(game.rank) }}>
        <span className="sr-only">Rank </span>{game.rank}
      </span>
      <Link to={`/game/${game.id}`} className="shrink-0" tabIndex={-1} aria-hidden="true">
        {game.coverUrl ? (
          <img src={game.coverUrl} alt="" loading="lazy" className="w-16 h-[5.5rem] rounded-sm object-cover bg-slate-800" />
        ) : (
          <div className="w-16 h-[5.5rem] rounded-sm bg-slate-800" />
        )}
      </Link>
      <div className="min-w-0 flex-1 flex flex-col gap-1">
        <Link to={`/game/${game.id}`} className="font-medium text-white text-lg leading-tight truncate underline decoration-1 underline-offset-4 decoration-transparent hover:decoration-white transition-[text-decoration-color] duration-120">
          {game.title}
        </Link>
        <p className="text-sm text-slate-400 truncate">{[year, platforms].filter(Boolean).join(' · ')}</p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <Score value={game.average} />
            <span className="text-slate-400">({game.reviewCount} {game.reviewCount === 1 ? 'review' : 'reviews'})</span>
          </span>
          {game.myRating ? (
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              Your score
              <span className="font-semibold tabular-nums" style={{ color: getRarity(game.myRating).color }}>{game.myRating}/10</span>
            </span>
          ) : (
            <Link
              to={loggedIn ? `/game/${game.id}/review` : `/login?redirect=${encodeURIComponent(`/game/${game.id}/review`)}`}
              className={`inline-flex items-center gap-1.5 min-h-8 font-medium text-white ${TEXT_LINK}`}
            >
              <PenLine className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.8} aria-hidden="true" /> Played it? Review it
            </Link>
          )}
          {!game.myRating && <BacklogButton gameId={game.id} source="hall_of_fame" />}
        </p>
      </div>
    </li>
  );
};

const InsightBar = ({ label, value }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <span className="font-medium text-white">{label}</span>
      {value != null ? <Score value={value} /> : <span className="text-slate-400 text-sm">—</span>}
    </div>
    <div className="h-1 bg-slate-700">
      {value != null && <div className="h-full" style={{ width: `${value * 10}%`, background: getRarity(Math.round(value)).edge }} />}
    </div>
  </div>
);

const TopGames = () => {
  const { data: session } = useSession();
  // The Play Next promo only shows to players who may use it (the server decides)
  const playNext = usePlayNextAccess();
  const [sort, setSort] = useState('rank');
  const [platform, setPlatform] = useState('');
  const [chart, setChart] = useState(null); // { key, games, size, insights }
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const key = `${sort}|${platform}|${session?.user?.id ?? ''}|${attempt}`;

  useEffect(() => {
    const controller = new AbortController();
    getTopGames({ sort, platform }, controller.signal)
      .then((data) => {
        setError(false);
        setChart({ key: `${sort}|${platform}|${session?.user?.id ?? ''}|${attempt}`, ...data });
      })
      .catch((err) => err.name !== 'AbortError' && setError(true));
    return () => controller.abort();
  }, [sort, platform, session?.user?.id, attempt]);

  const current = chart?.key === key ? chart : null;
  const insights = chart?.insights;
  const reviewed = insights?.reviewedByMe ?? 0;

  return (
    <div className={`${WRAP} py-10 grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_340px] gap-10 items-start`}>
      {/* min-w-0: the column may shrink to the phone screen (no sideways scrolling) */}
      <section className="min-w-0">
        <p className="text-sm text-slate-400 mb-3">IMGM Hall of Fame</p>
        <h1 className="font-display text-[54px] md:text-[88px] leading-[.9] uppercase tracking-[.005em] text-white">
          {/* "The Top 35" once the chart has some size; until then, just its name */}
          {chart?.size >= 10 ? `The Top ${chart.size}` : 'The Hall of Fame'}
        </h1>
        <p className="text-slate-400 mt-3">As rated by IMGM players.</p>

        {/* Your progress through the chart */}
        {session && chart?.size > 0 && (
          <div className="mt-6">
            <div className="h-1 bg-slate-700">
              <div className="h-full bg-white transition-[width] duration-500" style={{ width: `${(reviewed / chart.size) * 100}%` }} />
            </div>
            <p className="mt-2 flex justify-between text-sm tabular-nums text-slate-400">
              <span>{reviewed} of {chart.size} reviewed</span>
              <span>{Math.round((reviewed / chart.size) * 100)}%</span>
            </p>
          </div>
        )}

        {/* Filters + sort */}
        <div className="mt-8 mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className={SEGMENTS} role="group" aria-label="Platform">
            {PLATFORMS.map((p) => (
              <button
                key={p.label}
                type="button"
                aria-pressed={platform === p.value}
                onClick={() => setPlatform(p.value)}
                className={segment(platform === p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-400">
            Sort by
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-11 px-3 rounded-sm bg-slate-900 border border-slate-500 text-base font-medium text-white outline-none focus:border-white transition-colors duration-120"
            >
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
        </div>

        {error && <LoadError title="Couldn't load the chart" onRetry={() => setAttempt((n) => n + 1)} />}
        {!current && !error ? (
          <div className="flex flex-col">
            {Array.from({ length: 5 }, (_, i) => <div key={i} className="h-[121px] border-t border-slate-700 bg-slate-900/50 motion-safe:animate-pulse" />)}
          </div>
        ) : current?.games.length === 0 ? (
          <p className="py-12 text-center text-slate-400">No games on the chart for this platform yet.</p>
        ) : (
          <ol className="flex flex-col border-b border-slate-700">
            {current?.games.map((game) => <ChartRow key={game.id} game={game} loggedIn={Boolean(session)} />)}
          </ol>
        )}
      </section>

      {/* Chart insights */}
      <aside className="lg:sticky lg:top-24 flex flex-col gap-8">
        <div className="flex flex-col gap-6 border-t border-slate-700 pt-6">
          <h2 className="font-display text-[34px] leading-none tracking-[.005em] text-white">Chart insights</h2>
          <InsightBar label="Average IMGM score" value={insights?.chartAverage ?? null} />
          {session ? (
            <InsightBar label="Your average score" value={insights?.myAverage ?? null} />
          ) : (
            <p className="text-sm text-slate-400">
              <Link to="/login?redirect=%2Fhall-of-fame" className={`font-medium text-white ${TEXT_LINK}`}>Log in</Link> to see your scores on the chart.
            </p>
          )}
        </div>
        {/* Only for players who may use Play Next (the server decides) */}
        {playNext.enabled && (
          <Link
            to="/play-next"
            className="group rounded-sm border border-slate-500 p-5 hover:border-white transition-colors duration-120 flex items-start gap-4"
          >
            <Sparkles className="w-5 h-5 mt-0.5 shrink-0 text-slate-400" strokeWidth={1.8} aria-hidden="true" />
            <span>
              <span className="block font-medium text-white underline decoration-1 underline-offset-5 decoration-slate-500/80 group-hover:decoration-current">Not sure what's next?</span>
              <span className="block text-sm text-slate-400 mt-1">Play Next picks 5 games for you from your taste and these reviews.</span>
            </span>
          </Link>
        )}
      </aside>
    </div>
  );
};

export default TopGames;
