/**
 * HeroCard — what a Steam game becomes on IMGM: a card waiting for your score (a "?",
 * "Yours to rate"), with your Steam hours printed on it. It stands in front of the
 * Steam page's cover wall, tilting toward the pointer like every IMGM card.
 *
 *   yours    a connected player whose library is in: their most played game they
 *            haven't rated yet, with their real hours, and a link straight into its
 *            review quest (hours and platform filled in)
 *   example  everyone else: a real featured game that's on Steam, with sample hours,
 *            and the caption says it's an example
 *   face down  while that's still on its way (never a made-up card in the meantime)
 *
 * Props:
 *   mine     the library game to show ({ gameId, title, coverUrl, minutes, platforms }),
 *            or null
 *   sample   the featured game for the example ({ title, coverUrl }), or null
 *   waiting  true while it can't tell yet which of the two to show
 *   connected  true for a player who has connected Steam (the example's caption says
 *            where their own games are)
 */
import { Link } from 'react-router-dom';
import CardStage from '../../CardStage';
import CollectibleCard from '../../CollectibleCard';
import FaceDownCard from '../../home/FaceDownCard';
// The same review-quest link as the library's rows (hours and PC filled in)
import { questLink } from '../library/libraryData';
import { hoursLabel } from '../../../lib/steam';
import { TEXT_LINK } from '../../../lib/ui';

// The example's playtime: a favourite's worth of hours
const SAMPLE_MINUTES = 142 * 60;

const HeroCard = ({ mine, sample, waiting, connected }) => {
  const game = waiting ? null : mine ?? sample;
  if (!game) return <FaceDownCard className="rotate-[-2.5deg]" />;

  const minutes = mine ? mine.minutes : SAMPLE_MINUTES;
  return (
    <div>
      {/* Not rated yet, so no tier: the plain ivory edge of a card still to be earned */}
      <CardStage
        tier="common"
        front={
          <CollectibleCard
            title={game.title}
            score={null}
            coverUrl={game.coverUrl}
            meta={`${hoursLabel(minutes)} on Steam`}
            reviewer="You"
          />
        }
      />
      <p className="mt-6 text-sm text-slate-400 text-center lg:text-left">
        {mine ? (
          <>
            Your most played game you haven't rated.{' '}
            <Link to={questLink(mine)} className={`inline-flex items-center min-h-11 font-medium text-white ${TEXT_LINK}`}>
              Rate it
            </Link>
          </>
        ) : connected ? (
          'An example. Your own games are waiting in your library.'
        ) : (
          'An example. Connect Steam to see your own games and hours.'
        )}
      </p>
    </div>
  );
};

export default HeroCard;
