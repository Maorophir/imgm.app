/**
 * GameShelf — one row of game covers on the Games page (pages/Search.jsx): a title, an
 * optional "see all" link, and the games in a row that scrolls sideways (a swipe on a
 * phone; arrows on a computer, where a mouse can't scroll sideways).
 *
 * Props:
 *   title     the shelf's heading
 *   intro     a line under it (optional), e.g. which genres "Picked for you" is based on
 *   link      { to, label } for the whole list elsewhere (optional)
 *   games     the games (GameCard props), or null while they load
 *   note      (game) → the line under a title instead of year · genre (optional)
 */
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import GameCard from '../GameCard';
import GameCardSkeleton from '../GameCardSkeleton';
import { SECTION_TITLE, TEXT_LINK } from '../../lib/ui';

// Each tile's width: about two and a half on a phone (the half says "swipe"), six or so
// across a computer
const TILE = 'w-[148px] sm:w-[176px] shrink-0 snap-start';

const GameShelf = ({ title, intro, link, games, note }) => {
  const rowRef = useRef(null);
  // Most of a row's width at a time, so the next tiles come in whole
  const scroll = (direction) => {
    const row = rowRef.current;
    row?.scrollBy({ left: direction * row.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <section className="mt-12 sm:mt-16 first:mt-0" aria-label={title}>
      <div className="flex items-end justify-between gap-4 mb-5 sm:mb-6">
        <div className="min-w-0">
          <h2 className={SECTION_TITLE}>{title}</h2>
          {intro && <p className="mt-1.5 text-sm text-slate-400">{intro}</p>}
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {link && (
            <Link to={link.to} className={`text-sm font-medium text-white whitespace-nowrap ${TEXT_LINK}`}>
              {link.label}
            </Link>
          )}
          <div className="hidden sm:flex gap-1.5">
            <button type="button" onClick={() => scroll(-1)} aria-label={`Scroll ${title} back`} className="grid place-items-center w-10 h-10 rounded-sm border border-slate-600 text-white hover:border-white transition-colors duration-120">
              <ChevronLeft className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => scroll(1)} aria-label={`Scroll ${title} on`} className="grid place-items-center w-10 h-10 rounded-sm border border-slate-600 text-white hover:border-white transition-colors duration-120">
              <ChevronRight className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
      <ul
        ref={rowRef}
        className="flex gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory scroll-px-4 sm:scroll-px-0 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-4 px-4 sm:mx-0 sm:px-0 pb-1"
      >
        {games == null
          ? Array.from({ length: 6 }, (_, i) => <li key={i} className={TILE}><GameCardSkeleton /></li>)
          : games.map((game) => (
            <li key={game.id} className={TILE}>
              <GameCard
                id={game.id}
                title={game.title}
                coverUrl={game.coverUrl}
                genres={game.genres}
                platforms={game.platforms}
                ratings={game.ratings}
                reviewCount={game.reviewCount}
                releaseDate={game.releaseDate}
                note={note?.(game)}
              />
            </li>
          ))}
      </ul>
    </section>
  );
};

export default GameShelf;
