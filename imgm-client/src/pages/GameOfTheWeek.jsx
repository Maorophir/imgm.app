/**
 * Game of the Week — Route: /game-of-the-week
 *
 *   the crown     last week's winner: the Game of the Week for these 7 days
 *   the ballot    this week's candidates (each from a different source, labelled);
 *                 players vote Sunday to Saturday, Israel time, and can change their
 *                 vote until it closes. Results show once you've voted.
 * Everything comes from /api/gotw; the server closes each week by itself (lib/gotw.js).
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Clock, Crown, Flame, Gem, Heart, Landmark, Sparkles, TrendingUp, Users } from 'lucide-react';
import { getGotw, voteGotw } from '../lib/api';
import { useSession } from '../lib/authClient';
import LoadError from '../components/LoadError';

// Why a game is on the ballot (the server's slot names)
const SLOTS = {
  hot: { label: 'Hot on IMGM', Icon: Flame },
  favorite: { label: 'Community favorite', Icon: Heart },
  new_release: { label: 'New release', Icon: Sparkles },
  hidden_gem: { label: 'Hidden gem', Icon: Gem },
  classic: { label: 'Classic', Icon: Landmark },
  popular: { label: 'Trending now', Icon: TrendingUp },
  player_pick: { label: 'Player pick', Icon: Users },
};

// "Oct 11" in Israel time (weeks run on Israel's calendar)
const day = (date, timeZone) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone });

// "2d 5h left" / "3h 12m left", ticking every minute
const useTimeLeft = (endsAt) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);
  if (!endsAt) return '';
  const minutes = Math.max(0, Math.floor((new Date(endsAt) - now) / 60000));
  const [d, h, m] = [Math.floor(minutes / 1440), Math.floor((minutes % 1440) / 60), minutes % 60];
  return d > 0 ? `${d}d ${h}h left` : h > 0 ? `${h}h ${m}m left` : `${m}m left`;
};

const Crowned = ({ gotw, timeZone }) => {
  if (!gotw) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-700 p-10 text-center">
        <Crown className="w-10 h-10 mx-auto mb-3 text-amber-300" aria-hidden="true" />
        <p className="text-xl font-bold text-white">The first Game of the Week is crowned Sunday</p>
        <p className="text-slate-400 mt-1">Vote below. The game with the most votes reigns for the whole week.</p>
      </div>
    );
  }
  const { game } = gotw;
  const art = game.artworks?.[0] ?? game.coverUrl;
  const reignEnds = new Date(new Date(gotw.reignsFrom).getTime() + 6 * 24 * 60 * 60 * 1000);
  const share = gotw.totalVotes ? Math.round((gotw.votes / gotw.totalVotes) * 100) : null;
  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-300/30 min-h-[360px] flex items-end">
      {art && <img src={art} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/20" />
      <div className="relative p-6 md:p-10 flex flex-col md:flex-row md:items-end gap-6 w-full">
        {game.coverUrl && <img src={game.coverUrl} alt="" className="hidden md:block w-36 rounded-xl shadow-2xl border border-white/10" />}
        <div className="flex-1 min-w-0">
          <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-300 text-slate-950 text-xs font-black uppercase tracking-[0.2em]">
            <Crown className="w-4 h-4" aria-hidden="true" /> Game of the Week
          </p>
          <p className="mt-3 text-sm font-semibold text-slate-300">
            {day(gotw.reignsFrom, timeZone)} – {day(reignEnds, timeZone)}
          </p>
          <h2 className="font-display text-5xl md:text-7xl uppercase tracking-tight text-white leading-none mt-1">{game.title}</h2>
          <p className="mt-3 text-slate-300">
            Chosen by IMGM players{share != null && <> · <span className="font-bold text-white">{share}%</span> of {gotw.totalVotes} votes</>}
          </p>
        </div>
        <Link to={`/game/${game.id}`} className="self-start md:self-end px-6 py-3 rounded-full font-bold bg-brand hover:brightness-110 text-slate-950 shadow-[0_8px_24px_-8px_var(--color-brand)] transition whitespace-nowrap">
          See the game
        </Link>
      </div>
    </div>
  );
};

const Candidate = ({ candidate, mine, voted, total, onVote, busy }) => {
  const { game, slot, votes } = candidate;
  const { label, Icon } = SLOTS[slot] ?? SLOTS.popular;
  const share = voted && total ? Math.round((votes / total) * 100) : 0;
  const year = game.releaseDate ? new Date(game.releaseDate).getFullYear() : null;
  return (
    <li className={`relative flex flex-col rounded-2xl border bg-slate-900/60 overflow-hidden transition ${mine ? 'border-brand shadow-[0_0_24px_-6px_var(--color-brand)]' : 'border-slate-800'}`}>
      <Link to={`/game/${game.id}`} className="relative block">
        {game.coverUrl ? (
          <img src={game.coverUrl} alt="" loading="lazy" className="w-full aspect-[3/4] object-cover bg-slate-800" />
        ) : (
          <div className="w-full aspect-[3/4] bg-slate-800" />
        )}
        <span className="absolute top-2 left-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/85 border border-slate-700 text-[11px] font-bold text-slate-200">
          <Icon className="w-3.5 h-3.5 text-brand" aria-hidden="true" /> {label}
        </span>
      </Link>
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="min-w-0">
          <Link to={`/game/${game.id}`} className="font-bold text-white leading-tight line-clamp-2 hover:text-brand transition">{game.title}</Link>
          <p className="text-xs text-slate-500 mt-0.5">{[year, game.genres?.[0]].filter(Boolean).join(' · ')}</p>
        </div>
        {voted && (
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-bold text-white tabular-nums">{share}%</span>
              <span className="text-slate-500 tabular-nums">{votes} {votes === 1 ? 'vote' : 'votes'}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${mine ? 'bg-brand' : 'bg-slate-500'}`} style={{ width: `${share}%` }} />
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => onVote(game.id)}
          disabled={busy || mine}
          className={`mt-auto inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition disabled:cursor-default ${
            mine
              ? 'bg-brand text-slate-950'
              : 'border border-slate-700 text-white hover:border-brand/60 hover:bg-white/5 disabled:opacity-50'
          }`}
        >
          {mine ? <><Check className="w-4 h-4" aria-hidden="true" /> Your vote</> : voted ? 'Switch my vote' : 'Vote'}
        </button>
      </div>
    </li>
  );
};

const GameOfTheWeek = () => {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const timeLeft = useTimeLeft(data?.week.endsAt);

  useEffect(() => {
    const controller = new AbortController();
    getGotw(controller.signal)
      .then((result) => {
        setError(false);
        setData(result);
      })
      .catch((err) => err.name !== 'AbortError' && setError(true));
    return () => controller.abort();
  }, [session?.user?.id, attempt]);

  const vote = async (gameId) => {
    if (!session) {
      navigate('/login?redirect=%2Fgame-of-the-week');
      return;
    }
    setBusy(true);
    try {
      setData(await voteGotw(gameId));
    } catch {
      setAttempt((n) => n + 1); // reload the ballot (e.g. the week just closed)
    } finally {
      setBusy(false);
    }
  };

  if (error) return <div className="max-w-7xl mx-auto px-6 py-16"><LoadError title="Couldn't load Game of the Week" onRetry={() => setAttempt((n) => n + 1)} /></div>;
  if (!data) return <div className="max-w-7xl mx-auto px-6 py-10"><div className="h-[360px] rounded-3xl bg-slate-900/50 animate-pulse" /></div>;

  const { week, candidates, myVote, totalVotes } = data;
  const voted = myVote != null;
  const nextReignStarts = week.endsAt;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col gap-14">
      <section>
        <p className="text-xs font-black uppercase tracking-[0.25em] text-brand mb-4">Game of the Week</p>
        <Crowned gotw={data.gameOfTheWeek} timeZone={week.timeZone} />
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Vote for <span className="text-brand">next week's</span> game
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              The winner is the Game of the Week from {day(nextReignStarts, week.timeZone)}. You can change your vote until voting closes.
            </p>
          </div>
          <p className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-700 text-sm font-semibold text-slate-200">
            <Clock className="w-4 h-4 text-brand" aria-hidden="true" />
            Voting closes Saturday at midnight · {timeLeft}
          </p>
        </div>
        <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {candidates.map((candidate) => (
            <Candidate
              key={candidate.game.id}
              candidate={candidate}
              mine={myVote === candidate.game.id}
              voted={voted}
              total={totalVotes}
              onVote={vote}
              busy={busy}
            />
          ))}
        </ul>
        <p className="mt-4 text-sm text-slate-500">
          {voted ? `${totalVotes} ${totalVotes === 1 ? 'player has' : 'players have'} voted so far.` : session ? 'Results show once you vote.' : 'Log in to vote. Results show once you vote.'}
        </p>
      </section>
    </div>
  );
};

export default GameOfTheWeek;
