/**
 * CardQuote — a review's words, set beside its card (the site edition of a card carries
 * no words, so there's room here for all of them): italic serif, the opening quote mark
 * hanging into the margin so the words line up, and the reviewer under it.
 *
 * Props:
 *   text       the review's words (the quote marks are added)
 *   reviewer   their gamer tag, shown as "— IamHonie" (optional)
 *   lines      clamp to this many lines (optional; by default every word shows)
 *   size       'lg' (the home hero) or 'md' (the default, captions under cards)
 *   className  placement
 */
const SIZES = {
  md: 'text-lg leading-[1.4]',
  lg: 'text-xl leading-[1.35] xl:text-2xl',
};
const CLAMPS = { 3: 'line-clamp-3', 4: 'line-clamp-4', 5: 'line-clamp-5', 6: 'line-clamp-6' };

const CardQuote = ({ text, reviewer, lines, size = 'md', className = '' }) => {
  if (!text) return null;
  return (
    <figure className={className}>
      <blockquote className={`-ml-[.42em] pl-[.42em] -indent-[.42em] font-serif italic text-white text-pretty ${SIZES[size]} ${CLAMPS[lines] ?? ''}`}>
        “{text}”
      </blockquote>
      {reviewer && <figcaption className="mt-3 text-sm text-slate-400">— {reviewer}</figcaption>}
    </figure>
  );
};

export default CardQuote;
