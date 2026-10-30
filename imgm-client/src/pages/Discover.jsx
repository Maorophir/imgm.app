/**
 * Discover — Route: /discover (a DEMO: built from the featured games the home page
 * already loads, no server changes yet)
 *
 * A full-height feed of games, one per screen, snapping like Reels or TikTok: swipe or
 * scroll for the next one. The game on screen plays its trailer (muted, from IGDB's
 * YouTube list) over its own key art, blurred; the others wait as still pictures, so
 * only one video ever loads at a time. Under it: the title, when it's out ("Out in 12
 * days" for one coming soon), platforms, genres, the IMGM verdict and a line about it.
 *
 * Beside it, the actions:
 *   Want it       the real Backlog (logged out: log in, then back here)
 *   Played it?    a score picker: a score opens the game's review quest
 *   Not for me    on to the next game (later: teaches Play Next what you skip)
 *   Share         the game's page (the phone's share sheet, or the link copied)
 *   Sound         trailers start muted; this turns sound on for the feed
 *
 * Feeds: New (out in the last year), Coming soon, Trending (IGDB's popular order).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookmarkCheck, BookmarkPlus, ChevronDown, Share2, Star, Volume2, VolumeX, X } from 'lucide-react';
import { getFeaturedGames } from '../lib/api';
import { useBacklog } from '../context/BacklogContext';
import { pickVideos } from '../components/game/pickVideos';
import { getRarity } from '../components/reviewQuest/questOptions';
import RarityMark from '../components/RarityMark';
import { SEGMENTS, segment, TEXT_LINK } from '../lib/ui';

const DAY = 24 * 60 * 60 * 1000;
const NEW_FOR = 365 * DAY; // the demo has only the popular games to choose from
const FEEDS = [
  { key: 'new', label: 'New' },
  { key: 'soon', label: 'Coming soon' },
  { key: 'trending', label: 'Trending' },
];

const releaseLine = (date, now) => {
  if (!date) return null;
  const when = new Date(date);
  const days = Math.ceil((when.getTime() - now) / DAY);
  if (days > 0) return days === 1 ? 'Out tomorrow' : days <= 60 ? `Out in ${days} days` : `Out ${when.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })}`;
  return when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

// A round action on the rail: icon over a short word, 44px+ to tap
const RAIL = 'flex flex-col items-center gap-1 min-w-14 text-xs font-medium text-white';
const RAIL_ICON = 'grid place-items-center w-12 h-12 rounded-full border border-slate-500 bg-slate-950/70 hover:border-white transition-colors duration-120';

const Slide = ({ game, now, active, muted, onToggleSound, onNext }) => {
  const backlog = useBacklog();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [rating, setRating] = useState(false); // the score picker is open
  const [shared, setShared] = useState(false);
  const video = useMemo(() => pickVideos(game.videos ?? [], 1)[0] ?? null, [game.videos]);
  const art = game.artworks?.[0] ?? game.screenshots?.[0] ?? game.coverUrl;
  const score = game.ratings?.imgm;
  const rarity = typeof score === 'number' && game.reviewCount > 0 ? getRarity(score) : null;
  const saved = backlog?.has(game.id);
  const upcoming = game.releaseDate && new Date(game.releaseDate).getTime() > now;

  const want = () => {
    if (!backlog?.loggedIn) return navigate(`/login?redirect=${encodeURIComponent(pathname)}`);
    backlog.toggle(game.id);
  };
  const share = async () => {
    const url = `${window.location.origin}/game/${game.id}`;
    try {
      if (navigator.share) await navigator.share({ title: game.title, url });
      else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 1800);
      }
    } catch { /* closed the share sheet */ }
  };

  return (
    <section className="relative h-full snap-start snap-always overflow-hidden flex flex-col" aria-label={game.title}>
      {/* The game's own key art, blurred and dark, behind everything */}
      {art && <img src={art} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-45" />}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/20 to-slate-950/90" />

      {/* As wide as the trailer, which is sized by the screen's height, so the words
          under it always fit (and "Swipe for more" has room at the bottom) */}
      <div className="relative flex-1 min-h-0 flex flex-col justify-center gap-4 px-4 pb-12 pt-16 sm:px-8 lg:pt-20 w-full sm:w-[min(100%,calc(50dvh*16/9+64px))] mx-auto">
        {/* The trailer (only the game on screen loads it). A clear layer over it keeps
            swipes and scrolls for the feed; tapping it turns the sound on or off. */}
        <div className="relative w-full aspect-video rounded-sm overflow-hidden bg-slate-950 border border-slate-700 shadow-2xl">
          {active && video ? (
            <iframe
              key={`${video.youtubeId}-${muted}`}
              title={`${game.title}: ${video.name}`}
              src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&mute=${muted ? 1 : 0}&controls=0&loop=1&playlist=${video.youtubeId}&playsinline=1&rel=0&modestbranding=1`}
              allow="autoplay; encrypted-media; picture-in-picture"
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
          ) : (
            art && <img src={art} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <button type="button" onClick={onToggleSound} aria-label={muted ? 'Turn the sound on' : 'Mute'} className="absolute inset-0 cursor-pointer" />
        </div>

        {/* What it is */}
        <div className="flex items-end gap-4">
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-x-3 text-sm text-slate-300">
              {upcoming && <span className="px-2 py-0.5 rounded-sm border border-brand text-brand text-xs font-semibold uppercase tracking-[.12em]">Coming soon</span>}
              <span>{releaseLine(game.releaseDate, now)}</span>
              {game.genres?.[0] && <span className="text-slate-400">{game.genres.slice(0, 2).join(' · ')}</span>}
            </p>
            <h2 className="mt-2 font-display uppercase text-[40px] sm:text-[56px] leading-[.9] tracking-[.005em] text-white">
              <Link to={`/game/${game.id}`} className="hover:underline decoration-2 underline-offset-4">{game.title}</Link>
            </h2>
            <p className="mt-2 flex flex-wrap items-center gap-x-2.5 text-sm text-slate-400" style={rarity ? { '--ink': rarity.color } : undefined}>
              {rarity ? (
                <>
                  <RarityMark tier={rarity.key} className="text-(--ink)" />
                  <span><span className="tabular-nums text-(--ink)">{score.toFixed(1)}</span> <span className="text-(--ink)">{rarity.label}</span> on IMGM · {game.reviewCount} review{game.reviewCount === 1 ? '' : 's'}</span>
                </>
              ) : (
                <span>{upcoming ? 'Not out yet: save it for launch day.' : 'No IMGM rating yet. Played it? Be the first.'}</span>
              )}
              {game.platforms?.length > 0 && <span className="hidden sm:inline">· {game.platforms.slice(0, 4).join(', ')}</span>}
            </p>
            {game.description && <p className="mt-2 max-w-[640px] text-sm text-slate-300 line-clamp-2">{game.description}</p>}
          </div>

          {/* The actions */}
          <div className="shrink-0 flex flex-col items-center gap-3">
            <button type="button" onClick={want} aria-pressed={Boolean(saved)} className={RAIL}>
              <span className={`${RAIL_ICON} ${saved ? 'border-white' : ''}`}>
                {saved ? <BookmarkCheck className="w-5 h-5" strokeWidth={1.8} /> : <BookmarkPlus className="w-5 h-5" strokeWidth={1.8} />}
              </span>
              {saved ? 'Saved' : 'Want it'}
            </button>
            {!upcoming && (
              <button type="button" onClick={() => setRating((open) => !open)} aria-expanded={rating} className={RAIL}>
                <span className={RAIL_ICON}><Star className="w-5 h-5" strokeWidth={1.8} /></span>
                Played it?
              </button>
            )}
            <button type="button" onClick={onNext} className={RAIL}>
              <span className={RAIL_ICON}><X className="w-5 h-5" strokeWidth={1.8} /></span>
              Not for me
            </button>
            <button type="button" onClick={share} className={RAIL}>
              <span className={RAIL_ICON}><Share2 className="w-5 h-5" strokeWidth={1.8} /></span>
              {shared ? 'Copied' : 'Share'}
            </button>
          </div>
        </div>

        {/* Played it? Pick a score: it opens the game's review quest */}
        {rating && (
          <div className="flex flex-wrap items-center gap-2 animate-fade-in" role="group" aria-label={`Your score for ${game.title}`}>
            <span className="text-sm text-slate-300 mr-1">Your score:</span>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
              const tier = getRarity(n);
              return (
                <Link
                  key={n}
                  to={`/game/${game.id}/review`}
                  className="grid place-items-center w-10 h-10 rounded-sm border border-slate-600 text-sm font-semibold tabular-nums text-white hover:border-(--ink) hover:text-(--ink) transition-colors duration-120"
                  style={{ '--ink': tier.color }}
                  aria-label={`${n} out of 10, ${tier.label}`}
                >
                  {n}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Sound, for the whole feed */}
      <button type="button" onClick={onToggleSound} aria-label={muted ? 'Turn the sound on' : 'Mute'} className="absolute top-3 right-4 sm:right-8 grid place-items-center w-11 h-11 rounded-full bg-slate-950/70 border border-slate-600 text-white hover:border-white">
        {muted ? <VolumeX className="w-5 h-5" strokeWidth={1.8} /> : <Volume2 className="w-5 h-5" strokeWidth={1.8} />}
      </button>
    </section>
  );
};

function Discover() {
  const [games, setGames] = useState(null);
  const [feed, setFeed] = useState('new');
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [height, setHeight] = useState(null);
  const [now] = useState(() => Date.now()); // read once: what's new or coming soon, as of opening the page
  const scroller = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    getFeaturedGames(controller.signal).then(setGames).catch(() => !controller.signal.aborted && setGames([]));
    return () => controller.abort();
  }, []);

  // The feed fills the screen under the site's header
  useEffect(() => {
    const fit = () => scroller.current && setHeight(window.innerHeight - scroller.current.getBoundingClientRect().top - window.scrollY);
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [games]);

  const list = useMemo(() => {
    const withVideo = (games ?? []).filter((g) => g.videos?.length);
    const time = (g) => (g.releaseDate ? new Date(g.releaseDate).getTime() : 0);
    if (feed === 'soon') return withVideo.filter((g) => time(g) > now).sort((a, b) => time(a) - time(b));
    if (feed === 'new') return withVideo.filter((g) => time(g) <= now && now - time(g) < NEW_FOR).sort((a, b) => time(b) - time(a));
    return withVideo;
  }, [games, feed, now]);

  // Which game is on screen: the one most of the feed shows
  useEffect(() => {
    const box = scroller.current;
    if (!box) return undefined;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && setActive(Number(entry.target.dataset.index))),
      { root: box, threshold: 0.6 }
    );
    box.querySelectorAll('[data-index]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [list]);

  const goTo = (index) => scroller.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ behavior: 'smooth' });
  const pickFeed = (key) => {
    setFeed(key);
    setActive(0);
    scroller.current?.scrollTo({ top: 0 });
  };

  return (
    <main className="relative bg-slate-950">
      {/* The feeds, floating over the top of the feed */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 max-w-[calc(100%-96px)]">
        <div className={`${SEGMENTS} bg-slate-950/80`} role="tablist" aria-label="Discover feeds">
          {FEEDS.map((f) => (
            <button key={f.key} type="button" role="tab" aria-selected={feed === f.key} onClick={() => pickFeed(f.key)} className={segment(feed === f.key)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={scroller} className="overflow-y-auto snap-y snap-mandatory overscroll-contain" style={{ height: height ?? '100vh' }}>
        {games === null && <div className="h-full grid place-items-center text-slate-400">Loading games…</div>}
        {games && list.length === 0 && (
          <div className="h-full grid place-items-center text-center px-6 text-slate-300">
            <p>Nothing here right now. <button type="button" onClick={() => pickFeed('trending')} className={`font-medium text-white ${TEXT_LINK}`}>See what's trending</button></p>
          </div>
        )}
        {list.map((game, i) => (
          <div key={game.id} data-index={i} className="h-full">
            <Slide game={game} now={now} active={i === active} muted={muted} onToggleSound={() => setMuted((m) => !m)} onNext={() => goTo(i + 1)} />
          </div>
        ))}
      </div>

      {/* A hint on the first game that there's more below */}
      {active === 0 && list.length > 1 && (
        <button type="button" onClick={() => goTo(1)} className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1 text-sm text-slate-300 hover:text-white motion-safe:animate-bounce">
          Swipe for more <ChevronDown className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </main>
  );
}

export default Discover;
