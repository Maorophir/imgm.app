/**
 * ShareImage — what a shared card looks like as a picture: a 1080×1350 portrait (the
 * size Instagram and most feeds show whole), Noir black, with the IMGM mark and address
 * across the top, the card's share edition (the player's words and the power mark on it)
 * standing in the middle, and the invitation at the bottom.
 *
 * It's drawn off screen at its real size and photographed into a PNG (lib/cardImage).
 * Pass a ref to reach the node.
 *
 * Props:
 *   card   CollectibleCard props (title, score, coverUrl, meta, credit, reviewer, date,
 *          quote)
 */
import { forwardRef } from 'react';
import CollectibleCard from '../CollectibleCard';
import { PowerIcon } from '../Logo';
import { getRarity } from '../reviewQuest/questOptions';
import { SHARE_IMAGE_SIZE } from '../../lib/cardImage';

// IGDB covers: the 528px copy of a 264px one; other art is used as it is
const sharpCover = (url) => url?.replace('/t_cover_big/', '/t_cover_big_2x/');

const ShareImage = forwardRef(({ card }, ref) => {
  const rarity = getRarity(card.score);
  return (
    <div
      ref={ref}
      style={{ width: SHARE_IMAGE_SIZE.width, height: SHARE_IMAGE_SIZE.height, '--ink': rarity.color }}
      className="flex flex-col items-center justify-between bg-slate-950 px-[72px] py-[64px] font-sans text-white"
    >
      {/* The brand and where to find it */}
      <div className="w-full flex items-center justify-between">
        <span className="inline-flex items-center gap-4">
          <PowerIcon className="w-[52px] h-[52px] text-brand" />
          <span className="font-wordmark text-[64px] leading-none tracking-[0.03em] text-white">IMGM</span>
        </span>
        <span className="text-[30px] text-slate-400">imgm.app</span>
      </div>

      {/* The card, as large as the picture allows, with IGDB's twice-as-large cover (the
          picture is 1080px wide, so the usual 264px one would look soft) */}
      <CollectibleCard {...card} coverUrl={sharpCover(card.coverUrl)} edition="share" className="w-[660px]" />

      {/* The invitation, with a line in the card's ink */}
      <div className="w-full flex items-end justify-between gap-8 pt-6 border-t-2 border-(--ink)">
        <p className="font-display uppercase text-[60px] leading-[.9] tracking-[.005em] text-white">
          Rate what you play<span className="text-brand">.</span>
        </p>
        <p className="text-[28px] leading-tight text-slate-400 text-right">
          Every rating is
          <br />a collectible card
        </p>
      </div>
    </div>
  );
});
ShareImage.displayName = 'ShareImage';

export default ShareImage;
