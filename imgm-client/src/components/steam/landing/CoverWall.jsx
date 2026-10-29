/**
 * CoverWall — the Steam page's backdrop: a tilted wall of real game covers (IMGM's
 * featured games, or a connected player's own), four rows drifting slowly sideways in
 * turn, like a library seen from an angle. It's what the page is about: a shelf of games, one of which comes forward
 * as a card (the hero's card stands in front of it).
 *
 * Dimmed with the scrims every IMGM backdrop uses: evenly on phones and tablets (the
 * words run across it), heavier on the left on desktop (under the words) so the right,
 * behind the card, keeps more of its colour; and it fades in from the page at the top
 * and out into it at the bottom. People who ask their device for less motion get a
 * wall that stands still.
 *
 * Fills its parent (absolute, so the parent needs `relative`) and ignores the mouse.
 * Pure decoration (aria-hidden): the covers carry no words a reader needs.
 *
 * Props:
 *   covers  the cover addresses to show (in order; dealt out across the rows). Empty
 *           while they load: then it's just the dark scrims, and the covers fade in.
 */
import { memo } from 'react';

// Each row drifts its own way, at its own (very slow) speed
const ROWS = [
  { animation: 'animate-scroll-left', duration: '210s' },
  { animation: 'animate-scroll-right', duration: '170s' },
  { animation: 'animate-scroll-left', duration: '240s' },
  { animation: 'animate-scroll-right', duration: '190s' },
];
const PER_ROW = 12; // at least this many covers a row: wider than a wide screen

// Deal the covers out like cards (1st → row 1, 2nd → row 2…). A short row repeats
// WHOLE (A B C A B C), never just its first few, so a cover never lands beside itself
// where the doubled row loops (the same rule as Play Next's wall).
const dealRows = (covers) =>
  ROWS.map((_, row) => {
    const mine = covers.filter((_, i) => i % ROWS.length === row);
    const pool = mine.length ? mine : covers;
    return Array.from({ length: Math.ceil(PER_ROW / pool.length) }, () => pool).flat();
  });

// Over the covers, in the page black: an even dim (phones, tablets) or a left-heavy one
// (desktop), then the fades at the top and bottom
const SHADES = [
  'bg-slate-950/55 lg:bg-transparent lg:bg-gradient-to-r lg:from-slate-950/95 lg:via-slate-950/65 lg:to-slate-950/25',
  'bg-gradient-to-b from-slate-950 via-transparent via-30% to-transparent',
  'bg-gradient-to-t from-slate-950 via-slate-950/40 via-25% to-transparent',
];

const CoverWall = ({ covers }) => {
  const rows = covers.length ? dealRows(covers) : [];
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* The wall, tilted and a little larger than the box so its corners never show.
          Each row is doubled ([A, A]) because the drift moves exactly 50%. */}
      <div className="absolute inset-0 flex flex-col justify-center gap-4 opacity-55 saturate-[.8] -rotate-[7deg] scale-125 sm:gap-5">
        {rows.map((row, r) => (
          <div
            key={r}
            className={`flex w-max gap-4 sm:gap-5 ${ROWS[r].animation} motion-reduce:animate-none`}
            style={{ animationDuration: ROWS[r].duration }}
          >
            {[...row, ...row].map((cover, i) => (
              <img
                key={`${cover}-${i}`}
                src={cover}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-[150px] sm:h-[190px] lg:h-[210px] aspect-[3/4] object-cover rounded-sm shrink-0 bg-slate-900 animate-fade-in"
              />
            ))}
          </div>
        ))}
      </div>

      {SHADES.map((shade) => (
        <div key={shade} className={`absolute inset-0 ${shade}`} />
      ))}
    </div>
  );
};

// memo: the wall re-renders only when its covers change, not when the page's state does
export default memo(CoverWall);
