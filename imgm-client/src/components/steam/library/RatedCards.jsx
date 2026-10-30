/**
 * The library games you've rated, as their cards: the profile's mini-card grid (two
 * columns on phones, then as many 240px columns as fit), each card standing still on
 * its painted edge (components/profile/ProfileParts.jsx ReviewCard). Under each card:
 * the hours you played on Steam, and Edit, back into its quest. The card itself opens
 * the game's page.
 */
import { Link } from 'react-router-dom';
import { PenLine } from 'lucide-react';
import CardStage from '../../CardStage';
import CollectibleCard from '../../CollectibleCard';
import { getRarity } from '../../reviewQuest/questOptions';
import { hoursLabel } from '../../../lib/steam';
import { TEXT_LINK } from '../../../lib/ui';
import { questLink } from './libraryData';

const RatedCard = ({ game, hoursHidden }) => {
  const rarity = getRarity(game.myRating);
  // A Family Sharing game says so: those hours were played on someone else's copy
  const hours = !hoursHidden && game.minutes > 0 ? `${hoursLabel(game.minutes)} on Steam${game.shared ? ', shared' : ''}` : null;
  return (
    // The keyboard outline goes around the whole card, like the profile's cards
    <li className="relative min-w-0 animate-fade-in has-[.card-link:focus-visible]:outline-2 has-[.card-link:focus-visible]:outline-offset-4 has-[.card-link:focus-visible]:outline-white">
      <CardStage
        tier={rarity.key}
        tilt={false}
        rest={0}
        className="w-full sm:w-[min(208px,100%)]"
        front={<CollectibleCard variant="mini" title={game.title} score={game.myRating} coverUrl={game.coverUrl} />}
      />
      {/* Stretched over the whole card: one tab stop, named for screen readers (the card
          shows the title and score) */}
      <Link to={`/game/${game.gameId}`} className="card-link absolute inset-0 focus-visible:outline-none">
        <span className="sr-only">{game.title}: your score {game.myRating}/10, {rarity.label}</span>
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 text-sm sm:w-[min(208px,100%)]">
        {hours && <span className="text-slate-400 tabular-nums">{hours}</span>}
        {/* Above the card's link */}
        <Link to={questLink(game, { hoursHidden })} className={`relative z-1 inline-flex items-center gap-1.5 min-h-11 font-medium text-white ${TEXT_LINK}`}>
          <PenLine className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.8} aria-hidden="true" />
          Edit<span className="sr-only"> your review of {game.title}</span>
        </Link>
      </div>
    </li>
  );
};

const RatedCards = ({ games, hoursHidden }) => (
  // auto-fill keeps the empty columns, so one or two cards stay card-sized
  <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] sm:gap-x-8 sm:gap-y-14">
    {games.map((game) => <RatedCard key={game.gameId} game={game} hoursHidden={hoursHidden} />)}
  </ul>
);

export default RatedCards;
