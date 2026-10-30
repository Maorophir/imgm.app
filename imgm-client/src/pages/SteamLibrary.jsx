/**
 * SteamLibrary — Route: /steam/library (players only; the header's Steam page, /steam,
 * explains connecting Steam)
 *
 * The games on your Steam account with your hours, in four lists (the one you pick is
 * kept in the address, ?tab=, so a reload and Back come back to it):
 *   To rate      played on Steam, not rated yet, most played first: the hours where the
 *                Hall of Fame has its rank, and Rate it, the review quest with your hours
 *                and PC filled in (about two minutes, and it becomes a card)
 *   Rated        your cards, with Edit
 *   Not played   never started on Steam: Add to Backlog
 *   Not on IMGM  Steam apps IMGM can't rate (DLC, bundles, tools...): a link to Steam,
 *                and a search on IMGM
 * Empty lists stay hidden (but To rate and Rated), and a search box narrows the list on
 * screen by title.
 *
 * Steam is only asked for the games when the player asks: right after connecting
 * (?steam=connected), the first time this page opens, and Refresh / Try again (the
 * server allows one every 5 minutes). Steam's own answers are explained: a private
 * library (what to change in Steam; games kept from an earlier import still show), an
 * empty one, hidden hours, and this server not reading libraries yet (no Steam Web API
 * key). Not connected at all: the Steam page, carrying Steam's ?steam_error along.
 *
 * Noir: the Backlog's narrow page, rows on hairlines, text links and ghost buttons.
 * Lime only in a state with one way on (Steam's privacy settings, or search).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ExternalLink, RefreshCw, Search as SearchIcon } from 'lucide-react';
import { getSteamLibrary, importSteamLibrary } from '../lib/api';
import { useSession } from '../lib/authClient';
import { steamErrorMessage } from '../lib/steam';
import { GHOST_BUTTON, GHOST_BUTTON_SM, TEXT_BUTTON_SM, TEXT_LINK } from '../lib/ui';
import LoadError from '../components/LoadError';
import LibraryTabs from '../components/steam/library/LibraryTabs';
import LibraryList from '../components/steam/library/LibraryList';
import {
  EmptyLibrary, HoursHiddenNote, Importing, LibraryOffPanel, NotImported, PrivatePanel, RowsSkeleton, StatusText,
} from '../components/steam/library/LibraryPanels';
import {
  LIBRARY_PANEL, TABS, countOf, filterByName, importProblem, sortLibrary, steamProfileLink, tabId, timeSince,
} from '../components/steam/library/libraryData';

const LOGIN = '/login?redirect=%2Fsteam%2Flibrary';
// A list with nothing in it stays hidden, except these two (what the page is for)
const ALWAYS_SHOWN = ['to-rate', 'rated'];
// With fewer games than this the whole list fits on a screen: no search box
const SEARCH_FROM = 11;

// What each list is, in a line over it
const INTROS = {
  'to-rate': 'Most played first. Rating one takes about two minutes, and it becomes a card.',
  rated: 'Your cards for the games on this account.',
  'not-played': 'Never started on Steam. Save any of them to your Backlog for later.',
  'not-on-imgm': "DLC, bundles, tools and anything IMGM couldn't match. Some may be on IMGM under another name.",
};

// The line at the top after Steam sent the player back here
const arrivalNotice = ({ connected, error }) => {
  if (connected) return { title: 'Steam connected.', text: 'You can also log in to IMGM with Steam now.' };
  if (error) return { title: null, text: steamErrorMessage(error) };
  return null;
};

const SteamLibrary = () => {
  const { data: session, isPending } = useSession();
  const userId = session?.user?.id;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Steam's answer on the way here (?steam=connected, ?steam_error=<code>), read once.
  // Then it leaves the address, so a reload or a shared link doesn't say it again.
  const [arrival] = useState(() => {
    const code = searchParams.get('steam_error');
    return { connected: searchParams.get('steam') === 'connected', error: steamErrorMessage(code) ? code : null };
  });
  const [notice, setNotice] = useState(() => arrivalNotice(arrival));
  useEffect(() => {
    // Not for a guest: they're on their way to logging in, and a change here would undo that
    if (!userId || (!searchParams.has('steam') && !searchParams.has('steam_error'))) return;
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params);
        next.delete('steam');
        next.delete('steam_error');
        return next;
      },
      { replace: true }
    );
  }, [userId, searchParams, setSearchParams]);

  const [library, setLibrary] = useState(null); // the server's answer: { state, games, others, ... }
  const [failed, setFailed] = useState(null); // 'load' | 'login'
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false); // asking Steam right now
  const [status, setStatus] = useState(null); // what that said: { text, error, quiet }
  const [query, setQuery] = useState('');
  const searchBox = useRef(null);
  const autoImported = useRef(false);

  // Ask Steam for the library again: Refresh, Try again, and once by itself after
  // connecting. The answer is the whole library, as the page shows it.
  const importNow = useCallback(
    async ({ auto = false } = {}) => {
      setBusy(true);
      setStatus(null);
      try {
        const fresh = await importSteamLibrary();
        setLibrary(fresh);
        // Said to screen readers only: the page itself shows what came back
        const said = { private: "Steam isn't sharing your games yet.", empty: 'No games on this Steam account yet.' };
        setStatus({ quiet: true, text: said[fresh.state] ?? 'Your library is up to date.' });
      } catch (error) {
        const code = error?.data?.code;
        if (code === 'NOT_CONNECTED') navigate('/steam', { replace: true }); // disconnected meanwhile (another tab)
        else if (code === 'LIBRARY_OFF') setLibrary((current) => current && { ...current, libraryEnabled: false });
        else if (error?.status === 401) setFailed('login');
        // Too soon after an import that just happened by itself: what's here is fresh
        else if (!(auto && code === 'TOO_SOON')) setStatus(importProblem(error));
      } finally {
        setBusy(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    if (!userId) return undefined;
    const controller = new AbortController();
    getSteamLibrary(controller.signal)
      .then((loaded) => {
        setFailed(null);
        setLibrary(loaded);
        // Never brought in yet, or Steam was just connected: ask Steam now, once (the
        // player asked for it by connecting Steam or opening this page)
        if (!autoImported.current && loaded.libraryEnabled && (loaded.importedAt == null || arrival.connected)) {
          autoImported.current = true;
          importNow({ auto: true });
        }
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        if (error.status === 404 && error.data?.code === 'NOT_CONNECTED') {
          // The Steam page explains connecting (and shows why Steam said no, if it did)
          navigate(arrival.error ? `/steam?steam_error=${encodeURIComponent(arrival.error)}` : '/steam', { replace: true });
        } else {
          setFailed(error.status === 401 ? 'login' : 'load');
        }
      });
    return () => controller.abort();
  }, [userId, attempt, arrival, importNow, navigate]);

  if (isPending) return <div className="min-h-[70vh] animate-pulse" />;
  if (!session) return <Navigate to={LOGIN} replace />;

  const games = library?.games ?? [];
  const others = library?.others ?? [];
  const hoursHidden = Boolean(library?.hoursHidden);
  const entries = games.length + others.length;
  const searching = query.trim() !== '';

  // The lists, the ones shown, and the one picked (?tab=, else the first with games in it)
  const lists = sortLibrary({ games, others, hoursHidden });
  const found = Object.fromEntries(
    Object.entries(lists).map(([key, items]) => [key, filterByName(items, query, key === 'not-on-imgm' ? 'name' : 'title')])
  );
  // Each tab's count: what the search finds, while there's a search
  const counts = Object.fromEntries(Object.entries(searching ? found : lists).map(([key, items]) => [key, items.length]));
  const tabs = TABS.filter((tab) => ALWAYS_SHOWN.includes(tab.key) || lists[tab.key].length > 0);
  const asked = searchParams.get('tab');
  const active = tabs.some((tab) => tab.key === asked) ? asked : (tabs.find((tab) => lists[tab.key].length > 0) ?? tabs[0]).key;
  const pickTab = (key) =>
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params);
        next.set('tab', key);
        return next;
      },
      { replace: true }
    );
  const clearSearch = () => {
    setQuery('');
    searchBox.current?.focus();
  };

  // "312 games · 241 on IMGM · updated 2 minutes ago" ("checked" when Steam sent nothing)
  const when = library?.importedAt && `${library.state === 'private' ? 'checked' : 'updated'} ${timeSince(library.importedAt)}`;
  const parts = [entries > 0 && countOf(entries, 'game'), entries > 0 && `${games.length.toLocaleString('en-US')} on IMGM`, when].filter(Boolean);
  const stats = parts.join(' · ').replace(/^./, (first) => first.toUpperCase()); // "Updated 2 minutes ago" on its own
  // Refresh lives in the header once there's a library; Steam's private answer has its
  // own Try again in its panel
  const canRefresh = Boolean(library?.libraryEnabled) && (library.state === 'ok' || library.state === 'empty');
  const profile = steamProfileLink(library?.profileUrl);
  const steamName = library?.personaName || 'your Steam account';
  const retry = () => importNow();

  // The panel for Steam's answer, when there's something to explain
  let panel = null;
  if (library) {
    if (!library.libraryEnabled) panel = <LibraryOffPanel kept={entries > 0} />;
    else if (library.state == null) panel = busy ? <Importing /> : <NotImported busy={busy} status={status} onRetry={retry} />;
    else if (library.state === 'private') panel = <PrivatePanel kept={entries > 0} busy={busy} status={status} onRetry={retry} />;
    else if (entries === 0) panel = <EmptyLibrary />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 flex flex-col gap-8">
      {notice && library && (
        <div role="status" className="flex items-center justify-between gap-4 rounded-sm border border-slate-700 bg-slate-900 px-5 py-2">
          <p className="text-slate-200">
            {notice.title && <span className="font-semibold text-white">{notice.title}</span>} {notice.text}
          </p>
          <button type="button" onClick={() => setNotice(null)} className={`shrink-0 ${TEXT_BUTTON_SM}`}>
            Close
          </button>
        </div>
      )}

      <header className="flex flex-col gap-3">
        <h1 className="font-display text-[54px] md:text-[88px] leading-[.9] uppercase tracking-[.005em] text-white">Your Steam library</h1>
        <p className="text-slate-400">Every game on your Steam account, with the hours you played.</p>
        {library && (
          <div className="flex flex-col">
            <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-slate-400">
              Connected as
              {profile ? (
                <a href={profile} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 min-h-11 max-w-full font-medium text-white ${TEXT_LINK}`}>
                  <span className="min-w-0 break-all">{steamName}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 text-slate-400" strokeWidth={1.8} aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : (
                <span className="font-medium text-white break-all">{steamName}</span>
              )}
            </p>
            {(stats || canRefresh) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {stats && <p className="text-sm text-slate-400 tabular-nums">{stats}</p>}
                {canRefresh && (
                  <button type="button" onClick={retry} disabled={busy} className={GHOST_BUTTON_SM}>
                    <RefreshCw className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
                    {busy ? 'Refreshing…' : 'Refresh'}
                  </button>
                )}
              </div>
            )}
            {canRefresh && <StatusText status={status} className="mt-2" />}
          </div>
        )}
      </header>
      {/* Asking Steam takes a few seconds: what's happening, and what it said, for screen readers */}
      <p className="sr-only" aria-live="polite">
        {busy ? (library?.state == null ? 'Bringing in your games from Steam.' : 'Checking Steam for changes.') : (status?.text ?? '')}
      </p>

      {failed === 'login' ? (
        <div className="py-12 text-center border-t border-slate-700">
          <p className="text-xl font-semibold text-white">Your login expired</p>
          <p className="text-slate-400 mt-1">Log in again to see your Steam library.</p>
          <Link to={LOGIN} className={`${GHOST_BUTTON} mt-6`}>
            Log in again
          </Link>
        </div>
      ) : failed === 'load' ? (
        <LoadError
          title="Couldn't load your Steam library"
          onRetry={() => {
            setFailed(null);
            setAttempt((n) => n + 1);
          }}
        />
      ) : !library ? (
        <RowsSkeleton />
      ) : (
        <>
          {panel}
          {entries > 0 && (
            <>
              {hoursHidden && <HoursHiddenNote />}
              <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <LibraryTabs tabs={tabs} counts={counts} active={active} onChange={pickTab} />
                {entries >= SEARCH_FROM && (
                  // The header's search field: card stock, a control-grey edge that turns
                  // ivory while it has focus. 16px text, so phones don't zoom in.
                  <label className="flex w-full sm:w-64 items-center gap-2.5 h-11 px-3.5 rounded-sm bg-slate-900 border border-slate-500 focus-within:border-white transition-colors duration-120">
                    <span className="sr-only">Find a game in your library</span>
                    <SearchIcon className="w-4 h-4 shrink-0 text-slate-400" strokeWidth={1.8} aria-hidden="true" />
                    <input
                      ref={searchBox}
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      maxLength={100}
                      autoComplete="off"
                      placeholder="Find a game"
                      className="flex-1 min-w-0 h-10 bg-transparent text-base text-white placeholder:text-slate-400 appearance-none focus:outline-hidden [&::-webkit-search-cancel-button]:appearance-none"
                    />
                  </label>
                )}
              </div>
              <div id={LIBRARY_PANEL} role="tabpanel" aria-labelledby={tabId(active)} className="flex flex-col gap-4">
                <p className="text-sm text-slate-400">
                  {active === 'to-rate' && hoursHidden ? 'Rating one takes about two minutes, and it becomes a card.' : INTROS[active]}
                </p>
                <LibraryList
                  key={active}
                  tab={active}
                  items={found[active]}
                  hoursHidden={hoursHidden}
                  query={query}
                  ratedCount={lists.rated.length}
                  onClearQuery={clearSearch}
                />
              </div>
            </>
          )}
        </>
      )}

      {library && (
        <div className="border-t border-slate-700 pt-6 flex flex-col text-sm text-slate-400">
          <p>
            Your library comes from Steam and is shown as is. IMGM isn't affiliated with Valve or Steam. Steam and the
            Steam logo are trademarks of Valve Corporation.
          </p>
          <Link to="/settings#steam" className={`self-start inline-flex items-center min-h-11 font-medium text-white ${TEXT_LINK}`}>
            Disconnect Steam in Settings
          </Link>
        </div>
      )}
    </div>
  );
};

export default SteamLibrary;
