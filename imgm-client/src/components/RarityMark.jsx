/**
 * RarityMark — the small symbol for a loot rarity tier, in the Noir look.
 *
 * Each tier is a "Harvey ball", a circle that fills up as the score goes up:
 *   Junk       an empty ring
 *   Common     a quarter filled
 *   Uncommon   half filled
 *   Rare       three quarters filled
 *   Epic       full
 *   Legendary  full, with a second ring around it
 *
 * It is drawn in currentColor, so the text colour around it (the tier's ink) paints it.
 * It is decorative (aria-hidden): the tier's name is always written next to it.
 *
 * Props:
 *   tier       a RARITIES key from reviewQuest/questOptions ('junk' … 'legendary')
 *   className  size and colour classes; 14px when no size is given
 *   thin       finer lines, for a mark drawn large (the empty art window of a card)
 */

// The filled part of each tier, in a 14×14 box around a ring of radius 4.6.
// Junk has no fill: the empty ring is the whole symbol.
const FILL = {
  common: 'M7 7V2.4A4.6 4.6 0 0 1 11.6 7Z',
  uncommon: 'M7 7V2.4A4.6 4.6 0 0 1 7 11.6Z',
  rare: 'M7 7V2.4A4.6 4.6 0 1 1 2.4 7Z',
  epic: 'M7 2.4A4.6 4.6 0 1 1 7 11.6A4.6 4.6 0 1 1 7 2.4Z',
  legendary: 'M7 2.4A4.6 4.6 0 1 1 7 11.6A4.6 4.6 0 1 1 7 2.4Z',
};

const RarityMark = ({ tier, className = '', thin = false }) => (
  <svg
    viewBox="0 0 14 14"
    // The default size; a w-* / h-* class overrides it
    width="14"
    height="14"
    aria-hidden="true"
    focusable="false"
    className={`block shrink-0 ${className}`}
  >
    <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth={thin ? 0.6 : 1.1} />
    {FILL[tier] && <path d={FILL[tier]} fill="currentColor" />}
    {/* Only a perfect 10 gets the outer ring */}
    {tier === 'legendary' && (
      <circle cx="7" cy="7" r="6.5" fill="none" stroke="currentColor" strokeWidth={thin ? 0.4 : 0.8} />
    )}
  </svg>
);

export default RarityMark;
