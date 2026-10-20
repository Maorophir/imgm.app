/**
 * BriefShelves — the answer's brief in the chat, under its intro. Each brief group is a
 * shelf: its heading, then a row of small cards that mixes the picks (with their rank
 * medal) and the honorable mentions (tagged "Mention"), each framed in its IMGM score's
 * rarity like the pick cards, with the score in the corner. They're dealt in one after
 * another as the answer lands.
 *
 * Small shelves sit side by side when there's room (one game alone doesn't take a row).
 * Tapping a card opens its details under its shelf (one at a time in the whole answer):
 * why it fits, the IMGM score, Backlog and a link to the game. "If you only play one"
 * closes the brief. Mentions have no card in the panel, so this is where they're seen.
 */
import { Fragment, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { getRarity } from '../reviewQuest/questOptions';
import BacklogButton from '../BacklogButton';
import BriefSpotlight from './BriefSpotlight';
import { ImgmBadge } from './PickCard';
import RankMedal from './RankMedal';
import { briefGroups } from './briefGames';
import { pickName } from './pickName';
import { scoreFrame } from './scoreFrame';

const scoreText = (rating) => (Number.isInteger(Number(rating)) ? Number(rating) : Number(rating).toFixed(1));

const Tile = ({ game, order, open, onToggle, panelId }) => {
  const frame = scoreFrame(game.rating);
  const pick = game.kind === 'pick';
  return (
    <li className="w-26 shrink-0 snap-start animate-fade-in [animation-fill-mode:both]" style={{ animationDelay: `${order * 70}ms` }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`${game.title}, ${pick ? pickName(game.rank) : 'honorable mention'}`}
        className="group w-full text-left"
      >
        <span
          className={`relative block transition-transform duration-160 motion-safe:group-hover:-translate-y-0.5 ${
            frame ? frame.className : 'rounded-sm border border-slate-700 p-px'
          } ${open ? 'outline-1 outline-white outline-offset-2' : ''}`}
          style={frame?.style}
        >
          {game.cover ? (
            <img src={game.cover} alt="" loading="lazy" className="block w-full aspect-[3/4] rounded-xs object-cover bg-slate-800" />
          ) : (
            <span className="block w-full aspect-[3/4] rounded-xs bg-slate-800" />
          )}
          {pick ? (
            <RankMedal rank={game.rank} className="absolute top-1.5 left-1.5 w-6 h-6 text-xs shadow-[0_1px_4px_rgba(0,0,0,.6),inset_0_0_0_2px_rgba(0,0,0,.22)]" />
          ) : (
            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-xs bg-slate-950/90 text-[11px] font-medium text-slate-200">Mention</span>
          )}
          {game.rating ? (
            <span
              className="absolute bottom-1.5 right-1.5 px-1.5 py-1 rounded-xs bg-slate-950/90 font-display text-sm leading-none tabular-nums"
              style={{ color: getRarity(game.rating).color }}
            >
              {scoreText(game.rating)}
            </span>
          ) : null}
        </span>
        {/* Two lines kept for every title, so the row's covers stay level */}
        <span className={`mt-2 min-h-[2lh] text-sm leading-tight line-clamp-2 transition-colors duration-120 ${open ? 'text-white font-medium' : 'text-slate-200 group-hover:text-white'}`}>
          {game.title}
        </span>
      </button>
    </li>
  );
};

const Details = ({ game, id }) => (
  <div id={id} className="mt-1 p-3.5 rounded-sm border border-slate-600 bg-slate-950/60 flex flex-col gap-1.5 animate-fade-in">
    <p className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
      {game.kind === 'pick' ? (
        <>
          <RankMedal rank={game.rank} className="w-4.5 h-4.5 text-[11px]" /> {pickName(game.rank)}
        </>
      ) : (
        <>Honorable mention · {game.label}</>
      )}
    </p>
    <h4 className="font-semibold text-white leading-tight">{game.title}</h4>
    {game.rating ? <ImgmBadge rating={game.rating} reviewCount={game.review_count} /> : null}
    <p className="text-sm text-slate-300 leading-snug">{game.why}</p>
    <div className="mt-1 flex items-center gap-3">
      <BacklogButton gameId={game.game_id} source="play_next" />
      <Link to={`/game/${game.game_id}`} className="inline-flex items-center gap-1 min-h-8 text-sm font-medium text-slate-300 hover:text-white transition-colors duration-120">
        Open game <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" />
      </Link>
    </div>
  </div>
);

const BriefShelves = ({ cards }) => {
  const [open, setOpen] = useState(null); // the game id whose details are open
  const panelId = useId();
  const groups = briefGroups(cards);
  if (groups.length === 0) return null;
  const best = cards.games.find((g) => g.best_pick);
  let order = 0; // the deal order, across all the shelves

  return (
    <div className="mt-5 flex flex-col gap-5">
      <div className="flex flex-wrap gap-x-8 gap-y-5">
      {groups.map((group) => {
        const shown = group.games.find((g) => g.game_id === open);
        return (
          <Fragment key={group.heading}>
          <section className="min-w-0 max-w-full">
            <h3 className="flex items-baseline gap-2 text-sm">
              <span className="font-medium text-white">{group.heading}</span>
              <span className="text-slate-500">{group.games.length}</span>
            </h3>
            <ul className="mt-2.5 flex gap-3 overflow-x-auto snap-x px-1 -mx-1 pt-1 pb-1">
              {group.games.map((game) => (
                <Tile
                  key={game.game_id}
                  game={game}
                  order={order++}
                  open={game.game_id === open}
                  onToggle={() => setOpen((o) => (o === game.game_id ? null : game.game_id))}
                  panelId={panelId}
                />
              ))}
            </ul>
          </section>
          {/* The details take a full line of their own, right after their shelf */}
          {shown && <div className="basis-full -mt-3"><Details game={shown} id={panelId} /></div>}
          </Fragment>
        );
      })}
      </div>
      <BriefSpotlight pick={best} />
    </div>
  );
};

export default BriefShelves;
