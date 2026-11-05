/**
 * DailySection — the home page's way into the daily Guess the game (/daily): today's
 * first picture, blurred as the game starts it, "Guess the game · #12", how everyone is
 * doing, and a button: Play, or "See your result" once this player has finished.
 *
 * A ghost button, not lime: the hero holds the home page's one lime action. The strip
 * asks the server the same way the page does (a logged-out player's game is in this
 * browser, lib/dailyGame), and hides itself if the request fails.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { getDaily } from '../../lib/api';
import { useSession } from '../../lib/authClient';
import { localDailyGame, pictureStyle } from '../../lib/dailyGame';
import { WRAP, GHOST_BUTTON_TALL, LABEL } from '../../lib/ui';

// The line under the title: how everyone did, once anyone has finished
const resultsLine = (results) => {
  if (!results?.players) return 'Be one of the first to play today';
  return `${results.solvedShare}% of ${results.players} player${results.players === 1 ? '' : 's'} got it today`;
};

export default function DailySection() {
  const { data: session, isPending } = useSession();
  const userId = session?.user?.id ?? null;
  const [daily, setDaily] = useState(null);
  const [failed, setFailed] = useState(false);

  // Again when the player logs in or out (their game moves between browser and server)
  useEffect(() => {
    if (isPending) return;
    const controller = new AbortController();
    const game = localDailyGame();
    getDaily({ guesses: game?.guesses ?? [], gaveUp: Boolean(game?.gaveUp) }, controller.signal)
      .then(setDaily)
      .catch((err) => {
        if (err.name !== 'AbortError') setFailed(true);
      });
    return () => controller.abort();
  }, [isPending, userId]);

  if (failed || !daily?.pictures?.length) return null;
  const finished = daily.status !== 'playing';
  const first = daily.pictures[0];

  return (
    <section aria-labelledby="daily-title" className="mt-30 sm:mt-40">
      <div className={WRAP}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8 p-4 sm:p-5 rounded-sm bg-slate-900 border border-slate-700 animate-fade-in">
          {/* The first picture as the game starts it: blurred, so nothing is given away */}
          <div className="@container relative w-full sm:w-[280px] aspect-video shrink-0 overflow-hidden rounded-xs border border-slate-600 bg-slate-950">
            <img
              src={first.url}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
              style={pictureStyle(first)}
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className={LABEL}>Daily · #{daily.number} · the same game for everyone</p>
            <h2 id="daily-title" className="mt-1.5 font-display text-[34px] sm:text-[40px] leading-[.95] text-white">
              Guess the game
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              {finished
                ? daily.status === 'solved' ? `You got it in ${daily.guesses.length}. ${resultsLine(daily.results)}.` : `Not today. ${resultsLine(daily.results)}.`
                : `${daily.maxTries} tries, a clearer picture each time. ${resultsLine(daily.results)}.`}
            </p>
          </div>

          <Link to="/daily" className={`${GHOST_BUTTON_TALL} self-start sm:self-center`}>
            {finished ? 'See your result' : 'Play'}
            <ArrowRight className="w-4.5 h-4.5" strokeWidth={1.8} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
