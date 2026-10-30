/**
 * Discover — Route: /discover
 *
 * A full-height feed of games, one per screen, snapping like Reels or TikTok: swipe or
 * scroll for the next one. The game on screen plays its trailer (muted, from IGDB's
 * YouTube list) edge to edge, cropped to fill the screen like a phone video; the others
 * wait as their key art, so only one video ever loads at a time. Over it, at the bottom:
 * when it's out ("Out in 12 days", "Coming 2027" when IGDB knows only the year), the
 * title, the IMGM verdict and a line about it.
 *
 * Beside that, the actions:
 *   Want it       the real Backlog (logged out: log in, then back here)
 *   Played it?    a score picker: a score opens the game's review quest
 *   Not for me    on to the next game (later: teaches Play Next what you skip)
 *   Share         the game's page (the phone's share sheet, or the link copied)
 *   Sound         trailers start muted; this turns sound on for the feed
 *
 * Feeds (GET /api/games/discover, IGDB's popularity rankings): New (the last 90 days),
 * Coming soon (the most wanted of the next year), Trending.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookmarkCheck, BookmarkPlus, ChevronDown, Share2, Star, Volume2, VolumeX, X } from 'lucide-react';
import { getDiscoverGames } from '../lib/api';
import { useBacklog } from '../context/BacklogContext';
import { pickVideos } from '../components/game/pickVideos';
import { getRarity } from '../components/reviewQuest/questOptions';
import RarityMark from '../components/RarityMark';
import { SEGMENTS, segment, TEXT_LINK } from '../lib/ui';

const DAY = 24 * 60 * 60 * 1000;
const FEEDS = [
  { key: 'new', label: 'New' },
  { key: 'soon', label: 'Coming soon' },
  { key: 'trending', label: 'Trending' },
];

// When it's out, in words. IGDB marks a game known only by its year as out on 31 December.
const releaseLine = (date, now) => {
  if (!date) return null;
  const when = new Date(date);
  const days = Math.ceil((when.getTime() - now) / DAY);
  if (days > 0) {
    if (when.getUTCMonth() === 11 && when.getUTCDate() === 31) return `Coming ${when.getUTCFullYear()}`;
    if (days === 1) return 'Out tomorrow';
    if (days <= 60) return `Out in ${days} days`;
    return `Out ${when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}`;
  }
  return when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

// The trailer filling the screen like a phone video: 16:9, as big as it must be to cover
// the slide either way (cqw/cqh: the slide's own size), a little bigger still so
// YouTube's title bar and logo fall outside, and centred
const COVER_VIDEO = {
  width: 'calc(max(100cqw, 177.78cqh) * 1.18)',
  height: 'calc(max(56.25cqw, 100cqh) * 1.18)',
};

// A round action on the rail: icon over a short word, 44px+ to tap
const RAIL = 'flex flex-col items-center gap-1 min-w-14 text-xs font-medium text-white [text-shadow:0_1px_3px_rgb(0_0_0/.8)]';
const RAIL_ICON = 'grid place-items-center w-12 h-12 rounded-full border border-white/40 bg-slate-950/50 backdrop-blur-sm hover:border-white transition-colors duration-120';

const Slide = ({ game, now, active, muted, onToggleSound, onNext }) => {
  const backlog = useBacklog();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [rating, setRating] = useState(false); // the score picker is open
  const [shared, setShared] = useState(false);
  const [playing, setPlaying] = useState(null); // the trailer that has loaded (shown from then on)
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
    <section className="relative h-full snap-start snap-always overflow-hidden bg-slate-950 [container-type:size]" aria-label={game.title}>
      {/* The key art, until (or instead of) the trailer */}
      {art && <img src={art} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />}

      {/* The trailer, edge to edge (only the game on screen loads it). A clear layer over
          it keeps swipes and scrolls for the feed; tapping it turns the sound on or off. */}
      {active && video && (
        <iframe
          key={`${video.youtubeId}-${muted}`}
          title={`${game.title}: ${video.name}`}
          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&mute=${muted ? 1 : 0}&controls=0&loop=1&playlist=${video.youtubeId}&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&fs=0`}
          allow="autoplay; encrypted-media; picture-in-picture"
          onLoad={() => setPlaying(video.youtubeId)}
          // Hidden until the player is ready, so the key art shows instead of a black box
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none border-0 transition-opacity duration-500 ${
            playing === video.youtubeId ? 'opacity-100' : 'opacity-0'
          }`}
          style={COVER_VIDEO}
        />
      )}
      <button type="button" onClick={onToggleSound} aria-label={muted ? 'Turn the sound on' : 'Mute'} className="absolute inset-0 cursor-pointer" />

      {/* Shades so the words read over any video: the top (the feeds) and the bottom */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-slate-950/70 to-transparent pointer-events-none" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent pointer-events-none" />

      {/* What it is, and the actions, over the bottom of the video */}
      <div className="absolute inset-x-0 bottom-0 px-4 pb-10 sm:px-8 sm:pb-12 pointer-events-none">
        <div className="max-w-[1180px] mx-auto flex items-end gap-4">
          <div className="min-w-0 flex-1 pointer-events-auto">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-200">
              {upcoming && <span className="px-2 py-0.5 rounded-sm border border-white/70 text-white text-xs font-semibold uppercase tracking-[.12em]">Coming soon</span>}
              <span>{releaseLine(game.releaseDate, now)}</span>
              {game.genres?.[0] && <span className="text-slate-300">{game.genres.slice(0, 2).join(' · ')}</span>}
            </p>
            <h2 className="mt-2 font-display uppercase text-[44px] sm:text-[64px] leading-[.88] tracking-[.005em] text-white [text-wrap:balance]">
              <Link to={`/game/${game.id}`} className="hover:underline decoration-2 underline-offset-4">{game.title}</Link>
            </h2>
            <p className="mt-2 flex flex-wrap items-center gap-x-2.5 text-sm text-slate-300" style={rarity ? { '--ink': rarity.color } : undefined}>
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
            {game.description && <p className="mt-2 max-w-[620px] text-sm text-slate-300 line-clamp-2">{game.description}</p>}

            {/* Played it? Pick a score: it opens the game's review quest */}
            {rating && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 animate-fade-in" role="group" aria-label={`Your score for ${game.title}`}>
                <span className="text-sm text-slate-200 mr-1">Your score:</span>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                  const tier = getRarity(n);
                  return (
                    <Link
                      key={n}
                      to={`/game/${game.id}/review`}
                      className="grid place-items-center w-10 h-10 rounded-sm border border-white/30 bg-slate-950/60 text-sm font-semibold tabular-nums text-white hover:border-(--ink) hover:text-(--ink) transition-colors duration-120"
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

          {/* The actions */}
          <div className="shrink-0 flex flex-col items-center gap-3 pointer-events-auto">
            <button type="button" onClick={want} aria-pressed={Boolean(saved)} className={RAIL}>
              <span className={`${RAIL_ICON} ${saved ? 'border-white bg-white/15' : ''}`}>
                {saved ? <BookmarkCheck className="w-5 h-5" strokeWidth={1.8} /> : <BookmarkPlus className="w-5 h-5" strokeWidth={1.8} />}
              </span>
              {saved ? 'Saved' : 'Want it'}
            </button>
            {!upcoming && (
              <button type="button" onClick={() => setRating((open) => !open)} aria-expanded={rating} className={RAIL}>
                <span className={`${RAIL_ICON} ${rating ? 'border-white' : ''}`}><Star className="w-5 h-5" strokeWidth={1.8} /></span>
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
      </div>

      {/* Sound, for the whole feed */}
      <button type="button" onClick={onToggleSound} aria-label={muted ? 'Turn the sound on' : 'Mute'} className="absolute top-3 right-4 sm:right-8 grid place-items-center w-11 h-11 rounded-full bg-slate-950/50 backdrop-blur-sm border border-white/40 text-white hover:border-white">
        {muted ? <VolumeX className="w-5 h-5" strokeWidth={1.8} /> : <Volume2 className="w-5 h-5" strokeWidth={1.8} />}
      </button>
    </section>
  );
};

function Discover() {
  const [feed, setFeed] = useState('new');
  const [lists, setLists] = useState({}); // feed -> games ([] if it couldn't load)
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [height, setHeight] = useState(null);
  const [now] = useState(() => Date.now()); // read once: what's out or coming, as of opening the page
  const scroller = useRef(null);

  // Each feed loads the first time it's picked, then stays
  const games = lists[feed] ?? null;
  useEffect(() => {
    if (lists[feed]) return undefined;
    const controller = new AbortController();
    getDiscoverGames(feed, controller.signal)
      .then((list) => setLists((all) => ({ ...all, [feed]: list })))
      .catch(() => !controller.signal.aborted && setLists((all) => ({ ...all, [feed]: [] })));
    return () => controller.abort();
  }, [feed, lists]);

  // The feed fills the screen under the site's header
  useEffect(() => {
    const fit = () => scroller.current && setHeight(window.innerHeight - scroller.current.getBoundingClientRect().top - window.scrollY);
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // Only games with a trailer to play
  const list = useMemo(() => (games ?? []).filter((g) => g.videos?.length), [games]);

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
        <div className={`${SEGMENTS} bg-slate-950/60 backdrop-blur-sm`} role="tablist" aria-label="Discover feeds">
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
        <button type="button" onClick={() => goTo(1)} className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1 text-sm text-slate-300 hover:text-white motion-safe:animate-bounce">
          Swipe for more <ChevronDown className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </main>
  );
}

export default Discover;
