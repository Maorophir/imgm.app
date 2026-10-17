/**
 * Home page: what the community is saying right now, and games waiting for a review.
 *
 *   FreshReviews   the four newest reviews on any game, each as a small card with the
 *                  reviewer's words under it, who wrote it and how long ago. The whole
 *                  card opens the game page at that review; the reviewer's name opens
 *                  their public profile (/u/<gamer tag>).
 *   ReviewPicks    games the player has most likely played, to get them reviewing:
 *                  popular ones in their favourite genres they haven't rated (logged
 *                  in), or the most played games of all time (guests). A carousel of
 *                  key art with the card each would become, then a row per game, each a
 *                  shortcut into its review quest
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { cardMeta } from '../../lib/reviewCard';
import { getReviewPicks } from '../../lib/api';
import { useSession } from '../../lib/authClient';
import CardStage from '../CardStage';
import CollectibleCard from '../CollectibleCard';
import { timeAgo } from '../../lib/timeAgo';
import { gameMetaParts, shortGenre } from '../../lib/gameLabels';
import { getRarity } from '../reviewQuest/questOptions';
import { WRAP, TEXT_LINK, SECTION_TITLE } from '../../lib/ui';

const FRESH_COUNT = 4; // newest reviews shown
const FIRSTS_COUNT = 6; // games in Played these? Rate them.

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
        {/* The reviewer's name opens their profile. It sits above the card's link (z-1),
            so a tap on the name goes to the player and anywhere else to the review. */}
        {review.author ? (
          <Link
            to={`/u/${encodeURIComponent(review.author)}`}
            className={`relative z-1 inline-flex items-center min-h-11 font-medium text-white ${TEXT_LINK}`}
          >
            {author}
          </Link>
        ) : (
          <span className="inline-flex items-center min-h-11 font-medium text-white">{author}</span>
        )}
        {/* Opens the game page right at this review. Its ::after stretches over the whole
            figure, so the card is one link (one tab stop), named for screen readers as
            the reviewer's review of the game and shown as how long ago it was. It's a
            text link like any other, so hovering anywhere on the card firms its line. */}
        <Link
          to={`/game/${review.game.id}?review=${review.id}#review-${review.id}`}
          className={`fresh-link inline-flex items-center min-h-11 text-xs tabular-nums after:absolute after:inset-0 focus-visible:outline-none ${TEXT_LINK}`}
        >
          <span className="sr-only">{author}’s review of {review.game.title}, </span>
          <time dateTime={review.createdAt}>{timeAgo(review.createdAt)}</time>
        </Link>
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

// "Be the first reviewer": one waiting game at a time, its key art with the card it's
// waiting for hanging off the edge (its cover, a "?" for the score, "Yours to rate").
// The arrows and dots step through the games; it also moves on by itself every few
// seconds, but never while the pointer or keyboard is on it, nor for players who asked
// their device for less motion. The card and the button open that game's review quest.
const ROTATE_MS = 6000;
const FirstsCarousel = ({ games }) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const count = games.length;

  useEffect(() => {
    if (paused || reducedMotion || count < 2) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(timer);
  }, [paused, reducedMotion, count]);

  const game = games[index % count];
  const go = (step) => setIndex((i) => (i + step + count) % count);
  const art = game.artworks?.[0] ?? null;
  const year = game.releaseDate ? new Date(game.releaseDate).getUTCFullYear() : null;
  const makers = [game.developer, year].filter(Boolean).join(', ');
  const quest = `/game/${game.id}/review`;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Games to rate"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setPaused(false)}
    >
      <div className="relative">
        {art ? (
          <img
            key={game.id}
            src={art}
            alt={`${game.title} key art`}
            loading="lazy"
            decoding="async"
            className="block w-full aspect-[2.4/1] object-cover object-[50%_35%] rounded-sm bg-slate-900 animate-fade-in"
          />
        ) : (
          <div aria-hidden="true" className="w-full aspect-[2.4/1] rounded-sm bg-slate-900" />
        )}
        {/* The card it's waiting for, hanging off the art's bottom edge */}
        <Link
          key={`card-${game.id}`}
          to={quest}
          aria-label={`Rate ${game.title} first`}
          className="absolute z-2 right-4 -bottom-20 w-36 sm:right-12 sm:-bottom-32 sm:w-[250px] animate-fade-in rotate-[2deg] hover:rotate-0 transition-transform duration-200"
        >
          <CollectibleCard
            title={game.title}
            score={null}
            coverUrl={game.coverUrl}
            meta={cardMeta(game)}
            credit={game.developer ? `Cover · ${game.developer}` : undefined}
            reviewer="You"
          />
        </Link>
      </div>

      {/* Whose art it is, and the controls. Narrower than the art on the left, so it
          never runs under the card */}
      <div className="mt-3 flex flex-col gap-3 max-w-[calc(100%-170px)] sm:max-w-[calc(100%-330px)]">
        <p className="text-sm text-slate-400">
          Key art · {game.title}{makers && ` (${makers})`}
        </p>
        {count > 1 && (
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => go(-1)} aria-label="Previous game" className="w-11 h-11 grid place-items-center text-slate-400 hover:text-white">
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            {games.map((g, i) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show ${g.title}`}
                aria-current={i === index % count ? 'true' : undefined}
                className="w-6 h-11 grid place-items-center"
              >
                <span className={`block h-1.5 rounded-full transition-all duration-200 ${i === index % count ? 'w-4 bg-white' : 'w-1.5 bg-slate-600'}`} />
              </button>
            ))}
            <button type="button" onClick={() => go(1)} aria-label="Next game" className="w-11 h-11 grid place-items-center text-slate-400 hover:text-white">
              <ChevronRight className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// "Played these? Rate them.": the section that gets visitors reviewing. Games they have
// most likely played, with the card each one would become:
//   logged in  popular games in the genres they review most, minus the ones they've rated
//   guests     the most played games of all time
// avoidArt: the id of the game whose key art is already in the hero (it goes last in the
// carousel, so the page doesn't show the same picture twice in a row).
export const ReviewPicks = ({ avoidArt }) => {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;
  const [picks, setPicks] = useState(null); // { personal, genres, games }; false = failed
  useEffect(() => {
    const controller = new AbortController();
    getReviewPicks(controller.signal)
      .then(setPicks)
      .catch((err) => err.name !== 'AbortError' && setPicks(false));
    return () => controller.abort();
  }, [userId]); // logging in or out changes the picks

  const games = (picks?.games ?? []).slice(0, FIRSTS_COUNT);
  if (!picks || games.length === 0) return null;
  const rank = (game) => (game.id === avoidArt ? 2 : game.artworks?.length ? 0 : 1);
  const genres = (picks.genres ?? []).map(shortGenre);

  return (
    <section aria-labelledby="picks-title" className="mt-30 sm:mt-50">
      <div className={WRAP}>
        {/* One game at a time, with the card it would become: games with key art first */}
        <FirstsCarousel games={[...games].sort((a, b) => rank(a) - rank(b))} />

        {picks.personal && <p className="mt-6 sm:mt-8 text-xs font-semibold uppercase tracking-[.2em] text-slate-400">Picked for you</p>}
        <h2 id="picks-title" className={`${picks.personal ? 'mt-2' : 'mt-6 sm:mt-8'} font-display text-[34px] leading-none tracking-[.005em] text-white`}>
          {picks.personal ? 'Played one of these? Rate it.' : 'Played these? Rate them.'}
        </h2>
        <p className="mt-3 max-w-[560px] text-base leading-[1.6] text-white">
          {picks.personal
            ? `Big ${genres.join(' and ')} games you haven't rated yet. Two minutes each, and every one becomes a card.`
            : "The most played games of all time. You've probably played a few: rate one and it becomes your first card."}
        </p>

        <div className="mt-10 grid grid-cols-[repeat(auto-fill,minmax(min(380px,100%),1fr))] gap-x-12">
          {games.map((game) => (
            // One row, one link: straight into the game's review quest
            <Link
              key={game.id}
              to={`/game/${game.id}/review`}
              className="group grid grid-cols-[48px_minmax(0,1fr)] sm:grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-x-4 min-h-[92px] py-3.5 border-t border-slate-700 text-white animate-fade-in"
            >
              {game.coverUrl ? (
                <img src={game.coverUrl} alt="" width="48" height="64" loading="lazy" decoding="async" className="row-span-2 sm:row-span-1 block w-12 h-16 object-cover rounded-sm bg-slate-900" />
              ) : (
                <span className="row-span-2 sm:row-span-1 block w-12 h-16 rounded-sm bg-slate-900" />
              )}
              <span className="flex flex-col min-w-0">
                <span className="text-base leading-[1.3] font-medium underline decoration-1 underline-offset-4 decoration-transparent group-hover:decoration-white transition-[text-decoration-color] duration-120">
                  {game.title}
                </span>
                <span className="mt-0.5 text-sm text-slate-400">
                  {[...gameMetaParts({ releaseDate: game.releaseDate, genres: game.genres }), game.reviewCount ? null : 'no reviews yet'].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span className="col-start-2 sm:col-start-auto justify-self-start sm:justify-self-auto mt-0.5 sm:mt-0 text-sm leading-[1.45] font-medium whitespace-nowrap underline decoration-1 underline-offset-5 decoration-slate-500/80 group-hover:decoration-current group-hover:text-slate-50 transition-colors duration-120">
                {game.reviewCount ? 'Rate it' : 'Rate it first'}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
