/**
 * ImgmRating — the game page's verdict, one line of type right under the title: the
 * average IMGM score the way a card prints it (the numeral in the display face and the
 * tier's ink, "/10" in grey), the tier's name, how many reviews it's from, and a link
 * down to them. No box: it sits straight on the page.
 *
 * A game nobody has reviewed gets a quiet line with the way to write the first card.
 * A game that isn't out yet gets its release date there instead ("Out 19 Nov 2026"):
 * it can't be reviewed until then. If it has reviews anyway (its date was pushed back
 * after people played it), their verdict shows as usual.
 */
import { Link } from 'react-router-dom';
import { getRarity } from '../reviewQuest/questOptions';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { isUnreleased, releaseLabel } from '../../lib/release';
import { TEXT_LINK } from '../../lib/ui';

const ImgmRating = ({ average, count, gameId, releaseDate }) => {
  const reducedMotion = usePrefersReducedMotion();

  // "Read the reviews": glide down to them (a jump for people who ask their device for
  // less motion), and carry keyboard focus there too. A Cmd/Ctrl/Shift/Alt click is left
  // to the browser, so the link still opens in a new tab or window. The page scrolls
  // itself because a plain #link would count as a new page (ScrollToTop).
  const readReviews = (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const section = document.getElementById('reviews');
    if (!section) return;
    section.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    section.focus({ preventScroll: true });
  };

  if (isUnreleased(releaseDate) && !count) {
    return (
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display text-[40px] leading-[.8] text-white">{releaseLabel(releaseDate)}</span>
        <span className="text-base text-slate-400">You can rate it once it's out.</span>
      </p>
    );
  }

  if (!count) {
    return (
      <p className="text-base text-slate-400">
        No cards yet. Yours would be the first.{' '}
        <Link to={`/game/${gameId}/review`} className={`font-medium text-white ${TEXT_LINK}`}>
          Start Review Quest
        </Link>
      </p>
    );
  }

  const rarity = getRarity(average);

  return (
    // The tier's ink, for the numeral and the tier's name
    <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1" style={{ '--ink': rarity.color }}>
      {/* Screen readers get it as one sentence; the line below is for the eyes */}
      <p className="sr-only">
        IMGM rating {average.toFixed(1)} out of 10, {rarity.label}, from {count} review{count === 1 ? '' : 's'}
      </p>
      <p className="flex items-baseline gap-x-2 text-base" aria-hidden="true">
        <span className="font-display text-[40px] leading-[.8] tabular-nums text-(--ink)">{average.toFixed(1)}</span>
        <span className="text-sm tabular-nums text-slate-400">/10</span>
        <span className="ml-1 font-semibold text-(--ink)">{rarity.label}</span>
        <span className="text-slate-400">from {count} review{count === 1 ? '' : 's'}</span>
      </p>
      <a href="#reviews" onClick={readReviews} className={`inline-flex items-center min-h-11 text-base font-medium text-white ${TEXT_LINK}`}>
        Read the reviews
      </a>
    </div>
  );
};

export default ImgmRating;
