/**
 * GameCard — A game in the Home and Search grids, drawn like loot: the cover, the
 * title, one quiet line (year · genre · platforms) and the IMGM verdict in its rarity
 * colour (◆ EPIC 8.0, 3 reviews). A game nobody has reviewed yet invites the first review.
 *
 * Data: coverUrl, title, genres, platforms and releaseDate come from IGDB;
 * ratings.imgm (the average score) and reviewCount from IMGM reviews.
 *
 * The whole card is one link to the game page (the title's link stretches over it),
 * so it works with the keyboard, Cmd-click and "Open in new tab".
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Medal } from 'lucide-react';
import { getRarity } from './reviewQuest/questOptions';
import { PowerIcon } from './Logo';
import { coverSrcSet } from '../lib/igdbImage';
import { gameMetaParts } from '../lib/gameLabels';

// From this many reviews a score is settled enough to tint the card's edge (and foil a
// Legendary). Before that, a single 10/10 shouldn't turn a card gold.
const SETTLED_REVIEWS = 3;

// How wide a card is: 2 columns on phones, up to 5 (about 230px each) on desktop
const COVER_SIZES = '(min-width: 1024px) 230px, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw';

// No cover, or it failed to load: the title on dark art, so the card still looks intended
const CoverFallback = ({ title }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center bg-gradient-to-br from-slate-800 to-slate-900">
    <PowerIcon className="w-8 h-8 text-slate-600" />
    <span className="font-display text-2xl uppercase leading-none text-slate-400 text-balance line-clamp-3">
      {title}
    </span>
  </div>
);

const GameCard = ({
  id,
  title,
  coverUrl,
  genres = [],
  platforms = [],
  ratings = {},
  reviewCount,
  releaseDate,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [broken, setBroken] = useState(!coverUrl);

  const score = ratings.imgm;
  const rarity = typeof score === 'number' ? getRarity(score) : null;
  const settled = rarity && reviewCount >= SETTLED_REVIEWS;
  const meta = gameMetaParts({ releaseDate, genres, platforms });

  // The edge at rest: foil for a settled Legendary, the rarity colour for a settled
  // score, a quiet grey otherwise. Hover and focus light it up in the rarity colour.
  const edge = !settled
    ? 'border-slate-800/50'
    : rarity.key === 'legendary'
      ? 'loot-foil'
      : 'border-[color-mix(in_srgb,var(--rc)_35%,transparent)]';

  return (
    <article
      id={`game-card-${id}`}
      // --rc: the colour of the edge and the glow (unreviewed games glow grey, not lime)
      style={{ '--rc': rarity?.color ?? 'var(--color-slate-400)' }}
      className={`
        group relative flex flex-col
        bg-slate-900/60 border ${edge}
        rounded-2xl overflow-hidden
        transition duration-300 ease-out
        hover:-translate-y-1
        hover:border-[color-mix(in_srgb,var(--rc)_70%,transparent)]
        hover:shadow-[0_0_28px_-4px_color-mix(in_srgb,var(--rc)_45%,transparent)]
        has-[.card-link:focus-visible]:-translate-y-1
        has-[.card-link:focus-visible]:border-[color-mix(in_srgb,var(--rc)_70%,transparent)]
        has-[.card-link:focus-visible]:shadow-[0_0_28px_-4px_color-mix(in_srgb,var(--rc)_45%,transparent)]
        has-[.card-link:focus-visible]:outline-2 has-[.card-link:focus-visible]:outline-offset-2
        has-[.card-link:focus-visible]:outline-brand
        active:scale-[.98]
      `}
    >
      {/* ── Cover Art ── a grey pulse until it loads, then it fades in */}
      <div className={`relative aspect-[3/4] overflow-hidden bg-slate-800 ${loaded || broken ? '' : 'motion-safe:animate-pulse'}`}>
        {broken ? (
          <CoverFallback title={title} />
        ) : (
          <img
            src={coverUrl}
            // 264px for 1x screens, 528px for retina, so covers stay sharp
            srcSet={coverSrcSet(coverUrl)}
            sizes={COVER_SIZES}
            alt="" // the title link already names the card
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setBroken(true)}
            className={`
              w-full h-full object-cover
              transition-[opacity,scale] duration-500 ease-out
              group-hover:scale-105
              ${loaded ? 'opacity-100' : 'opacity-0'}
            `}
          />
        )}

        {/* Gradient fade at the bottom of the image */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-900/90 to-transparent" />
      </div>

      {/* ── Card Body ── fixed rows, so every card in a grid row lines up */}
      <div className="flex flex-col gap-1 p-3.5 flex-1">
        <h3 className="text-[15px] font-bold text-white leading-tight line-clamp-2 min-h-[2.5em]">
          {/* Stretched link: its ::after covers the whole card */}
          <Link to={`/game/${id}`} className="card-link after:absolute after:inset-0 focus-visible:outline-none">
            {title}
          </Link>
        </h3>

        {/* One quiet line: year · genre · platforms. On a narrow card a part that doesn't
            fit drops out whole (it wraps onto a hidden second line) instead of being cut */}
        <p className="flex flex-wrap gap-x-1 h-4 overflow-hidden text-xs leading-4 text-slate-400">
          {meta.map((part, i) => (
            <span key={i} className="whitespace-nowrap">
              {i > 0 && '· '}{part}
            </span>
          ))}
        </p>

        {/* The IMGM verdict, or the invitation to give the first one */}
        <div className="mt-auto pt-2 min-h-7">
          {rarity && reviewCount > 0 ? (
            // The review count drops out the same way when the card is too narrow
            <p className="flex flex-wrap items-center justify-between gap-x-2 h-5 overflow-hidden text-xs">
              <span className="flex items-center gap-1.5 h-5">
                <span aria-hidden="true" className="w-2 h-2 shrink-0 rotate-45 rounded-[2px] bg-(--rc) shadow-[0_0_8px_var(--rc)]" />
                <span className="text-[11px] font-black uppercase tracking-wider text-(--rc)">{rarity.label}</span>
                <span className="font-bold tabular-nums text-white">{score.toFixed(1)}</span>
              </span>
              <span className="leading-5 text-slate-500 whitespace-nowrap">
                {reviewCount} review{reviewCount === 1 ? '' : 's'}
              </span>
            </p>
          ) : reviewCount === 0 && (
            // Above the stretched link (z-10), so it opens the Review Quest, not the game page
            <Link
              to={`/game/${id}/review`}
              aria-label={`Be the first to review ${title}`}
              className="group/first relative z-10 inline-flex items-center gap-1.5 h-5 text-xs font-bold text-amber-300/80 transition hover:text-amber-300"
            >
              <Medal className="w-3.5 h-3.5" aria-hidden="true" />
              Be the first
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/first:translate-x-0.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
};

export default GameCard;
