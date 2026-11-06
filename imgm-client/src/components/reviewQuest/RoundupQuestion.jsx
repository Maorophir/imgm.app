/**
 * RoundupQuestion — "Want a Sunday roundup?" on the review quest's done screen, asked
 * once ever: after a player has posted a review, while their email is confirmed and the
 * roundup is still off. Two plain answers and nothing ticked for them; either answer
 * means it's never asked again (the server keeps when it was asked). Settings → Emails
 * changes it any time.
 *
 * Ghost buttons: the done screen's lime is "See it on the game page".
 */
import { Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { answerRoundupQuestion, getEmailSettings } from '../../lib/api';
import { GHOST_BUTTON_SM, TEXT_BUTTON_SM, TEXT_LINK } from '../../lib/ui';

const RoundupQuestion = () => {
  const [ask, setAsk] = useState(false);
  const [answer, setAnswer] = useState(null); // 'yes' | 'no' once answered

  useEffect(() => {
    const controller = new AbortController();
    getEmailSettings(controller.signal).then((s) => setAsk(s.ask)).catch(() => {});
    return () => controller.abort();
  }, []);

  const reply = (yes) => {
    setAnswer(yes ? 'yes' : 'no');
    answerRoundupQuestion(yes).catch(() => setAnswer(null));
  };

  if (!ask || answer === 'no') return null;
  return (
    <div className="mt-8 mx-auto max-w-md rounded-sm border border-slate-700 bg-slate-900 p-5 text-left">
      {answer === 'yes' ? (
        <p role="status" className="text-sm text-slate-200">
          Done: the roundup comes on Sundays.{' '}
          <Link to="/settings#emails" className={`font-medium text-white ${TEXT_LINK}`}>Change it in Settings</Link>
        </p>
      ) : (
        <>
          <p className="flex items-center gap-2 font-semibold text-white">
            <Mail className="w-4 h-4 text-slate-400" strokeWidth={1.8} aria-hidden="true" /> Want a Sunday roundup?
          </p>
          <p className="text-sm text-slate-400 mt-1.5">
            One email on Sundays: the Game of the Week, your backlog games that came out, and the week's most helpful review. Unsubscribe in one click.
          </p>
          <div className="mt-4 flex items-center gap-5">
            <button type="button" onClick={() => reply(true)} className={GHOST_BUTTON_SM}>Yes, send it</button>
            <button type="button" onClick={() => reply(false)} className={TEXT_BUTTON_SM}>No thanks</button>
          </div>
        </>
      )}
    </div>
  );
};

export default RoundupQuestion;
