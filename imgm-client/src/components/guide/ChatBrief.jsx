/**
 * ChatBrief — the answer's short brief in the chat, under its intro: the picks and the
 * honorable mentions grouped by what a player wants from them, then the one to play if
 * you only play one. Like a friend's quick rundown, while the cards (in the side panel,
 * or under the answer on phones) carry the full reasons.
 *
 *   The closest feel (FromSoftware)   Sekiro · Dark Souls III · Bloodborne
 *   If you loved exploring            Dragon's Dogma II · Hollow Knight
 *   If you only play one: Lies of P.
 *
 * Every name opens its game. The 5 picks are set in white; the mentions (extras with
 * no card) in grey, so it's clear which is which.
 */
import { Fragment } from 'react';
import { Link } from 'react-router-dom';

const GameLink = ({ game, pick }) => (
  <Link
    to={`/game/${game.game_id}`}
    className={`underline decoration-1 underline-offset-4 decoration-slate-600 hover:decoration-current transition-colors duration-120 ${
      pick ? 'font-medium text-white' : 'text-slate-300 hover:text-white'
    }`}
  >
    {game.title}
  </Link>
);

const ChatBrief = ({ cards }) => {
  const picks = new Map(cards.games.map((g) => [g.game_id, g]));
  const mentions = new Map((cards.mentions ?? []).map((m) => [m.game_id, m]));
  const groups = (cards.brief ?? [])
    .map((group) => ({ ...group, games: group.game_ids.map((id) => picks.get(id) ?? mentions.get(id)).filter(Boolean) }))
    .filter((group) => group.games.length > 0);
  if (groups.length === 0) return null;
  const best = cards.games.find((g) => g.best_pick);

  return (
    <div className="mt-4">
      <dl className="flex flex-col gap-3">
        {groups.map((group) => (
          <div key={group.heading}>
            <dt className="text-sm text-slate-400">{group.heading}</dt>
            <dd className="mt-0.5 leading-relaxed">
              {group.games.map((game, i) => (
                <Fragment key={game.game_id}>
                  {i > 0 && <span className="text-slate-500" aria-hidden="true"> · </span>}
                  <GameLink game={game} pick={picks.has(game.game_id)} />
                </Fragment>
              ))}
            </dd>
          </div>
        ))}
      </dl>
      {best && (
        <p className="mt-4 text-white">
          If you only play one: <GameLink game={best} pick />.
        </p>
      )}
    </div>
  );
};

export default ChatBrief;
