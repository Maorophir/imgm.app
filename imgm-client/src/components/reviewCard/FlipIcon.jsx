/**
 * FlipIcon — the small turning arrow in a circle after a card’s "Flip" button text, so it's
 * clear the card turns over. It spins half a turn each time the card does.
 *
 * Props:
 *   flipped  true while the card shows its back
 */
import { RotateCw } from 'lucide-react';

const FlipIcon = ({ flipped }) => (
  <span aria-hidden="true" className="inline-grid place-items-center w-7 h-7 shrink-0 rounded-full border border-slate-500">
    <RotateCw
      className={`w-3.5 h-3.5 transition-transform duration-300 motion-reduce:transition-none ${flipped ? 'rotate-180' : ''}`}
      strokeWidth={2}
    />
  </span>
);

export default FlipIcon;
