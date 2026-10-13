/**
 * CollectibleCard — a review as a Noir trading card, plus its two backs: ChecklistBack
 * (the reviewer's checklist, for a review that has one) and CardBack (the back that
 * every IMGM card shares otherwise).
 *
 * The front is printed card stock in the trading-card shape (63:88, rounded corners):
 * a frame in the score's rarity ink (gilt for a Legendary 10), the game's title in big
 * condensed capitals, the score numeral in the tier's ink, an art window, the tier, and
 * who reviewed it. A card with no art (or art that fails to load) shows a dark panel in
 * the tier's colour with a large rarity mark instead, so it still looks intended.
 *
 * Two sizes of the same design:
 *   full  everything above, plus the meta line, an art credit, a quote and the footer
 *   mini  for small cards in a grid: title, score, art and the tier only
 *
 * Props (all but title and score are optional):
 *   title      the game's name
 *   score      1–10: one reviewer's score, or a game's average (8.4); sets the rarity
 *   coverUrl   the art for the window: an IGDB cover (sharp on retina screens too) or
 *              any image address
 *   meta       one quiet line under the title, e.g. "Platformer · 2025" (full only)
 *   credit     small print beside the tier, e.g. "Cover · Team Cherry" (full only)
 *   reviewer   the reviewer's gamer tag, shown as "Reviewed by IamHonie" (full only)
 *   date       when it was reviewed (an ISO string or a Date), shown as "12 Oct 2026"
 *              (full only)
 *   quote      a line from the review, in italic serif; the card adds the quote marks
 *              (full only)
 *   variant    'full' (the default) or 'mini'
 *   className  the card's width and placement, e.g. "w-[min(380px,100%)]"
 *
 * Sizing: everything inside is measured in cqi (a share of the card's own width), so
 * the card is the same design at 200px and at 480px. It fills the width it is given
 * and takes its height from the 63:88 shape. That means it needs a width from outside
 * (a block parent, or a w-* class): it can't size itself from its content, so inside a
 * flex row or an absolutely placed box give it a width.
 *
 * On a stage that tilts (CardStage), a Legendary's gilt follows the pointer through
 * the --gilt-at CSS variable the stage sets.
 */
import { useState } from 'react';
import RarityMark from './RarityMark';
import { PowerIcon } from './Logo';
import { getRarity } from './reviewQuest/questOptions';
import { coverSrcSet } from '../lib/igdbImage';
import CardChecklist from './reviewCard/CardChecklist';

// The card stock: dark, with a faint ivory line just inside its edge. The corner is the
// trading-card one (3mm on a 63×88mm card), as percentages so it scales with the card.
const STOCK = 'relative flex flex-col aspect-[63/88] rounded-[4.76%/3.41%] overflow-hidden bg-slate-900 text-white inset-ring inset-ring-white/7';

// The Legendary frame: the gilt, larger than the frame so that moving it (--gilt-at,
// set by a tilting CardStage) slides the shine across. At rest it sits in the middle.
const GILT = {
  backgroundImage: 'var(--gradient-gilt)',
  backgroundSize: '260% 260%',
  backgroundPosition: 'var(--gilt-at, 50% 50%)',
};

// The measurements that differ between the two sizes (all in cqi, see the header)
const SIZES = {
  full: {
    stock: 'p-[2.4cqi]',
    frame: 'p-[max(1px,.55cqi)]',
    frameGilt: 'p-[1.3cqi] shadow-[inset_0_0_0_max(1px,.2cqi)_rgba(40,28,6,.6)]',
    face: 'pt-[3cqi] px-[3.2cqi] pb-[2.6cqi] rounded-[2.1cqi/1.5cqi]',
    faceGilt: 'pt-[3cqi] px-[3.2cqi] pb-[2.6cqi] rounded-[1.6cqi/1.15cqi] shadow-[inset_0_0_0_max(1px,.2cqi)_rgba(40,28,6,.5)]',
    title: 'mt-[.6cqi] text-[length:9cqi]',
    score: 'text-[length:16cqi]',
    // The art window is about 85% of the card's width
    sizes: '(min-width: 640px) 400px, 85vw',
  },
  mini: {
    stock: 'p-[2.6cqi]',
    frame: 'p-[max(1px,.7cqi)]',
    frameGilt: 'p-[1.6cqi] shadow-[inset_0_0_0_max(1px,.2cqi)_rgba(40,28,6,.6)]',
    face: 'pt-[3.6cqi] px-[3.6cqi] pb-[3.2cqi] rounded-[2cqi/1.43cqi]',
    faceGilt: 'pt-[3.6cqi] px-[3.6cqi] pb-[3.2cqi] rounded-[2cqi/1.43cqi] shadow-[inset_0_0_0_max(1px,.2cqi)_rgba(40,28,6,.5)]',
    title: 'mt-[.8cqi] text-[length:10cqi]',
    score: 'text-[length:17cqi]',
    sizes: '(min-width: 640px) 200px, 45vw',
  },
};

// The hairline between the parts of the card (ivory at 14%, never thinner than 1px)
const HAIRLINE = 'border-white/14';

// The small print along the bottom of every card face ("Beta · imgm.app")
const SMALL_PRINT = `flex justify-between gap-[2cqi] pt-[1.6cqi] border-t-[length:max(1px,.22cqi)] ${HAIRLINE} text-[length:max(9px,2.8cqi)] leading-none text-slate-400`;

// A review's date on the card ("12 Oct 2026") and for screen readers ("12 October 2026")
const shortDate = (when) => when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const longDate = (when) => when.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

// A reviewer's score is a whole number (10); a game's average keeps one decimal (8.4)
const scoreText = (score) => (Number.isInteger(score) ? String(score) : score.toFixed(1));

const CollectibleCard = ({
  title,
  coverUrl,
  score,
  meta,
  credit,
  reviewer,
  date,
  quote,
  variant = 'full',
  className = '',
}) => {
  // The address of art that failed to load. Remembering the address (not just "broken")
  // means new art passed in later gets its own chance to load.
  const [brokenUrl, setBrokenUrl] = useState(null);

  const mini = variant === 'mini';
  const size = SIZES[mini ? 'mini' : 'full'];
  const rarity = getRarity(score);
  const legendary = rarity.key === 'legendary';
  const shown = scoreText(score);
  const showArt = Boolean(coverUrl) && brokenUrl !== coverUrl;

  // Only a real date is shown (a bad one would print "Invalid Date")
  const when = date ? new Date(date) : null;
  const hasDate = when && !Number.isNaN(when.getTime());

  // What a screen reader hears for the whole card
  const label = [
    `Review card: ${title}, ${shown} out of 10, ${rarity.label}.`,
    reviewer && `Reviewed by ${reviewer}${hasDate ? ` on ${longDate(when)}` : ''}.`,
  ].filter(Boolean).join(' ');

  return (
    <div className={`@container ${className}`}>
      <article
        aria-label={label}
        className={`${STOCK} ${size.stock}`}
        // The tier's colours, for the classes below: --ink for text, symbols and the
        // frame, --deep for the panel behind a card with no art
        style={{ '--ink': rarity.color, '--deep': rarity.deep }}
      >
        {/* The frame: the tier's ink (or the gilt) showing around the face */}
        <div
          className={`flex-1 min-h-0 flex rounded-[2.6cqi/1.86cqi] ${legendary ? size.frameGilt : `${size.frame} bg-(--ink)`}`}
          style={legendary ? GILT : undefined}
        >
          <div className={`flex-1 min-w-0 flex flex-col bg-slate-900 ${legendary ? size.faceGilt : size.face}`}>
            {/* Title and score */}
            <div className="flex items-start justify-between gap-[3cqi]">
              <p className={`${size.title} min-w-0 font-display leading-[.9] tracking-[.01em] uppercase text-balance break-words line-clamp-3`}>
                {title}
              </p>
              <p className="flex items-baseline gap-[.8cqi] shrink-0">
                <span className={`${size.score} font-display leading-[.78] text-(--ink)`}>{shown}</span>
                {!mini && <span className="text-[length:max(9px,2.8cqi)] tabular-nums text-slate-400">/10</span>}
              </p>
            </div>

            {/* One quiet line (genre · year) and the power mark in the tier's ink */}
            {!mini && (
              <div className={`flex items-center justify-between gap-[2cqi] mt-[2cqi] pb-[1.8cqi] border-b-[length:max(1px,.22cqi)] ${HAIRLINE}`}>
                <span className="min-w-0 truncate text-[length:max(10px,3cqi)] leading-[1.2] tabular-nums text-slate-400">{meta}</span>
                <PowerIcon className="w-[4cqi] h-[4cqi] shrink-0 text-(--ink)" />
              </div>
            )}

            {/* The art window takes whatever height the text leaves, so a card with a
                quote shows less art and a card without one shows more */}
            <div
              className={`relative flex-[1_1_0] min-h-0 flex flex-col overflow-hidden ${
                mini ? 'mt-[3cqi] rounded-[.8cqi] bg-(--deep)' : 'mt-[2.4cqi] rounded-[.6cqi] bg-slate-950'
              }`}
            >
              {showArt ? (
                <img
                  src={coverUrl}
                  // IGDB covers come in 264px and 528px copies; other art is used as is
                  srcSet={coverUrl.includes('/t_cover_big/') ? coverSrcSet(coverUrl) : undefined}
                  sizes={size.sizes}
                  alt={`${title} cover art`}
                  // Big cards are the page's feature, so they load at once; minis sit in grids
                  loading={mini ? 'lazy' : undefined}
                  decoding="async"
                  onError={() => setBrokenUrl(coverUrl)}
                  className="block flex-[1_1_0] min-h-0 w-full object-cover object-[50%_22%]"
                />
              ) : (
                // No art: the tier's dark panel with its mark, drawn large
                <span aria-hidden="true" className="flex-[1_1_0] min-h-0 grid place-items-center bg-(--deep)">
                  <RarityMark tier={rarity.key} thin className="w-[34cqi] h-[34cqi] text-(--ink)" />
                </span>
              )}
              {/* A fine line around the window, in the ink on full cards */}
              <span
                aria-hidden="true"
                className={`absolute inset-0 rounded-[inherit] pointer-events-none ${
                  mini
                    ? 'inset-ring inset-ring-white/10'
                    : 'shadow-[inset_0_0_0_max(1px,.25cqi)_color-mix(in_srgb,var(--ink)_42%,transparent)]'
                }`}
              />
            </div>

            {/* The tier, and the art's credit on full cards */}
            <div className={`flex items-center justify-between gap-[2cqi] ${mini ? 'mt-[3cqi]' : 'mt-[2.2cqi]'}`}>
              <span
                className={`inline-flex items-center font-semibold leading-none text-(--ink) ${
                  mini ? 'gap-[2cqi] text-[length:max(10px,5.4cqi)]' : 'gap-[1.4cqi] text-[length:max(10px,3.4cqi)]'
                }`}
              >
                <RarityMark
                  tier={rarity.key}
                  className={`min-w-2.5 min-h-2.5 ${mini ? 'w-[5.4cqi] h-[5.4cqi]' : 'w-[3.8cqi] h-[3.8cqi]'}`}
                />
                {rarity.label}
              </span>
              {!mini && credit && (
                <span className="min-w-0 truncate text-[length:max(9px,2.8cqi)] leading-none text-slate-400">{credit}</span>
              )}
            </div>

            {!mini && quote && (
              // The opening quote mark hangs into the margin, so the words line up. The
              // clamp hides whatever spills out of the box, so the box reaches out to
              // the left (-ml, then pl back) to keep the hanging mark inside it.
              <blockquote className="-ml-[.42em] pl-[.42em] -indent-[.42em] mt-[2.6cqi] font-serif italic font-normal text-[length:max(11px,4.2cqi)] leading-[1.3] text-white line-clamp-4">
                “{quote}”
              </blockquote>
            )}

            {!mini && (
              <div className="mt-[2.6cqi]">
                {(reviewer || hasDate) && (
                  <p className="flex items-baseline justify-between gap-[2cqi] text-[length:max(10px,3.4cqi)] leading-[1.2]">
                    {reviewer ? (
                      <span className="min-w-0 truncate">
                        <span className="text-slate-400">Reviewed by</span>{' '}
                        <span className="font-semibold text-white">{reviewer}</span>
                      </span>
                    ) : <span />}
                    {hasDate && (
                      <time dateTime={when.toISOString()} className="shrink-0 tabular-nums text-[length:max(9px,2.6cqi)] text-slate-400">
                        {shortDate(when)}
                      </time>
                    )}
                  </p>
                )}
                {/* The small print along the bottom of every card */}
                <p className={`${SMALL_PRINT} ${reviewer || hasDate ? 'mt-[1.8cqi]' : ''}`}>
                  <span>Beta</span>
                  <span>imgm.app</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </article>
    </div>
  );
};

// The back's measurements. A small back (a face-down card about 110–200px wide) draws
// its label, rings and lines a little heavier, or they'd be too fine to read.
const BACK = {
  full: {
    label: 'text-[length:max(9px,3.4cqi)]',
    // The rings: fine ivory circles, 2.4cqi apart
    rings: 'repeating-radial-gradient(circle at 50% 50%, transparent 0 2.4cqi, rgba(238,231,217,.07) 2.4cqi 2.7cqi)',
    outer: 'shadow-[0_0_0_max(1px,.3cqi)_rgba(238,231,217,.22)]',
    inner: 'shadow-[0_0_0_max(1px,.3cqi)_rgba(238,231,217,.45)]',
    wordmark: 'text-[length:12cqi]',
  },
  small: {
    label: 'text-[length:max(9px,4.4cqi)]',
    rings: 'repeating-radial-gradient(circle at 50% 50%, transparent 0 2.8cqi, rgba(238,231,217,.08) 2.8cqi 3.3cqi)',
    outer: 'shadow-[0_0_0_max(1px,.4cqi)_rgba(238,231,217,.22)]',
    inner: 'shadow-[0_0_0_max(1px,.4cqi)_rgba(238,231,217,.45)]',
    wordmark: 'text-[length:13cqi]',
  },
};

/**
 * CardBack — the back of every IMGM card: rings around the power mark, and the
 * wordmark. The same size rules as the front (give it a width).
 * Props: className; small for a card about 110–200px wide (see BACK above).
 */
export const CardBack = ({ className = '', small = false }) => {
  const back = BACK[small ? 'small' : 'full'];
  return (
    <div className={`@container ${className}`}>
      <article aria-label="Card back" className={`${STOCK} p-[2.4cqi]`}>
        <div className="flex-1 min-h-0 flex flex-col items-center justify-between pt-[6cqi] px-[4cqi] pb-[5cqi] rounded-[2.2cqi/1.6cqi] border-[length:max(1px,.3cqi)] border-white/20">
          <span className={`${back.label} leading-none text-slate-400`}>I Am Gaming</span>
          <span
            aria-hidden="true"
            className={`grid place-items-center w-[66cqi] aspect-square rounded-full ${back.outer}`}
            style={{ backgroundImage: back.rings }}
          >
            <span className={`grid place-items-center w-[30cqi] aspect-square rounded-full bg-slate-900 ${back.inner}`}>
              <PowerIcon className="w-[15cqi] h-[15cqi] text-white" />
            </span>
          </span>
          <span className={`font-wordmark ${back.wordmark} leading-[.9] tracking-[.04em] -mr-[.04em]`}>IMGM</span>
        </div>
      </article>
    </div>
  );
};

/**
 * ChecklistBack — the back of a review's card when the review has a checklist: the same
 * stock and frame as its front (the tier's ink, or the gilt for a Legendary 10), with
 * the reviewer's checklist printed on it (CardChecklist, the same back a game page's
 * card has). A review without a checklist turns over to CardBack instead. Give it a
 * width, like the front.
 * Props: score (sets the frame), ticks (from tickedChecklist), name (the reviewer),
 * className.
 */
export const ChecklistBack = ({ score, ticks, name, className = '' }) => {
  const rarity = getRarity(score);
  const legendary = rarity.key === 'legendary';
  const size = SIZES.full;
  return (
    <div className={`@container ${className}`}>
      <article aria-label={`${name}'s checklist`} className={`${STOCK} ${size.stock}`} style={{ '--ink': rarity.color }}>
        <div
          className={`flex-1 min-h-0 flex rounded-[2.6cqi/1.86cqi] ${legendary ? size.frameGilt : `${size.frame} bg-(--ink)`}`}
          style={legendary ? GILT : undefined}
        >
          <div className={`flex-1 min-w-0 min-h-0 flex flex-col bg-slate-900 ${legendary ? size.faceGilt : size.face}`}>
            {/* The answers scroll if a small card can't fit them all; the small print
                stays at the bottom, as on the front */}
            <div className="flex-1 min-h-0">
              <CardChecklist ticks={ticks} name={name} />
            </div>
            <p className={`mt-[2.4cqi] ${SMALL_PRINT}`}>
              <span>Beta</span>
              <span>imgm.app</span>
            </p>
          </div>
        </div>
      </article>
    </div>
  );
};

export default CollectibleCard;
