/**
 * RateAnother — the way on from the Review Quest's done screen: "Rate another game",
 * three covers of popular games to rate next (each opens its own quest), and "More
 * games" for the quest's game search (/search?quest=1).
 *
 * The three come from the home page's featured games, leaving out the game just
 * reviewed, games that aren't out yet (they can't be rated) and the player's own latest
 * reviews (one cheap request: their newest 12, which covers most players' every review).
 * If the featured games can't be loaded, the covers step aside and "More games" stays.
 *
 * Noir: quiet on purpose, as the screen's one lime action stays "See it on the game
 * page". Small covers with 2px corners and no box, the title under each, underlined on
 * hover, like the search page's quest picks.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFeaturedGames, getMyReviews } from '../../lib/api';
import { isUnreleased } from '../../lib/release';
import { TEXT_LINK } from '../../lib/ui';

const COUNT = 3;

const RateAnother = ({ gameId }) => {
  // null while loading, false when the featured games couldn't be loaded
  const [games, setGames] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      getFeaturedGames(controller.signal),
      // Only to leave out games they've rated: if it fails, nothing is left out
      getMyReviews(0, controller.signal).catch(() => ({ reviews: [] })),
    ])
      .then(([featured, mine]) => {
        const rated = new Set([gameId, ...mine.reviews.map((r) => r.game?.id)]);
        setGames(featured.filter((g) => !rated.has(g.id) && !isUnreleased(g.releaseDate)).slice(0, COUNT));
      })
      .catch((err) => err.name !== 'AbortError' && setGames(false));
    return () => controller.abort();
  }, [gameId]);

  return (
    <section aria-labelledby="rate-another-title" className="mt-10 pt-8 border-t border-slate-700 text-center">
      <h2 id="rate-another-title" className="text-lg font-semibold text-white">Rate another game</h2>

      {games !== false && games?.length !== 0 && (
        <ul className="mx-auto mt-5 max-w-sm grid grid-cols-3 gap-3 sm:gap-4 text-left">
          {games === null
            ? Array.from({ length: COUNT }, (_, i) => (
                // The covers' space while they load, so nothing jumps
                <li key={i} aria-hidden="true" className="aspect-[3/4] rounded-sm bg-slate-950 motion-safe:animate-pulse" />
              ))
            : games.map((game) => (
                <li key={game.id} className="min-w-0">
                  <Link to={`/game/${game.id}/review`} className="group flex flex-col text-white">
                    <div className="aspect-[3/4] overflow-hidden rounded-sm bg-slate-950">
                      {game.coverUrl && (
                        <img src={game.coverUrl} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <span className="mt-2 text-sm font-medium leading-[1.3] line-clamp-2 underline decoration-1 underline-offset-4 decoration-transparent group-hover:decoration-white transition-[text-decoration-color] duration-120">
                      {game.title}
                    </span>
                  </Link>
                </li>
              ))}
        </ul>
      )}

      <Link to="/search?quest=1" className={`mt-3 inline-flex items-center h-11 text-sm font-medium text-white ${TEXT_LINK}`}>
        More games
      </Link>
    </section>
  );
};

export default RateAnother;
