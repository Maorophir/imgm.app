/**
 * RankTab — a pick's place in the 5, as a flat tab like a card's set number: gold,
 * silver and bronze ink for the top three, card stock with a hairline for #4 and #5.
 * The frame around a pick shows its IMGM score (its rarity); the tab shows its rank.
 *
 *   <RankTab rank={2} />                 "2ND", a label in a line of text
 *   <RankTab rank={2} words />           "2ND PICK"
 *   <RankTab rank={2} corner="tl" />     tucked into a cover's top-left corner (the
 *                                        cover clips it: overflow-hidden); "br" for the
 *                                        bottom right of a cover that can't clip
 * Size and padding come from className.
 */
import { ordinal, pickName } from './pickName';

const INKS = {
  1: 'var(--color-medal-gold)',
  2: 'var(--color-medal-silver)',
  3: 'var(--color-medal-bronze)',
};

const CORNERS = {
  tl: 'absolute top-0 left-0 rounded-none rounded-br-xs',
  br: 'absolute bottom-0 right-0 rounded-none rounded-tl-xs rounded-br-xs',
};

const RankTab = ({ rank, words = false, corner, className = '' }) => {
  const ink = INKS[rank];
  return (
    <span
      // Words are read out; the short tab sits beside its own text, so it's hidden
      aria-hidden={words ? undefined : 'true'}
      className={`inline-flex items-center shrink-0 font-display uppercase leading-none tracking-[.05em] whitespace-nowrap ${
        ink ? 'text-slate-950' : 'bg-slate-950 text-white shadow-[inset_0_0_0_1px_var(--color-slate-600)]'
      } ${corner ? CORNERS[corner] : 'rounded-xs'} ${className}`}
      style={ink ? { background: ink } : undefined}
    >
      {words ? pickName(rank) : ordinal(rank)}
    </span>
  );
};

export default RankTab;
