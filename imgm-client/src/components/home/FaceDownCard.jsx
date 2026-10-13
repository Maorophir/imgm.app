/**
 * FaceDownCard — an IMGM card lying face down: the back every card shares, on a plain
 * edge with no rarity colour (nobody has played it yet, so it has no tier).
 *
 * It stands for a card still to be earned: under the "Be the first reviewer" art, in the
 * hero when there's no review to show, and on the review quest's sign-up page (the card
 * a visitor is about to earn). Pure decoration (aria-hidden), so the words next to it do
 * the explaining.
 *
 * Like every card it needs a width from outside (className), e.g. "w-[200px]". Pass
 * `small` for one about 110–200px wide: its back draws heavier lines, so they still read.
 */
import { CardBack } from '../CollectibleCard';

const FaceDownCard = ({ className = '', small = false }) => (
  <div aria-hidden="true" className={`@container ${className}`}>
    <div className="relative">
      {/* The card's printed side peeking out below it. Warm grey, not a tier's ink (a
          step lighter than the decorative-border grey, so it reads on the dark art). The
          shadow is in cqi, so a small card gets a small shadow. */}
      <span className="absolute inset-0 rounded-[4.76%/3.41%] bg-[#4a443c] translate-x-px translate-y-[3px] shadow-[0_1px_2px_rgba(0,0,0,.5),0_15cqi_25cqi_-10cqi_rgba(0,0,0,.9)]" />
      <CardBack small={small} className="relative" />
    </div>
  </div>
);

export default FaceDownCard;
