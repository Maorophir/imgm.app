/**
 * Game of the Week — Route: /game-of-the-week
 *
 *   the crown     last week's winner: the Game of the Week for these 7 days, with
 *                 what players think of it, its most helpful reviews, and past winners
 *   your record   voting streak, winners picked (3 = Kingmaker), your nomination
 *   the ballot    this week's candidates (each from a different source, labelled);
 *                 players vote Sunday to Saturday, Israel time. A vote is final (the
 *                 card asks to confirm first), and results show once you've voted.
 * Everything comes from /api/gotw; the server closes each week by itself (lib/gotw.js).
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PlayerVerdict from '../components/game/PlayerVerdict';
import GamePicker from '../components/reviewQuest/GamePicker';
import { getRarity } from '../components/reviewQuest/questOptions';
import { Check, Clock, Crown, LogIn, Vote, Flame, Gem, Heart, Landmark, PartyPopper, Sparkles, ThumbsUp, Trophy, TrendingUp, Users } from 'lucide-react';
import { getGame, getGameReviews, getGotw, getGotwHistory, nominateGotw, voteGotw } from '../lib/api';
import { useSession } from '../lib/authClient';
import BacklogButton from '../components/BacklogButton';
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

const Crowned = ({ gotw, timeZone, pickedWinner }) => {
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
    // The animated gold foil frame of a Legendary review card (index.css .rarity-frame)
    <div className="rarity-frame is-legendary !rounded-[28px] shadow-[0_0_60px_-10px_rgb(251_191_36/0.45)]">
    <div className="relative overflow-hidden rounded-[25px] min-h-[380px] flex items-end bg-slate-950">
      {art && <img src={art} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/20" />
      <div className="relative p-6 md:p-10 flex flex-col md:flex-row md:items-end gap-6 w-full">
        {game.coverUrl && <img src={game.coverUrl} alt="" className="hidden md:block w-36 rounded-xl shadow-2xl border border-white/10" />}
        <div className="flex-1 min-w-0">
          {/* (the "Game of the Week" crown header sits above the frame) */}
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-300">
            {day(gotw.reignsFrom, timeZone)} – {day(reignEnds, timeZone)}
          </p>
          <h2 className="font-display text-5xl md:text-7xl uppercase tracking-tight text-white leading-none mt-1">{game.title}</h2>
          <p className="mt-3 text-slate-300">
            Chosen by IMGM players{share != null && <> · <span className="font-bold text-white">{share}%</span> of {gotw.totalVotes} votes</>}
            {gotw.topRank && <> · <Link to="/hall-of-fame" className="font-bold text-white hover:text-brand">#{gotw.topRank} in the Hall of Fame</Link></>}
          </p>
          {pickedWinner && (
            <p className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/15 border border-brand/60 text-sm font-bold text-white">
              <PartyPopper className="w-4 h-4 text-brand" aria-hidden="true" /> You picked the winner!
            </p>
          )}
        </div>
        <div className="self-start md:self-end flex flex-col items-start md:items-end gap-3">
          <Link to={`/game/${game.id}`} className="px-6 py-3 rounded-full font-bold bg-brand hover:brightness-110 text-slate-950 shadow-[0_8px_24px_-8px_var(--color-brand)] transition whitespace-nowrap">
            See the game
          </Link>
          <BacklogButton gameId={game.id} source="gotw" variant="pill" />
        </div>
      </div>
    </div>
    </div>
  );
};

const Candidate = ({ candidate, mine, voted, total, confirming, onPick, onConfirm, onCancel, busy, canVote }) => {
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
        {mine ? (
          <p className="mt-auto inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold bg-brand text-slate-950">
            <Check className="w-4 h-4" aria-hidden="true" /> Your vote
          </p>
        ) : voted || !canVote ? null : confirming ? (
          // Votes are final: one more click to be sure
          <div className="mt-auto flex flex-col gap-2 animate-fade-in">
            <p className="text-xs text-slate-300 text-center">Lock in your vote? You can't change it this week.</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={onCancel} disabled={busy} className="py-2 rounded-xl text-sm font-bold border border-slate-700 text-slate-300 hover:text-white transition">
                Cancel
              </button>
              <button type="button" onClick={() => onConfirm(game.id)} disabled={busy} className="py-2 rounded-xl text-sm font-bold bg-brand text-slate-950 hover:brightness-110 transition disabled:opacity-50">
                {busy ? '…' : 'Confirm'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onPick(game.id)}
            className="mt-auto py-2.5 rounded-xl text-sm font-bold border border-slate-700 text-white hover:border-brand/60 hover:bg-white/5 transition"
          >
            Vote
          </button>
        )}
      </div>
    </li>
  );
};

// The winner's 3 most helpful reviews, as short quotes
const TopReviews = ({ gameId }) => {
  const [reviews, setReviews] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    getGameReviews(gameId, { sort: 'helpful', offset: 0, limit: 3 }, controller.signal)
      .then((page) => setReviews(page.reviews.filter((r) => r.reviewText?.trim())))
      .catch(() => setReviews([]));
    return () => controller.abort();
  }, [gameId]);
  if (!reviews?.length) return null;
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">
        Most <span className="text-brand">helpful</span> reviews
      </h2>
      <ul className="grid md:grid-cols-3 gap-4">
        {reviews.map((review) => {
          const rarity = getRarity(review.rating);
          const text = (review.masked?.reviewText ?? review.reviewText).trim();
          return (
            <li key={review.id} className="flex flex-col gap-3 p-5 rounded-2xl bg-slate-900/60 border border-slate-800" style={{ boxShadow: `inset 3px 0 0 ${rarity.color}` }}>
              <p className="text-xs font-bold" style={{ color: rarity.color }}>
                <span className="uppercase tracking-wider">{rarity.label}</span> {review.rating}/10
              </p>
              <p className="text-slate-200 leading-relaxed line-clamp-5">“{text}”</p>
              <p className="mt-auto flex items-center justify-between text-xs text-slate-500">
                <span>{review.user?.displayUsername ?? 'A player'}</span>
                {review.helpfulCount > 0 && (
                  <span className="inline-flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" /> {review.helpfulCount}</span>
                )}
              </p>
            </li>
          );
        })}
      </ul>
      <Link to={`/game/${gameId}#reviews`} className="inline-block mt-4 text-sm font-bold text-brand hover:underline">Read every review →</Link>
    </div>
  );
};

// Everything about the reigning winner below its banner
const CrownedDetails = ({ gameId }) => {
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    getGame(gameId, controller.signal).then(setGame).catch(() => {});
    return () => controller.abort();
  }, [gameId]);
  return (
    <>
      {game && (
        <PlayerVerdict
          game={game}
          embedded
          title={<>Why <span className="text-brand">players</span> love it</>}
          onRatingClick={() => navigate(`/game/${gameId}#reviews`)}
        />
      )}
      <TopReviews gameId={gameId} />
    </>
  );
};

// Streak, winners picked, the Kingmaker title
const MyRecord = ({ me }) => (
  <div className="flex flex-wrap gap-2">
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-700 text-sm font-semibold text-slate-200">
      <Flame className="w-4 h-4 text-orange-400" aria-hidden="true" /> Streak: {me.streak} {me.streak === 1 ? 'week' : 'weeks'}
    </span>
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-700 text-sm font-semibold text-slate-200">
      <Trophy className="w-4 h-4 text-amber-300" aria-hidden="true" /> Winners picked: {me.winnersPicked}
    </span>
    {me.kingmaker && (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-300/10 border border-amber-300/50 text-sm font-bold text-amber-200">
        <Crown className="w-4 h-4" aria-hidden="true" /> Kingmaker
      </span>
    )}
  </div>
);

// Nominate a game for next week's "Player pick" slot
const Nominate = ({ nomination, onChange, busy }) => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col md:flex-row md:items-center gap-4">
    <div className="md:w-1/2">
      <p className="inline-flex items-center gap-2 font-bold text-white">
        <Users className="w-4 h-4 text-brand" aria-hidden="true" /> Nominate a game for next week
      </p>
      <p className="text-sm text-slate-400 mt-1">The game players nominate most joins next week's ballot as the Player pick. You can change it all week.</p>
    </div>
    <div className={`md:w-1/2 ${busy ? 'opacity-60 pointer-events-none' : ''}`}>
      <GamePicker value={nomination} onChange={onChange} placeholder="Search a game to nominate…" />
    </div>
  </div>
);

// Past Games of the Week
const PastWinners = ({ timeZone }) => {
  const [winners, setWinners] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    getGotwHistory(controller.signal).then(setWinners).catch(() => setWinners([]));
    return () => controller.abort();
  }, []);
  if (!winners?.length) return null;
  return (
    <section>
      <h2 className="text-2xl font-bold text-white mb-6">
        Past <span className="text-brand">winners</span>
      </h2>
      <ul className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        {winners.map((w) => (
          <li key={w.votedIn}>
            <Link to={`/game/${w.game.id}`} className="group flex flex-col gap-2">
              {w.game.coverUrl ? (
                <img src={w.game.coverUrl} alt="" loading="lazy" className="w-full aspect-[3/4] rounded-xl object-cover bg-slate-800 group-hover:ring-2 group-hover:ring-amber-300/70 transition" />
              ) : (
                <div className="w-full aspect-[3/4] rounded-xl bg-slate-800" />
              )}
              <span className="text-sm font-semibold text-slate-200 leading-tight line-clamp-2 group-hover:text-white">{w.game.title}</span>
              <span className="text-xs text-slate-500">Week of {day(w.reignsFrom, timeZone)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

const GameOfTheWeek = () => {
  const { data: session } = useSession();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(null); // the game whose vote awaits a confirm
  const [xpToast, setXpToast] = useState(null); // "+5 XP" after voting
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

  const pick = (gameId) => setConfirming(gameId);

  const vote = async (gameId) => {
    setBusy(true);
    try {
      const result = await voteGotw(gameId);
      setData(result);
      setXpToast(result.me?.voteXp ?? 5);
      setTimeout(() => setXpToast(null), 3500);
    } catch {
      setAttempt((n) => n + 1); // reload the ballot (e.g. the week just closed)
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  };

  const nominate = async (game) => {
    setBusy(true);
    try {
      setData(await nominateGotw(game?.id ?? null));
    } catch {
      setAttempt((n) => n + 1);
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
      {/* The throne: this week's winner, in gold */}
      <section className="relative rounded-[2.5rem] border border-amber-300/20 bg-gradient-to-b from-amber-300/[0.07] via-slate-900/30 to-transparent px-4 py-8 md:p-10 flex flex-col gap-12">
        <header className="flex items-center justify-center gap-4 text-amber-300">
          <span className="h-px w-8 md:w-32 bg-gradient-to-r from-transparent to-amber-300/60" />
          <span className="flex flex-col items-center gap-1">
            <Crown className="w-7 h-7" aria-hidden="true" />
            <span className="text-xs md:text-sm font-black uppercase tracking-[0.2em] md:tracking-[0.35em] whitespace-nowrap">Game of the Week</span>
          </span>
          <span className="h-px w-8 md:w-32 bg-gradient-to-l from-transparent to-amber-300/60" />
        </header>
        <Crowned gotw={data.gameOfTheWeek} timeZone={week.timeZone} pickedWinner={data.me?.pickedWinner} />
        {data.gameOfTheWeek && <CrownedDetails gameId={data.gameOfTheWeek.game.id} />}
      </section>

      {/* The ballot: next week's vote, in lime */}
      <section className="rounded-[2.5rem] border border-slate-800 bg-slate-900/40 px-4 py-8 md:p-10 shadow-[inset_0_3px_0_var(--color-brand)]">
        <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.3em] text-brand mb-3">
          <Vote className="w-4 h-4" aria-hidden="true" /> The ballot · voting now
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Vote for <span className="text-brand">next week's</span> game
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              The winner is the Game of the Week from {day(nextReignStarts, week.timeZone)}. One vote each, and it's final.
            </p>
          </div>
          <p className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-700 text-sm font-semibold text-slate-200">
            <Clock className="w-4 h-4 text-brand" aria-hidden="true" />
            Voting closes Saturday at midnight · {timeLeft}
          </p>
        </div>
        {data.me && <div className="mb-6"><MyRecord me={data.me} /></div>}
        <ul aria-label="This week's ballot" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {candidates.map((candidate) => (
            <Candidate
              key={candidate.game.id}
              candidate={candidate}
              mine={myVote === candidate.game.id}
              voted={voted}
              total={totalVotes}
              confirming={confirming === candidate.game.id}
              onPick={pick}
              onConfirm={vote}
              onCancel={() => setConfirming(null)}
              busy={busy}
              canVote={Boolean(session)}
            />
          ))}
        </ul>
        <p className="mt-4 text-sm text-slate-500">
          {voted ? `${totalVotes} ${totalVotes === 1 ? 'player has' : 'players have'} voted so far.` : session ? 'Results show once you vote.' : ''}
        </p>
        {!session && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-6 flex flex-col md:flex-row md:items-center gap-5">
            <span className="w-12 h-12 rounded-2xl grid place-items-center bg-brand/10 border border-brand/30 text-brand shrink-0">
              <Vote className="w-6 h-6" aria-hidden="true" />
            </span>
            <div className="flex-1">
              <p className="font-bold text-white text-lg">Log in to vote</p>
              <p className="text-sm text-slate-400 mt-0.5">
                Pick next week's Game of the Week, see the live results, nominate a game, and earn XP for every vote.
              </p>
            </div>
            <Link
              to="/login?redirect=%2Fgame-of-the-week"
              className="inline-flex items-center gap-2 self-start md:self-auto px-6 py-3 rounded-full font-bold bg-brand hover:brightness-110 text-slate-950 shadow-[0_8px_24px_-8px_var(--color-brand)] transition"
            >
              <LogIn className="w-4 h-4" aria-hidden="true" /> Log in to vote
            </Link>
          </div>
        )}
        {session && <div className="mt-8"><Nominate nomination={data.me?.nomination ?? null} onChange={nominate} busy={busy} /></div>}
      </section>

      <PastWinners timeZone={week.timeZone} />

      {/* The reward for voting: a little "+5 XP" that floats up and away */}
      {xpToast && (
        <div role="status" className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-xp-pop pointer-events-none">
          <p className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-brand text-slate-950 font-black shadow-[0_0_40px_-4px_var(--color-brand)]">
            <Sparkles className="w-5 h-5" aria-hidden="true" /> +{xpToast} XP
            <span className="font-bold text-slate-950/70">· thanks for voting!</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default GameOfTheWeek;
