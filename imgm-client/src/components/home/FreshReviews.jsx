/**
 * Home page: what the community is saying right now, and games waiting for a review.
 *
 *   FreshReviews   the four newest reviews on any game, each as a small card with the
 *                  reviewer's words under it, who wrote it and how long ago. The whole
 *                  card opens the game page at that review.
 *   NeedsReview    popular games (from the featured list) nobody has reviewed yet: one's
 *                  key art with a card still lying face down on it, then a row per game,
 *                  each a shortcut into its review quest and the First Reviewer badge
 */
import { Link } from 'react-router-dom';
import CardStage from '../CardStage';
import CollectibleCard from '../CollectibleCard';
import FaceDownCard from './FaceDownCard';
import { timeAgo } from '../../lib/timeAgo';
import { gameMetaParts } from '../../lib/gameLabels';
import { getRarity } from '../reviewQuest/questOptions';
import { WRAP, TEXT_LINK, SECTION_TITLE } from '../../lib/ui';

const FRESH_COUNT = 4; // newest reviews shown
const FIRSTS_COUNT = 6; // unreviewed games listed

// One review: its mini card (on its painted edge, standing still), the words, who and when
const FreshCard = ({ review }) => {
  const rarity = getRarity(review.rating);
  const author = review.author ?? 'A player';
  return (
    // The keyboard outline goes around the whole card, like the game tiles
    <figure className="relative min-w-0 animate-fade-in has-[.fresh-link:focus-visible]:outline-2 has-[.fresh-link:focus-visible]:outline-offset-4 has-[.fresh-link:focus-visible]:outline-white">
      <CardStage
        tier={rarity.key}
        tilt={false}
        rest={0}
        className="w-full sm:w-[min(208px,100%)]"
        front={<CollectibleCard variant="mini" title={review.game.title} score={review.rating} coverUrl={review.game.coverUrl} />}
      />
      {review.snippet && (
        // The opening quote mark hangs into the margin, so the words line up. The clamp
        // hides whatever spills out of the box, so the box reaches out to the left (-ml,
        // then pl back) to keep the hanging mark inside it.
        <blockquote className="-ml-[.42em] pl-[.42em] -indent-[.42em] mt-5 sm:mt-7 font-serif italic text-base sm:text-[21px] leading-[1.35] text-white break-words line-clamp-4">
          “{review.snippet}”
        </blockquote>
      )}
      <figcaption className="flex flex-wrap items-center gap-x-3 mt-2 text-sm text-slate-400">
        {/* Opens the game page right at this review. Its ::after stretches over the whole
            figure, so the card is one link (one tab stop) named after the reviewer. */}
        <Link
          to={`/game/${review.game.id}?review=${review.id}#review-${review.id}`}
          className={`fresh-link inline-flex items-center min-h-11 font-medium text-white after:absolute after:inset-0 focus-visible:outline-none ${TEXT_LINK}`}
        >
          {author}
          <span className="sr-only">’s review of {review.game.title}</span>
        </Link>
        <time dateTime={review.createdAt} className="text-xs tabular-nums">{timeAgo(review.createdAt)}</time>
      </figcaption>
    </figure>
  );
};

// reviews: the newest reviews from the Home page, minus the two already shown as big
// cards above (null while loading, [] when none)
export const FreshReviews = ({ reviews }) => {
  if (reviews?.length === 0) return null; // nothing yet: the section steps aside
  return (
    <section aria-labelledby="fresh-title" className="mt-18 sm:mt-24">
      <div className={WRAP}>
        <h2 id="fresh-title" className={SECTION_TITLE}>
          Fresh from the community
        </h2>
        {/* Two columns on phones; from tablets up, as many 240px columns as fit (three on
            a tablet, four on a laptop) */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 mt-8 sm:grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] sm:gap-x-8 sm:gap-y-14 sm:mt-12">
          {reviews === null
            ? Array.from({ length: FRESH_COUNT }, (_, i) => (
              <div key={i} aria-hidden="true" className="w-full sm:w-[min(208px,100%)] aspect-[63/88] rounded-[4.76%/3.41%] bg-slate-900 motion-safe:animate-pulse" />
            ))
            : reviews.slice(0, FRESH_COUNT).map((review) => <FreshCard key={review.id} review={review} />)}
        </div>
      </div>
    </section>
  );
};

// games: the featured list (null while loading). avoidArt: the id of the game whose
// key art is already in the hero, so the page doesn't show the same picture twice.
export const NeedsReview = ({ games, avoidArt }) => {
  const unreviewed = (games ?? []).filter((game) => !game.reviewCount);
  const waiting = unreviewed.slice(0, FIRSTS_COUNT);
  if (waiting.length === 0) return null;

  // The art over the list: a waiting game's key art (one in the list when it can be)
  const artGame = unreviewed.find((game) => game.artworks?.length && game.id !== avoidArt);
  const artYear = artGame?.releaseDate ? new Date(artGame.releaseDate).getFullYear() : null;
  const artMakers = artGame ? [artGame.developer, artYear].filter(Boolean).join(', ') : '';

  return (
    <section aria-labelledby="first-title" className="mt-30 sm:mt-50">
      <div className={WRAP}>
        {artGame && (
          <>
            <div className="relative">
              <img
                src={artGame.artworks[0]}
                alt={`${artGame.title} key art`}
                loading="lazy"
                decoding="async"
                className="block w-full aspect-[2.4/1] object-cover object-[50%_35%] rounded-sm bg-slate-900"
              />
              {/* A card still face down, hanging off the art's bottom edge */}
              <FaceDownCard small className="absolute z-2 right-4 -bottom-14 w-28 sm:right-12 sm:-bottom-24 sm:w-[200px]" />
            </div>
            {/* Narrower than the art, so it never runs under the face-down card */}
            <p className="mt-3 max-w-[calc(100%-140px)] sm:max-w-[calc(100%-300px)] text-sm text-slate-400">
              Key art · {artGame.title}{artMakers && ` (${artMakers})`}
            </p>
          </>
        )}

        <h2 id="first-title" className={`${artGame ? 'mt-12' : ''} font-display text-[34px] leading-none tracking-[.005em] text-white`}>
          Be the first reviewer
        </h2>
        <p className="mt-3 max-w-[520px] text-base leading-[1.6] text-white">
          Popular games nobody on IMGM has reviewed yet. Go first and earn the First Reviewer badge.
        </p>

        <div className="mt-10 grid grid-cols-[repeat(auto-fill,minmax(min(380px,100%),1fr))] gap-x-12">
          {waiting.map((game) => (
            // One row, one link: straight into the game's review quest. On phones "Write
            // the first review" moves under the title, clear of the screen's right edge.
            <Link
              key={game.id}
              to={`/game/${game.id}/review`}
              className="group grid grid-cols-[48px_minmax(0,1fr)] sm:grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-x-4 min-h-[92px] py-3.5 border-t border-slate-700 text-white animate-fade-in"
            >
              {game.coverUrl ? (
                <img
                  src={game.coverUrl}
                  alt=""
                  width="48"
                  height="64"
                  loading="lazy"
                  decoding="async"
                  className="row-span-2 sm:row-span-1 block w-12 h-16 object-cover rounded-sm bg-slate-900"
                />
              ) : (
                <span className="row-span-2 sm:row-span-1 block w-12 h-16 rounded-sm bg-slate-900" />
              )}
              <span className="flex flex-col min-w-0">
                <span className="text-base leading-[1.3] font-medium underline decoration-1 underline-offset-4 decoration-transparent group-hover:decoration-white transition-[text-decoration-color] duration-120">
                  {game.title}
                </span>
                <span className="mt-0.5 text-sm text-slate-400">{gameMetaParts({ releaseDate: game.releaseDate, genres: game.genres }).join(' · ')}</span>
              </span>
              <span className="col-start-2 sm:col-start-auto justify-self-start sm:justify-self-auto mt-0.5 sm:mt-0 text-sm leading-[1.45] font-medium whitespace-nowrap underline decoration-1 underline-offset-5 decoration-slate-500/80 group-hover:decoration-current group-hover:text-slate-50 transition-colors duration-120">
                Write the first review
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
