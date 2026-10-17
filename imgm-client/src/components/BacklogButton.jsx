/**
 * "Add to Backlog" / "In your Backlog". Works inside clickable cards (it never opens
 * them). Logged out, it sends you to log in and brings you back.
 *   variant="pill"  icon + words, a 44px ghost button (game pages)
 *   variant="chip"  small, for cards and rows
 * Noir: a ghost with a control-grey edge; once saved the edge turns ivory and the
 * bookmark fills in (no lime: that's kept for each page's main action).
 */
import { BookmarkCheck, BookmarkPlus } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBacklog } from '../context/BacklogContext';

const BacklogButton = ({ gameId, source, variant = 'chip', className = '' }) => {
  const backlog = useBacklog();
  const navigate = useNavigate();
  const location = useLocation();
  const saved = backlog?.has(gameId);

  const click = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!backlog?.loggedIn) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    backlog.toggle(gameId, source);
  };

  const Icon = saved ? BookmarkCheck : BookmarkPlus;
  const label = saved ? 'In your Backlog' : 'Add to Backlog';
  const look =
    variant === 'pill'
      ? `h-11 px-4 text-sm ${saved ? 'border-white' : 'border-slate-500 hover:border-white'}`
      : `h-8 px-2.5 text-xs ${saved ? 'border-white' : 'border-slate-600 hover:border-white'}`;
  return (
    <button
      type="button"
      onClick={click}
      aria-pressed={Boolean(saved)}
      title={saved ? 'Remove from your Backlog' : 'Save it to play later'}
      className={`inline-flex items-center gap-1.5 rounded-sm border font-medium text-white whitespace-nowrap hover:text-slate-50 transition-colors duration-120 ${look} ${className}`}
    >
      <Icon className={variant === 'pill' ? 'w-4 h-4' : 'w-3.5 h-3.5'} strokeWidth={1.8} aria-hidden="true" />
      {label}
    </button>
  );
};

export default BacklogButton;
