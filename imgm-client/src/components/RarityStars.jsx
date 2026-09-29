/**
 * RarityStars — 10 stars (one per point) whose fill takes the colour of the
 * score's loot rarity. Legendary scores make the stars shimmer gold.
 *
 * Interactive by default: tap a star, drag across them, or use the arrow keys.
 * Pass `readOnly` to display a score — including averages: 8.4 shows 8 full
 * stars and a 40%-filled 9th star.
 */
import { useState, useRef, useId } from 'react';
import { getRarity } from './reviewQuest/questOptions';

const STAR_PATH = 'M12 2.5l2.94 6.1 6.56.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.2 1.2-6.5-4.8-4.6 6.56-.9z';
const STAR_COUNT = 10;
const EMPTY_COLOR = '#475569'; // slate-600, before any score is picked

// Star size + gap per size. `lg` still fits 10 stars on a phone.
const SIZES = {
  sm: { star: 'w-3.5 h-3.5', gap: 'gap-px' },
  md: { star: 'w-5 h-5', gap: 'gap-0.5' },
  lg: { star: 'w-6 h-6 sm:w-10 sm:h-10', gap: 'gap-1 sm:gap-1.5' },
};

const clamp = (v) => Math.min(STAR_COUNT, Math.max(1, v));

const RarityStars = ({ value, onChange, size = 'lg', readOnly = false }) => {
  // What the mouse is hovering over (a preview), shown instead of `value` while hovering
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  // Which star just got picked — changing its key replays the "pop" animation
  const [pop, setPop] = useState({ index: -1, count: 0 });
  const starRefs = useRef([]);
  // A unique prefix for the SVG clip-path ids, so several star rows can share a page
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');

  const shown = preview ?? value ?? 0;
  const rarity = shown ? getRarity(shown) : null;
  const color = rarity?.color ?? EMPTY_COLOR;
  const legendary = rarity?.key === 'legendary';

  // Which star is under the pointer → a 1–10 score
  const scoreFromPointer = (e) => {
    for (let i = 0; i < STAR_COUNT; i++) {
      const box = starRefs.current[i].getBoundingClientRect();
      if (i === STAR_COUNT - 1 || e.clientX <= box.right + 2) return i + 1;
    }
  };

  const commit = (score) => {
    const v = clamp(score);
    if (v !== value) setPop((p) => ({ index: v - 1, count: p.count + 1 }));
    onChange?.(v);
  };

  // Only interactive rows get event handlers
  const handlers = readOnly ? {} : {
    onPointerDown: (e) => {
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
      setPreview(null);
      commit(scoreFromPointer(e));
    },
    onPointerMove: (e) => {
      if (dragging) commit(scoreFromPointer(e));
      else if (e.pointerType === 'mouse') setPreview(scoreFromPointer(e));
    },
    onPointerUp: () => setDragging(false),
    onPointerLeave: () => !dragging && setPreview(null),
    onKeyDown: (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); commit((value ?? 0) + 1); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); commit((value ?? 2) - 1); }
    },
  };

  const { star: starSize, gap } = SIZES[size];

  return (
    <div
      {...handlers}
      role={readOnly ? 'img' : 'slider'}
      tabIndex={readOnly ? undefined : 0}
      aria-label={value ? `${value} out of 10, ${getRarity(value).label}` : 'Rating, not picked yet'}
      aria-valuemin={readOnly ? undefined : 1}
      aria-valuemax={readOnly ? undefined : STAR_COUNT}
      aria-valuenow={readOnly ? undefined : value ?? undefined}
      className={`flex ${gap} ${readOnly ? '' : 'cursor-pointer touch-none select-none p-1.5 rounded-xl focus-visible:outline-2 focus-visible:outline-blue-500'}`}
    >
      {Array.from({ length: STAR_COUNT }, (_, i) => {
        // How much of this star is filled, 0–1 (fractions happen for averages, e.g. 8.4)
        const fraction = Math.min(1, Math.max(0, shown - i));
        const clipId = `${uid}-star-${i}`;
        return (
          <svg
            key={pop.index === i ? `${i}-${pop.count}` : i}
            ref={(el) => (starRefs.current[i] = el)}
            viewBox="0 0 24 24"
            className={`${starSize} shrink-0 overflow-visible transition-[filter] duration-300 ${pop.index === i ? 'animate-pop' : ''} ${legendary && !readOnly ? 'animate-shimmer' : ''}`}
            style={{
              filter: shown && size !== 'sm' ? `drop-shadow(0 0 6px ${color}66)` : 'none',
              animationDelay: legendary ? `${i * 0.08}s` : undefined,
              opacity: preview != null ? 0.75 : 1,
            }}
            aria-hidden="true"
          >
            <defs>
              <clipPath id={clipId}>
                <rect x="0" y="0" width={fraction * 24} height="24" />
              </clipPath>
            </defs>
            <path d={STAR_PATH} fill="none" stroke={shown ? `${color}80` : EMPTY_COLOR} strokeWidth="1.4" strokeLinejoin="round" />
            <path d={STAR_PATH} fill={color} clipPath={`url(#${clipId})`} className="transition-[fill] duration-300" />
          </svg>
        );
      })}
    </div>
  );
};

export default RarityStars;
