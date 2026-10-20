/**
 * PickCard — one recommended game. The Best Pick gets the big Legendary-style card;
 * the other four are compact rows, the next two framed in their tier's colours
 * (#2 Epic purple, #3 Rare blue). Every card links to the game's IMGM page.
 * Each card's bottom row has Add to Backlog; "Played it" and "Not for me" live in the
 * Sort your picks screen, which answers all 5 at once (SortYourPicks).
 * Noir: the frames are thin edges in the tier's ink (the gilt for the Best Pick), with
 * square corners, square buttons and the tier's mark instead of words in capitals.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Star } from 'lucide-react';
import { getRarity } from '../reviewQuest/questOptions';
import BacklogButton from '../BacklogButton';
import RarityMark from '../RarityMark';
import RichText from './RichText';

export const ImgmBadge = ({ rating, reviewCount }) => {
  if (!rating) return <span className="text-sm text-slate-400">No IMGM reviews yet</span>;
  const rarity = getRarity(rating);
  return (
    <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: rarity.color }}>
      <RarityMark tier={rarity.key} />
      <span className="font-semibold">{rarity.label}</span>
      <span className="tabular-nums">{Number(rating).toFixed(1)}</span>
      <span className="text-slate-400">
        · {reviewCount} review{reviewCount === 1 ? '' : 's'}
      </span>
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

// Rank → tier frame for the compact rows (#1 is the Legendary Best Pick card).
// Colours come from the rarity table, so they always match the review cards.
const RANK_TIERS = {
  2: { frame: 'rarity-frame is-epic', color: getRarity(8).color },
  3: { frame: 'rarity-frame', color: getRarity(6).color }, // Rare: a plain frame in its blue
};

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

  if (pick.best_pick) {
    return (
      <Link
        to={`/game/${pick.game_id}`}
        className="relative rarity-frame is-legendary block animate-fade-in hover:brightness-110 transition-[filter] duration-120"
        style={{ '--rc': getRarity(10).color }}
      >
        <article className="rounded-xs bg-slate-900 overflow-hidden flex gap-4 p-4">
          <Cover src={pick.cover} title={pick.title} className="w-28 h-40 rounded-sm shrink-0" />
          <div className="min-w-0 flex flex-col gap-1.5">
            <span className="self-start inline-flex items-center gap-1 h-6 px-2 rounded-xs border border-rarity-legendary-edge text-rarity-legendary text-xs font-medium">
              <Star className="w-3 h-3" strokeWidth={2} aria-hidden="true" /> Best pick
            </span>
            <h3 className="font-display text-[28px] uppercase tracking-[.005em] text-white leading-[.9] text-balance">{pick.title}</h3>
            <p className="text-sm text-slate-400">
              {[pick.year, hoursText(pick.hours), platformsText(pick.platforms)].filter(Boolean).join(' · ')}
            </p>
            <ImgmBadge rating={pick.rating} reviewCount={pick.review_count} />
            <Why text={pick.why} defaultOpen className="text-sm text-slate-200 leading-relaxed mt-1" />
            {actions}
          </div>
        </article>
      </Link>
    );
  }

  const tier = RANK_TIERS[rank];
  const row = (
    <>
      <Cover src={pick.cover} title={pick.title} className="w-14 h-20 rounded-sm shrink-0" />
      <div className="min-w-0 flex flex-col gap-1">
        <h3 className="font-semibold text-white leading-tight">
          <span className="mr-1.5 tabular-nums" style={{ color: tier?.color ?? 'var(--color-slate-400)' }}>{rank}.</span>
          {pick.title}
        </h3>
        <span className="flex flex-wrap items-center gap-x-2">
          <ImgmBadge rating={pick.rating} reviewCount={pick.review_count} />
          {hoursText(pick.hours) && <span className="text-sm text-slate-400">· {hoursText(pick.hours)}</span>}
        </span>
        <Why text={pick.why} className="text-sm text-slate-300 leading-snug" />
        {actions}
      </div>
    </>
  );

  // #2 and #3: the row inside its tier's frame
  if (tier) {
    return (
      <Link
        to={`/game/${pick.game_id}`}
        className={`relative block animate-fade-in hover:brightness-110 transition-[filter] duration-120 ${tier.frame}`}
        style={{ '--rc': tier.color }}
      >
        <article className="rounded-xs bg-slate-900 flex gap-3 p-3">{row}</article>
      </Link>
    );
  }

  return (
    <Link
      to={`/game/${pick.game_id}`}
      className="relative flex gap-3 p-3 rounded-sm bg-slate-900 border border-slate-700 hover:border-white transition-colors duration-120 animate-fade-in"
    >
      {row}
    </Link>
  );
};

export default PickCard;
