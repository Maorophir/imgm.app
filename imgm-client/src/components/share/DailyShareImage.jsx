/**
 * DailyShareImage — the daily Guess the game's result as a picture to share: a
 * 1080×1350 portrait like the review card's (ShareImage), Noir black, never the answer.
 *
 * The day's first picture is the hero, as blurred as the game starts it (what a friend
 * sees on their first try: "can you name it?"), then the result in the ink of a rarity
 * for how fast the player got it (resultRarity: in one, Legendary; not at all, Junk),
 * the tries as blocks and the streak. The user picked this "teaser" design from three
 * (a collectible card and a scoreboard were the others), 2026-11-06.
 *
 * Drawn off screen at its real size and photographed into a PNG (lib/cardImage), from
 * the share window (ShareCardDialog's `image`).
 *
 * Props:
 *   number     the puzzle's number (#12)
 *   tries      one tone per try, in order: 'hit' | 'hot' | 'warm' | 'cold' | 'skip'
 *   maxTries   6
 *   solved     got it or not
 *   streak     days in a row (shown from 2)
 *   picture    the first picture, already blurred (blurredPicture, lib/dailyShare)
 */
import { Flame } from 'lucide-react';
import { PowerIcon } from '../Logo';
import { SHARE_IMAGE_SIZE } from '../../lib/cardImage';
import { resultRarity } from '../../lib/dailyShare';

const WARM_INK = '#e2b65e'; // the Legendary gold, as on the page's tiles
const COLD_INK = '#5a5249';

// The tries as blocks: the hit in the result's ink, warm ones in gold, cold grey, a
// skip dashed, the ones not needed empty
const TriesRow = ({ tries, maxTries, ink }) => (
  <div className="flex gap-3 w-full">
    {Array.from({ length: maxTries }, (_, i) => {
      const tone = tries[i];
      const style = tone === 'hit' ? { background: ink }
        : tone === 'hot' ? { background: WARM_INK }
          : tone === 'warm' ? { background: `${WARM_INK}8c` }
            : tone === 'cold' ? { background: COLD_INK }
              : undefined;
      return (
        <span
          key={i}
          style={style}
          className={`flex-1 h-[46px] ${tone === 'skip' ? 'border-[3px] border-dashed border-slate-500' : tone ? '' : 'border-[3px] border-slate-700'}`}
        />
      );
    })}
  </div>
);

const DailyShareImage = ({ number, tries, maxTries, solved, streak, picture }) => {
  const tier = resultRarity(solved, tries.length);
  return (
    <div
      style={{ width: SHARE_IMAGE_SIZE.width, height: SHARE_IMAGE_SIZE.height }}
      className="flex flex-col items-center justify-between bg-slate-950 px-[72px] py-[64px] font-sans text-white"
    >
      <div className="w-full flex items-center justify-between">
        <span className="inline-flex items-center gap-4">
          <PowerIcon className="w-[52px] h-[52px] text-brand" />
          <span className="font-wordmark text-[64px] leading-none tracking-[0.03em] text-white">IMGM</span>
        </span>
        <span className="text-[30px] text-slate-400">imgm.app/daily</span>
      </div>

      <div className="w-full">
        <p className="font-display uppercase text-[56px] leading-none text-slate-300">
          Guess the game <span className="text-white tabular-nums">#{number}</span>
        </p>
        <div className="mt-6 w-full aspect-video overflow-hidden border-2 border-slate-700 bg-slate-900">
          {picture && <img src={picture} alt="" className="w-full h-full object-cover" />}
        </div>
      </div>

      <div className="w-full">
        <div className="flex items-end justify-between gap-6">
          <p className="font-display uppercase text-[104px] leading-[.85]" style={{ color: tier.color }}>
            {solved ? (tries.length === 1 ? 'Got it in one' : `Got it in ${tries.length}`) : 'Not today'}
          </p>
          <p className="text-[30px] uppercase tracking-[.12em] font-semibold pb-2" style={{ color: tier.color }}>{tier.label}</p>
        </div>
        <div className="mt-8"><TriesRow tries={tries} maxTries={maxTries} ink={tier.color} /></div>
        <div className="mt-8 pt-6 border-t-2 border-slate-700 flex items-center justify-between text-[32px]">
          <span className="text-white font-medium">Can you name it?</span>
          {streak >= 2 && (
            <span className="inline-flex items-center gap-3 text-slate-300 tabular-nums">
              <Flame className="w-9 h-9" strokeWidth={1.8} /> {streak} days in a row
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyShareImage;
