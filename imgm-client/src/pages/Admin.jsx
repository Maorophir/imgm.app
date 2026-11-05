/**
 * Admin — IMGM's own back office at /admin, only for players whose role is 'admin' (App
 * sends anyone else home; the server answers them 404 either way). Four tabs:
 *   Stats     players, who's active week by week, who comes back, reviews, what players do
 *   Visitors  everyone who opens the site, logged in or not (IMGM's own cookie-free
 *             counter): visitors, pages, where they came from, countries, devices
 *   Reports   Discover comments someone reported: keep, hide or delete each
 *   Reviews   the newest reviews, searchable by game or gamer tag: delete one
 *   Comments  the newest Discover comments, searchable: hide or delete one
 * Every delete asks first, and can carry a note for the log (AdminAction on the server).
 * Not linked from anywhere but the admin's own menu, not in the sitemap, and noindex.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EyeOff, Eye, Lock, Search, Trash2, ExternalLink } from 'lucide-react';
import {
  getAdminStats, getAdminVisitors, getAdminReports, getAdminComments, getAdminReviews,
  setAdminCommentHidden, deleteAdminComment, deleteAdminReview,
} from '../lib/api';
import { getRarity } from '../components/reviewQuest/questOptions';
import { timeAgo } from '../lib/timeAgo';
import LoadError from '../components/LoadError';
import { WRAP, SECTION_TITLE, SEGMENTS, segment, LABEL, FIELD, GHOST_BUTTON_SM, TEXT_BUTTON_SM } from '../lib/ui';

const TABS = [
  ['stats', 'Stats'],
  ['visitors', 'Visitors'],
  ['reports', 'Reports'],
  ['reviews', 'Reviews'],
  ['comments', 'Comments'],
];

// "2026-11-02" → "2 Nov"
const shortDate = (day) => new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const pct = (part, whole) => (whole ? Math.min(100, Math.round((part / whole) * 100)) : 0);
const change = (now, before) => {
  const d = now - before;
  return d === 0 ? 'Same as last week' : `${d > 0 ? '+' : ''}${d} on last week`;
};

// Loads `load(signal)` on mount and whenever `deps` change; `reload` runs it again
function useLoad(load, deps) {
  const [state, setState] = useState({ data: null, error: false });
  const [round, setRound] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal)
      .then((data) => setState({ data, error: false }))
      .catch((error) => error.name !== 'AbortError' && setState({ data: null, error: true }));
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, round]);
  // A retry clears the error first, so the page shows it loading again
  const reload = useCallback(() => {
    setState((s) => ({ data: s.data, error: false }));
    setRound((r) => r + 1);
  }, []);
  return { ...state, reload };
}

// ── Stats ──

function Tile({ label, value, note }) {
  return (
    <div className="bg-slate-900 p-5">
      <p className={LABEL}>{label}</p>
      <p className="font-display text-[44px] sm:text-[52px] leading-none mt-2 tabular-nums">{value}</p>
      <p className="text-sm text-slate-400 mt-2">{note}</p>
    </div>
  );
}

function Stats() {
  const { data, error, reload } = useLoad((signal) => getAdminStats(signal), []);
  if (error) return <LoadError onRetry={reload} />;
  if (!data) return <div className="h-150" />;
  const { players, active, cameBack, reviews, weeks, doing, activitySince } = data;
  const doingRows = [
    ['Rated a game', doing.rated],
    ['Discover vote', doing.discoverVoted],
    ['Play Next', doing.playNext],
    ['Game of the Week vote', doing.gotwVoted],
    ['Commented on Discover', doing.commented],
  ];

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-700 border border-slate-700 mb-8">
        <Tile label="Players" value={players.total.toLocaleString()} note={`+${players.newThisWeek} this week`} />
        <Tile label="Active this week" value={active.thisWeek} note={change(active.thisWeek, active.lastWeek)} />
        <Tile
          label="Came back the next week"
          value={cameBack.joined ? `${pct(cameBack.returned, cameBack.joined)}%` : '–'}
          note={cameBack.joined ? `${cameBack.returned} of last week's ${cameBack.joined} new players` : 'No new players last week'}
        />
        <Tile label="Reviews this week" value={reviews.total} note={`${reviews.quick} score only, ${reviews.full} with answers`} />
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 lg:gap-8">
        <div className="border border-slate-700 bg-slate-900 p-5">
          <p className="font-semibold mb-1">Active players, week by week</p>
          <p className="text-sm text-slate-400 mb-5">
            Players who used the site logged in that week (7 days to today, UTC).{' '}
            {activitySince ? `Counted since ${shortDate(activitySince)}.` : 'Counting starts with the next visit.'}
          </p>
          <WeekBars weeks={weeks} value={(week) => week.players} />
        </div>

        <div className="border border-slate-700 bg-slate-900 p-5">
          <p className="font-semibold mb-1">What players do</p>
          <p className="text-sm text-slate-400 mb-5">Share of this week's {active.thisWeek} active players</p>
          {doingRows.map(([what, count]) => (
            <div key={what} className="mb-3.5">
              <div className="flex justify-between text-sm mb-1.5">
                <span>{what}</span>
                <span className="tabular-nums text-slate-300">
                  {pct(count, active.thisWeek)}% <span className="text-slate-400">· {count}</span>
                </span>
              </div>
              <div className="h-1.5 bg-slate-700">
                <div className="h-full bg-slate-300" style={{ width: `${pct(count, active.thisWeek)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Visitors ──

// Week-by-week bars, for Stats and Visitors (the newest week in ivory)
function WeekBars({ weeks, value }) {
  const tallest = Math.max(1, ...weeks.map(value));
  return (
    <>
      <div className="flex items-end gap-2 sm:gap-3 h-45 border-b border-slate-600">
        {weeks.map((week, i) => (
          <div key={week.start} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
            <span className="text-xs tabular-nums text-slate-300">{value(week)}</span>
            <div
              className={`w-full ${i === weeks.length - 1 ? 'bg-white' : 'bg-slate-500'}`}
              style={{ height: `${(value(week) / tallest) * 150}px` }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 sm:gap-3 mt-2">
        {weeks.map((week) => (
          <span key={week.start} className="flex-1 text-center text-xs text-slate-400">{shortDate(week.start)}</span>
        ))}
      </div>
    </>
  );
}

const DEVICE_NAMES = { phone: 'Phone', tablet: 'Tablet', computer: 'Computer' };
const countryName = (code) => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
};
const TOP_LISTS = [
  ['path', 'Top pages', (v) => v],
  ['referrer', 'Where they came from', (v) => (v === 'other' ? 'Other sites' : v)],
  ['country', 'Countries', countryName],
  ['device', 'Devices', (v) => DEVICE_NAMES[v] ?? v],
  ['browser', 'Browsers', (v) => v],
  ['os', 'Systems', (v) => v],
];

// One of this week's top lists, as bars against its biggest value
function TopList({ title, rows, label, empty }) {
  const most = Math.max(1, ...rows.map((r) => r.visitors));
  return (
    <div className="border border-slate-700 bg-slate-900 p-5">
      <p className="font-semibold mb-4">{title}</p>
      {rows.length === 0 && <p className="text-sm text-slate-400">{empty}</p>}
      {rows.map((row) => (
        <div key={row.value} className="mb-3.5">
          <div className="flex justify-between gap-4 text-sm mb-1.5">
            <span className="min-w-0 truncate">{label(row.value)}</span>
            <span className="shrink-0 tabular-nums text-slate-300">
              {row.visitors} <span className="text-slate-400">· {row.views} views</span>
            </span>
          </div>
          <div className="h-1.5 bg-slate-700">
            <div className="h-full bg-slate-300" style={{ width: `${(row.visitors / most) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Visitors() {
  const { data, error, reload } = useLoad((signal) => getAdminVisitors(signal), []);
  if (error) return <LoadError onRetry={reload} />;
  if (!data) return <div className="h-150" />;
  const { since, today, thisWeek, lastWeek, weeks, top } = data;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-700 border border-slate-700 mb-8">
        <Tile label="Visitors today" value={today.visitors} note={`${today.views} page views`} />
        <Tile label="Visitors this week" value={thisWeek.visitors} note={change(thisWeek.visitors, lastWeek.visitors)} />
        <Tile label="Visitors last week" value={lastWeek.visitors} note={`${lastWeek.views} page views`} />
        <Tile label="Page views this week" value={thisWeek.views} note={change(thisWeek.views, lastWeek.views)} />
      </div>

      <div className="border border-slate-700 bg-slate-900 p-5 mb-6 lg:mb-8">
        <p className="font-semibold mb-1">Visitors, week by week</p>
        <p className="text-sm text-slate-400 mb-5">
          Everyone who opened the site, logged in or not. A visitor is only recognised within a day, so a
          week adds up its days: someone who came on three days counts three times.{' '}
          {since ? `Counted since ${shortDate(since)}.` : 'Counting starts with the next visit.'}
        </p>
        <WeekBars weeks={weeks} value={(week) => week.visitors} />
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
        {TOP_LISTS.map(([dimension, title, label]) => (
          <TopList
            key={dimension}
            title={title}
            rows={top[dimension] ?? []}
            label={label}
            empty={dimension === 'referrer' ? 'No visits from other sites this week' : dimension === 'country' ? 'No countries yet (the server only learns them through imgm.app)' : 'Nothing this week yet'}
          />
        ))}
      </div>

      <p className="text-sm text-slate-400 mt-6">
        This week: the last 7 days, UTC. No cookies; browsers that ask not to be tracked aren't counted.{' '}
        <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className={`${TEXT_BUTTON_SM} inline-flex items-center gap-1 h-auto text-white`}>
          Full analytics on Vercel <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      </p>
    </>
  );
}

// ── Moderation ──

// A delete that asks first: the button opens "Delete …? [note] Delete / Cancel"
function ConfirmDelete({ what, onDelete }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={GHOST_BUTTON_SM}>
        <Trash2 className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> Delete
      </button>
    );
  }
  const run = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await onDelete(note.trim() || undefined);
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };
  return (
    <div className="w-full border border-slate-600 bg-slate-950 p-3 mt-1">
      <p className="text-sm font-medium mb-2">Delete this {what}? The player can't get it back.</p>
      <input
        className={FIELD}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={300}
        placeholder="Why (optional, for the log)"
        aria-label="Why it was deleted (optional)"
      />
      <div className="flex items-center gap-3 mt-3">
        <button type="button" onClick={run} disabled={busy} className={GHOST_BUTTON_SM}>
          {busy ? 'Deleting…' : `Delete ${what}`}
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={busy} className={TEXT_BUTTON_SM}>
          Cancel
        </button>
        {failed && <span className="text-sm text-slate-300">That didn't work. Try again.</span>}
      </div>
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className="relative block max-w-md mb-5">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} aria-hidden="true" />
      <input className={`${FIELD} pl-10`} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </label>
  );
}

// The words typed, settled for a moment, so a search isn't sent on every key
function useSettled(value, ms = 300) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
}

const Empty = ({ children }) => <p className="text-slate-400 py-10">{children}</p>;

// One Discover comment, with its reports when it has any, and what can be done to it
function CommentRow({ comment, onChanged }) {
  const [busy, setBusy] = useState(false);
  const setHidden = async (hidden) => {
    setBusy(true);
    try {
      await setAdminCommentHidden(comment.id, hidden);
      onChanged();
    } finally {
      setBusy(false);
    }
  };
  const reported = comment.reports.length > 0;
  return (
    <li className="border border-slate-700 bg-slate-900 p-4">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-slate-400 mb-2">
        <span className="font-semibold text-white">{comment.author.tag ?? 'A player'}</span>
        <span>on</span>
        <Link to={`/game/${comment.gameId}`} className="text-white underline decoration-slate-500/80 underline-offset-4 hover:decoration-current">
          {comment.gameTitle ?? `game ${comment.gameId}`}
        </Link>
        <span>· {timeAgo(comment.createdAt)}</span>
        {comment.parentId && <span>· a reply</span>}
        <span>· {comment.likes} likes</span>
        {comment.hidden && (
          <span className="inline-flex items-center gap-1 px-1.5 border border-slate-500 rounded-sm text-xs text-slate-200">
            <EyeOff className="w-3 h-3" strokeWidth={1.8} aria-hidden="true" /> Hidden
          </span>
        )}
      </div>
      <p className="text-base whitespace-pre-wrap wrap-break-word">{comment.body}</p>
      {reported && (
        <ul className="mt-3 border-t border-slate-700 pt-3 space-y-1">
          {comment.reports.map((report, i) => (
            <li key={i} className="text-sm text-slate-300">
              Reported by {report.by ?? 'a player'} {timeAgo(report.createdAt)}
              {report.reason ? <>: <span className="text-white">{report.reason}</span></> : null}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-3 mt-4">
        {comment.hidden || reported ? (
          // "Keep": it's fine. It shows again, and its reports are cleared.
          <button type="button" onClick={() => setHidden(false)} disabled={busy} className={GHOST_BUTTON_SM}>
            <Eye className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> {comment.hidden ? 'Keep: show it again' : 'Keep: clear the reports'}
          </button>
        ) : null}
        {!comment.hidden && (
          <button type="button" onClick={() => setHidden(true)} disabled={busy} className={GHOST_BUTTON_SM}>
            <EyeOff className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> Hide
          </button>
        )}
        <ConfirmDelete
          what={comment.replies ? `comment and its ${comment.replies} ${comment.replies === 1 ? 'reply' : 'replies'}` : 'comment'}
          onDelete={async (note) => {
            await deleteAdminComment(comment.id, note);
            onChanged();
          }}
        />
      </div>
    </li>
  );
}

function Reports() {
  const { data, error, reload } = useLoad((signal) => getAdminReports(signal), []);
  if (error) return <LoadError onRetry={reload} />;
  if (!data) return <div className="h-100" />;
  if (!data.comments.length) return <Empty>No reported comments. All quiet.</Empty>;
  return (
    <ul className="space-y-3">
      {data.comments.map((comment) => <CommentRow key={comment.id} comment={comment} onChanged={reload} />)}
    </ul>
  );
}

function Comments() {
  const [q, setQ] = useState('');
  const settled = useSettled(q);
  const { data, error, reload } = useLoad((signal) => getAdminComments(settled, signal), [settled]);
  return (
    <>
      <SearchBox value={q} onChange={setQ} placeholder="Search words or a gamer tag" />
      {error ? <LoadError onRetry={reload} /> : !data ? <div className="h-100" /> : !data.comments.length ? (
        <Empty>No comments{settled ? ` matching "${settled}"` : ' yet'}.</Empty>
      ) : (
        <ul className="space-y-3">
          {data.comments.map((comment) => <CommentRow key={comment.id} comment={comment} onChanged={reload} />)}
        </ul>
      )}
    </>
  );
}

function Reviews() {
  const [q, setQ] = useState('');
  const settled = useSettled(q);
  const { data, error, reload } = useLoad((signal) => getAdminReviews(settled, signal), [settled]);
  return (
    <>
      <SearchBox value={q} onChange={setQ} placeholder="Search a game or a gamer tag" />
      {error ? <LoadError onRetry={reload} /> : !data ? <div className="h-100" /> : !data.reviews.length ? (
        <Empty>No reviews{settled ? ` matching "${settled}"` : ' yet'}.</Empty>
      ) : (
        <ul className="space-y-3">
          {data.reviews.map((review) => (
            <li key={review.id} className="border border-slate-700 bg-slate-900 p-4 flex gap-4">
              <span className="font-display text-[34px] leading-none w-10 shrink-0 text-center" style={{ color: getRarity(review.rating).color }}>
                {review.rating}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-slate-400 mb-1">
                  <Link to={`/game/${review.game.id}?review=${review.id}#review-${review.id}`} className="font-semibold text-white underline decoration-slate-500/80 underline-offset-4 hover:decoration-current">
                    {review.game.title}
                  </Link>
                  <span>by {review.author.tag ?? 'a player'}</span>
                  <span>· {timeAgo(review.createdAt)}</span>
                  <span>· {review.helpfulCount} helpful, {review.unhelpfulCount} not</span>
                </div>
                <p className={`text-base wrap-break-word ${review.reviewText ? '' : 'text-slate-400'}`}>
                  {review.reviewText ? (review.reviewText.length > 400 ? `${review.reviewText.slice(0, 400)}…` : review.reviewText) : 'Score only, no words.'}
                </p>
                <div className="mt-3">
                  <ConfirmDelete
                    what="review"
                    onDelete={async (note) => {
                      await deleteAdminReview(review.id, note);
                      reload();
                    }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function Admin() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([key]) => key === params.get('tab')) ? params.get('tab') : 'stats';

  return (
    <main className={`${WRAP} pt-8 sm:pt-12 pb-24`}>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <h1 className={SECTION_TITLE}>Admin</h1>
        <p className="flex items-center gap-2 text-sm text-slate-400 border border-slate-700 rounded-sm px-3 h-9">
          <Lock className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" /> Only you can see this page
        </p>
      </div>
      <div role="tablist" aria-label="Admin sections" className={`${SEGMENTS} mb-8`}>
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setParams(key === 'stats' ? {} : { tab: key }, { replace: true })}
            className={segment(tab === key)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'stats' && <Stats />}
      {tab === 'visitors' && <Visitors />}
      {tab === 'reports' && <Reports />}
      {tab === 'reviews' && <Reviews />}
      {tab === 'comments' && <Comments />}
    </main>
  );
}
