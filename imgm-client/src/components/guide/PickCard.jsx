/**
 * PickCard — one recommended game. The Best Pick gets the big Legendary-style card;
 * the other four are compact rows, the next two framed in their tier's colours
 * (#2 Epic purple, #3 Rare blue). Every card links to the game's IMGM page.
 * With onNotForMe, each card also gets a "Not for me" button (swaps that game out).
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { getRarity } from '../reviewQuest/questOptions';
import RichText from './RichText';

export const ImgmBadge = ({ rating, reviewCount }) => {
  if (!rating) return <span className="text-xs text-slate-500">No IMGM reviews yet</span>;
  const rarity = getRarity(rating);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold" style={{ color: rarity.color }}>
      <span className="uppercase tracking-wider">{rarity.label}</span>
      <span className="tabular-nums">{Number(rating).toFixed(1)}</span>
      <span className="text-slate-500 font-semibold">
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

// Sits on top of the card's link, so it must stop the click from opening the game
const NotForMeButton = ({ pick, onNotForMe, disabled }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onNotForMe(pick);
    }}
    title={`Not for me: swap ${pick.title} for something else`}
    className="absolute top-2 right-2 z-10 px-2 py-1 rounded-lg text-[11px] font-bold text-slate-300 bg-slate-950/80 border border-slate-700 hover:text-white hover:border-red-400/70 transition disabled:opacity-40 disabled:cursor-not-allowed"
  >
    ✕ Not for me
  </button>
);

// Rank → tier frame for the compact rows (#1 is the Legendary Best Pick card)
const RANK_TIERS = {
  2: { frame: 'rarity-frame is-epic', color: '#c084fc' },
  3: { frame: 'rarity-frame', color: '#60a5fa' }, // Rare: a plain frame in its blue
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
          className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white transition"
        >
          {open ? 'Show less' : 'Read more'}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

const PickCard = ({ pick, rank, onNotForMe, disabled }) => {
  const notForMe = onNotForMe && <NotForMeButton pick={pick} onNotForMe={onNotForMe} disabled={disabled} />;

  if (pick.best_pick) {
    return (
      <Link
        to={`/game/${pick.game_id}`}
        className="relative rarity-frame is-legendary block animate-fade-in hover:scale-[1.01] transition"
        style={{ '--rc': '#fbbf24' }}
      >
        {notForMe}
        <article className="rounded-[17px] bg-slate-900 overflow-hidden flex gap-4 p-4">
          <Cover src={pick.cover} title={pick.title} className="w-28 h-40 rounded-xl shrink-0" />
          <div className="min-w-0 flex flex-col gap-1.5">
            <span className="self-start text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 bg-amber-300 rounded px-2 py-0.5">
              ★ Best pick
            </span>
            <h3 className="text-xl font-black text-white leading-tight">{pick.title}</h3>
            <p className="text-xs text-slate-400">
              {[pick.year, hoursText(pick.hours), platformsText(pick.platforms)].filter(Boolean).join(' · ')}
            </p>
            <ImgmBadge rating={pick.rating} reviewCount={pick.review_count} />
            <Why text={pick.why} defaultOpen className="text-sm text-slate-200 leading-relaxed mt-1" />
          </div>
        </article>
      </Link>
    );
  }

  const tier = RANK_TIERS[rank];
  const row = (
    <>
      <Cover src={pick.cover} title={pick.title} className="w-14 h-20 rounded-lg shrink-0" />
      <div className="min-w-0 flex flex-col gap-1">
        {/* pr-24 keeps long titles clear of the "Not for me" button */}
        <h3 className={`font-bold text-white leading-tight ${onNotForMe ? 'pr-24' : ''}`}>
          <span className="mr-1.5 tabular-nums" style={{ color: tier?.color ?? '#64748b' }}>{rank}.</span>
          {pick.title}
        </h3>
        <span className="flex flex-wrap items-center gap-x-2">
          <ImgmBadge rating={pick.rating} reviewCount={pick.review_count} />
          {hoursText(pick.hours) && <span className="text-xs text-slate-400">· {hoursText(pick.hours)}</span>}
        </span>
        <Why text={pick.why} className="text-sm text-slate-300 leading-snug" />
      </div>
    </>
  );

  // #2 and #3: the row inside its tier's frame
  if (tier) {
    return (
      <Link
        to={`/game/${pick.game_id}`}
        className={`relative block animate-fade-in hover:scale-[1.01] transition ${tier.frame}`}
        style={{ '--rc': tier.color }}
      >
        {notForMe}
        <article className="rounded-[17px] bg-slate-900 flex gap-3 p-3">{row}</article>
      </Link>
    );
  }

  return (
    <Link
      to={`/game/${pick.game_id}`}
      className="relative flex gap-3 p-3 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-brand/60 transition animate-fade-in"
    >
      {notForMe}
      {row}
    </Link>
  );
};

export default PickCard;
