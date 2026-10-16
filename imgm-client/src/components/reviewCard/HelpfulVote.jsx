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
        // Your choice: raised stock with an ivory edge (no lime: that's the page's main action's)
        className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-sm text-sm font-medium border transition-colors duration-120 ${
          active ? 'bg-slate-800 border-white text-white' : 'border-slate-600 text-white hover:border-white'
        }`}
      >
        <Icon className={`w-3.5 h-3.5 ${active ? '' : 'text-slate-400'}`} strokeWidth={1.8} aria-hidden="true" />
        {label}
      </button>
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 border-t border-slate-700">
      {!own && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Was this helpful?</span>
          {button(true, ThumbsUp, 'Yes')}
          {button(false, ThumbsDown, 'No')}
        </div>
      )}
      {count && <span className="text-sm text-slate-400">{count}</span>}
    </div>
  );
};

export default HelpfulVote;
