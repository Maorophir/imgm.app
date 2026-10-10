/**
 * "Add to Backlog" / "In your Backlog". Works inside clickable cards (it never opens
 * them). Logged out, it sends you to log in and brings you back.
 *   variant="pill"  icon + words (game pages)
 *   variant="chip"  small, for cards and rows
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
      ? `px-4 py-2 rounded-full text-sm ${saved ? 'bg-brand/15 border-brand text-white' : 'border-slate-600 text-slate-200 hover:text-white hover:border-slate-400'}`
      : `px-2.5 py-1 rounded-lg text-[11px] ${saved ? 'bg-brand/15 border-brand/70 text-white' : 'border-slate-700 text-slate-300 hover:text-white hover:border-slate-500'}`;
  return (
    <button
      type="button"
      onClick={click}
      aria-pressed={Boolean(saved)}
      title={saved ? 'Remove from your Backlog' : 'Save it to play later'}
      className={`inline-flex items-center gap-1.5 font-bold border bg-slate-950/60 transition ${look} ${className}`}
    >
      <Icon className={variant === 'pill' ? 'w-4 h-4' : 'w-3.5 h-3.5'} aria-hidden="true" style={saved ? { color: 'var(--color-brand)' } : undefined} />
      {label}
    </button>
  );
};

export default BacklogButton;
