/**
 * BriefSpotlight — "If you only play one": the Best Pick as a featured card at the end
 * of the brief. Its cover art fills the card's right side under a dark scrim (the only
 * kind of gradient Noir allows over art), with the gold tab, the title, its IMGM
 * score and a line on why. The whole card opens the game; Backlog sits above the link.
 */
import { Link } from 'react-router-dom';
import BacklogButton from '../BacklogButton';
import { ImgmBadge } from './PickCard';
import RankTab from './RankTab';

const BriefSpotlight = ({ pick }) => {
  if (!pick) return null;
  return (
    <div className="relative overflow-hidden rounded-sm border border-slate-600 bg-slate-900 hover:border-white transition-colors duration-120 animate-fade-in">
      {pick.cover && (
        <img src={pick.cover} alt="" aria-hidden="true" loading="lazy" className="absolute inset-y-0 right-0 w-3/5 h-full object-cover object-[50%_20%] opacity-60" />
      )}
      <span className="absolute inset-0 bg-linear-to-r from-slate-900 from-40% via-slate-900/85 to-slate-900/20" aria-hidden="true" />
      <div className="relative flex gap-4 p-4">
        {/* Phones skip the small cover: the art behind already shows it, and the words need the room */}
        {pick.cover ? (
          <img src={pick.cover} alt="" loading="lazy" className="max-sm:hidden w-18 h-24 shrink-0 rounded-xs object-cover bg-slate-800 border border-white/14" />
        ) : (
          <div className="max-sm:hidden w-18 h-24 shrink-0 rounded-xs bg-slate-800" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1 flex flex-col gap-1">
          <p className="inline-flex items-center gap-1.5 text-sm text-slate-300">
            <RankTab rank={1} className="px-1.5 pt-1 pb-[3px] text-xs" /> If you only play one
          </p>
          <h3 className="font-display text-[26px] sm:text-[30px] uppercase leading-[.9] text-white text-balance">
            <Link to={`/game/${pick.game_id}`} className="after:absolute after:inset-0">
              {pick.title}
            </Link>
          </h3>
          <ImgmBadge rating={pick.rating} reviewCount={pick.review_count} />
          <p className="text-sm text-slate-200 leading-snug line-clamp-2 max-w-[46ch]">{pick.why}</p>
        </div>
        <BacklogButton gameId={pick.game_id} source="play_next" variant="icon" className="relative z-10 self-start shrink-0 bg-slate-950/70" />
      </div>
    </div>
  );
};

export default BriefSpotlight;
