/**
 * A review as its card's props (CollectibleCard), built the same way everywhere: the
 * home page, the review quest's reward, your review on the game page and your profile.
 *
 * The card's picture is the review's own art (`art`, chosen by the server from the
 * review's id: the same for that review everywhere, different from the game's other
 * reviews), else the game's cover.
 */
import { cardArtUrl, isCover } from './igdbImage';
import { shortGenre } from './gameLabels';

// The small print on the card: "RPG · 2015" (IGDB dates are midnight UTC, so the year
// is read in UTC: a 1 January release would show the year before in the Americas)
export const cardMeta = (game) =>
  [game.genres?.[0] && shortGenre(game.genres[0]), game.releaseDate && new Date(game.releaseDate).getUTCFullYear()]
    .filter(Boolean)
    .join(' · ') || undefined;

export const reviewCardProps = ({ game, art, rating, reviewer, date, quote, badges = [] }) => {
  const picture = cardArtUrl(art) ?? game.coverUrl;
  return {
    title: game.title,
    score: rating,
    coverUrl: picture,
    meta: cardMeta(game),
    // Whose picture it is: the cover, or the game's own art (an artwork or a screenshot)
    credit: game.developer ? `${isCover(picture) ? 'Cover' : 'Art'} · ${game.developer}` : undefined,
    reviewer,
    date,
    quote: quote || undefined,
    badges,
  };
};
