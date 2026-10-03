/**
 * PickCard — one recommended game. The Best Pick gets the big Legendary-style card;
 * the other four are compact rows. Every card links to the game's IMGM page.
 */
import { Link } from 'react-router-dom';
import { getRarity } from '../reviewQuest/questOptions';
import RichText from './RichText';

export const ImgmBadge = ({ rating, reviewCount }) => {
  if (!rating) return <span className="text-xs text-slate-500">No IMGM reviews yet</span>;
  const rarity = getRarity(rating);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold" style={{ color: rarity.color }}>
      <span className="uppercase tracking-wider">{rarity.label}</span>
      <span className="tabular-nums">{Number(rating).toFixed(1)}</span>
      <span className="text-slate-500 font-semibold">
        · {reviewCount} review{reviewCount === 1 ? '' : 's'}
      </span>
    </span>
  );
};

const Cover = ({ src, title, className }) =>
  src ? (
    <img src={src} alt={`${title} cover`} loading="lazy" className={`object-cover bg-slate-800 ${className}`} />
  ) : (
    <div className={`bg-slate-800 flex items-center justify-center text-2xl ${className}`} aria-hidden="true">🎮</div>
  );

const platformsText = (platforms = []) =>
  platforms.length > 3 ? `${platforms.slice(0, 3).join(' · ')} +${platforms.length - 3}` : platforms.join(' · ');

const PickCard = ({ pick, rank }) => {
  if (pick.best_pick) {
    return (
      <Link
        to={`/game/${pick.game_id}`}
        className="rarity-frame is-legendary block animate-fade-in hover:scale-[1.01] transition"
        style={{ '--rc': '#fbbf24' }}
      >
        <article className="rounded-[17px] bg-slate-900 overflow-hidden flex gap-4 p-4">
          <Cover src={pick.cover} title={pick.title} className="w-28 h-40 rounded-xl shrink-0" />
          <div className="min-w-0 flex flex-col gap-1.5">
            <span className="self-start text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 bg-amber-300 rounded px-2 py-0.5">
              ★ Best pick
            </span>
            <h3 className="text-xl font-black text-white leading-tight">{pick.title}</h3>
            <p className="text-xs text-slate-400">
              {[pick.year, platformsText(pick.platforms)].filter(Boolean).join(' · ')}
            </p>
            <ImgmBadge rating={pick.rating} reviewCount={pick.review_count} />
            <p className="text-sm text-slate-200 leading-relaxed mt-1"><RichText text={pick.why} /></p>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link
      to={`/game/${pick.game_id}`}
      className="flex gap-3 p-3 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-indigo-400/50 transition animate-fade-in"
    >
      <Cover src={pick.cover} title={pick.title} className="w-14 h-20 rounded-lg shrink-0" />
      <div className="min-w-0 flex flex-col gap-1">
        <h3 className="font-bold text-white leading-tight">
          <span className="text-slate-500 mr-1.5 tabular-nums">{rank}.</span>
          {pick.title}
        </h3>
        <ImgmBadge rating={pick.rating} reviewCount={pick.review_count} />
        <p className="text-sm text-slate-300 leading-snug line-clamp-3"><RichText text={pick.why} /></p>
      </div>
    </Link>
  );
};

export default PickCard;
