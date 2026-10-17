/**
 * GameCard — a game in the Home and Search grids, as a Noir tile: the cover with a
 * thin strip in its rarity colour under it, the title, one quiet line (year · genre ·
 * platforms) and the IMGM verdict in the tier's ink (● 8.0 Epic · 3 reviews). A game
 * nobody has reviewed leaves that line empty rather than saying so (most games in a
 * grid have no reviews yet, and a column of "No reviews yet" only advertises it), but
 * the line keeps its height, so every tile in a grid row is the same size.
 *
 * Data: coverUrl, title, genres, platforms and releaseDate come from IGDB;
 * ratings.imgm (the average score) and reviewCount from IMGM reviews.
 *
 * The whole tile is one link to the game page (the title's link stretches over it),
 * so it works with the keyboard, Cmd-click and "Open in new tab". There is no box
 * around it: like the rest of Noir, it sits straight on the page.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import RarityMark from './RarityMark';
import { getRarity } from './reviewQuest/questOptions';
import { PowerIcon } from './Logo';
import { coverSrcSet, COVER_SIZES } from '../lib/igdbImage';
import { gameMetaParts } from '../lib/gameLabels';

// Noir's UI timing: quick, and settles without a bounce
const EASE = 'ease-[cubic-bezier(.2,.9,.1,1)]';

// No cover, or it failed to load: the title on dark stock, so the tile still looks intended
const CoverFallback = ({ title }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center bg-slate-900">
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
  ratings,
  reviewCount,
  releaseDate,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [broken, setBroken] = useState(!coverUrl);

  // Some lists send no ratings at all for a game nobody has reviewed
  const score = ratings?.imgm;
  const rarity = typeof score === 'number' ? getRarity(score) : null;
  // A score shows unless the list says outright that nobody has reviewed the game
  const reviewed = Boolean(rarity) && reviewCount !== 0;
  const meta = gameMetaParts({ releaseDate, genres, platforms });

  return (
    <article
      id={`game-card-${id}`}
      className="group relative flex flex-col min-w-0 has-[.card-link:focus-visible]:outline-2 has-[.card-link:focus-visible]:outline-offset-4 has-[.card-link:focus-visible]:outline-white"
      // The tier's colours: --ink for the verdict, --edge for the strip under the cover
      style={reviewed ? { '--ink': rarity.color, '--edge': rarity.edge } : undefined}
    >
      {/* ── Cover ── a grey pulse until it loads, then it fades in */}
      <div className={`relative aspect-[3/4] overflow-hidden rounded-sm bg-slate-900 ${loaded || broken ? '' : 'motion-safe:animate-pulse'}`}>
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
            className={`w-full h-full object-cover transition-opacity duration-500 ease-out ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
      </div>

      {/* The rarity strip: the card's painted edge peeking out under the cover. It grows
          a little on hover. Unreviewed games keep the same 4px of space, so titles in a
          row line up. */}
      <span
        aria-hidden="true"
        className={`block h-1 mx-0.5 rounded-b-sm origin-top ${
          reviewed
            ? `bg-(--edge) shadow-[0_1px_0_rgba(0,0,0,.5)] transition-transform duration-180 ${EASE} group-hover:scale-y-175 group-has-[.card-link:focus-visible]:scale-y-175`
            : ''
        }`}
      />

      {/* Title: two lines tall at most (and always), so every tile in a grid row lines up */}
      <h3 className="mt-3.5 text-base font-medium leading-[1.3] text-white line-clamp-2 min-h-[2.6em]">
        {/* Stretched link: its ::after covers the whole tile. Underlined on hover. */}
        <Link
          to={`/game/${id}`}
          className={`card-link after:absolute after:inset-0 focus-visible:outline-none underline decoration-1 underline-offset-4 decoration-transparent transition-[text-decoration-color] duration-120 ${EASE} group-hover:decoration-white group-has-[.card-link:focus-visible]:decoration-white`}
        >
          {title}
        </Link>
      </h3>

      {/* One quiet line: year · genre · platforms. On a narrow tile a part that doesn't
          fit drops out whole (it wraps onto a hidden second line) instead of being cut */}
      <p className="flex flex-wrap gap-x-1 h-[21px] mt-1 overflow-hidden text-sm leading-[21px] text-slate-400">
        {meta.map((part, i) => (
          <span key={i} className="whitespace-nowrap">
            {i > 0 && '· '}{part}
          </span>
        ))}
      </p>

      {/* The IMGM verdict in the tier's ink, or an empty line of the same height.
          The review count sits on the same line when the tile is wide enough, and wraps
          onto its own line when it isn't ("Legendary" is the longest word), never hidden.
          Its "·" lives in its own left padding: the line is pulled 12px left and clipped,
          so a "·" that would start the second line is cut off with that padding. */}
      {reviewed ? (
        <p className="mt-2 overflow-hidden text-sm leading-5 text-(--ink)">
          <span className="flex flex-wrap items-center -ml-3">
            <span className="flex items-center gap-2 h-5 pl-3 whitespace-nowrap">
              <RarityMark tier={rarity.key} />
              <span>
                <span className="text-xs tabular-nums">{score.toFixed(1)}</span> {rarity.label}
              </span>
            </span>
            {reviewCount > 0 && (
              <span className="relative pl-3 whitespace-nowrap text-slate-400 before:absolute before:left-1 before:content-['·']">
                {reviewCount} review{reviewCount === 1 ? '' : 's'}
              </span>
            )}
          </span>
        </p>
      ) : (
        <div className="h-5 mt-2" aria-hidden="true" />
      )}
    </article>
  );
};

export default GameCard;
