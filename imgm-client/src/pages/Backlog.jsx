/**
 * Backlog — Route: /backlog
 *
 * The games you saved to play later. "My order" is yours to arrange (new games land
 * on top; move any game up, down, to the top or the bottom); the other views just
 * sort for a moment. "Finished" takes a game off the list. Reviewing never does it by
 * itself: plenty of players review mid-game.
 */
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Bookmark, Check, ChevronDown, ChevronsDown, ChevronsUp, ChevronUp, PenLine, Sparkles, Star, X } from 'lucide-react';
import { getBacklog, reorderBacklog } from '../lib/api';
import { useSession } from '../lib/authClient';
import { useBacklog } from '../context/BacklogContext';
import { getRarity } from '../components/reviewQuest/questOptions';
import { timeAgo } from '../lib/timeAgo';

const FROM = { play_next: 'Play Next', game_page: 'a game page', hall_of_fame: 'the Hall of Fame', gotw: 'Game of the Week' };
const VIEWS = [
  { value: 'mine', label: 'My order' },
  { value: 'added', label: 'Recently added' },
  { value: 'score', label: 'IMGM score' },
  { value: 'title', label: 'A–Z' },
];
const SORTS = {
  added: (a, b) => new Date(b.addedAt) - new Date(a.addedAt),
  score: (a, b) => (b.average ?? -1) - (a.average ?? -1),
  title: (a, b) => a.game.title.localeCompare(b.game.title),
};

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
  const [view, setView] = useState('mine');
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
  const shown = view === 'mine' ? kept : [...kept].sort(SORTS[view]);

  // Move one game in "My order": update at once, then save the whole order
  const move = (index, to) => {
    const next = [...kept];
    const [item] = next.splice(index, 1);
    next.splice(Math.max(0, Math.min(to, next.length)), 0, item);
    setItems(next);
    reorderBacklog(next.map((i) => i.game.id)).catch(() => {});
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-brand">Your</p>
          <h1 className="font-display text-5xl md:text-6xl uppercase tracking-tight text-white">
            Backlog<span className="text-brand">.</span>
          </h1>
          <p className="text-slate-400 mt-2">Games you saved to play later. Done with one? Mark it finished.</p>
        </div>
        {kept.length > 1 && (
          <label className="flex items-center gap-2 text-sm text-slate-400">
            Show
            <select
              value={view}
              onChange={(e) => setView(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-semibold focus:border-brand outline-none"
            >
              {VIEWS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </label>
        )}
      </header>

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
                    <MoveButton icon={ChevronDown} label="Move down" onClick={() => move(index, index + 1)} disabled={index === kept.length - 1} />
                    <MoveButton icon={ChevronsDown} label="Move to the bottom" onClick={() => move(index, kept.length - 1)} disabled={index === kept.length - 1} />
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
                      Added {timeAgo(item.addedAt) === 'just now' ? 'just now' : `${timeAgo(item.addedAt)} ago`}
                      {FROM[item.source] && ` from ${FROM[item.source]}`}
                    </span>
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => backlog.toggle(game.id)}
                    title="Finished it: take it off your Backlog"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold bg-brand text-slate-950 hover:brightness-110 transition"
                  >
                    <Check className="w-4 h-4" aria-hidden="true" /> <span className="hidden sm:inline">Finished</span>
                  </button>
                  <Link
                    to={`/game/${game.id}/review`}
                    title={item.myRating ? 'Edit your review' : 'Review it'}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border border-slate-700 text-slate-200 hover:text-white hover:border-slate-500 transition"
                  >
                    <PenLine className="w-4 h-4" aria-hidden="true" /> <span className="hidden sm:inline">{item.myRating ? 'Edit review' : 'Review'}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => backlog.toggle(game.id)}
                    aria-label={`Remove ${game.title} from your Backlog`}
                    title="Not interested anymore: remove it"
                    className="hidden sm:inline-flex items-center justify-center px-3 py-2 rounded-xl text-sm font-bold border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition"
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
