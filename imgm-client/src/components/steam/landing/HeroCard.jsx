/**
 * HeroCard — what a Steam game becomes on IMGM: a card waiting for your score (a "?",
 * "Yours to rate"), with your Steam hours printed on it. It stands in front of the
 * Steam page's cover wall, tilting toward the pointer like every IMGM card.
 *
 *   yours    a connected player whose library is in: their most played games they
 *            haven't rated yet, with their real hours, and a link straight into the
 *            shown one's review quest (hours and platform filled in)
 *   example  everyone else: real featured games that are on Steam, with sample hours,
 *            and the caption says it's an example
 *   face down  while that's still on its way (never a made-up card in the meantime)
 *
 * With more than one game it's a carousel: every few seconds the card turns over to
 * IMGM's back and comes up as the next game. It waits while the pointer or keyboard
 * focus is on it, or the tab is hidden; the dots under it pick a game. People who ask
 * for less motion get no turning by itself, only the dots (and a short cross-fade).
 *
 * Props:
 *   mine     the library games to show ([{ gameId, title, coverUrl, minutes, platforms }]),
 *            or [] / null
 *   samples  the featured games for the example ([{ title, coverUrl }]), or [] / null
 *   waiting  true while it can't tell yet which of the two to show
 *   connected  true for a player who has connected Steam (the example's caption says
 *            where their own games are)
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import CardStage from '../../CardStage';
import CollectibleCard, { CardBack } from '../../CollectibleCard';
import FaceDownCard from '../../home/FaceDownCard';
// The same review-quest link as the library's rows (hours and PC filled in)
import { questLink } from '../library/libraryData';
import { hoursLabel } from '../../../lib/steam';
import { TEXT_LINK } from '../../../lib/ui';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';

// The examples' playtimes, one per card: a favourite's worth, a weekend's, a long haul…
const SAMPLE_HOURS = [142, 87, 36, 210, 54];
// How long each card shows, and how long the turn over takes (the flip's 0.7s in index.css)
const SHOW_MS = 5000;
const TURN_MS = 700;

const HeroCard = ({ mine, samples, waiting, connected }) => {
  const own = mine?.length > 0;
  const games = waiting ? [] : own ? mine : samples ?? [];
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(0);
  const [turning, setTurning] = useState(false); // showing the back, between two games
  const [paused, setPaused] = useState(false);
  const turnTimer = useRef(null);

  // A new list (the library arrived, another player): start from its first game
  const count = games.length;
  const index = shown < count ? shown : 0;

  // Turns the card over, and brings it back up as `next`
  const goTo = (next) => {
    clearTimeout(turnTimer.current);
    if (reduced) {
      setShown(next);
      return;
    }
    setTurning(true);
    turnTimer.current = setTimeout(() => {
      setShown(next);
      setTurning(false);
    }, TURN_MS);
  };
  useEffect(() => () => clearTimeout(turnTimer.current), []);

  // The carousel turning by itself: never for less motion, and not while it's held
  useEffect(() => {
    if (count < 2 || reduced || paused) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') goTo((index + 1) % count);
    }, SHOW_MS);
    return () => clearInterval(timer);
    // goTo only reads what's listed here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, reduced, paused, index]);

  const game = games[index];
  if (!game) return <FaceDownCard className="rotate-[-2.5deg]" />;

  const minutes = own ? game.minutes : SAMPLE_HOURS[index % SAMPLE_HOURS.length] * 60;
  return (
    <div
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Not rated yet, so no tier: the plain ivory edge of a card still to be earned */}
      <CardStage
        tier="common"
        flipped={turning}
        back={<CardBack />}
        front={
          <CollectibleCard
            title={game.title}
            score={null}
            coverUrl={game.coverUrl}
            meta={`${hoursLabel(minutes)} on Steam`}
            reviewer="You"
          />
        }
      />
      <p className="mt-6 text-sm text-slate-400 text-center lg:text-left">
        {own ? (
          <>
            {count > 1 ? "Your most played games you haven't rated." : "Your most played game you haven't rated."}{' '}
            <Link to={questLink(game)} className={`inline-flex items-center min-h-11 font-medium text-white ${TEXT_LINK}`}>
              Rate it<span className="sr-only">: {game.title}</span>
            </Link>
          </>
        ) : connected ? (
          'Examples. Your own games are waiting in your library.'
        ) : (
          'Examples. Connect Steam to see your own games and hours.'
        )}
      </p>

      {/* One dot per game: the shown one is a longer ivory bar (lime is the page's one
          main action), and each is a 44px tap target */}
      {count > 1 && (
        <div className="flex justify-center lg:justify-start -ml-3">
          {games.map((item, i) => (
            <button
              key={item.gameId ?? item.title}
              type="button"
              onClick={() => i !== index && goTo(i)}
              aria-label={`Show ${item.title}`}
              aria-current={i === index ? 'true' : undefined}
              className="group grid place-items-center h-11 w-8"
            >
              <span
                className={`block h-1 rounded-full transition-all duration-300 ${
                  i === index ? 'w-5 bg-white' : 'w-2 bg-slate-600 group-hover:bg-slate-400'
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default HeroCard;
