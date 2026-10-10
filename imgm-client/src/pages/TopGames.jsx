/**
 * The Hall of Fame (top games) — Route: /hall-of-fame (/top redirects here)
 *
 * IMGM's own chart (inspired by IMDb's Top 250): games ranked by what IMGM players
 * scored them, with a weighted score so one glowing review can't top it (the server
 * explains the formula, controllers/chartsController.js). Rank badges wear the rarity
 * colours: #1 Legendary, #2-3 Epic, #4-10 Rare. Logged-in players see their own
 * score on each game and how much of the chart they've reviewed.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PenLine, Sparkles, Star } from 'lucide-react';
import { getTopGames } from '../lib/api';
import { useSession } from '../lib/authClient';
import { getRarity, RARITIES } from '../components/reviewQuest/questOptions';
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

// #1 Legendary gold, #2-3 Epic purple, #4-10 Rare blue, the rest quiet
const rankStyle = (rank) => {
  if (rank === 1) return { background: tierColor('legendary'), color: '#0f172a' };
  if (rank <= 3) return { background: tierColor('epic'), color: '#0f172a' };
  if (rank <= 10) return { background: tierColor('rare'), color: '#0f172a' };
  return { background: 'rgb(30 41 59)', color: 'rgb(203 213 225)' };
};

const Score = ({ value, size = 'w-4 h-4' }) => {
  const rarity = getRarity(Math.round(value));
  return (
    <span className="inline-flex items-center gap-1.5 font-bold text-white tabular-nums">
      <Star className={size} style={{ color: rarity.color, fill: rarity.color }} aria-hidden="true" />
      {value.toFixed(1)}
    </span>
  );
};

const ChartRow = ({ game, loggedIn }) => {
  const year = game.releaseDate ? new Date(game.releaseDate).getFullYear() : null;
  const platforms = (game.platforms ?? []).slice(0, 3).join(' · ') + ((game.platforms?.length ?? 0) > 3 ? ` +${game.platforms.length - 3}` : '');
  return (
    <li className="flex items-center gap-4 p-3 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-600 transition animate-fade-in">
      <Link to={`/game/${game.id}`} className="shrink-0">
        {game.coverUrl ? (
          <img src={game.coverUrl} alt="" loading="lazy" className="w-16 h-[5.5rem] rounded-lg object-cover bg-slate-800" />
        ) : (
          <div className="w-16 h-[5.5rem] rounded-lg bg-slate-800" />
        )}
      </Link>
      <div className="min-w-0 flex-1 flex flex-col gap-1">
        <span className="self-start px-2 py-0.5 rounded-md text-xs font-black tabular-nums" style={rankStyle(game.rank)}>
          #{game.rank}
        </span>
        <Link to={`/game/${game.id}`} className="font-bold text-white text-lg leading-tight truncate hover:text-brand transition">
          {game.title}
        </Link>
        <p className="text-xs text-slate-400 truncate">{[year, platforms].filter(Boolean).join(' · ')}</p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <Score value={game.average} />
            <span className="text-slate-500">({game.reviewCount} {game.reviewCount === 1 ? 'review' : 'reviews'})</span>
          </span>
          {game.myRating ? (
            <span className="inline-flex items-center gap-1.5 text-slate-300">
              Your score
              <span className="font-bold tabular-nums" style={{ color: getRarity(game.myRating).color }}>{game.myRating}/10</span>
            </span>
          ) : (
            <Link
              to={loggedIn ? `/game/${game.id}/review` : `/login?redirect=${encodeURIComponent(`/game/${game.id}/review`)}`}
              className="inline-flex items-center gap-1.5 font-semibold text-brand hover:underline"
            >
              <PenLine className="w-3.5 h-3.5" aria-hidden="true" /> Played it? Review it
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
      <span className="font-bold text-white">{label}</span>
      {value != null ? <Score value={value} /> : <span className="text-slate-500 text-sm">—</span>}
    </div>
    <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
      {value != null && <div className="h-full rounded-full" style={{ width: `${value * 10}%`, background: getRarity(Math.round(value)).color }} />}
    </div>
  </div>
);

const TopGames = () => {
  const { data: session } = useSession();
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
    <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_340px] gap-10 items-start">
      {/* min-w-0: the column may shrink to the phone screen (no sideways scrolling) */}
      <section className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-brand mb-2">IMGM Hall of Fame</p>
        <h1 className="font-display text-5xl md:text-6xl uppercase tracking-tight text-white">
          {/* "The Top 35" once the chart has some size; until then, just its name */}
          {chart?.size >= 10 ? `The Top ${chart.size}` : 'The Hall of Fame'}<span className="text-brand">.</span>
        </h1>
        <p className="text-slate-400 mt-2">As rated by IMGM players.</p>

        {/* Your progress through the chart */}
        {session && chart?.size > 0 && (
          <div className="mt-6">
            <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(reviewed / chart.size) * 100}%` }} />
            </div>
            <p className="mt-2 flex justify-between text-xs font-black uppercase tracking-[0.2em] text-slate-300">
              <span>{reviewed} of {chart.size} reviewed</span>
              <span>{Math.round((reviewed / chart.size) * 100)}%</span>
            </p>
          </div>
        )}

        {/* Filters + sort */}
        <div className="mt-8 mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Platform">
            {PLATFORMS.map((p) => (
              <button
                key={p.label}
                type="button"
                aria-pressed={platform === p.value}
                onClick={() => setPlatform(p.value)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-bold border transition ${
                  platform === p.value ? 'bg-brand text-slate-950 border-brand' : 'border-slate-700 text-slate-300 hover:text-white hover:border-slate-500'
                }`}
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
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-semibold focus:border-brand outline-none"
            >
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
        </div>

        {error && <LoadError title="Couldn't load the chart" onRetry={() => setAttempt((n) => n + 1)} />}
        {!current && !error ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }, (_, i) => <div key={i} className="h-28 rounded-2xl bg-slate-900/50 animate-pulse" />)}
          </div>
        ) : current?.games.length === 0 ? (
          <p className="py-12 text-center text-slate-400">No games on the chart for this platform yet.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {current?.games.map((game) => <ChartRow key={game.id} game={game} loggedIn={Boolean(session)} />)}
          </ol>
        )}
      </section>

      {/* Chart insights */}
      <aside className="lg:sticky lg:top-24 flex flex-col gap-8">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col gap-6">
          <h2 className="text-xl font-bold text-white border-l-4 border-brand pl-3">Chart insights</h2>
          <InsightBar label="Average IMGM score" value={insights?.chartAverage ?? null} />
          {session ? (
            <InsightBar label="Your average score" value={insights?.myAverage ?? null} />
          ) : (
            <p className="text-sm text-slate-400">
              <Link to="/login?redirect=%2Fhall-of-fame" className="font-bold text-brand hover:underline">Log in</Link> to see your scores on the chart.
            </p>
          )}
        </div>
        <Link
          to="/play-next"
          className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-brand/60 transition flex items-start gap-4"
        >
          <span className="w-11 h-11 rounded-xl grid place-items-center bg-brand/10 border border-brand/30 text-brand shrink-0">
            <Sparkles className="w-5 h-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block font-bold text-white group-hover:text-brand transition">Not sure what's next?</span>
            <span className="block text-sm text-slate-400 mt-1">Play Next picks 5 games for you from your taste and these reviews.</span>
          </span>
        </Link>
      </aside>
    </div>
  );
};

export default TopGames;
