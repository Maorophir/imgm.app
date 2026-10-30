/**
 * SteamLanding — Route: /steam (the header's "Steam"). What connecting Steam gives you,
 * how it works and what IMGM gets from it, with the way in.
 *
 *   The hero       "Bring your Steam games." over a slowly drifting, tilted wall of real
 *                  game covers (IMGM's featured games, or once you're connected, your own
 *                  most played ones), dimmed, with the page's one lime
 *                  button (ConnectAction: log in, connect, or open your library) and a
 *                  card showing what a Steam game becomes: "Yours to rate", with the
 *                  hours from Steam printed on it (your own most played game, once
 *                  you're connected)
 *   What you get   every game you own in one place, your hours filled in, a card for
 *                  every rating, and the games you never started straight to the Backlog
 *   How it works   three steps: connect on Steam's own page, let Steam share your games
 *                  (the two privacy settings, with a link to Steam's settings page), rate
 *   What IMGM gets and never gets from Steam, how to disconnect, and that IMGM isn't
 *                  affiliated with Valve
 *
 * Steam's answer can land here as ?steam_error=<code> (the library page sends players
 * here when they aren't connected, carrying it along): it's read once, shown in the
 * site's words (only known codes have any), and cleared from the address.
 *
 * Noir: the cover wall is the only art; sections are typographic, on hairlines, with
 * Big Shoulders headings, and the lime is only on the hero's button.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSession } from '../lib/authClient';
import { getFeaturedGames, getSteamLibrary, getSteamStatus } from '../lib/api';
import { steamErrorMessage } from '../lib/steam';
import { WRAP, SECTION_TITLE, TEXT_LINK, TEXT_BUTTON_SM } from '../lib/ui';
import CoverWall from '../components/steam/landing/CoverWall';
import ConnectAction from '../components/steam/landing/ConnectAction';
import HeroCard from '../components/steam/landing/HeroCard';

// Steam's own privacy settings page (it asks the player to log in to Steam first if needed)
const STEAM_PRIVACY_SETTINGS = 'https://steamcommunity.com/my/edit/settings';

// The cover wall: at most this many of a player's own covers (a library can hold
// hundreds), and no fewer, or it repeats too much and IMGM's featured games show instead
const OWN_WALL_MAX = 48;
const OWN_WALL_MIN = 12;
const NO_COVERS = [];
// The hero card's carousel: at most this many games take turns on it
const CARDS_MAX = 5;

// A section's heading column beside its content (desktop), stacked on smaller screens
const SECTION = `${WRAP} grid gap-y-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-x-12 xl:gap-x-16`;

const GETS = [
  { title: 'Every game you own', text: 'Your Steam games on one page, most played first, so the ones you know best are right at the top.' },
  { title: 'Your hours, filled in', text: 'Rate a game from your library, and the hours you played on Steam are already in your review.' },
  { title: 'A card for every rating', text: 'Rate one in about two minutes, and it becomes a card. Your score sets how rare it is.' },
  { title: 'Never played it? Backlog it', text: 'Bought it in a sale and never started? Put it on your Backlog in one tap.' },
];

// The two Steam settings that let IMGM see your games (Steam's own names for them)
const STEAM_SETTINGS = ['My profile', 'Game details'];

const IMGM_GETS = [
  'Your Steam ID, the public number Steam gives every account',
  'Your Steam name',
  "The games you own, and how long you've played each one",
];
const IMGM_NEVER_GETS = ['Your Steam password', 'Your email address', 'Your payment details', 'Your friends list'];

// Steam's answer, from the address (?steam=connected or ?steam_error=<code>): words
// only for codes the site knows, so a link can't make the page say something else
const noticeFrom = (params) => {
  if (params.get('steam') === 'connected') return { title: 'Steam connected.', text: 'You can log in with Steam from now on.' };
  const text = steamErrorMessage(params.get('steam_error'));
  return text ? { text } : null;
};

function SteamLanding() {
  const { data: session, isPending } = useSession();
  const userId = session?.user?.id ?? null;

  // Read once, then cleared from the address (replace: Back doesn't bring it back, and
  // a reload or a shared link doesn't show it again)
  const [searchParams, setSearchParams] = useSearchParams();
  const [notice, setNotice] = useState(() => noticeFrom(searchParams));
  useEffect(() => {
    if (!searchParams.has('steam') && !searchParams.has('steam_error')) return;
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.delete('steam');
      next.delete('steam_error');
      return next;
    }, { replace: true });
  }, [searchParams, setSearchParams]);

  // Featured games: the covers for the wall, and the example card's game (null while
  // loading, [] if they couldn't load: then a plain dark hero and a face-down card)
  const [featured, setFeatured] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    getFeaturedGames(controller.signal)
      .then(setFeatured)
      .catch(() => !controller.signal.aborted && setFeatured([]));
    return () => controller.abort();
  }, []);
  const covers = useMemo(() => (featured ?? []).map((game) => game.coverUrl).filter(Boolean), [featured]);
  // The example cards: featured games that are on Steam (any featured game, if none are)
  const samples = useMemo(() => {
    const withCover = (featured ?? []).filter((game) => game.coverUrl);
    const onSteam = withCover.filter((game) => game.stores?.some((store) => store.key === 'steam'));
    return (onSteam.length > 0 ? onSteam : withCover).slice(0, CARDS_MAX);
  }, [featured]);

  // The player's Steam connection. Kept with whose it is, so a different player logging
  // in on this tab never sees the last one's.
  const [steam, setSteam] = useState({ userId: null, status: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!userId) return undefined;
    const controller = new AbortController();
    getSteamStatus(controller.signal)
      .then((status) => setSteam({ userId, status }))
      // Couldn't tell: offer Connect (the server says so if it's already connected)
      .catch(() => !controller.signal.aborted && setSteam({ userId, status: { connected: false, failed: true } }));
    return () => controller.abort();
  }, [userId, attempt]);
  const status = userId && steam.userId === userId ? steam.status : null;
  const connected = Boolean(status?.connected);
  const refresh = useCallback(() => setAttempt((n) => n + 1), []);

  // Connected: their library, for the card (their most played game they haven't rated)
  const [library, setLibrary] = useState({ userId: null, games: null });
  useEffect(() => {
    if (!userId || !connected) return undefined;
    const controller = new AbortController();
    getSteamLibrary(controller.signal)
      .then((data) => setLibrary({ userId, games: data?.games ?? [] }))
      .catch(() => !controller.signal.aborted && setLibrary({ userId, games: [] }));
    return () => controller.abort();
  }, [userId, connected]);
  const games = library.userId === userId ? library.games : null;
  const mine = useMemo(
    () => (games ?? []).filter((game) => game.myRating == null && game.minutes > 0 && game.coverUrl).slice(0, CARDS_MAX),
    [games]
  );

  const ownCovers = useMemo(() => (games ?? []).map((game) => game.coverUrl).filter(Boolean).slice(0, OWN_WALL_MAX), [games]);

  const state = isPending ? 'loading' : !session ? 'guest' : !status ? 'loading' : connected ? 'connected' : 'ready';
  // The wall and the card wait until they know whose games to show (a connected
  // player's own, once loaded), so nothing is swapped for something else in view
  const deciding = state === 'loading' || (connected && games === null);
  const wallCovers = deciding ? NO_COVERS : connected && ownCovers.length >= OWN_WALL_MIN ? ownCovers : covers;
  const cardWaiting = featured === null || deciding;

  return (
    // overflow-x-clip: the tilted wall and the card never cause a sideways scroll
    <main className="overflow-x-clip pb-12 md:pb-16">
      {/* ── The hero: the cover wall behind, the words and the way in, and the card ── */}
      <section aria-labelledby="steam-title" className="relative">
        <CoverWall covers={wallCovers} />

        {notice && (
          <div className={`${WRAP} relative pt-6`}>
            <div role="status" className="flex items-center justify-between gap-4 rounded-sm border border-slate-700 bg-slate-900 px-5 py-2">
              <p className="text-slate-200">
                {notice.title && <span className="font-semibold text-white">{notice.title}</span>} {notice.text}
              </p>
              <button type="button" onClick={() => setNotice(null)} className={`shrink-0 ${TEXT_BUTTON_SM}`}>
                Close
              </button>
            </div>
          </div>
        )}

        {/* Desktop: the words on the left, the card in its own column, the whole hero
            filling the first screen (up to 760px). Phones and tablets: the card under
            the words, centred. */}
        <div className={`${WRAP} relative grid gap-y-14 pt-12 pb-20 sm:pt-16 sm:pb-24 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center lg:gap-x-16 lg:py-14 lg:min-h-[min(760px,calc(100svh-73px))] xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-x-24`}>
          <div className="min-w-0">
            {/* Big condensed capitals, two lines at most at every width (it's about 12
                letters a line: 14vw leaves room even on a 320px phone) */}
            <h1
              id="steam-title"
              className="font-display uppercase tracking-[.005em] text-white text-balance break-words text-[length:clamp(44px,14vw,104px)] leading-[.84] lg:text-[length:clamp(80px,7.6vw,128px)] lg:leading-[.82]"
            >
              Bring your Steam games.
            </h1>
            <p className="mt-6 max-w-[560px] text-lg leading-[1.5] text-slate-200 sm:text-xl">
              Connect Steam, and every game you own lines up on IMGM with your hours. Rate one in about two minutes,
              and it becomes a card.
            </p>
            <ConnectAction state={state} status={status} onRefresh={refresh} className="mt-8 lg:mt-10" />
          </div>

          <div className="justify-self-center w-[min(280px,78%)] sm:w-[320px] lg:justify-self-stretch lg:w-auto">
            <HeroCard mine={mine} samples={samples} waiting={cardWaiting} connected={connected} />
          </div>
        </div>
      </section>

      {/* ── What you get ── */}
      <section aria-labelledby="steam-gets-title" className={`${SECTION} mt-16 sm:mt-24`}>
        <h2 id="steam-gets-title" className={SECTION_TITLE}>
          Your library, ready to rate.
        </h2>
        <dl className="border-b border-slate-700">
          {GETS.map(({ title, text }) => (
            <div key={title} className="grid gap-y-2 border-t border-slate-700 py-6 sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] sm:gap-x-8 sm:py-7">
              <dt className="font-display text-[28px] sm:text-[34px] leading-[.95] tracking-[.005em] text-white">{title}</dt>
              <dd className="text-base leading-[1.6] text-slate-300 sm:pt-1">{text}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── How it works: three steps ── */}
      <section aria-labelledby="steam-how-title" className={`${SECTION} mt-24 sm:mt-32`}>
        <div>
          <h2 id="steam-how-title" className={SECTION_TITLE}>
            How it works.
          </h2>
          <p className="mt-6 max-w-[360px] text-base leading-[1.6] text-white">You only do this once.</p>
        </div>
        {/* role="list": Safari drops a list's meaning when its markers are hidden */}
        <ol role="list" className="border-b border-slate-700">
          <Step number={1} title="Connect on Steam's own page">
            <p>
              Press Connect Steam and log in on Steam's site. Steam tells IMGM which account is yours. IMGM never sees
              your password.
            </p>
          </Step>
          <Step number={2} title="Let Steam share your games">
            <p>Steam only shares the games on a public profile. In your Steam privacy settings, set both of these to Public:</p>
            <dl className="mt-4 max-w-[420px] rounded-sm border border-slate-700 bg-slate-900 divide-y divide-slate-700">
              {STEAM_SETTINGS.map((name) => (
                <div key={name} className="flex items-center justify-between gap-4 min-h-11 px-4">
                  <dt className="text-white">{name}</dt>
                  <dd className="font-semibold text-white">Public</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4">
              Want your hours too? Leave “Always keep my total playtime private” unticked. Changes can take a few
              minutes to reach IMGM.
            </p>
            {/* A plain link to Steam (never nofollow: Steam's API terms ask for that) */}
            <a
              href={STEAM_PRIVACY_SETTINGS}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-2 inline-flex items-center min-h-11 font-medium text-white ${TEXT_LINK}`}
            >
              Open your Steam privacy settings<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </Step>
          <Step number={3} title="Rate from your library">
            <p>Open your library, pick a game you've played and rate it. Your hours are already filled in, and it becomes a card.</p>
          </Step>
        </ol>
      </section>

      {/* ── What IMGM gets from Steam, and what it never gets ── */}
      <section aria-labelledby="steam-data-title" className={`${SECTION} mt-24 sm:mt-32`}>
        <h2 id="steam-data-title" className={SECTION_TITLE}>
          What IMGM gets from Steam.
        </h2>
        <div>
          <div className="grid gap-y-10 sm:grid-cols-2 sm:gap-x-10">
            <DataList title="IMGM gets" items={IMGM_GETS} />
            <DataList title="IMGM never gets" items={IMGM_NEVER_GETS} />
          </div>
          <p className="mt-10 max-w-[600px] text-base leading-[1.6] text-white">
            IMGM only asks Steam for your games when you connect, open your library or refresh it. Disconnect any time in{' '}
            <Link to="/settings" className={`font-medium text-white ${TEXT_LINK}`}>Settings</Link>, and your Steam data is
            deleted from IMGM. Your reviews and Backlog stay. More in our{' '}
            <Link to="/privacy" className={`font-medium text-white ${TEXT_LINK}`}>Privacy Policy</Link>.
          </p>
        </div>
      </section>

      <p className={`${WRAP} mt-20 sm:mt-24 text-sm text-slate-400`}>
        IMGM isn't affiliated with Valve or Steam. Steam and the Steam logo are trademarks of Valve Corporation.
      </p>
    </main>
  );
}

// One step of "How it works": its number in big condensed figures (decoration: the list
// is numbered for screen readers already), the title, and what to do
const Step = ({ number, title, children }) => (
  <li className="grid grid-cols-[44px_minmax(0,1fr)] gap-x-4 border-t border-slate-700 py-7 sm:grid-cols-[88px_minmax(0,1fr)] sm:gap-x-6 sm:py-8">
    <span aria-hidden="true" className="font-display text-[44px] sm:text-[72px] leading-[.8] tabular-nums text-slate-400">
      {number}
    </span>
    <div className="min-w-0">
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <div className="mt-2 text-base leading-[1.6] text-slate-300">{children}</div>
    </div>
  </li>
);

// One side of "What IMGM gets": a small heading and its items, on hairlines
const DataList = ({ title, items }) => (
  <div>
    <h3 className="text-xl font-semibold text-white">{title}</h3>
    <ul className="mt-4">
      {items.map((item) => (
        <li key={item} className="border-t border-slate-700 py-3 text-base leading-[1.5] text-white">
          {item}
        </li>
      ))}
    </ul>
  </div>
);

export default SteamLanding;
