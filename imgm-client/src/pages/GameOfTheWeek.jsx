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
 *
 * Noir: sections on hairlines (no glowing panels), the winner's art in the Legendary
 * gilt edge, Big Shoulders headings, and lime only on the page's main action: "Log in
 * to vote", or the "Confirm" that locks a vote in. Everything else is a ghost button
 * or a text link.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PlayerVerdict from '../components/game/PlayerVerdict';
import GamePicker from '../components/reviewQuest/GamePicker';
import RarityMark from '../components/RarityMark';
import { getRarity } from '../components/reviewQuest/questOptions';
import { ArrowRight, Check, Clock, Crown, LogIn, Send, Vote, Flame, Gem, Heart, Landmark, Sparkles, ThumbsUp, Trophy, TrendingUp, Users } from 'lucide-react';
import { getGame, getGameReviews, getGotw, getGotwHistory, nominateGotw, voteGotw } from '../lib/api';
import { useSession } from '../lib/authClient';
import { WRAP, SECTION_TITLE, PRIMARY_BUTTON, GHOST_BUTTON, TEXT_LINK, TEXT_BUTTON_SM } from '../lib/ui';
import BacklogButton from '../components/BacklogButton';
import LoadError from '../components/LoadError';

// The Legendary gilt, as the 2px edge around the winner's art
// The winner banner shows its share of the vote only from this many votes
const SHARE_MIN_VOTES = 20;

const GILT = { backgroundImage: 'var(--gradient-gilt)', backgroundSize: '260% 260%', backgroundPosition: '50% 50%' };

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
      <div className="py-10 text-center">
        <Crown className="w-9 h-9 mx-auto mb-3 text-rarity-legendary" strokeWidth={1.8} aria-hidden="true" />
        <p className="text-xl font-semibold text-white">The first Game of the Week is crowned Sunday</p>
        <p className="text-slate-400 mt-1">Vote below. The game with the most votes reigns for the whole week.</p>
      </div>
    );
  }
  const { game } = gotw;
  const art = game.artworks?.[0] ?? game.coverUrl;
  const reignEnds = new Date(new Date(gotw.reignsFrom).getTime() + 6 * 24 * 60 * 60 * 1000);
  // The winner's share of the vote, once there are enough votes for it to mean something
  // ("100% of 3 votes" says more about how few voted than about the game)
  const share = gotw.totalVotes >= SHARE_MIN_VOTES ? Math.round((gotw.votes / gotw.totalVotes) * 100) : null;
  return (
    // The winner's art in a 2px Legendary gilt edge
    <div className="p-[2px] rounded-sm" style={GILT}>
    <div className="relative overflow-hidden rounded-xs min-h-[380px] flex items-end bg-slate-950">
      {art && <img src={art} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/20" />
      <div className="relative p-6 md:p-10 flex flex-col md:flex-row md:items-end gap-6 w-full">
        {game.coverUrl && <img src={game.coverUrl} alt="" className="hidden md:block w-36 rounded-sm" />}
        <div className="flex-1 min-w-0">
          {/* (the "Game of the Week" crown header sits above the frame) */}
          <p className="text-sm tabular-nums text-slate-300">
            {day(gotw.reignsFrom, timeZone)} – {day(reignEnds, timeZone)}
          </p>
          <h2 className="font-display text-[54px] md:text-[88px] uppercase tracking-[.005em] text-white leading-[.9] mt-2 text-balance break-words">{game.title}</h2>
          <p className="mt-3 text-slate-300">
            Chosen by IMGM players{share != null && <> · <span className="font-semibold text-white tabular-nums">{share}%</span> of {gotw.totalVotes} votes</>}
            {gotw.topRank && <> · <Link to="/hall-of-fame" className={`font-medium text-white ${TEXT_LINK}`}>#{gotw.topRank} in the Hall of Fame</Link></>}
          </p>
          {pickedWinner && (
            <p className="mt-3 text-sm font-medium text-white">You picked the winner!</p>
          )}
        </div>
        <div className="self-start md:self-end flex flex-col items-start md:items-end gap-3">
          <Link to={`/game/${game.id}`} className={`${GHOST_BUTTON} bg-slate-950/60`}>
            See the game
          </Link>
          <BacklogButton gameId={game.id} source="gotw" variant="pill" className="bg-slate-950/60" />
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
    <li className={`relative flex flex-col rounded-sm border bg-slate-900 overflow-hidden transition-colors duration-120 ${mine ? 'border-white' : 'border-slate-700'}`}>
      <Link to={`/game/${game.id}`} className="relative block">
        {game.coverUrl ? (
          <img src={game.coverUrl} alt="" loading="lazy" className="w-full aspect-[3/4] object-cover bg-slate-800" />
        ) : (
          <div className="w-full aspect-[3/4] bg-slate-800" />
        )}
        <span className="absolute top-2 left-2 inline-flex items-center gap-1.5 h-7 px-2 rounded-xs bg-slate-950/90 border border-slate-600 text-xs font-medium text-white">
          <Icon className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.8} aria-hidden="true" /> {label}
        </span>
      </Link>
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="min-w-0">
          <Link to={`/game/${game.id}`} className="font-medium text-white leading-tight line-clamp-2 underline decoration-1 underline-offset-4 decoration-transparent hover:decoration-white transition-[text-decoration-color] duration-120">{game.title}</Link>
          <p className="text-sm text-slate-400 mt-0.5">{[year, game.genres?.[0]].filter(Boolean).join(' · ')}</p>
        </div>
        {voted && (
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-semibold text-white tabular-nums">{share}%</span>
              <span className="text-slate-400 tabular-nums">{votes} {votes === 1 ? 'vote' : 'votes'}</span>
            </div>
            <div className="h-1 bg-slate-700">
              <div className={`h-full transition-[width] duration-500 ${mine ? 'bg-white' : 'bg-slate-500'}`} style={{ width: `${share}%` }} />
            </div>
          </div>
        )}
        {mine ? (
          <p className="mt-auto inline-flex items-center justify-center gap-1.5 h-11 text-sm font-medium text-white">
            <Check className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" /> Your vote
          </p>
        ) : voted || !canVote ? null : confirming ? (
          // Votes are final: one more click to be sure. Confirm is the page's one lime
          // action while it's up.
          <div className="mt-auto flex flex-col gap-2 animate-fade-in">
            <p className="text-sm text-slate-300 text-center">Lock in your vote? You can't change it this week.</p>
            <button type="button" onClick={() => onConfirm(game.id)} disabled={busy} className={`${PRIMARY_BUTTON} w-full`}>
              {busy ? 'Voting…' : 'Confirm'}
            </button>
            <button type="button" onClick={onCancel} disabled={busy} className={`${TEXT_BUTTON_SM} self-center`}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => onPick(game.id)} className={`${GHOST_BUTTON} mt-auto w-full`}>
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
      <h2 className={`${SECTION_TITLE} mb-8`}>Most helpful reviews</h2>
      <ul className="grid md:grid-cols-3 gap-x-8 gap-y-8">
        {reviews.map((review) => {
          const rarity = getRarity(review.rating);
          const text = (review.masked?.reviewText ?? review.reviewText).trim();
          return (
            <li key={review.id} className="flex flex-col gap-3 pt-5 border-t border-slate-700">
              <p className="flex items-center gap-2 text-sm" style={{ color: rarity.color }}>
                <RarityMark tier={rarity.key} />
                <span className="font-semibold">{rarity.label}</span>
                <span className="tabular-nums text-slate-400">{review.rating}/10</span>
              </p>
              {/* A review quote: the serif, its opening mark hanging in the margin (the
                  box reaches left so the clamp doesn't cut the mark off) */}
              <blockquote className="-ml-[.42em] pl-[.42em] -indent-[.42em] font-serif italic text-lg leading-[1.4] text-white line-clamp-5">“{text}”</blockquote>
              <p className="mt-auto flex items-center justify-between text-sm text-slate-400">
                <span>{review.user?.displayUsername ?? 'A player'}</span>
                {review.helpfulCount > 0 && (
                  <span className="inline-flex items-center gap-1 tabular-nums"><ThumbsUp className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" /> {review.helpfulCount}</span>
                )}
              </p>
            </li>
          );
        })}
      </ul>
      <Link to={`/game/${gameId}#reviews`} className={`inline-flex items-center gap-1.5 h-11 mt-4 text-sm font-medium text-white ${TEXT_LINK}`}>
        Read every review <ArrowRight className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
      </Link>
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
          title="Why players love it"
          onRatingClick={() => navigate(`/game/${gameId}#reviews`)}
        />
      )}
      <TopReviews gameId={gameId} />
    </>
  );
};

// Streak, winners picked, the Kingmaker title
const RECORD_CHIP = 'inline-flex items-center gap-1.5 h-9 px-3 rounded-sm border text-sm font-medium';
const MyRecord = ({ me }) => (
  <div className="flex flex-wrap gap-2">
    <span className={`${RECORD_CHIP} border-slate-600 text-white`}>
      <Flame className="w-4 h-4 text-slate-400" strokeWidth={1.8} aria-hidden="true" /> Streak: <span className="tabular-nums">{me.streak}</span> {me.streak === 1 ? 'week' : 'weeks'}
    </span>
    <span className={`${RECORD_CHIP} border-slate-600 text-white`}>
      <Trophy className="w-4 h-4 text-rarity-legendary" strokeWidth={1.8} aria-hidden="true" /> Winners picked: <span className="tabular-nums">{me.winnersPicked}</span>
    </span>
    {me.kingmaker && (
      <span className={`${RECORD_CHIP} border-rarity-legendary-edge text-rarity-legendary`}>
        <Crown className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> Kingmaker
      </span>
    )}
  </div>
);

// Nominate a game for next week's "Player pick" slot: pick it, then send it
const Nominate = ({ nomination, onChange, busy }) => {
  const [draft, setDraft] = useState(null); // picked but not sent yet
  const [changing, setChanging] = useState(false);
  const picking = !nomination || changing;
  const send = async () => {
    await onChange(draft);
    setDraft(null);
    setChanging(false);
  };
  return (
    <div className="border-t border-slate-700 pt-6 flex flex-col md:flex-row md:items-center gap-4">
      <div className="md:w-1/2">
        <p className="inline-flex items-center gap-2 font-semibold text-white">
          <Users className="w-4 h-4 text-slate-400" strokeWidth={1.8} aria-hidden="true" /> Nominate a game for next week
        </p>
        <p className="text-sm text-slate-400 mt-1">The game players nominate most joins next week's ballot as the Player pick. You can change it all week.</p>
      </div>
      <div className={`md:w-1/2 flex flex-col gap-3 ${busy ? 'opacity-60 pointer-events-none' : ''}`}>
        {picking ? (
          <>
            <GamePicker value={draft} onChange={setDraft} placeholder="Search a game to nominate…" />
            {draft && (
              <div className="flex gap-2">
                <button type="button" onClick={send} className={GHOST_BUTTON}>
                  <Send className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> Nominate
                </button>
                {nomination && (
                  <button type="button" onClick={() => { setDraft(null); setChanging(false); }} className={GHOST_BUTTON}>
                    Cancel
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-3 p-2 pr-3 rounded-sm bg-slate-800 border border-white">
            {nomination.coverUrl ? <img src={nomination.coverUrl} alt="" className="w-10 h-14 object-cover rounded-sm shrink-0" /> : <div className="w-10 h-14 rounded-sm bg-slate-900 shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-400 inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" strokeWidth={2.2} aria-hidden="true" /> Nominated</p>
              <p className="font-medium text-white text-sm leading-tight line-clamp-2">{nomination.title}</p>
            </div>
            <button type="button" onClick={() => setChanging(true)} className={TEXT_BUTTON_SM}>Change</button>
          </div>
        )}
      </div>
    </div>
  );
};

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
    <section className="border-t border-slate-700 pt-12">
      <h2 className={`${SECTION_TITLE} mb-8`}>Past winners</h2>
      <ul className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        {winners.map((w) => (
          <li key={w.votedIn}>
            <Link to={`/game/${w.game.id}`} className="group flex flex-col gap-2">
              {w.game.coverUrl ? (
                <img src={w.game.coverUrl} alt="" loading="lazy" className="w-full aspect-[3/4] rounded-sm object-cover bg-slate-800 group-hover:ring-2 group-hover:ring-white/60 transition-shadow duration-120" />
              ) : (
                <div className="w-full aspect-[3/4] rounded-sm bg-slate-800" />
              )}
              <span className="text-sm font-medium text-white leading-tight line-clamp-2 underline decoration-1 underline-offset-4 decoration-transparent group-hover:decoration-white transition-[text-decoration-color] duration-120">{w.game.title}</span>
              <span className="text-sm text-slate-400">Week of {day(w.reignsFrom, timeZone)}</span>
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

  if (error) return <div className={`${WRAP} py-16`}><LoadError title="Couldn't load Game of the Week" onRetry={() => setAttempt((n) => n + 1)} /></div>;
  if (!data) return <div className={`${WRAP} py-10`}><div className="h-[360px] rounded-sm bg-slate-900 motion-safe:animate-pulse" /></div>;

  const { week, candidates, myVote, totalVotes } = data;
  const voted = myVote != null;
  const nextReignStarts = week.endsAt;

  return (
    <div className={`${WRAP} py-10 flex flex-col gap-14`}>
      {/* The throne: this week's winner, in its gilt edge */}
      <section className="flex flex-col gap-12">
        <header className="flex items-center justify-center gap-4">
          <span className="h-px w-8 md:w-32 bg-slate-700" />
          <span className="flex flex-col items-center gap-2">
            <Crown className="w-7 h-7 text-rarity-legendary" strokeWidth={1.8} aria-hidden="true" />
            <span className="font-display text-[34px] leading-none tracking-[.005em] text-white whitespace-nowrap">Game of the Week</span>
          </span>
          <span className="h-px w-8 md:w-32 bg-slate-700" />
        </header>
        <Crowned gotw={data.gameOfTheWeek} timeZone={week.timeZone} pickedWinner={data.me?.pickedWinner} />
        {data.gameOfTheWeek && <CrownedDetails gameId={data.gameOfTheWeek.game.id} />}
      </section>

      {/* The ballot: next week's vote */}
      <section className="border-t border-slate-700 pt-12">
        <p className="inline-flex items-center gap-2 text-sm text-slate-400 mb-3">
          <Vote className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> The ballot · voting now
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className={SECTION_TITLE}>Vote for next week's game</h1>
            <p className="text-slate-400 text-sm mt-3">
              The winner is the Game of the Week from {day(nextReignStarts, week.timeZone)}. One vote each, and it's final.
            </p>
          </div>
          <p className="inline-flex items-center gap-2 text-sm text-slate-300">
            <Clock className="w-4 h-4 text-slate-400" strokeWidth={1.8} aria-hidden="true" />
            Voting closes Saturday at midnight · <span className="tabular-nums">{timeLeft}</span>
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
        <p className="mt-4 text-sm text-slate-400">
          {voted ? `${totalVotes} ${totalVotes === 1 ? 'player has' : 'players have'} voted so far.` : session ? 'Results show once you vote.' : ''}
        </p>
        {!session && (
          <div className="mt-6 border-t border-slate-700 pt-6 flex flex-col md:flex-row md:items-center gap-5">
            <div className="flex-1">
              <p className="font-semibold text-white text-lg">Log in to vote</p>
              <p className="text-sm text-slate-400 mt-0.5">
                Pick next week's Game of the Week, see the live results, nominate a game, and earn XP for every vote.
              </p>
            </div>
            {/* Logged out, this is the page's main action: the one lime button */}
            <Link to="/login?redirect=%2Fgame-of-the-week" className={`${PRIMARY_BUTTON} self-start md:self-auto`}>
              <LogIn className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> Log in to vote
            </Link>
          </div>
        )}
        {session && <div className="mt-8"><Nominate nomination={data.me?.nomination ?? null} onChange={nominate} busy={busy} /></div>}
      </section>

      <PastWinners timeZone={week.timeZone} />

      {/* The reward for voting: a little "+5 XP" that floats up and away */}
      {xpToast && (
        <div role="status" className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-xp-pop pointer-events-none">
          <p className="inline-flex items-center gap-2 h-12 px-5 rounded-sm border border-slate-600 bg-slate-900 text-white font-medium whitespace-nowrap shadow-[0_32px_64px_-24px_rgba(0,0,0,.85)]">
            <Sparkles className="w-4 h-4 text-rarity-legendary" strokeWidth={1.8} aria-hidden="true" />
            <span className="font-semibold tabular-nums">+{xpToast} XP</span>
            <span className="text-slate-300">· thanks for voting!</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default GameOfTheWeek;
