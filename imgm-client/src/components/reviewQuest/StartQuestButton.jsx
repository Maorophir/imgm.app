/**
 * StartQuestButton — The call-to-action that opens the Review Quest.
 * The Noir primary: a flat lime button with its label on one line, and the reward
 * ("Up to 130 XP · about 2 min") as a quiet caption beside it, outside the button.
 * Wraps under the button when there isn't room on the line.
 *
 * Give it the game's releaseDate: a game that isn't out yet can't be reviewed, so in
 * its place it shows when the game comes out ("Out 19 Nov 2026") and Add to Backlog,
 * to save it for then. Leave it out for a player's own review: that can always be edited.
 */
import { Link } from 'react-router-dom';
import { MAX_XP } from './questOptions';
import BacklogButton from '../BacklogButton';
import { isUnreleased, releaseLabel } from '../../lib/release';
import { PRIMARY_BUTTON } from '../../lib/ui';

const StartQuestButton = ({ gameId, releaseDate, label = 'Start Review Quest', reward = `Up to ${MAX_XP} XP · about 2 min` }) => {
  if (isUnreleased(releaseDate)) {
    return (
      <div className="inline-flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="text-base font-medium text-white">{releaseLabel(releaseDate)}</span>
        <BacklogButton gameId={gameId} source="game_page" variant="pill" />
      </div>
    );
  }

  return (
    <div className="inline-flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <Link to={`/game/${gameId}/review`} className={PRIMARY_BUTTON}>
        {label}
      </Link>
      {reward && <span className="text-sm text-slate-400">{reward}</span>}
    </div>
  );
};

export default StartQuestButton;
