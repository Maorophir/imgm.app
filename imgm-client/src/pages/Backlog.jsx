/**
 * Backlog — Route: /backlog
 *
 * The games you saved to play later, in two lists: To play and Finished. "My order" is
 * yours to arrange (new games land on top; move any game up, down, to the top or the
 * bottom); the other views just sort for a moment. Each game: Review (or edit your
 * review), Finished it (it moves to Finished, with a lime mark; it can go back) and ✕
 * to remove it. Reviewing never marks a game by itself: plenty of players review mid-game.
 */
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Bookmark, Check, CircleCheck, ChevronDown, ChevronsDown, ChevronsUp, ChevronUp, PenLine, RotateCcw, Sparkles, Star, X } from 'lucide-react';
import { getBacklog, reorderBacklog, setBacklogFinished } from '../lib/api';
import { useSession } from '../lib/authClient';
import { useBacklog } from '../context/BacklogContext';
import { getRarity } from '../components/reviewQuest/questOptions';
import { timeAgo } from '../lib/timeAgo';

const FROM = { play_next: 'Play Next', game_page: 'a game page', hall_of_fame: 'the Hall of Fame', gotw: 'Game of the Week' };
const LISTS = [
  { value: 'toPlay', label: 'To play' },
  { value: 'finished', label: 'Finished' },
];
const VIEWS = {
  toPlay: [
    { value: 'mine', label: 'My order' },
    { value: 'added', label: 'Recently added' },
    { value: 'score', label: 'IMGM score' },
    { value: 'title', label: 'A–Z' },
  ],
  finished: [
    { value: 'finished', label: 'Recently finished' },
    { value: 'score', label: 'IMGM score' },
    { value: 'title', label: 'A–Z' },
  ],
};
const SORTS = {
  added: (a, b) => new Date(b.addedAt) - new Date(a.addedAt),
  finished: (a, b) => new Date(b.finishedAt) - new Date(a.finishedAt),
  score: (a, b) => (b.average ?? -1) - (a.average ?? -1),
  title: (a, b) => a.game.title.localeCompare(b.game.title),
};

const ago = (date) => (timeAgo(date) === 'just now' ? 'just now' : `${timeAgo(date)} ago`);

const MoveButton = ({ icon: Icon, label, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition disabled:opacity-25 disabled:hover:bg-transparent"
  >
    <Icon className="w-4 h-4" aria-hidden="true" />
  </button>
);

const Backlog = () => {
  const { data: session, isPending } = useSession();
  const backlog = useBacklog();
  const [items, setItems] = useState(null);
  const [list, setList] = useState('toPlay');
  const [views, setViews] = useState({ toPlay: 'mine', finished: 'finished' }); // each list keeps its own
  const view = views[list];
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return undefined;
    const controller = new AbortController();
    getBacklog(controller.signal).then(setItems).catch(() => setItems([]));
    return () => controller.abort();
  }, [userId]);

  if (isPending) return <div className="min-h-[70vh] animate-pulse" />;
  if (!session) return <Navigate to="/login?redirect=%2Fbacklog" replace />;

  // Removed here or anywhere else on the page: it leaves the list
  const kept = (items ?? []).filter((item) => backlog?.has(item.game.id));
  const toPlay = kept.filter((item) => !item.finishedAt);
  const finished = kept.filter((item) => item.finishedAt);
  const inList = list === 'finished' ? finished : toPlay;
  const shown = view === 'mine' ? inList : [...inList].sort(SORTS[view]);

  // Move one game in "My order" (To play): update at once, then save the whole order
  const move = (index, to) => {
    const next = [...toPlay];
    const [item] = next.splice(index, 1);
    next.splice(Math.max(0, Math.min(to, next.length)), 0, item);
    setItems([...next, ...finished]);
    reorderBacklog(next.map((i) => i.game.id)).catch(() => {});
  };

  // Finished it (or back to To play): moves list at once; back as it was if the server refuses
  const markFinished = (gameId, done) => {
    const set = (finishedAt) => setItems((current) => current.map((i) => (i.game.id === gameId ? { ...i, finishedAt } : i)));
    const before = kept.find((i) => i.game.id === gameId)?.finishedAt ?? null;
    set(done ? new Date().toISOString() : null);
    setBacklogFinished(gameId, done).catch(() => set(before));
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-brand">Your</p>
          <h1 className="font-display text-5xl md:text-6xl uppercase tracking-tight text-white">
            Backlog<span className="text-brand">.</span>
          </h1>
          <p className="text-slate-400 mt-2">Games you saved to play later. Finished one? Mark it, and it moves to Finished.</p>
        </div>
        {inList.length > 1 && (
          <label className="flex items-center gap-2 text-sm text-slate-400">
            Show
            <select
              value={view}
              onChange={(e) => setViews({ ...views, [list]: e.target.value })}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-semibold focus:border-brand outline-none"
            >
              {VIEWS[list].map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </label>
        )}
      </header>

      {kept.length > 0 && (
        <div className="flex gap-2" role="tablist" aria-label="Backlog lists">
          {LISTS.map((l) => {
            const count = l.value === 'finished' ? finished.length : toPlay.length;
            const active = list === l.value;
            return (
              <button
                key={l.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setList(l.value)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border transition ${
                  active ? 'bg-brand text-slate-950 border-brand' : 'border-slate-700 text-slate-300 hover:text-white hover:border-slate-500'
                }`}
              >
                {l.value === 'finished' && <CircleCheck className="w-4 h-4" aria-hidden="true" />}
                {l.label}
                <span className={`tabular-nums ${active ? 'text-slate-950/70' : 'text-slate-500'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {items === null ? (
        <div className="flex flex-col gap-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 rounded-2xl bg-slate-900/50 animate-pulse" />)}</div>
      ) : kept.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-700 p-10 text-center">
          <Bookmark className="w-10 h-10 mx-auto mb-3 text-brand" aria-hidden="true" />
          <p className="text-xl font-bold text-white">Your Backlog is empty</p>
          <p className="text-slate-400 mt-1">Save games from Play Next, the Hall of Fame or any game page to play them later.</p>
          <Link to="/play-next" className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-full font-bold bg-brand hover:brightness-110 text-slate-950 transition">
            <Sparkles className="w-4 h-4" aria-hidden="true" /> Find games with Play Next
          </Link>
        </div>
      ) : inList.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-700 p-10 text-center">
          <CircleCheck className="w-10 h-10 mx-auto mb-3 text-brand" aria-hidden="true" />
          {list === 'finished' ? (
            <>
              <p className="text-xl font-bold text-white">No finished games yet</p>
              <p className="text-slate-400 mt-1">Done with a game? Press Finished it, and it lands here.</p>
            </>
          ) : (
            <>
              <p className="text-xl font-bold text-white">You finished them all</p>
              <p className="text-slate-400 mt-1">Time for something new.</p>
              <Link to="/play-next" className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-full font-bold bg-brand hover:brightness-110 text-slate-950 transition">
                <Sparkles className="w-4 h-4" aria-hidden="true" /> Find games with Play Next
              </Link>
            </>
          )}
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {shown.map((item, index) => {
            const { game } = item;
            const year = game.releaseDate ? new Date(game.releaseDate).getFullYear() : null;
            const rarity = item.average != null ? getRarity(Math.round(item.average)) : null;
            return (
              <li key={game.id} className="flex items-center gap-3 sm:gap-4 p-3 rounded-2xl bg-slate-900/60 border border-slate-800 animate-fade-in">
                {view === 'mine' && (
                  <div className="flex flex-col shrink-0" role="group" aria-label={`Move ${game.title}`}>
                    <MoveButton icon={ChevronsUp} label="Move to the top" onClick={() => move(index, 0)} disabled={index === 0} />
                    <MoveButton icon={ChevronUp} label="Move up" onClick={() => move(index, index - 1)} disabled={index === 0} />
                    <MoveButton icon={ChevronDown} label="Move down" onClick={() => move(index, index + 1)} disabled={index === toPlay.length - 1} />
                    <MoveButton icon={ChevronsDown} label="Move to the bottom" onClick={() => move(index, toPlay.length - 1)} disabled={index === toPlay.length - 1} />
                  </div>
                )}
                <Link to={`/game/${game.id}`} className="shrink-0">
                  {game.coverUrl ? (
                    <img src={game.coverUrl} alt="" loading="lazy" className="w-16 h-[5.5rem] rounded-lg object-cover bg-slate-800" />
                  ) : (
                    <div className="w-16 h-[5.5rem] rounded-lg bg-slate-800" />
                  )}
                </Link>
                <div className="min-w-0 flex-1 flex flex-col gap-1">
                  <Link to={`/game/${game.id}`} className="font-bold text-white text-lg leading-tight truncate hover:text-brand transition">
                    {view === 'mine' && <span className="text-slate-500 mr-1.5 tabular-nums">{index + 1}.</span>}
                    {game.title}
                  </Link>
                  {item.finishedAt && (
                    <span className="self-start inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand/15 border border-brand/50 text-brand text-[11px] font-black uppercase tracking-wider">
                      <Check className="w-3 h-3" strokeWidth={3} aria-hidden="true" /> Finished
                    </span>
                  )}
                  <p className="text-xs text-slate-400 truncate">{[year, ...(game.platforms ?? []).slice(0, 3)].filter(Boolean).join(' · ')}</p>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    {rarity ? (
                      <span className="inline-flex items-center gap-1.5 font-bold text-white">
                        <Star className="w-4 h-4" style={{ color: rarity.color, fill: rarity.color }} aria-hidden="true" />
                        {item.average.toFixed(1)} <span className="font-normal text-slate-500">({item.reviewCount})</span>
                      </span>
                    ) : (
                      <span className="text-slate-500">No IMGM reviews yet</span>
                    )}
                    {item.myRating && (
                      <span className="text-xs text-slate-300">
                        Your score <span className="font-bold" style={{ color: getRarity(item.myRating).color }}>{item.myRating}/10</span>
                      </span>
                    )}
                    <span className="text-xs text-slate-500">
                      {item.finishedAt ? (
                        `Finished ${ago(item.finishedAt)}`
                      ) : (
                        <>
                          Added {ago(item.addedAt)}
                          {FROM[item.source] && ` from ${FROM[item.source]}`}
                        </>
                      )}
                    </span>
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                  <Link
                    to={`/game/${game.id}/review`}
                    title={item.myRating ? 'Edit your review' : 'Review it'}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold bg-brand text-slate-950 hover:brightness-110 transition"
                  >
                    <PenLine className="w-4 h-4" aria-hidden="true" /> <span className="hidden sm:inline">{item.myRating ? 'Edit review' : 'Review'}</span>
                  </Link>
                  {item.finishedAt ? (
                    <button
                      type="button"
                      onClick={() => markFinished(game.id, false)}
                      aria-label={`Move ${game.title} back to To play`}
                      title="Not finished after all: back to To play"
                      className="inline-flex items-center justify-center px-3 py-2 rounded-xl text-sm font-bold border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition"
                    >
                      <RotateCcw className="w-4 h-4" aria-hidden="true" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => markFinished(game.id, true)}
                      aria-label={`Mark ${game.title} as finished`}
                      title="Finished it: move it to Finished"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border border-brand/60 text-brand hover:bg-brand/10 transition"
                    >
                      <CircleCheck className="w-4 h-4" aria-hidden="true" /> <span className="hidden sm:inline">Finished it</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => backlog.toggle(game.id)}
                    aria-label={`Remove ${game.title} from your Backlog`}
                    title="Remove it from your Backlog"
                    className="inline-flex items-center justify-center px-3 py-2 rounded-xl text-sm font-bold border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

export default Backlog;
