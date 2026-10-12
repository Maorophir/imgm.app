/**
 * StartQuestButton — The call-to-action that opens the Review Quest.
 * The Noir primary: a flat lime button with its label on one line, and the reward
 * ("Up to 130 XP · about 2 min") as a quiet caption beside it, outside the button.
 * Wraps under the button when there isn't room on the line.
 */
import { Link } from 'react-router-dom';
import { MAX_XP } from './questOptions';
import { PRIMARY_BUTTON } from '../../lib/ui';

const StartQuestButton = ({ gameId, label = 'Start Review Quest', reward = `Up to ${MAX_XP} XP · about 2 min` }) => (
  <div className="inline-flex flex-wrap items-center gap-x-4 gap-y-1.5">
    <Link to={`/game/${gameId}/review`} className={PRIMARY_BUTTON}>
      {label}
    </Link>
    {reward && <span className="text-sm text-slate-400">{reward}</span>}
  </div>
);

export default StartQuestButton;
