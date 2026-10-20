/**
 * HonorableMentions — under the 5 picks: a few more games well worth it that didn't make
 * the cut, each with the guide's short label ("Same challenge, other studio") and one
 * line on why. Quieter than the cards on purpose: a small cover, no frame, no swap
 * buttons. Each one opens its game page and can go straight to the backlog.
 */
import { useId } from 'react';
import { Link } from 'react-router-dom';
import BacklogButton from '../BacklogButton';

const HonorableMentions = ({ mentions }) => {
  const headingId = useId(); // the panel can be on the page twice (one per layout)
  if (!mentions?.length) return null;
  return (
    <section aria-labelledby={headingId} className="mt-3 pt-4 border-t border-slate-700">
      <h2 id={headingId} className="text-sm text-slate-400">
        Honorable mentions
      </h2>
      <ul className="mt-2 flex flex-col">
        {mentions.map((mention) => (
          <li key={mention.game_id} className="relative flex gap-3 py-2.5 animate-fade-in">
            {mention.cover ? (
              <img
                src={mention.cover}
                alt=""
                loading="lazy"
                className="w-10 h-14 shrink-0 rounded-xs object-cover bg-slate-800"
              />
            ) : (
              <div className="w-10 h-14 shrink-0 rounded-xs bg-slate-800" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-400">{mention.label}</p>
              <h3 className="font-semibold text-white leading-tight">
                {/* The whole row opens the game (the link's area covers it) */}
                <Link
                  to={`/game/${mention.game_id}`}
                  className="hover:underline underline-offset-4 decoration-1 after:absolute after:inset-0"
                >
                  {mention.title}
                </Link>
              </h3>
              <p className="mt-0.5 text-sm text-slate-300 leading-snug line-clamp-2">{mention.why}</p>
            </div>
            {/* Above the row's link, so a tap adds to the backlog instead of opening the game */}
            <BacklogButton gameId={mention.game_id} source="play_next" variant="icon" className="relative z-10 self-center shrink-0" />
          </li>
        ))}
      </ul>
    </section>
  );
};

export default HonorableMentions;
