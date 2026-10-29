/**
 * Backlog — Route: /backlog
 *
 * The games you saved, in three lists a game moves along: Playing now, To play and
 * Finished. The page opens on Playing now when you're playing something, else on To play.
 * "My order" (To play) is yours to arrange (new games land on top; move any game up,
 * down, to the top or the bottom); the other views just sort for a moment. Each game:
 * Review (or edit your review), one step on (To play: I'm playing it; Playing now:
 * Finished it, with a Finished mark after), a step back to To play from the other two,
 * and X to remove it. Reviewing never marks a game by itself: plenty of players review
 * mid-game (the review quest offers Finished it afterwards).
 *
 * Noir: a list on hairlines, the lists as a segmented control, and every row's actions
 * as ghost buttons (a page of rows has no single main action, so no lime).
 */
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Bookmark, Check, CircleCheck, ChevronDown, ChevronsDown, ChevronsUp, ChevronUp, Gamepad2, PenLine, RotateCcw, Sparkles, X } from 'lucide-react';
import { getBacklog, reorderBacklog, setBacklogFinished, setBacklogPlaying } from '../lib/api';
import { useSession } from '../lib/authClient';
import { useBacklog } from '../context/BacklogContext';
import { usePlayNextAccess } from '../hooks/usePlayNextAccess';
import { getRarity } from '../components/reviewQuest/questOptions';
import { timeAgo } from '../lib/timeAgo';
import { PRIMARY_BUTTON, SEGMENTS, segment } from '../lib/ui';
import RarityMark from '../components/RarityMark';

// A row's small ghost buttons (44px tall), with words or just an icon
const ROW_BUTTON =
  'inline-flex items-center justify-center gap-1.5 h-11 min-w-11 px-3 rounded-sm border border-slate-500 text-sm font-medium text-white hover:border-white hover:text-slate-50 transition-colors duration-120';

const FROM = { play_next: 'Play Next', game_page: 'a game page', hall_of_fame: 'the Hall of Fame', gotw: 'Game of the Week', steam: 'your Steam library' };
const LISTS = [
  { value: 'playing', label: 'Playing now' },
  { value: 'toPlay', label: 'To play' },
  { value: 'finished', label: 'Finished' },
];
const VIEWS = {
  playing: [
    { value: 'started', label: 'Recently started' },
    { value: 'score', label: 'IMGM score' },
    { value: 'title', label: 'A–Z' },
  ],
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
  started: (a, b) => new Date(b.playingAt) - new Date(a.playingAt),
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
    className="w-8 h-8 grid place-items-center rounded-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors duration-120 disabled:opacity-25 disabled:hover:bg-transparent"
  >
    <Icon className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
  </button>
);

const Backlog = () => {
  const { data: session, isPending } = useSession();
  const backlog = useBacklog();
  // "Find games with Play Next" only shows to players who may use it (the server decides)
  const playNext = usePlayNextAccess();
  const [items, setItems] = useState(null);
  const [list, setList] = useState('toPlay');
  const [views, setViews] = useState({ playing: 'started', toPlay: 'mine', finished: 'finished' }); // each list keeps its own
  const view = views[list];
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return undefined;
    const controller = new AbortController();
    getBacklog(controller.signal)
      .then((loaded) => {
        setItems(loaded);
        // Open on what you're playing, if anything (an empty Playing now is no place to land)
        setList(loaded.some((item) => item.playingAt && !item.finishedAt) ? 'playing' : 'toPlay');
      })
      .catch(() => setItems([]));
    return () => controller.abort();
  }, [userId]);

  if (isPending) return <div className="min-h-[70vh] animate-pulse" />;
  if (!session) return <Navigate to="/login?redirect=%2Fbacklog" replace />;

  // Removed here or anywhere else on the page: it leaves the list
  const kept = (items ?? []).filter((item) => backlog?.has(item.game.id));
  // One list per game (the server keeps them apart too): finished, else playing, else to play
  const finished = kept.filter((item) => item.finishedAt);
  const playing = kept.filter((item) => !item.finishedAt && item.playingAt);
  const toPlay = kept.filter((item) => !item.finishedAt && !item.playingAt);
  const lists = { playing, toPlay, finished };
  const inList = lists[list];
  const shown = view === 'mine' ? inList : [...inList].sort(SORTS[view]);

  // Move one game in "My order" (To play): update at once, then save the whole order
  const move = (index, to) => {
    const next = [...toPlay];
    const [item] = next.splice(index, 1);
    next.splice(Math.max(0, Math.min(to, next.length)), 0, item);
    setItems([...playing, ...next, ...finished]);
    reorderBacklog(next.map((i) => i.game.id)).catch(() => {});
  };

  // A game changes list at once; back as it was if the server refuses. If it was the last
  // game in the list on screen, the page follows it (an empty list is no place to stay).
  const moveTo = (gameId, changes, save, target) => {
    const set = (fields) => setItems((current) => current.map((i) => (i.game.id === gameId ? { ...i, ...fields } : i)));
    const before = kept.find((i) => i.game.id === gameId);
    set(changes);
    if (inList.length === 1 && inList[0].game.id === gameId) setList(target);
    save().catch(() => set({ finishedAt: before?.finishedAt ?? null, playingAt: before?.playingAt ?? null }));
  };
  // Finished it (it leaves Playing now, as on the server), or back to To play
  const markFinished = (gameId, done) =>
    moveTo(gameId, done ? { finishedAt: new Date().toISOString(), playingAt: null } : { finishedAt: null }, () => setBacklogFinished(gameId, done), done ? 'finished' : 'toPlay');
  // I'm playing it (Playing now), or not after all: back to To play
  const markPlaying = (gameId, on) =>
    moveTo(gameId, on ? { playingAt: new Date().toISOString(), finishedAt: null } : { playingAt: null }, () => setBacklogPlaying(gameId, on), on ? 'playing' : 'toPlay');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400 mb-2">Your</p>
          <h1 className="font-display text-[54px] md:text-[88px] leading-[.9] uppercase tracking-[.005em] text-white">
            Backlog
          </h1>
          <p className="text-slate-400 mt-3">Games you saved to play later. Started one? Press I'm playing it and it moves to Playing now, then Finished when you're done.</p>
        </div>
        {inList.length > 1 && (
          <label className="flex items-center gap-2 text-sm text-slate-400">
            Show
            <select
              value={view}
              onChange={(e) => setViews({ ...views, [list]: e.target.value })}
              className="h-11 px-3 rounded-sm bg-slate-900 border border-slate-500 text-base font-medium text-white outline-none focus:border-white transition-colors duration-120"
            >
              {VIEWS[list].map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </label>
        )}
      </header>

      {kept.length > 0 && (
        <div className={`${SEGMENTS} self-start`} role="tablist" aria-label="Backlog lists">
          {LISTS.map((l) => {
            const count = lists[l.value].length;
            const active = list === l.value;
            return (
              <button
                key={l.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setList(l.value)}
                className={segment(active)}
              >
                {/* From sm up: on a phone (360px and up) the three lists only fit side by
                    side without the icon, and with "Playing" for "Playing now" */}
                {l.value === 'finished' && <CircleCheck className="hidden sm:block w-4 h-4" strokeWidth={1.8} aria-hidden="true" />}
                {l.value === 'playing' ? (
                  <>
                    <span className="sm:hidden">Playing</span>
                    <span className="hidden sm:inline">{l.label}</span>
                  </>
                ) : (
                  l.label
                )}
                <span className={`tabular-nums font-normal ${active ? 'text-slate-950/70' : 'text-slate-400'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {items === null ? (
        <div className="flex flex-col">{[0, 1, 2].map((i) => <div key={i} className="h-[121px] border-t border-slate-700 bg-slate-900/50 motion-safe:animate-pulse" />)}</div>
      ) : kept.length === 0 ? (
        <div className="py-12 text-center border-t border-slate-700">
          <Bookmark className="w-8 h-8 mx-auto mb-3 text-slate-400" strokeWidth={1.8} aria-hidden="true" />
          <p className="text-xl font-semibold text-white">Your Backlog is empty</p>
          <p className="text-slate-400 mt-1">Save games from Play Next, the Hall of Fame or any game page to play them later.</p>
          {/* The empty page's one way on, so it's the lime one */}
          {playNext.enabled && (
            <Link to="/play-next" className={`${PRIMARY_BUTTON} mt-6`}>
              <Sparkles className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> Find games with Play Next
            </Link>
          )}
        </div>
      ) : inList.length === 0 ? (
        <div className="py-12 text-center border-t border-slate-700">
          {list === 'finished' ? (
            <>
              <CircleCheck className="w-8 h-8 mx-auto mb-3 text-slate-400" strokeWidth={1.8} aria-hidden="true" />
              <p className="text-xl font-semibold text-white">No finished games yet</p>
              <p className="text-slate-400 mt-1">Done with a game you're playing? Press Finished it, and it lands here.</p>
            </>
          ) : list === 'playing' ? (
            <>
              <Gamepad2 className="w-8 h-8 mx-auto mb-3 text-slate-400" strokeWidth={1.8} aria-hidden="true" />
              <p className="text-xl font-semibold text-white">Not playing anything right now</p>
              <p className="text-slate-400 mt-1">Started a game from To play? Press I'm playing it, and it shows here.</p>
            </>
          ) : (
            <>
              {/* To play is empty: either everything's done, or what's left is being played */}
              {playing.length > 0 ? (
                <>
                  <Bookmark className="w-8 h-8 mx-auto mb-3 text-slate-400" strokeWidth={1.8} aria-hidden="true" />
                  <p className="text-xl font-semibold text-white">Nothing lined up next</p>
                  <p className="text-slate-400 mt-1">Save games from Play Next, the Hall of Fame or any game page for after this one.</p>
                </>
              ) : (
                <>
                  <CircleCheck className="w-8 h-8 mx-auto mb-3 text-slate-400" strokeWidth={1.8} aria-hidden="true" />
                  <p className="text-xl font-semibold text-white">You finished them all</p>
                  <p className="text-slate-400 mt-1">Time for something new.</p>
                </>
              )}
              {playNext.enabled && (
                <Link to="/play-next" className={`${PRIMARY_BUTTON} mt-6`}>
                  <Sparkles className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> Find games with Play Next
                </Link>
              )}
            </>
          )}
        </div>
      ) : (
        <ol className="flex flex-col border-b border-slate-700">
          {shown.map((item, index) => {
            const { game } = item;
            const year = game.releaseDate ? new Date(game.releaseDate).getFullYear() : null;
            const rarity = item.average != null ? getRarity(Math.round(item.average)) : null;
            return (
              <li key={game.id} className="flex items-center gap-3 sm:gap-4 px-1 py-4 border-t border-slate-700 animate-fade-in">
                {view === 'mine' && (
                  <div className="flex flex-col shrink-0" role="group" aria-label={`Move ${game.title}`}>
                    <MoveButton icon={ChevronsUp} label="Move to the top" onClick={() => move(index, 0)} disabled={index === 0} />
                    <MoveButton icon={ChevronUp} label="Move up" onClick={() => move(index, index - 1)} disabled={index === 0} />
                    <MoveButton icon={ChevronDown} label="Move down" onClick={() => move(index, index + 1)} disabled={index === toPlay.length - 1} />
                    <MoveButton icon={ChevronsDown} label="Move to the bottom" onClick={() => move(index, toPlay.length - 1)} disabled={index === toPlay.length - 1} />
                  </div>
                )}
                <Link to={`/game/${game.id}`} className="shrink-0" tabIndex={-1} aria-hidden="true">
                  {game.coverUrl ? (
                    <img src={game.coverUrl} alt="" loading="lazy" className="w-16 h-[5.5rem] rounded-sm object-cover bg-slate-800" />
                  ) : (
                    <div className="w-16 h-[5.5rem] rounded-sm bg-slate-800" />
                  )}
                </Link>
                <div className="min-w-0 flex-1 flex flex-col gap-1">
                  <Link to={`/game/${game.id}`} className="font-medium text-white text-lg leading-tight truncate underline decoration-1 underline-offset-4 decoration-transparent hover:decoration-white transition-[text-decoration-color] duration-120">
                    {view === 'mine' && <span className="text-slate-400 mr-1.5 tabular-nums">{index + 1}.</span>}
                    {game.title}
                  </Link>
                  {item.finishedAt && (
                    <span className="self-start inline-flex items-center gap-1 h-6 px-2 rounded-xs border border-slate-600 text-xs font-medium text-white">
                      <Check className="w-3 h-3 text-rarity-uncommon" strokeWidth={3} aria-hidden="true" /> Finished
                    </span>
                  )}
                  <p className="text-sm text-slate-400 truncate">{[year, ...(game.platforms ?? []).slice(0, 3)].filter(Boolean).join(' · ')}</p>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    {rarity ? (
                      <span className="inline-flex items-center gap-1.5 font-medium tabular-nums" style={{ color: rarity.color }}>
                        <RarityMark tier={rarity.key} />
                        {item.average.toFixed(1)} <span className="font-normal text-slate-400">({item.reviewCount})</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">No IMGM reviews yet</span>
                    )}
                    {item.myRating && (
                      <span className="text-slate-400">
                        Your score <span className="font-semibold tabular-nums" style={{ color: getRarity(item.myRating).color }}>{item.myRating}/10</span>
                      </span>
                    )}
                    <span className="text-slate-400">
                      {item.finishedAt ? (
                        `Finished ${ago(item.finishedAt)}`
                      ) : item.playingAt ? (
                        `Started ${ago(item.playingAt)}`
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
                    aria-label={item.myRating ? `Edit your review of ${game.title}` : `Review ${game.title}`}
                    className={ROW_BUTTON}
                  >
                    <PenLine className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> <span className="hidden sm:inline">{item.myRating ? 'Edit review' : 'Review'}</span>
                  </Link>
                  {item.finishedAt ? (
                    <button
                      type="button"
                      onClick={() => markFinished(game.id, false)}
                      aria-label={`Move ${game.title} back to To play`}
                      title="Not finished after all: back to To play"
                      className={ROW_BUTTON}
                    >
                      <RotateCcw className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
                    </button>
                  ) : item.playingAt ? (
                    <>
                      <button
                        type="button"
                        onClick={() => markFinished(game.id, true)}
                        aria-label={`Finished it: ${game.title}`}
                        title="Finished it: move it to Finished"
                        className={ROW_BUTTON}
                      >
                        <CircleCheck className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> <span className="hidden sm:inline">Finished it</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => markPlaying(game.id, false)}
                        aria-label={`Move ${game.title} back to To play`}
                        title="Not playing it now: back to To play"
                        className={ROW_BUTTON}
                      >
                        <RotateCcw className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => markPlaying(game.id, true)}
                      aria-label={`I'm playing it: ${game.title}`}
                      title="I'm playing it: move it to Playing now"
                      className={ROW_BUTTON}
                    >
                      <Gamepad2 className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> <span className="hidden sm:inline">I'm playing it</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => backlog.toggle(game.id)}
                    aria-label={`Remove ${game.title} from your Backlog`}
                    title="Remove it from your Backlog"
                    className={ROW_BUTTON}
                  >
                    <X className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
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
