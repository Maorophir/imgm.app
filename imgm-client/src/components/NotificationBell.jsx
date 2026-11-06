/**
 * NotificationBell — the bell beside the player's menu in the header, with how many
 * lines are unread. Opening it shows the latest 20: replies to your Discover comments,
 * helpful votes on your reviews, backlog games that came out, Game of the Week closing.
 * Each one links to its thing and is read once opened; "Mark all read" clears the count.
 *
 * Nothing here is sent anywhere: emails are separate, and off until the player chooses
 * them (the link at the bottom, Settings → Emails).
 *
 * The count is asked for once a minute, only while the tab is on screen (and at once
 * when it comes back), so a tab left open costs nothing. Opens and closes like the
 * player's menu (an outside click or Esc). On phones the list spans the screen under
 * the header: the bell sits left of the menu there, so a list hung from it would
 * overflow the screen's left edge.
 */
import { Bell, CalendarDays, MessageCircle, ThumbsUp, Vote } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getNotifications, getUnreadCount, markAllNotificationsRead, markNotificationRead } from '../lib/api';
import { TEXT_BUTTON_SM, TEXT_LINK } from '../lib/ui';

const POLL = 60_000;

// "pixelmoth" or "pixelmoth and 2 others" (the latest name first)
const whoDid = (actors = []) => {
  const first = <b className="font-semibold">{actors[0]?.name ?? 'A player'}</b>;
  if (actors.length <= 1) return first;
  return <>{first} and {actors.length - 1} other{actors.length > 2 ? 's' : ''}</>;
};

// What a line says, its icon and where it goes
const LINES = {
  reply: (d) => ({
    icon: MessageCircle,
    words: <>{whoDid(d.actors)} replied to your comment on <b className="font-semibold">{d.title ?? 'a game'}</b></>,
    to: `/discover?feed=${d.feed ?? 'hot'}&game=${d.gameId}`,
  }),
  helpful: (d) => ({
    icon: ThumbsUp,
    words: <>{whoDid(d.actors)} found your <b className="font-semibold">{d.title ?? ''}</b> review helpful</>,
    to: `/game/${d.gameId}?review=${d.reviewId}#review-${d.reviewId}`,
  }),
  released: (d) => ({
    icon: CalendarDays,
    words: <>Out now: <b className="font-semibold">{d.title}</b>, from your backlog</>,
    to: `/game/${d.gameId}`,
  }),
  gotw_closing: () => ({
    icon: Vote,
    words: <>Game of the Week voting closes tonight. You haven't voted yet</>,
    to: '/game-of-the-week',
  }),
};

// "now", "5m", "2h", "3d", then the date
const ago = (at) => {
  const minutes = Math.floor((Date.now() - new Date(at).getTime()) / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h`;
  if (minutes < 7 * 24 * 60) return `${Math.floor(minutes / (24 * 60))}d`;
  return new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null); // null while loading
  const boxRef = useRef(null);

  // The count: now, every minute while the tab is on screen, and when it comes back
  const refresh = useCallback(() => {
    if (document.visibilityState !== 'visible') return;
    getUnreadCount().then((r) => setUnread(r.unread)).catch(() => {});
  }, []);
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [refresh]);

  // Opening loads the list
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    getNotifications(controller.signal)
      .then((r) => {
        setItems(r.items);
        setUnread(r.unread);
      })
      .catch(() => setItems((current) => current ?? []));
    return () => controller.abort();
  }, [open]);

  // While open: a click anywhere outside, or Esc, closes it
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openLine = (item) => {
    setOpen(false);
    if (item.read) return;
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, read: true } : i)));
    setUnread((n) => Math.max(0, n - 1));
    markNotificationRead(item.id).catch(() => {});
  };

  const readAll = () => {
    setItems((list) => list?.map((i) => ({ ...i, read: true })));
    setUnread(0);
    markAllNotificationsRead().catch(() => {});
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        className={`relative w-11 h-11 grid place-items-center rounded-sm text-white transition-colors duration-120 ${open ? 'bg-slate-900' : 'hover:bg-slate-900'}`}
      >
        <Bell className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
        {unread > 0 && (
          <span aria-hidden="true" className="absolute top-1.5 right-1 min-w-4 h-4 px-1 rounded-full bg-white text-slate-950 text-[10px] font-bold leading-4 text-center tabular-nums">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        // Floats like the player's menu: card stock, a hairline edge, a soft shadow
        <div className="fixed inset-x-4 top-[60px] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2.5 sm:w-[380px] rounded-sm bg-slate-900 border border-slate-600 shadow-[0_32px_64px_-24px_rgba(0,0,0,.85)] transition-[opacity,translate] duration-160 ease-out translate-y-0 starting:opacity-0 starting:-translate-y-1">
          <div className="flex items-center justify-between gap-4 px-4 h-12 border-b border-slate-700">
            <p className="font-semibold text-white">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={readAll} className={TEXT_BUTTON_SM}>Mark all read</button>
            )}
          </div>
          <div className="max-h-[min(440px,calc(100dvh-180px))] overflow-y-auto">
            {items === null && <p className="px-4 py-6 text-sm text-slate-400">Loading…</p>}
            {items?.length === 0 && (
              <p className="px-4 py-6 text-sm text-slate-400">
                Nothing yet. Replies to your comments, helpful votes on your reviews and your backlog's release days show up here.
              </p>
            )}
            {items?.map((item) => {
              const line = LINES[item.kind]?.(item.data);
              if (!line) return null;
              const Icon = line.icon;
              return (
                <Link
                  key={item.id}
                  to={line.to}
                  onClick={() => openLine(item)}
                  className={`flex gap-3 px-4 py-3.5 border-b border-slate-700 last:border-0 hover:bg-slate-800 transition-colors duration-120 ${item.read ? '' : 'bg-slate-800'}`}
                >
                  <Icon className="w-4.5 h-4.5 shrink-0 mt-0.5 text-slate-300" strokeWidth={1.8} aria-hidden="true" />
                  <span className="flex-1 text-sm leading-snug text-white">
                    {line.words}
                    {!item.read && <span className="sr-only"> (unread)</span>}
                  </span>
                  <span className="text-xs text-slate-400 tabular-nums">{ago(item.at)}</span>
                </Link>
              );
            })}
          </div>
          <div className="px-4 py-3 border-t border-slate-700">
            <Link to="/settings#emails" onClick={() => setOpen(false)} className={`text-sm text-slate-300 ${TEXT_LINK}`}>
              Email settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
