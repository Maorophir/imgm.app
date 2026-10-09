/**
 * HelpfulVote — "Was this helpful? Yes / No" under a review, plus how many found it
 * helpful. Clicking your current choice again takes the vote back. The page updates
 * at once and goes back if the server refuses. Your own review shows only the count;
 * logged-out visitors are sent to log in and brought back.
 */
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { useSession } from '../../lib/authClient';
import { voteOnReview } from '../../lib/api';

const HelpfulVote = ({ review }) => {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [votes, setVotes] = useState({
    helpful: review.helpfulCount ?? 0,
    unhelpful: review.unhelpfulCount ?? 0,
    mine: review.myVote ?? null,
  });
  const own = session?.user?.id === review.user?.id;

  const vote = async (choice) => {
    if (!session) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    const before = votes;
    const next = votes.mine === choice ? null : choice; // same button again = take it back
    // Right away: undo the old vote, count the new one
    setVotes({
      helpful: votes.helpful - (votes.mine === true) + (next === true),
      unhelpful: votes.unhelpful - (votes.mine === false) + (next === false),
      mine: next,
    });
    try {
      const saved = await voteOnReview(review.id, next);
      setVotes({ helpful: saved.helpfulCount, unhelpful: saved.unhelpfulCount, mine: saved.myVote });
    } catch {
      setVotes(before);
    }
  };

  const count =
    votes.helpful > 0 &&
    `${votes.helpful} ${votes.helpful === 1 ? 'player' : 'players'} found ${own ? 'your review' : 'this'} helpful`;
  if (own && !count) return null;

  const button = (choice, Icon, label) => {
    const active = votes.mine === choice;
    return (
      <button
        type="button"
        onClick={() => vote(choice)}
        aria-pressed={active}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
          active
            ? choice
              ? 'bg-brand/15 border-brand text-white'
              : 'bg-red-500/10 border-red-400/60 text-white'
            : 'border-slate-700 text-slate-300 hover:text-white hover:border-slate-500'
        }`}
      >
        <Icon className="w-3.5 h-3.5" aria-hidden="true" />
        {label}
      </button>
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 border-t border-slate-800">
      {!own && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Was this helpful?</span>
          {button(true, ThumbsUp, 'Yes')}
          {button(false, ThumbsDown, 'No')}
        </div>
      )}
      {count && <span className="text-xs text-slate-500">{count}</span>}
    </div>
  );
};

export default HelpfulVote;
