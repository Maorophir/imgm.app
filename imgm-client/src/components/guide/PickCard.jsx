/**
 * PickCard — one recommended game. The Best Pick gets the big card; the other four are
 * compact rows. Each one wears a gold, silver or bronze tab for its rank (RankTab),
 * and is framed in its IMGM score's rarity (Epic purple, Rare blue, the gilt for a
 * 10/10), so a game looks the same here as in Sort your picks; a game with no IMGM
 * score gets a plain hairline. Every card links to the game's IMGM page.
 * Each card's bottom row has Add to Backlog; "Played it" and "Not for me" live in the
 * Sort your picks screen, which answers all 5 at once (SortYourPicks).
 * Noir: the frames are thin edges in the tier's ink, with square corners, square
 * buttons and the tier's mark instead of words in capitals.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Star } from 'lucide-react';
import { getRarity } from '../reviewQuest/questOptions';
import BacklogButton from '../BacklogButton';
import RarityMark from '../RarityMark';
import RankTab from './RankTab';
import RichText from './RichText';
import { scoreFrame } from './scoreFrame';

export const ImgmBadge = ({ rating, reviewCount }) => {
  if (!rating) return <span className="text-sm text-slate-400">No IMGM reviews yet</span>;
  const rarity = getRarity(rating);
  return (
    <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: rarity.color }}>
      <RarityMark tier={rarity.key} />
      <span className="font-semibold">{rarity.label}</span>
      <span className="tabular-nums">{Number(rating).toFixed(1)}</span>
      {/* No count rather than a wrong "0 reviews" (answers saved before the AI service read the count right) */}
      {reviewCount > 0 && (
        <span className="text-slate-400">
          · {reviewCount} review{reviewCount === 1 ? '' : 's'}
        </span>
      )}
    </span>
  );
};

const Cover = ({ src, title, className }) =>
  src ? (
    <img src={src} alt={`${title} cover`} loading="lazy" className={`object-cover bg-slate-800 ${className}`} />
  ) : (
    <div className={`bg-slate-800 ${className}`} aria-hidden="true" />
  );

// "~2.5h to beat" (normal playthrough, from IGDB player reports)
const hoursText = (hours) => (hours ? `~${hours}h to beat` : null);

const platformsText = (platforms = []) =>
  platforms.length > 3 ? `${platforms.slice(0, 3).join(' · ')} +${platforms.length - 3}` : platforms.join(' · ');

// The card's bottom row: Add to Backlog
const Actions = ({ pick }) => (
  <div className="flex flex-wrap items-center gap-1.5 mt-1">
    <BacklogButton gameId={pick.game_id} source="play_next" />
  </div>
);

const PLAIN_CARD = 'rounded-sm bg-slate-900 border border-slate-700 hover:border-white transition-colors duration-120';

// Why the guide picked it. Long ones fold to 3 lines with "Read more"; the Best Pick
// starts open (with "Show less"). The toggle sits inside the card's link, so it stops
// the click from opening the game.
const LONG_WHY = 140; // characters
const Why = ({ text, defaultOpen = false, className = '' }) => {
  const [open, setOpen] = useState(defaultOpen);
  const long = (text?.length ?? 0) > LONG_WHY;
  return (
    <div className={className}>
      <p className={long && !open ? 'line-clamp-3' : ''}>
        <RichText text={text} />
      </p>
      {long && (
        <button
          type="button"
          aria-expanded={open}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          className="mt-1 inline-flex items-center gap-1 min-h-8 text-sm font-medium text-slate-400 hover:text-white transition-colors duration-120"
        >
          {open ? 'Show less' : 'Read more'}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-120 ${open ? 'rotate-180' : ''}`} strokeWidth={1.8} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

const PickCard = ({ pick, rank }) => {
  const actions = <Actions pick={pick} />;

  const frame = scoreFrame(pick.rating);
  // The card's link: inside its score's frame, or a plain hairline card
  const card = (children, padding) =>
    frame ? (
      <Link
        to={`/game/${pick.game_id}`}
        className={`relative block animate-fade-in hover:brightness-110 transition-[filter] duration-120 ${frame.className}`}
        style={frame.style}
      >
        <article className={`rounded-xs bg-slate-900 overflow-hidden flex ${padding}`}>{children}</article>
      </Link>
    ) : (
      <Link to={`/game/${pick.game_id}`} className={`relative flex animate-fade-in ${padding} ${PLAIN_CARD}`}>
        {children}
      </Link>
    );

  if (pick.best_pick) {
    return card(
      <>
        <Cover src={pick.cover} title={pick.title} className="w-28 h-40 rounded-sm shrink-0" />
        <div className="min-w-0 flex flex-col gap-1.5">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-white">
            <RankTab rank={rank} words className="px-2 pt-1.5 pb-1 text-sm" />
            <span className="inline-flex items-center gap-1 text-slate-400 font-normal">
              · <Star className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" /> Best pick
            </span>
          </span>
          <h3 className="font-display text-[28px] uppercase tracking-[.005em] text-white leading-[.9] text-balance">{pick.title}</h3>
          <p className="text-sm text-slate-400">
            {[pick.year, hoursText(pick.hours), platformsText(pick.platforms)].filter(Boolean).join(' · ')}
          </p>
          <ImgmBadge rating={pick.rating} reviewCount={pick.review_count} />
          <Why text={pick.why} defaultOpen className="text-sm text-slate-200 leading-relaxed mt-1" />
          {actions}
        </div>
      </>,
      'gap-4 p-4',
    );
  }

  return card(
    <>
      <Cover src={pick.cover} title={pick.title} className="w-14 h-20 rounded-sm shrink-0" />
      <div className="min-w-0 flex flex-col gap-1">
        <RankTab rank={rank} words className="self-start px-1.5 pt-1 pb-[3px] text-xs" />
        <h3 className="font-semibold text-white leading-tight">{pick.title}</h3>
        <span className="flex flex-wrap items-center gap-x-2">
          <ImgmBadge rating={pick.rating} reviewCount={pick.review_count} />
          {hoursText(pick.hours) && <span className="text-sm text-slate-400">· {hoursText(pick.hours)}</span>}
        </span>
        <Why text={pick.why} className="text-sm text-slate-300 leading-snug" />
        {actions}
      </div>
    </>,
    'gap-3 p-3',
  );
};

export default PickCard;
