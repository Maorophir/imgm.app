/**
 * CardStage — holds a card up so it can be picked up: it tilts toward the pointer,
 * can turn over to its back, and sits on a painted edge in its rarity colour.
 *
 *   The edge     a slab in the tier's edge colour behind the card, a few pixels down
 *                and to the side, like the card's printed side. As the card tilts the
 *                edge slides the other way, so the card seems to have thickness.
 *   The tilt     the card leans toward the pointer (or a finger dragging across it),
 *                up to about 12 degrees, on a stiff spring that settles quickly.
 *   Legendary    only a perfect 10 also gets a soft glare that follows the pointer,
 *                and its gilt (frame and edge) shifts as it tilts.
 *   The flip     with flipped={true} the card turns over in 3D to show `back`.
 *
 * People who ask their device for less motion get a card that stays still, and the
 * flip becomes a short cross-fade.
 *
 * Props:
 *   front      the card's face, e.g. <CollectibleCard … />
 *   back       optional: its back, e.g. <CardBack />. Without it the card never turns
 *   flipped    true shows the back (the page owns the "Turn over" button)
 *   tier       the card's RARITIES key ('junk' … 'legendary'): the edge colour, and
 *              the glare and moving gilt for 'legendary'
 *   rest       the card's resting angle in degrees (default -2.5; 0 for straight)
 *   tilt       false keeps the card still (for small cards in a grid); default true
 *   maxTilt    the most it leans, in degrees (default 12)
 *   className  the stage's width and placement. Like the card, the stage needs a width
 *              from outside, e.g. "w-[min(380px,100%)]"
 */
import { useEffect, useRef, useState } from 'react';
import { RARITIES } from './reviewQuest/questOptions';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

// The card at rest: the pointer "in the middle" and no glare
const REST = { x: 0.5, y: 0.5, o: 0 };

// The spring: how hard it pulls toward the pointer (STIFFNESS) and how much speed it
// loses each frame (DAMPING). Stiff and well damped, so it follows closely and settles
// without wobbling.
const STIFFNESS = 0.16;
const DAMPING = 0.38;
// Smaller moves than this (a share of the card's size) aren't worth a re-render
const VISIBLE_CHANGE = 0.003;

// The cross-fade that replaces the flip when motion is reduced
const FADE_MS = 200;

// The painted edge and its shadow (in cqi, so a small card gets a small shadow)
const EDGE = 'absolute inset-0 rounded-[4.76%/3.41%] shadow-[0_1px_2px_rgba(0,0,0,.5),0_9cqi_16cqi_-6cqi_rgba(0,0,0,.85)]';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// The card's lean for a pointer position (0–1 across, 0–1 down)
const tiltTransform = ({ x, y }, max) =>
  `perspective(1100px) rotateX(${((y - 0.5) * -max).toFixed(2)}deg) rotateY(${((x - 0.5) * max).toFixed(2)}deg)`;

// The edge slides against the lean: down and right at rest, toward the raised side
// as the card tips. Kept within a few pixels so it always reads as the card's side.
const edgeTransform = ({ x, y }) => {
  const rx = (y - 0.5) * -12;
  const ry = (x - 0.5) * 12;
  const ex = clamp(1 - ry * 0.22, -2, 3);
  const ey = clamp(3 - rx * 0.22, 1, 5.5);
  return `translate(${ex.toFixed(2)}px, ${ey.toFixed(2)}px)`;
};

const CardStage = ({
  front,
  back,
  flipped = false,
  tier = 'common',
  rest = -2.5,
  tilt = true,
  maxTilt = 12,
  className = '',
}) => {
  const reduced = usePrefersReducedMotion();
  const moves = tilt && !reduced;
  const turned = Boolean(back) && flipped;
  const rarity = RARITIES.find((r) => r.key === tier) ?? RARITIES[1];
  const legendary = rarity.key === 'legendary';

  // What is on screen. Only updated when the card has visibly moved.
  const [pose, setPose] = useState(REST);
  // The spring itself: where it is, how fast it moves, where it's headed (t*), what was
  // last drawn (l*) and the frame it has asked for. Changed only by pointer events and
  // animation frames, never while rendering.
  const spring = useRef({ ...REST, vx: 0, vy: 0, vo: 0, tx: 0.5, ty: 0.5, to: 0, lx: 0.5, ly: 0.5, lo: 0, raf: 0 });
  const frontRef = useRef(null);
  const backRef = useRef(null);
  const lastTurned = useRef(turned);

  // Stop the spring if the card leaves the page mid-move. raf goes back to 0 so a
  // remount (e.g. a hot reload) can start it again: drive() skips while raf is set.
  useEffect(() => {
    const s = spring.current;
    return () => {
      cancelAnimationFrame(s.raf);
      s.raf = 0;
    };
  }, []);

  // Reduced motion: no 3D turn. The two faces cross-fade instead. This uses the Web
  // Animations API because the site-wide reduced-motion rule makes CSS transitions
  // instant, and a short fade is still kind to people who asked for less motion.
  useEffect(() => {
    if (lastTurned.current === turned) return;
    lastTurned.current = turned;
    if (!reduced) return;
    const fade = (el, from, to) => el?.animate?.([{ opacity: from }, { opacity: to }], { duration: FADE_MS, easing: 'ease-out' });
    fade(turned ? backRef.current : frontRef.current, 0, 1);
    fade(turned ? frontRef.current : backRef.current, 1, 0);
  }, [turned, reduced]);

  // Point the spring at a new target and run it until it settles
  const drive = (x, y, on) => {
    const s = spring.current;
    s.tx = clamp(x, 0, 1);
    s.ty = clamp(y, 0, 1);
    s.to = on ? 1 : 0;
    if (s.raf) return; // already running: it picks up the new target next frame

    const step = () => {
      s.vx = (s.vx + (s.tx - s.x) * STIFFNESS) * (1 - DAMPING);
      s.vy = (s.vy + (s.ty - s.y) * STIFFNESS) * (1 - DAMPING);
      s.vo = (s.vo + (s.to - s.o) * STIFFNESS) * (1 - DAMPING);
      s.x += s.vx;
      s.y += s.vy;
      s.o += s.vo;

      const settled =
        Math.abs(s.tx - s.x) + Math.abs(s.ty - s.y) + Math.abs(s.to - s.o) < 0.002 &&
        Math.abs(s.vx) + Math.abs(s.vy) + Math.abs(s.vo) < 0.001;
      if (settled) {
        Object.assign(s, { x: s.tx, y: s.ty, o: s.to, vx: 0, vy: 0, vo: 0 });
      }

      // Re-render only when the card has visibly moved (or to land exactly at rest)
      if (settled || Math.abs(s.x - s.lx) + Math.abs(s.y - s.ly) + Math.abs(s.o - s.lo) > VISIBLE_CHANGE) {
        Object.assign(s, { lx: s.x, ly: s.y, lo: s.o });
        setPose({ x: s.x, y: s.y, o: s.o });
      }
      s.raf = settled ? 0 : requestAnimationFrame(step);
    };
    s.raf = requestAnimationFrame(step);
  };

  // A pointer (mouse, pen or finger) over the stage: lean toward it
  const follow = (e) => {
    if (!moves) return;
    const box = e.currentTarget.getBoundingClientRect();
    if (!box.width || !box.height) return;
    drive((e.clientX - box.left) / box.width, (e.clientY - box.top) / box.height, true);
  };
  // The pointer left (or the browser took a finger over to scroll): settle back
  const settle = () => {
    if (moves) drive(0.5, 0.5, false);
  };

  const shown = moves ? pose : REST;

  return (
    <div
      className={`relative ${moves ? 'touch-pan-y' : ''} ${className}`}
      style={rest ? { transform: `rotate(${rest}deg)` } : undefined}
      onPointerMove={follow}
      onPointerLeave={settle}
      onPointerCancel={settle}
    >
      <div className="@container">
        <div
          style={{
            transform: moves ? tiltTransform(shown, maxTilt) : undefined,
            transformStyle: 'preserve-3d',
            // Where a Legendary's gilt catches the light (read by CollectibleCard's frame)
            '--gilt-at': `${(15 + shown.x * 70).toFixed(1)}% ${(20 + shown.y * 60).toFixed(1)}%`,
          }}
        >
          <div
            className={`relative ${reduced ? '' : 'transition-transform duration-[760ms] ease-[cubic-bezier(.2,.8,.15,1)]'}`}
            style={{
              transformStyle: 'preserve-3d',
              transform: reduced ? undefined : `rotateY(${turned ? 180 : 0}deg)`,
            }}
          >
            {/* ── Front ── */}
            <div
              ref={frontRef}
              aria-hidden={turned || undefined}
              className={`relative ${reduced ? '' : 'backface-hidden [transform:rotateY(0deg)]'} ${turned ? 'pointer-events-none' : ''}`}
              style={reduced && turned ? { opacity: 0 } : undefined}
            >
              <span
                aria-hidden="true"
                className={EDGE}
                style={{
                  transform: edgeTransform(shown),
                  ...(legendary
                    ? {
                      backgroundImage: 'var(--gradient-gilt)',
                      backgroundSize: '240% 100%',
                      backgroundPosition: `${(20 + shown.x * 60).toFixed(1)}% 50%`,
                    }
                    : { background: rarity.edge }),
                }}
              />
              <div className="relative">{front}</div>
              {/* Legendary only: a soft light where the pointer is, gone at rest */}
              {legendary && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-[4.76%/3.41%] pointer-events-none mix-blend-soft-light"
                  style={{
                    background: `radial-gradient(farthest-corner circle at ${(shown.x * 100).toFixed(1)}% ${(shown.y * 100).toFixed(1)}%, rgba(255,248,230,.75) 0%, rgba(255,248,230,.2) 24%, rgba(0,0,0,.2) 82%)`,
                    opacity: (clamp(shown.o, 0, 1) * 0.85).toFixed(3),
                  }}
                />
              )}
            </div>

            {/* ── Back ── laid face down behind the front, so turning the stage shows it */}
            {back && (
              <div
                ref={backRef}
                aria-hidden={!turned || undefined}
                className={`absolute inset-0 ${reduced ? '' : 'backface-hidden [transform:rotateY(180deg)]'} ${turned ? '' : 'pointer-events-none'}`}
                style={reduced && !turned ? { opacity: 0 } : undefined}
              >
                <span aria-hidden="true" className={EDGE} style={{ transform: 'translate(-1px, 3px)', background: rarity.edge }} />
                <div className="relative">{back}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardStage;
