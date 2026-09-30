/**
 * ReviewEntry — one review on a game page: the rarity card on the side,
 * the written review next to it. On phones the card sits on top.
 */
import RarityCard from './RarityCard';
import ReviewPanel from './ReviewPanel';

const ReviewEntry = ({ review, game, artUrl }) => (
  <div className="flex flex-col md:flex-row items-center md:items-start gap-5 md:gap-6">
    <RarityCard review={review} game={game} artUrl={artUrl} />
    <ReviewPanel review={review} />
  </div>
);

export default ReviewEntry;
