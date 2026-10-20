/**
 * "Add to Backlog" / "In your Backlog". Works inside clickable cards (it never opens
 * them). Logged out, it sends you to log in and brings you back.
 *   variant="pill"  icon + words, a 44px ghost button (game pages)
 *   variant="chip"  small, for cards and rows
 *   variant="icon"  the bookmark alone, a 40px square (tight rows, e.g. honorable mentions)
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
  const edge = saved ? 'border-white' : variant === 'pill' ? 'border-slate-500 hover:border-white' : 'border-slate-600 hover:border-white';
  const look = { pill: 'h-11 px-4 text-sm', chip: 'h-8 px-2.5 text-xs', icon: 'w-10 h-10 justify-center' }[variant];
  return (
    <button
      type="button"
      onClick={click}
      aria-pressed={Boolean(saved)}
      title={saved ? 'Remove from your Backlog' : 'Save it to play later'}
      className={`inline-flex items-center gap-1.5 rounded-sm border font-medium text-white whitespace-nowrap hover:text-slate-50 transition-colors duration-120 ${look} ${edge} ${className}`}
    >
      <Icon className={variant === 'chip' ? 'w-3.5 h-3.5' : 'w-4 h-4'} strokeWidth={1.8} aria-hidden="true" />
      {/* The icon variant still says it, for screen readers */}
      <span className={variant === 'icon' ? 'sr-only' : undefined}>{label}</span>
    </button>
  );
};

export default BacklogButton;
