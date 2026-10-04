/**
 * Play Next — Route: /play-next (the old /guide redirects here)
 *
 * The AI recommendation chat. The player asks; the guide shows its work live (a
 * step timeline, the games it considers, its answer streaming in), then lands on
 * 5 picks with one Best Pick in the side panel (inline on small screens).
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../lib/authClient';
import { useGameGuide } from '../hooks/useGameGuide';
import GuideTimeline from '../components/guide/GuideTimeline';
import GuidePanel from '../components/guide/GuidePanel';
import GuideComposer from '../components/guide/GuideComposer';
import RichText from '../components/guide/RichText';
import { PowerIcon } from '../components/Logo';


const GuideTurn = ({ turn, isLatest }) => {
  const [showFull, setShowFull] = useState(false);
  const streaming = turn.status === 'running' && turn.answer;

  return (
    <div className="flex flex-col gap-4">
      {/* The player's question */}
      <p className="self-end max-w-[85%] rounded-2xl rounded-br-md bg-white text-slate-950 px-4 py-2.5 font-semibold">
        {turn.question}
      </p>

      {/* The guide: its steps, then its answer */}
      <div className="flex gap-3">
        <span className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0" aria-hidden="true">
          <PowerIcon className="w-4.5 h-4.5 text-brand" />
        </span>
        <div className="min-w-0 flex-1 flex flex-col gap-3">
          <GuideTimeline steps={turn.steps} running={turn.status === 'running'} collapsible={Boolean(turn.cards)} />

          {turn.cards ? (
            <div className="rounded-2xl rounded-tl-md bg-slate-900/80 border border-slate-800 px-4 py-3 text-slate-200 leading-relaxed">
              <p>{turn.cards.intro}</p>
              <p className="mt-2 text-sm text-brand font-semibold hidden lg:block">Your 5 picks are in the panel →</p>
              {turn.answer && (
                <button type="button" onClick={() => setShowFull((s) => !s)} className="mt-2 text-xs font-bold text-slate-400 hover:text-white">
                  {showFull ? 'Hide the full answer ▴' : 'Read the full answer ▾'}
                </button>
              )}
              {showFull && (
                <p className="mt-2 text-sm text-slate-300 whitespace-pre-line border-t border-slate-800 pt-2">
                  <RichText text={turn.answer} />
                </p>
              )}
              {turn.cards.follow_up && <p className="mt-3 text-slate-300">{turn.cards.follow_up}</p>}
            </div>
          ) : (
            turn.answer && (
              <div className="rounded-2xl rounded-tl-md bg-slate-900/80 border border-slate-800 px-4 py-3 text-slate-200 leading-relaxed whitespace-pre-line">
                <RichText text={turn.answer} />
                {streaming && <span className="inline-block w-2 h-4 ml-0.5 bg-brand animate-pulse align-middle" aria-hidden="true" />}
              </div>
            )
          )}

          {turn.error && (
            <p className="rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm px-4 py-2.5">{turn.error}</p>
          )}

          {/* Small screens: the picks right here, under the answer */}
          {isLatest && (turn.cards || turn.games.length > 0) && (
            <div className="lg:hidden">
              <GuidePanel turn={turn} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function GameGuide() {
  const { data: session, isPending } = useSession();
  const { turns, current, running, ask } = useGameGuide();
  const [platforms, setPlatforms] = useState([]);
  const bottomRef = useRef(null);

  // Keep the newest activity in view as the guide works
  const activity = current ? `${current.steps.length}-${current.answer.length}-${Boolean(current.cards)}` : '';
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [activity]);

  if (isPending) return <div className="min-h-[70vh] animate-pulse" />;

  if (!session) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <PowerIcon className="w-12 h-12 text-brand mx-auto mb-4" />
        <h1 className="font-display text-5xl uppercase tracking-tight text-white mb-3">
          Play Next<span className="text-brand">.</span>
        </h1>
        <p className="text-slate-400 mb-8">
          Tell it what you're in the mood for. It reads your reviews and what IMGM players say, then picks your next 5 games.
        </p>
        <Link to="/login?redirect=%2Fplay-next" className="px-6 py-3 rounded-full font-bold bg-brand hover:brightness-110 text-slate-950 shadow-[0_8px_24px_-8px_var(--color-brand)] transition">
          Log in to start
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 grid lg:grid-cols-[minmax(0,1fr)_420px] gap-8 items-start">
      {/* Chat */}
      <section className="flex flex-col gap-6 min-h-[70vh]">
        <header>
          <h1 className="font-display text-5xl md:text-6xl uppercase tracking-tight text-white">
            Play Next<span className="text-brand">.</span>
          </h1>
          <p className="text-slate-400 mt-1">
            Tell it what you're in the mood for. Watch it dig through your reviews and the IMGM community, live.
          </p>
        </header>

        <div className="flex-1 flex flex-col gap-8">
          {turns.map((turn) => (
            <GuideTurn key={turn.id} turn={turn} isLatest={turn === current} />
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="sticky bottom-4 rounded-3xl bg-slate-950/90 backdrop-blur p-3 border border-slate-800 shadow-2xl shadow-black/50">
          <GuideComposer
            onAsk={(question) => ask(question, platforms.length ? { platforms } : {})}
            disabled={running}
            platforms={platforms}
            onPlatformsChange={setPlatforms}
            showStarters={turns.length === 0}
          />
        </div>
      </section>

      {/* Side panel (large screens) */}
      <aside className="hidden lg:block sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1">
        <GuidePanel turn={current} />
      </aside>
    </div>
  );
}

export default GameGuide;
