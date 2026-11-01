/**
 * RarityCard — a review on a game page as a Noir trading card, framed in the score's
 * rarity: the same card anatomy as CollectibleCard (the home page's cards), with the
 * review's own details printed on it.
 *
 * Front: the game's title and the score numeral in the tier's ink, who reviewed it
 * (and the badges it earned), an art window, the tier, "X meets Y", vibes, setup.
 * Back (tap to flip): the Steam-style checklist (CardChecklist, the same back the
 * home page's card has). Reviews without a checklist don't turn; quick reviews get a
 * "Quick review" stamp instead.
 *
 * The art window takes whatever height the text leaves, so sparse cards show more
 * art and busy cards never cut text off. Sizes are in cqi (a share of the card's
 * width), like CollectibleCard, so the card is the same design at any width.
 */
import { Hourglass, Monitor, RotateCcw } from 'lucide-react';
import ArtIcon from '../ArtIcon';
import { useState } from 'react';
import RarityMark from '../RarityMark';
import MarqueeText from '../MarqueeText';
import {
  getRarity, RATING_LABELS, VIBES, GOT_GOOD_AFTER, COMPLETION_STATUSES, BADGES,
} from '../reviewQuest/questOptions';
import { avatarColor, avatarUrl, formatDate, tickedChecklist, isQuickReview, reviewerName } from './reviewDisplay';
import CardChecklist from './CardChecklist';

// A player's face: their profile picture if they set one, otherwise their coloured initial.
// `user` = { id, avatarUpdatedAt }; the time in the address makes a new picture show at once.
export const Avatar = ({ name, user, size = 'w-8 h-8 text-sm' }) => {
  const [broken, setBroken] = useState(false);
  if (user?.avatarUpdatedAt && user.id && !broken) {
    return (
      <img
        src={avatarUrl(user)}
        alt=""
        onError={() => setBroken(true)}
        className={`${size} rounded-full object-cover object-top bg-slate-800 shrink-0`}
      />
    );
  }
  return (
    <span
      className={`${size} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}
      style={{ background: avatarColor(name) }}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
};

// The Legendary frame: the gilt, at rest (this card doesn't tilt)
const GILT = { backgroundImage: 'var(--gradient-gilt)', backgroundSize: '260% 260%', backgroundPosition: '50% 50%' };

// The hairline between the parts of the card (ivory at 14%, never thinner than 1px)
const HAIRLINE = 'border-white/14';

// One face of the card: printed card stock, the frame in the tier's ink (the gilt for
// a Legendary 10), and the dark face inside it that holds the content
const Face = ({ rarity, className = '', children }) => {
  const legendary = rarity.key === 'legendary';
  return (
    <div className={`${className} flex flex-col rounded-[4.76%/3.41%] overflow-hidden bg-slate-900 text-white inset-ring inset-ring-white/7 p-[2.4cqi]`}>
      <div
        className={`flex-1 min-h-0 flex rounded-[2.6cqi/1.86cqi] ${
          legendary ? 'p-[1.3cqi] shadow-[inset_0_0_0_max(1px,.2cqi)_rgba(40,28,6,.6)]' : 'p-[max(1px,.55cqi)] bg-(--ink)'
        }`}
        style={legendary ? GILT : undefined}
      >
        <div
          className={`flex-1 min-w-0 flex flex-col overflow-hidden bg-slate-900 pt-[3cqi] px-[3.2cqi] pb-[2.6cqi] ${
            legendary ? 'rounded-[1.6cqi/1.15cqi] shadow-[inset_0_0_0_max(1px,.2cqi)_rgba(40,28,6,.5)]' : 'rounded-[2.1cqi/1.5cqi]'
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

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
      // The tier's colours for the faces: --ink for the frame, numeral and marks,
      // --deep for an art window with no art
      className={`card-flip @container w-[280px] max-w-full aspect-[63/88] shrink-0 rounded-[4.76%/3.41%] ${flipped ? 'is-flipped' : ''} ${canFlip ? 'cursor-pointer' : ''}`}
      style={{ '--ink': rarity.color, '--deep': rarity.deep }}
      // Only cards that flip act as a button (the global ivory focus ring shows)
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
        <Face rarity={rarity} className="card-face">
          {/* The game's title, and the score in the tier's ink */}
          <div className="flex items-start justify-between gap-[3cqi]">
            <p className="mt-[.6cqi] min-w-0 font-display text-[length:8cqi] leading-[.9] tracking-[.01em] uppercase text-balance break-words line-clamp-2">
              {game.title}
            </p>
            <p className="flex items-baseline gap-[.8cqi] shrink-0">
              <span className="font-display text-[length:15cqi] leading-[.78] text-(--ink)">{review.rating}</span>
              <span className="text-[length:max(9px,2.8cqi)] tabular-nums text-slate-400">/10</span>
            </p>
          </div>

          {/* Who reviewed it and when, and the badges the review earned */}
          <div className={`flex items-center justify-between gap-[2cqi] mt-[2cqi] pb-[1.8cqi] border-b-[length:max(1px,.22cqi)] ${HAIRLINE}`}>
            <span className="flex items-center gap-[2cqi] min-w-0">
              <Avatar name={name} user={review.user} size="w-[8cqi] h-[8cqi] text-[length:max(10px,3.6cqi)]" />
              <span className="min-w-0 truncate text-[length:max(11px,3.8cqi)] leading-[1.2]">
                <span className="font-semibold">{name}</span>{' '}
                <span className="text-slate-400 tabular-nums">· {formatDate(review.createdAt)}</span>
              </span>
            </span>
            {review.badges?.length > 0 && (
              <span className="flex gap-[1cqi] shrink-0 text-(--ink)">
                {review.badges.map((b) => (
                  <span key={b} title={BADGES[b]?.label}>
                    <ArtIcon icon={BADGES[b]?.art} className="w-[max(14px,4.6cqi)] h-[max(14px,4.6cqi)]" />
                  </span>
                ))}
              </span>
            )}
          </div>

          {/* The art window: the game's artwork, or the tier's dark panel with its mark */}
          <div className="relative flex-[1_1_0] min-h-[24cqi] mt-[2.4cqi] rounded-[.6cqi] overflow-hidden bg-(--deep)">
            {artUrl ? (
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${artUrl})` }} aria-hidden="true" />
            ) : (
              <span aria-hidden="true" className="absolute inset-0 grid place-items-center">
                <RarityMark tier={rarity.key} thin className="w-[22cqi] h-[22cqi] text-(--ink)" />
              </span>
            )}
            {/* A fine line around the window, in the ink */}
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-[inherit] pointer-events-none shadow-[inset_0_0_0_max(1px,.25cqi)_color-mix(in_srgb,var(--ink)_42%,transparent)]"
            />
          </div>

          {/* The tier, and what the score means */}
          <div className="flex items-center justify-between gap-[2cqi] mt-[2.2cqi]">
            <span className="inline-flex items-center gap-[1.4cqi] text-[length:max(11px,3.8cqi)] font-semibold leading-none text-(--ink)">
              <RarityMark tier={rarity.key} className="w-[max(10px,3.8cqi)] h-[max(10px,3.8cqi)]" />
              {rarity.label}
            </span>
            <span className="min-w-0 truncate text-[length:max(10px,3.2cqi)] leading-none text-slate-400">{RATING_LABELS[review.rating]}</span>
          </div>

          {hasBody && (
            <div className="flex flex-col gap-[2cqi] mt-[2.4cqi]">
              {meets.length > 0 && (
                // One line: each game gets an equal share; long titles scroll
                <div className="flex items-center gap-[1.6cqi] min-w-0 text-[length:max(11px,3.6cqi)]">
                  {meets.map((g, i) => (
                    <span key={g.id} className="contents">
                      {i > 0 && <span className="font-semibold text-slate-400 shrink-0">×</span>}
                      <span className="flex items-center gap-[1.6cqi] min-w-0 flex-1">
                        {g.coverUrl && <img src={g.coverUrl} alt="" className="w-[7cqi] h-[10cqi] object-cover rounded-xs shrink-0" />}
                        {/* Long names slowly slide to show the whole title */}
                        <MarqueeText text={g.title} className="font-medium text-white" />
                      </span>
                    </span>
                  ))}
                </div>
              )}
              {vibes.length > 0 && (
                <div className="flex flex-wrap gap-[1.2cqi]">
                  {vibes.map((v) => (
                    <span key={v.value} className="inline-flex items-center gap-[1cqi] px-[1.6cqi] py-[.4cqi] rounded-xs border border-slate-600 text-[length:max(10px,3.2cqi)] font-medium text-slate-200 whitespace-nowrap">
                      <ArtIcon icon={v.art} className="w-[max(10px,3.2cqi)] h-[max(10px,3.2cqi)] text-slate-400" /> {v.label}
                    </span>
                  ))}
                </div>
              )}
              {gotGood && (
                <p className="flex items-center gap-[1cqi] text-[length:max(10px,3.2cqi)] text-slate-400">
                  <ArtIcon icon={gotGood.art} className="w-[max(10px,3.2cqi)] h-[max(10px,3.2cqi)]" /> Got good: {gotGood.label.toLowerCase()}
                </p>
              )}
            </div>
          )}

          {hasFoot && (
            <div className={`flex items-center justify-between gap-[2cqi] mt-[2.4cqi] pt-[1.6cqi] border-t-[length:max(1px,.22cqi)] ${HAIRLINE} text-[length:max(10px,3.2cqi)] leading-[1.3] text-slate-400`}>
              <span className="flex flex-wrap gap-x-[2.4cqi] gap-y-[.4cqi] min-w-0">
                {meta.map((m) => (
                  <span key={m.text} className="inline-flex items-center gap-[1cqi]">
                    <ArtIcon icon={m.icon} className="w-[max(10px,3.2cqi)] h-[max(10px,3.2cqi)]" />
                    {m.text}
                  </span>
                ))}
              </span>
              {/* The whole card is the button; this just says what tapping it does */}
              {canFlip && (
                <span className="font-medium text-white whitespace-nowrap underline decoration-1 underline-offset-[3px] decoration-slate-500/80">Flip</span>
              )}
              {!canFlip && quick && (
                <span className="px-[1.6cqi] py-[.4cqi] rounded-xs border border-slate-600 whitespace-nowrap">Quick review</span>
              )}
            </div>
          )}
        </Face>

        {/* ── Back: the checklist ── */}
        {canFlip && (
          <Face rarity={rarity} className="card-face card-face-back">
            {/* The whole card is the button; the arrow just says tapping turns it back */}
            <CardChecklist
              ticks={ticks}
              name={name}
              corner={<RotateCcw aria-hidden="true" className="shrink-0 w-[max(12px,4cqi)] h-[max(12px,4cqi)] text-white" strokeWidth={2} />}
            />
          </Face>
        )}
      </div>
    </div>
  );
};

export default RarityCard;
