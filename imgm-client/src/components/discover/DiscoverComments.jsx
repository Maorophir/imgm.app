/**
 * Discover's comments on the game on screen, opened from the Comments button: a sheet
 * over the bottom of the screen on a phone (like TikTok), a panel down the right side
 * on a computer. The feed keeps playing behind it.
 *
 *   - The most liked comments first, then the newest; 20 at a time ("More comments").
 *   - Replies are one level deep: "View 3 replies" opens them under the comment, and a
 *     reply to a reply joins the same thread, starting with the other player's @tag.
 *   - A heart likes a comment; your own comments can be deleted (their replies go too),
 *     anyone else's reported (3 reports hide it until it's checked).
 *   - Logged out: everything reads, and the box says to log in.
 * The server refuses links and slurs (lib/commentFilter.js) and says why.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Flag, Heart, Trash2, X } from 'lucide-react';
import {
  deleteDiscoverComment, getDiscoverComments, getDiscoverReplies, likeDiscoverComment,
  postDiscoverComment, reportDiscoverComment,
} from '../../lib/api';
import { Avatar } from '../reviewCard/RarityCard';
import { timeAgo } from '../../lib/timeAgo';
import { TEXT_BOX, TEXT_LINK } from '../../lib/ui';

const MAX = 300;
const count = (n, word) => `${n.toLocaleString('en-US')} ${word}${n === 1 ? '' : 's'}`;

// One comment (or reply): who, when, what, and its actions
const Comment = ({ comment, loggedIn, onReply, onLike, onDelete, onReport, small }) => {
  const [asking, setAsking] = useState(null); // 'delete' | 'report': the inline "sure?"
  const [reported, setReported] = useState(false);
  const { author } = comment;
  return (
    <div className="flex gap-3">
      <Link to={`/u/${encodeURIComponent(author.tag)}`} className="shrink-0" aria-label={`${author.tag}'s profile`}>
        <Avatar name={author.tag} user={author} size={small ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'} />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-400">
          <Link to={`/u/${encodeURIComponent(author.tag)}`} className="font-semibold text-slate-200 hover:underline">{author.tag}</Link>
          <span className="ml-2">{timeAgo(comment.createdAt)}</span>
        </p>
        <p className="mt-0.5 text-sm text-white whitespace-pre-line [overflow-wrap:anywhere]">{comment.body}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 text-xs text-slate-400">
          {loggedIn && <button type="button" onClick={() => onReply(comment)} className="min-h-8 font-medium hover:text-white">Reply</button>}
          {loggedIn && comment.mine && asking !== 'delete' && (
            <button type="button" onClick={() => setAsking('delete')} className="min-h-8 inline-flex items-center gap-1 hover:text-white">
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" /> Delete
            </button>
          )}
          {loggedIn && !comment.mine && !reported && asking !== 'report' && (
            <button type="button" onClick={() => setAsking('report')} className="min-h-8 inline-flex items-center gap-1 hover:text-white">
              <Flag className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" /> Report
            </button>
          )}
          {reported && <span className="min-h-8 inline-flex items-center">Reported. Thanks.</span>}
          {asking && (
            <span className="min-h-8 inline-flex items-center gap-3 text-slate-200">
              {asking === 'delete' ? (comment.replyCount ? 'Delete it and its replies?' : 'Delete it?') : 'Report this comment?'}
              <button
                type="button"
                onClick={async () => {
                  if (asking === 'delete') return onDelete(comment);
                  if (await onReport(comment)) setReported(true);
                  setAsking(null);
                }}
                className="font-semibold text-white hover:underline"
              >
                {asking === 'delete' ? 'Delete' : 'Report'}
              </button>
              <button type="button" onClick={() => setAsking(null)} className="hover:text-white">Cancel</button>
            </span>
          )}
        </div>
      </div>
      {/* The heart, with its count */}
      <button
        type="button"
        onClick={() => onLike(comment)}
        aria-pressed={comment.liked}
        aria-label={`Like: ${comment.likes}`}
        className="shrink-0 self-start flex flex-col items-center min-w-8 pt-1 text-xs text-slate-400 hover:text-white"
      >
        <Heart className={`w-4.5 h-4.5 ${comment.liked ? 'text-white' : ''}`} strokeWidth={1.8} fill={comment.liked ? 'currentColor' : 'none'} />
        <span className="tabular-nums">{comment.likes || ''}</span>
      </button>
    </div>
  );
};

export default function DiscoverComments({ game, total, loggedIn, onClose, onCountChange }) {
  const { pathname } = useLocation();
  const [comments, setComments] = useState(null); // null while loading
  const [more, setMore] = useState(false);
  const [page, setPage] = useState(0);
  const [problem, setProblem] = useState(null);
  const [replies, setReplies] = useState({}); // comment id -> its replies, once opened
  const [replyTo, setReplyTo] = useState(null); // { id (the thread), tag }
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const box = useRef(null);

  // The first page, and "More comments" after it
  useEffect(() => {
    const controller = new AbortController();
    getDiscoverComments(game.id, page, controller.signal)
      .then((data) => {
        setComments((list) => (page === 0 ? data.comments : [...(list ?? []), ...data.comments.filter((c) => !list?.some((o) => o.id === c.id))]));
        setMore(data.more);
        onCountChange(game.id, data.total);
      })
      .catch(() => !controller.signal.aborted && setComments((list) => list ?? []));
    return () => controller.abort();
  }, [game.id, page, onCountChange]);

  // Escape closes it
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // A change to one comment, wherever it sits (a comment or a reply)
  const update = useCallback((id, change) => {
    setComments((list) => list?.map((c) => (c.id === id ? { ...c, ...change(c) } : c)));
    setReplies((all) => Object.fromEntries(Object.entries(all).map(([key, list]) => [key, list.map((c) => (c.id === id ? { ...c, ...change(c) } : c))])));
  }, []);

  const openReplies = async (comment) => {
    if (replies[comment.id]) {
      // Hide them
      return setReplies((all) => {
        const rest = { ...all };
        delete rest[comment.id];
        return rest;
      });
    }
    try {
      const data = await getDiscoverReplies(comment.id);
      setReplies((all) => ({ ...all, [comment.id]: data.replies }));
    } catch {
      setProblem("Couldn't load the replies. Please try again.");
    }
  };

  // Reply: to a comment, its thread; to a reply, the same thread, starting with @them
  const reply = (comment) => {
    setReplyTo({ id: comment.parentId ?? comment.id, tag: comment.author.tag });
    if (comment.parentId) setText((t) => (t.startsWith(`@${comment.author.tag} `) ? t : `@${comment.author.tag} ${t}`));
    box.current?.focus();
  };

  // The heart shows at once; the server's count replaces it (or the old one comes back)
  const like = async (comment) => {
    if (!loggedIn) return setProblem('Log in to like comments.');
    const liked = !comment.liked;
    update(comment.id, (c) => ({ liked, likes: c.likes + (liked ? 1 : -1) }));
    try {
      const saved = await likeDiscoverComment(comment.id, liked);
      update(comment.id, () => saved);
    } catch {
      update(comment.id, () => ({ liked: comment.liked, likes: comment.likes }));
    }
  };

  const remove = async (comment) => {
    try {
      await deleteDiscoverComment(comment.id);
      if (comment.parentId) {
        setReplies((all) => ({ ...all, [comment.parentId]: all[comment.parentId]?.filter((r) => r.id !== comment.id) }));
        update(comment.parentId, (c) => ({ replyCount: Math.max(0, c.replyCount - 1) }));
        onCountChange(game.id, (n) => Math.max(0, n - 1));
      } else {
        setComments((list) => list.filter((c) => c.id !== comment.id));
        onCountChange(game.id, (n) => Math.max(0, n - 1 - comment.replyCount));
      }
    } catch (error) {
      setProblem(error?.data?.error ?? "Couldn't delete it. Please try again.");
    }
  };

  const report = async (comment) => {
    try {
      await reportDiscoverComment(comment.id);
      return true;
    } catch (error) {
      setProblem(error?.data?.error ?? "Couldn't send the report. Please try again.");
      return false;
    }
  };

  const post = async (event) => {
    event.preventDefault();
    const body = text.trim();
    if (!body || posting) return;
    setPosting(true);
    setProblem(null);
    try {
      const saved = await postDiscoverComment(game.id, body, replyTo?.id);
      if (saved.parentId) {
        // Under its comment, with the thread open
        const thread = replies[saved.parentId] ?? (await getDiscoverReplies(saved.parentId).then((d) => d.replies).catch(() => []));
        setReplies((all) => ({ ...all, [saved.parentId]: thread.some((r) => r.id === saved.id) ? thread : [...thread, saved] }));
        update(saved.parentId, (c) => ({ replyCount: c.replyCount + 1 }));
      } else {
        setComments((list) => [saved, ...(list ?? [])]);
      }
      onCountChange(game.id, (n) => n + 1);
      setText('');
      setReplyTo(null);
    } catch (error) {
      setProblem(error?.data?.error ?? "Couldn't post it. Please try again.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <>
      {/* Behind the sheet on a phone: a tap closes it */}
      <button type="button" aria-label="Close the comments" onClick={onClose} className="md:hidden absolute inset-0 z-20 bg-slate-950/40 cursor-default" />
      <section
        role="dialog"
        aria-label={`Comments on ${game.title}`}
        className="absolute z-30 inset-x-0 bottom-0 h-[72%] md:inset-x-auto md:right-0 md:top-0 md:h-full md:w-[400px] flex flex-col bg-slate-950/65 backdrop-blur-md border-t md:border-t-0 md:border-l border-white/14 rounded-t-sm md:rounded-none animate-fade-in"
      >
        <header className="flex items-center justify-between gap-3 px-4 h-13 border-b border-white/10 shrink-0">
          <h2 className="text-sm font-semibold text-white">{count(total, 'comment')}</h2>
          <button type="button" onClick={onClose} aria-label="Close the comments" className="grid place-items-center w-10 h-10 -mr-2 text-slate-300 hover:text-white">
            <X className="w-5 h-5" strokeWidth={1.8} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-4">
          {comments === null && <p className="text-sm text-slate-400">Loading comments…</p>}
          {comments?.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No comments yet. Be the first.</p>}
          {comments?.map((comment) => (
            <div key={comment.id}>
              <Comment comment={comment} loggedIn={loggedIn} onReply={reply} onLike={like} onDelete={remove} onReport={report} />
              {comment.replyCount > 0 && (
                <div className="pl-12 mt-1">
                  {replies[comment.id] && (
                    <div className="space-y-3 mt-2">
                      {replies[comment.id].map((r) => (
                        <Comment key={r.id} comment={r} loggedIn={loggedIn} onReply={reply} onLike={like} onDelete={remove} onReport={report} small />
                      ))}
                    </div>
                  )}
                  <button type="button" onClick={() => openReplies(comment)} className="min-h-8 text-xs font-medium text-slate-400 hover:text-white">
                    {replies[comment.id] ? 'Hide replies' : `View ${comment.replyCount} ${comment.replyCount === 1 ? 'reply' : 'replies'}`}
                  </button>
                </div>
              )}
            </div>
          ))}
          {more && (
            <button type="button" onClick={() => setPage((p) => p + 1)} className={`text-sm font-medium text-white ${TEXT_LINK}`}>
              More comments
            </button>
          )}
        </div>

        {/* (on a computer, clear of the site's Feedback button in the corner) */}
        <footer className="shrink-0 border-t border-white/10 px-4 py-3 md:pb-20">
          {problem && <p role="alert" className="mb-2 text-sm text-red-200">{problem}</p>}
          {loggedIn ? (
            <form onSubmit={post}>
              {replyTo && (
                <p className="mb-2 flex items-center justify-between text-xs text-slate-300">
                  <span>Replying to <span className="text-white">@{replyTo.tag}</span></span>
                  <button type="button" onClick={() => setReplyTo(null)} aria-label="Stop replying" className="grid place-items-center w-8 h-8 -mr-2 hover:text-white">
                    <X className="w-4 h-4" strokeWidth={1.8} />
                  </button>
                </p>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  ref={box}
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, MAX))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) post(e); // Shift+Enter: a new line
                  }}
                  rows={1}
                  maxLength={MAX}
                  placeholder={replyTo ? 'Add a reply…' : 'Add a comment…'}
                  aria-label={replyTo ? `Reply to ${replyTo.tag}` : `Comment on ${game.title}`}
                  className={`${TEXT_BOX} py-2.5 resize-none max-h-28 field-sizing-content`}
                />
                <button type="submit" disabled={!text.trim() || posting} className="h-11 px-3 text-sm font-semibold text-white disabled:text-slate-500">
                  {posting ? 'Posting…' : 'Post'}
                </button>
              </div>
              {text.length > MAX - 50 && <p className="mt-1 text-right text-xs text-slate-400 tabular-nums">{MAX - text.length} left</p>}
            </form>
          ) : (
            <p className="text-sm text-slate-300">
              <Link to={`/login?redirect=${encodeURIComponent(pathname)}`} className={`font-medium text-white ${TEXT_LINK}`}>Log in</Link> to comment.
            </p>
          )}
        </footer>
      </section>
    </>
  );
}
