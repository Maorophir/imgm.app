/**
 * Taste match: you and another player, from the games you both rated.
 *
 *   TasteMatch   the section on another player's public profile (/u/<tag>). Logged out,
 *                it asks to log in; under 3 games you both rated, it says how many more
 *                and links to the player's compare page to rate some of theirs.
 *   MatchResult  the match itself (also the compare page's result): the percentage,
 *                genres you both love, the game you split on, and the games you both
 *                rated with both scores in their rarity ink.
 *
 * The percentage is worked out by the server (matchOf in socialController.js): 100%
 * minus the average gap between your scores, as a share of the biggest gap (9).
 */
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getTasteMatch } from '../../lib/api';
import { getRarity } from '../reviewQuest/questOptions';
import { LABEL, SECTION_TITLE, TEXT_LINK } from '../../lib/ui';

const SHOWN = 10; // games in the table before "and N more"

const Score = ({ value }) => (
  <span className="font-display text-2xl tabular-nums" style={{ color: getRarity(value).color }}>
    {value}
  </span>
);

// data: the taste endpoint's answer with a match ({ shared, match, games })
export const MatchResult = ({ name, data }) => {
  const { match, games, shared } = data;
  const rest = games.length - SHOWN;
  return (
    <div className="grid gap-6 md:grid-cols-[300px_1fr] md:gap-8 items-start">
      <div className="border border-slate-600 bg-slate-900 rounded-sm p-5 sm:p-6">
        <p className={LABEL}>You and {name}</p>
        <p className="font-display text-[84px] leading-none text-white mt-1 tabular-nums">{match.percent}%</p>
        <p className="text-sm text-slate-300 mt-1">
          taste match, from {shared} game{shared === 1 ? '' : 's'} you both rated
        </p>
        {(match.bothLove.length > 0 || match.split) && (
          <div className="flex flex-col gap-2 mt-5 text-sm text-white">
            {match.bothLove.length > 0 && (
              <p><span className="text-slate-400">You both love</span> {match.bothLove.join(', ')}</p>
            )}
            {match.split && (
              <p>
                <span className="text-slate-400">You split on</span>{' '}
                <Link to={`/game/${match.split.id}`} className={TEXT_LINK}>{match.split.title}</Link>{' '}
                <span className="tabular-nums">({match.split.you} vs {match.split.them})</span>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className="font-semibold text-white mb-3">Games you both rated</p>
        <table className="w-full border border-slate-700 text-left">
          <thead>
            <tr className="text-sm text-slate-400 border-b border-slate-700">
              <th scope="col" className="font-normal px-3 sm:px-4 h-10">Game</th>
              <th scope="col" className="font-normal px-2 h-10 text-right w-16">You</th>
              <th scope="col" className="font-normal px-3 sm:px-4 h-10 text-right w-24 break-all">{name}</th>
            </tr>
          </thead>
          <tbody>
            {games.slice(0, SHOWN).map((game) => (
              <tr key={game.id} className="border-b border-slate-700 last:border-0">
                <td className="px-3 sm:px-4 h-12">
                  <Link to={`/game/${game.id}`} className="text-white hover:underline underline-offset-4 line-clamp-2">
                    {game.title}
                  </Link>
                </td>
                <td className="px-2 h-12 text-right"><Score value={game.you} /></td>
                <td className="px-3 sm:px-4 h-12 text-right"><Score value={game.them} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rest > 0 && <p className="text-sm text-slate-400 mt-2">and {rest} more</p>}
      </div>
    </div>
  );
};

// The section on another player's profile
const TasteMatch = ({ username, name, loggedIn }) => {
  const { pathname } = useLocation();
  const [data, setData] = useState(null); // the taste endpoint's answer, or { error: true }

  useEffect(() => {
    if (!loggedIn) return undefined;
    const controller = new AbortController();
    getTasteMatch(username, controller.signal)
      .then(setData)
      .catch((error) => error.name !== 'AbortError' && setData({ error: true }));
    return () => controller.abort();
  }, [username, loggedIn]);

  // A failed match isn't worth an error box on someone's profile: it just steps aside
  if (data?.error) return null;

  return (
    <section aria-labelledby="taste-title" className="flex flex-col gap-6">
      <h2 id="taste-title" className={SECTION_TITLE}>Your taste match</h2>
      {!loggedIn ? (
        <p className="text-base text-slate-300">
          <Link to={`/login?redirect=${encodeURIComponent(pathname)}`} className={`font-medium text-white ${TEXT_LINK}`}>
            Log in
          </Link>{' '}
          to see how much your taste agrees with {name}'s.
        </p>
      ) : !data ? (
        <div className="h-40 rounded-sm bg-slate-900 motion-safe:animate-pulse" aria-hidden="true" />
      ) : data.match ? (
        <MatchResult name={name} data={data} />
      ) : (
        <div className="border border-slate-700 rounded-sm p-5 flex flex-col gap-2">
          <p className="text-white">
            {data.shared === 0
              ? `You and ${name} haven't rated the same games yet.`
              : `You've both rated ${data.shared} game${data.shared === 1 ? '' : 's'}.`}{' '}
            Rate {data.needed} more game{data.needed === 1 ? '' : 's'} you both played to see your match.
          </p>
          <Link to={`/compare/${encodeURIComponent(name)}`} className={`self-start inline-flex items-center min-h-11 font-medium text-white ${TEXT_LINK}`}>
            Rate some of {name}'s games
          </Link>
        </div>
      )}
    </section>
  );
};

export default TasteMatch;
