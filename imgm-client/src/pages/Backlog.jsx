/**
 * Backlog — Route: /backlog
 *
 * The games you saved to play later, newest first. Review one and it's checked off
 * by itself (the server removes it when the review is saved).
 */
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Bookmark, PenLine, Sparkles, Star, X } from 'lucide-react';
import { getBacklog } from '../lib/api';
import { useSession } from '../lib/authClient';
import { useBacklog } from '../context/BacklogContext';
import { getRarity } from '../components/reviewQuest/questOptions';
import { timeAgo } from '../lib/timeAgo';

const FROM = { play_next: 'Play Next', game_page: 'a game page', hall_of_fame: 'the Hall of Fame', gotw: 'Game of the Week' };

const Backlog = () => {
  const { data: session, isPending } = useSession();
  const backlog = useBacklog();
  const [items, setItems] = useState(null);
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
  const shown = (items ?? []).filter((item) => backlog?.has(item.game.id));

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 flex flex-col gap-8">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.25em] text-brand">Your</p>
        <h1 className="font-display text-5xl md:text-6xl uppercase tracking-tight text-white">
          Backlog<span className="text-brand">.</span>
        </h1>
        <p className="text-slate-400 mt-2">Games you saved to play later. Review one and it's checked off.</p>
      </header>

      {items === null ? (
        <div className="flex flex-col gap-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 rounded-2xl bg-slate-900/50 animate-pulse" />)}</div>
      ) : shown.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-700 p-10 text-center">
          <Bookmark className="w-10 h-10 mx-auto mb-3 text-brand" aria-hidden="true" />
          <p className="text-xl font-bold text-white">Your Backlog is empty</p>
          <p className="text-slate-400 mt-1">Save games from Play Next, the Hall of Fame or any game page to play them later.</p>
          <Link to="/play-next" className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-full font-bold bg-brand hover:brightness-110 text-slate-950 transition">
            <Sparkles className="w-4 h-4" aria-hidden="true" /> Find games with Play Next
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((item) => {
            const { game } = item;
            const year = game.releaseDate ? new Date(game.releaseDate).getFullYear() : null;
            const rarity = item.average != null ? getRarity(Math.round(item.average)) : null;
            return (
              <li key={game.id} className="flex items-center gap-4 p-3 rounded-2xl bg-slate-900/60 border border-slate-800 animate-fade-in">
                <Link to={`/game/${game.id}`} className="shrink-0">
                  {game.coverUrl ? (
                    <img src={game.coverUrl} alt="" loading="lazy" className="w-16 h-[5.5rem] rounded-lg object-cover bg-slate-800" />
                  ) : (
                    <div className="w-16 h-[5.5rem] rounded-lg bg-slate-800" />
                  )}
                </Link>
                <div className="min-w-0 flex-1 flex flex-col gap-1">
                  <Link to={`/game/${game.id}`} className="font-bold text-white text-lg leading-tight truncate hover:text-brand transition">{game.title}</Link>
                  <p className="text-xs text-slate-400 truncate">{[year, ...(game.platforms ?? []).slice(0, 3)].filter(Boolean).join(' · ')}</p>
                  <p className="flex flex-wrap items-center gap-x-3 text-sm">
                    {rarity ? (
                      <span className="inline-flex items-center gap-1.5 font-bold text-white">
                        <Star className="w-4 h-4" style={{ color: rarity.color, fill: rarity.color }} aria-hidden="true" />
                        {item.average.toFixed(1)} <span className="font-normal text-slate-500">({item.reviewCount})</span>
                      </span>
                    ) : (
                      <span className="text-slate-500">No IMGM reviews yet</span>
                    )}
                    <span className="text-xs text-slate-500">
                      Added {timeAgo(item.addedAt) === 'just now' ? 'just now' : `${timeAgo(item.addedAt)} ago`}
                      {FROM[item.source] && ` from ${FROM[item.source]}`}
                    </span>
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                  <Link to={`/game/${game.id}/review`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold bg-brand text-slate-950 hover:brightness-110 transition">
                    <PenLine className="w-4 h-4" aria-hidden="true" /> Played it
                  </Link>
                  <button
                    type="button"
                    onClick={() => backlog.toggle(game.id)}
                    aria-label={`Remove ${game.title} from your Backlog`}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Backlog;
