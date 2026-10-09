/**
 * RarityCard — a review as a collectible card, framed in the score's loot rarity.
 *
 * Front: reviewer, game art with the stars, rarity, "X meets Y", vibes, setup.
 * Back (tap to flip): the Steam-style checklist. Reviews without a checklist
 * don't flip; quick reviews get a "Quick review" stamp instead.
 *
 * The art stretches to fill whatever room the text doesn't use, so sparse cards
 * show more art and busy cards never cut text off.
 */
import { Hourglass, ListChecks, Monitor } from 'lucide-react';
import ArtIcon from '../ArtIcon';
import { useState } from 'react';
import RarityStars from '../RarityStars';
import MarqueeText from '../MarqueeText';
import {
  getRarity, RATING_LABELS, VIBES, GOT_GOOD_AFTER, COMPLETION_STATUSES, BADGES, checklistColor,
} from '../reviewQuest/questOptions';
import { avatarColor, formatDate, tickedChecklist, isQuickReview, reviewerName } from './reviewDisplay';

export const Avatar = ({ name, size = 'w-8 h-8 text-sm' }) => (
  <span
    className={`${size} rounded-full flex items-center justify-center font-extrabold text-white shrink-0`}
    style={{ background: avatarColor(name) }}
    aria-hidden="true"
  >
    {name.charAt(0).toUpperCase()}
  </span>
);

// The rarity-coloured 3px border around each face of the card
const Frame = ({ rarity, className = '', children }) => (
  <div className={`rarity-frame is-${rarity.key} ${className}`} style={{ '--rc': rarity.color }}>
    <div className="h-full rounded-[17px] bg-slate-900 overflow-hidden flex flex-col">{children}</div>
  </div>
);

const RarityCard = ({ review, game, artUrl }) => {
  const [flipped, setFlipped] = useState(false);

  const rarity = getRarity(review.rating);
  const name = reviewerName(review);
  const ticks = tickedChecklist(review);
  const canFlip = ticks.length > 0;
  const quick = isQuickReview(review);

  const vibes = VIBES.filter((v) => review.vibes?.includes(v.value));
  const gotGood = GOT_GOOD_AFTER.find((o) => o.value === review.gotGoodAfter);
  const completion = COMPLETION_STATUSES.find((o) => o.value === review.completionStatus);
  const meets = [review.comparedA, review.comparedB].filter(Boolean);
  const meta = [
    review.hoursPlayed != null && { icon: Hourglass, text: `${review.hoursPlayed}h` },
    review.platform && { icon: Monitor, text: review.platform },
    completion && { icon: completion.art, text: completion.label },
  ].filter(Boolean);
  const hasBody = meets.length > 0 || vibes.length > 0 || gotGood;
  const hasFoot = meta.length > 0 || canFlip || quick;

  const flip = () => canFlip && setFlipped((f) => !f);

  return (
    <div
      className={`card-flip w-[270px] max-w-full aspect-[300/450] shrink-0 ${flipped ? 'is-flipped' : ''} ${canFlip ? 'cursor-pointer' : ''} rounded-[20px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand`}
      // Only flippable cards act as a button
      role={canFlip ? 'button' : undefined}
      tabIndex={canFlip ? 0 : undefined}
      aria-label={canFlip ? `${name}'s card. ${flipped ? 'Showing the checklist' : 'Tap to see the checklist'}` : undefined}
      onClick={flip}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          flip();
        }
      }}
    >
      <div className="card-flip-inner">
        {/* ── Front ── */}
        <Frame rarity={rarity} className="card-face">
          <div className="flex items-center justify-between gap-2 px-3 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar name={name} />
              <span className="min-w-0">
                <span className="block text-[13px] font-bold text-white truncate">{name}</span>
                <span className="block text-[11px] text-slate-400">{formatDate(review.createdAt)}</span>
              </span>
            </div>
            {review.badges?.length > 0 && (
              <span className="flex gap-0.5 text-sm shrink-0">
                {review.badges.map((b) => <span key={b} title={BADGES[b]?.label}><ArtIcon icon={BADGES[b]?.art} className="w-4 h-4 text-amber-300" /></span>)}
              </span>
            )}
          </div>

          {/* The art: game artwork → a rarity-tinted placeholder with the title */}
          <div
            className="card-art relative flex-[1_1_150px] min-h-[92px] bg-cover bg-center"
            style={artUrl
              ? { backgroundImage: `url(${artUrl})` }
              : { background: `radial-gradient(120% 90% at 30% 20%, ${rarity.color}55, #131c31 70%)` }}
          >
            {artUrl ? (
              <span className="absolute top-2 left-2 max-w-[calc(100%-16px)] truncate text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-slate-950/75 backdrop-blur-sm text-white">
                {game.title}
              </span>
            ) : (
              <span className="absolute inset-0 flex items-center justify-center px-4 pb-6 text-center font-bold text-slate-200 text-balance">
                {game.title}
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-3 pt-6 pb-2 bg-gradient-to-t from-slate-950/95 to-transparent">
              <RarityStars value={review.rating} size="sm" readOnly />
              <span className="font-black text-white text-xl leading-none tabular-nums">
                {review.rating}<span className="text-xs text-slate-400 font-semibold">/10</span>
              </span>
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-2 px-3 pt-2">
            <span className="text-lg font-black uppercase tracking-[0.2em]" style={{ color: rarity.color, textShadow: `0 0 14px ${rarity.color}66` }}>
              {rarity.label}
            </span>
            <span className="text-xs text-slate-400 font-semibold">{RATING_LABELS[review.rating]}</span>
          </div>

          {hasBody && (
            <div className="flex flex-col gap-2 px-3 pt-2">
              {meets.length > 0 && (
                // One line: each game gets an equal share; long titles scroll
                <div className="flex items-center gap-1.5 text-xs min-w-0">
                  {meets.map((g, i) => (
                    <span key={g.id} className="contents">
                      {i > 0 && <span className="font-black text-slate-400 shrink-0">×</span>}
                      <span className="flex items-center gap-1.5 min-w-0 flex-1">
                        {g.coverUrl && <img src={g.coverUrl} alt="" className="w-[22px] h-[30px] object-cover rounded-sm shrink-0" />}
                        {/* Long names slowly slide to show the whole title */}
                        <MarqueeText text={g.title} className="font-bold text-slate-100" />
                      </span>
                    </span>
                  ))}
                </div>
              )}
              {vibes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {vibes.map((v) => (
                    <span key={v.value} className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-200 whitespace-nowrap">
                      <ArtIcon icon={v.art} className="w-3 h-3" /> {v.label}
                    </span>
                  ))}
                </div>
              )}
              {gotGood && <p className="flex items-center gap-1 text-[11px] text-slate-400"><ArtIcon icon={gotGood.art} className="w-3 h-3" /> Got good: {gotGood.label.toLowerCase()}</p>}
            </div>
          )}

          {hasFoot && (
            <div className="flex items-center justify-between gap-2 px-3 pt-2 pb-2.5 mt-2 border-t border-slate-800">
              <span className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11px] text-slate-400 min-w-0">
                {meta.map((m) => (
                  <span key={m.text} className="inline-flex items-center gap-1">
                    <ArtIcon icon={m.icon} className="w-3 h-3" />
                    {m.text}
                  </span>
                ))}
              </span>
              {canFlip && <span className="text-[11px] font-bold text-slate-300 whitespace-nowrap">Flip ↻</span>}
              {!canFlip && quick && (
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 border border-slate-700 rounded px-1.5 py-0.5 whitespace-nowrap">
                  Quick review
                </span>
              )}
            </div>
          )}
        </Frame>

        {/* ── Back: the checklist ── */}
        {canFlip && (
          <Frame rarity={rarity} className="card-face card-face-back">
            <div className="flex flex-col gap-2.5 p-3 h-full overflow-y-auto">
              <p className="flex items-center justify-between gap-2 font-black text-white">
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"><ListChecks className="w-4 h-4 text-brand" aria-hidden="true" /> The checklist</span>
                <span className="text-[11px] font-medium text-slate-400 truncate min-w-0">{name}</span>
              </p>
              <div className="grid gap-1.5">
                {ticks.map(({ category, index, option }) => (
                  <div key={category.field} className="grid grid-cols-[14px_80px_1fr] gap-2 items-start text-xs leading-snug">
                    <span
                      className="w-[13px] h-[13px] mt-0.5 rounded-[3px] flex items-center justify-center text-[9px] font-black text-slate-900"
                      style={{ background: checklistColor(category, index).solid }}
                      aria-hidden="true"
                    >
                      {index === 'na' ? '–' : '✓'}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mt-0.5">{category.title}</span>
                    <span className={`break-words ${index === 'na' ? 'text-slate-400 italic' : 'text-slate-100'}`}>{option.label}</span>
                  </div>
                ))}
              </div>
              <span className="mt-auto text-center text-[11px] font-bold text-slate-300">Flip back ↺</span>
            </div>
          </Frame>
        )}
      </div>
    </div>
  );
};

export default RarityCard;
