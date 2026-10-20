/**
 * GuidePanel — the side panel. While the guide works it shows every game it is
 * considering (covers appear as they're found, and light up once checked); when
 * it's done, the final 5 take over, Best Pick first, with any honorable mentions under them.
 */
import { ListChecks } from "lucide-react";
import { GHOST_BUTTON_SM } from "../../lib/ui";
import HonorableMentions from "./HonorableMentions";
import PickCard from "./PickCard";

const ConsideringTile = ({ game }) => (
  <div className="relative animate-fade-in" title={game.title}>
    {game.cover ? (
      <img
        src={game.cover}
        alt=""
        className={`w-full aspect-[3/4] object-cover rounded-sm transition ${game.verified ? "" : "opacity-60 saturate-50"}`}
      />
    ) : (
      <div className="w-full aspect-[3/4] rounded-sm bg-slate-800" />
    )}
    <p className="mt-1 text-xs text-slate-400 truncate">{game.title}</p>
  </div>
);

const GuidePanel = ({ turn, onSort, disabled }) => {
  // Nothing asked yet: a quiet preview of what will appear here
  if (!turn) {
    return (
      <div className="border-t border-slate-700 pt-6 text-center">
        <p className="font-semibold text-white">Your picks will appear here</p>
        <p className="text-sm text-slate-400 mt-1">
          Five games chosen for you, with a Best Pick and exactly why each one
          fits.
        </p>
      </div>
    );
  }

  if (turn.cards) {
    const picks = [...turn.cards.games].sort(
      (a, b) => b.best_pick - a.best_pick,
    );
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-sm text-slate-400">
          Your 5 picks
        </h2>
        {/* One screen to answer all 5 (played it, not for me, keep) instead of one search per card.
            Above the picks, so it's seen without scrolling past them */}
        {onSort && (
          <button type="button" onClick={onSort} disabled={disabled} className={`${GHOST_BUTTON_SM} w-full`}>
            <ListChecks className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> Sort your picks
          </button>
        )}
        {picks.map((pick, i) => (
          <PickCard
            key={pick.game_id}
            pick={pick}
            rank={i + 1}
          />
        ))}
        {/* With a brief in the chat, the mentions are named there; older answers list them here */}
        {!turn.cards.brief?.length && <HonorableMentions mentions={turn.cards.mentions} />}
      </div>
    );
  }

  // Working (or failed before the picks): show what it's considering
  return (
    <div className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-sm text-slate-400">
        {turn.status === "running" && (
          <span
            className="w-2 h-2 rounded-full bg-white motion-safe:animate-pulse"
            aria-hidden="true"
          />
        )}
        Considering {turn.games.length > 0 && `${turn.games.length} games`}
      </h2>
      {turn.games.length > 0 ? (
        <div className="grid grid-cols-4 gap-2.5">
          {turn.games.map((game) => (
            <ConsideringTile key={game.id} game={game} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2.5" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="aspect-[3/4] rounded-sm bg-slate-800/60 motion-safe:animate-pulse"
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default GuidePanel;
