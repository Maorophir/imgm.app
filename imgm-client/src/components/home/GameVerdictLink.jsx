/**
 * GameVerdictLink — a game's name as a link, with its IMGM verdict in its tier's ink:
 * "● Clair Obscur: Expedition 33  8.5 Epic on IMGM · 32 reviews". Under the home page's
 * showcase cards, so a visitor can go and see the real game. Without players' scores
 * yet it's just the link.
 *
 * Props:
 *   game       { id, title, ratings: { imgm }, reviewCount }
 *   className  placement
 */
import { Link } from 'react-router-dom';
import RarityMark from '../RarityMark';
import { getRarity } from '../reviewQuest/questOptions';
import { TEXT_LINK } from '../../lib/ui';

const GameVerdictLink = ({ game, className = '' }) => {
  const score = game.ratings?.imgm;
  const rarity = typeof score === 'number' && game.reviewCount !== 0 ? getRarity(score) : null;
  return (
    <p
      className={`flex flex-wrap items-center gap-x-2.5 min-h-11 text-sm text-slate-400 ${className}`}
      style={rarity ? { '--ink': rarity.color } : undefined}
    >
      {rarity && <RarityMark tier={rarity.key} className="text-(--ink)" />}
      <Link to={`/game/${game.id}`} className={`inline-flex items-center min-h-11 font-medium text-white ${TEXT_LINK}`}>
        {game.title}
      </Link>
      {rarity && (
        <span>
          <span className="text-xs tabular-nums text-(--ink)">{score.toFixed(1)}</span>{' '}
          <span className="text-(--ink)">{rarity.label}</span> on IMGM
          {game.reviewCount > 0 && ` · ${game.reviewCount} review${game.reviewCount === 1 ? '' : 's'}`}
        </span>
      )}
    </p>
  );
};

export default GameVerdictLink;
