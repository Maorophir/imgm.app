/**
 * DiscoverSection — the home page's way into Discover (the trailer feed): "Hot right
 * now." and what Discover does, beside a phone showing the feed with a trailer playing,
 * so a visitor sees what it is instead of reading about it.
 *
 * The phone's screen is Discover as it looks on an upright phone, drawn at a phone's
 * real size (390px wide) and scaled down to fit (CSS zoom), so it's the same layout:
 * the menu's pull tab, the feeds' words and the full screen button over the top; the
 * trailer square at the top, the power line, the key art faded under it, the date,
 * title, IMGM rating line and description, the actions down the right with their
 * counts, and the timeline along the bottom.
 *
 * It works like a small feed: its Hot Now / Upcoming words switch feeds, and every 10
 * seconds it swipes up to the next game. It holds still while the pointer or focus is on
 * it, while it's off screen, and for people who ask for less motion (they also get still
 * pictures, no trailers). Each trailer starts a fifth of the way in (the first seconds
 * are age ratings and logos). The covers under the words are the games coming up next
 * in the phone, and every game opens the feed on that game
 * (/discover?feed=upcoming&game=<id>; no feed = Hot Now).
 *
 * Only games not rated for adults (Discover asks for an age first, the home page can't),
 * with a Steam trailer (no YouTube ads on the home page). Trailers are muted, and play
 * only while on screen. A feed loads only when the section comes near the screen (its
 * first load after the server's 6h cache can take several seconds); until then, or if
 * it can't load, the phone's screen stays dark and the button still opens Discover.
 *
 * Shown only to visitors who may use Discover (useDiscoverAccess).
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookmarkPlus, ChevronDown, Maximize, MessageCircle, Play, Share2, Star, ThumbsDown, ThumbsUp } from 'lucide-react';
import { getDiscoverGames, getDiscoverVotes, nativeTrailerUrl } from '../../lib/api';
import { useDiscoverAccess } from '../../hooks/useDiscoverAccess';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { clock, releaseLine } from '../discover/feedText';
import { getRarity } from '../reviewQuest/questOptions';
import RarityMark from '../RarityMark';
import { PowerIcon } from '../Logo';
import { WRAP, SECTION_TITLE, GHOST_BUTTON } from '../../lib/ui';

const FEEDS = [
  { key: 'hot', label: 'Hot Now' },
  { key: 'upcoming', label: 'Upcoming' },
];
const UP_NEXT = 5; // the covers under the words
const SWIPE_EVERY = '10s';
// The phone's screen, at a real phone's size (an iPhone's width), before it's scaled down
const SCREEN_W = 390;
const SCREEN_H = 664; // (an iPhone 13's screen under Safari's bars)

const feedLink = (feed, game) => {
  if (!game) return feed === 'hot' ? '/discover' : `/discover?feed=${feed}`;
  return feed === 'hot' ? `/discover?game=${game.id}` : `/discover?feed=${feed}&game=${game.id}`;
};

// Where a trailer's action starts: a fifth of the way in, at least 12s and at most 45s
// (and never so late that little is left). Short ones play from the start.
const actionStart = (duration) =>
  !Number.isFinite(duration) || duration < 25 ? 0 : Math.min(Math.max(duration * 0.2, 12), 45, duration - 15);

// What Discover does, in three lines
const POINTS = [
  { icon: Play, text: 'One trailer a screen. Swipe for the next.' },
  { icon: ThumbsUp, text: 'Thumbs up or down, and see what players say.' },
  { icon: Star, text: 'Played it? Rate it in one tap.' },
];

// The feed's own pieces, as Discover draws them (pages/Discover.jsx)
const RAIL = 'flex flex-col items-center gap-1 w-13 whitespace-nowrap text-xs font-medium text-white [text-shadow:0_1px_3px_rgb(0_0_0/.8)]';
const RAIL_ICON = 'grid place-items-center w-12 h-12 rounded-full border border-white/40 bg-slate-950/50 backdrop-blur-sm';
const feedWord = (on) =>
  `relative h-9 px-1 text-[15px] font-semibold [text-shadow:0_1px_3px_rgb(0_0_0/.8)] transition-colors duration-120 ${
    on ? 'text-white after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-1 after:w-6 after:h-0.5 after:bg-white' : 'text-white/60 hover:text-white'
  }`;

// A Steam trailer playing on its own: muted, from where the action starts (and back
// there when it ends), and only while on screen (a video off screen still costs a phone
// its data). Safari plays the stream itself, from our copy of its playlist (480p first:
// it starts fast; Steam's own if ours can't be had); other browsers through hls.js,
// loaded only when it's needed (as in Discover).
const LoopingTrailer = ({ trailer, still, onProgress }) => {
  const video = useRef(null);
  const start = useRef(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const el = video.current;
    if (still || !el) return undefined;
    let hls = null;
    let gone = false;
    // Set here too: React doesn't always put `muted` on the element, and a phone only
    // starts a video by itself when it's muted
    el.muted = true;
    if (el.canPlayType('application/vnd.apple.mpegurl')) el.src = nativeTrailerUrl(trailer.hls);
    else {
      import('hls.js').then(({ default: Hls }) => {
        if (gone || !Hls.isSupported()) return;
        hls = new Hls({ capLevelToPlayerSize: true });
        hls.loadSource(trailer.hls);
        hls.attachMedia(el);
      });
    }
    const seen = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) el.play().catch(() => {});
      else el.pause();
    }, { threshold: 0.4 });
    seen.observe(el);
    return () => {
      gone = true;
      seen.disconnect();
      hls?.destroy();
    };
  }, [trailer.hls, still]);
  return (
    <>
      {trailer.poster && <img src={trailer.poster} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      {!still && (
        <video
          ref={video}
          muted
          playsInline
          aria-hidden="true"
          onLoadedMetadata={(e) => {
            start.current = actionStart(e.currentTarget.duration);
            e.currentTarget.currentTime = start.current;
          }}
          onEnded={(e) => {
            e.currentTarget.currentTime = start.current;
            e.currentTarget.play().catch(() => {});
          }}
          // Shown once it's playing from the action (never a flash of the opening card)
          onTimeUpdate={(e) => {
            const { currentTime, duration } = e.currentTarget;
            if (!playing && currentTime >= start.current - 0.5) setPlaying(true);
            onProgress?.(currentTime, duration);
          }}
          onError={(e) => {
            // Our playlist couldn't be had (the server waking up): Steam's own instead
            const el = e.currentTarget;
            if (el.src.includes('/api/discover/stream.m3u8')) el.src = trailer.hls;
          }}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${playing ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </>
  );
};

// One game, as a slide of the feed on an upright phone (at the phone's real size). The
// whole slide opens the feed on it.
const Slide = ({ game, feed, votes, now, still, playing, className = '', onAnimationEnd }) => {
  const [progress, setProgress] = useState({ time: 0, duration: 0 });
  const art = game.artworks?.[0] ?? game.screenshots?.[0] ?? game.coverUrl;
  const upcoming = game.releaseDate && new Date(game.releaseDate).getTime() > now;
  const score = game.ratings?.imgm;
  const rarity = typeof score === 'number' && game.reviewCount > 0 ? getRarity(score) : null;
  const done = progress.duration ? Math.min(100, (progress.time / progress.duration) * 100) : 0;
  const count = (n) => (n ?? 0).toLocaleString('en-US');
  return (
    <Link
      to={feedLink(feed, game)}
      aria-label={`Watch ${game.title} in Discover`}
      tabIndex={playing ? undefined : -1}
      onAnimationEnd={onAnimationEnd}
      className={`absolute inset-0 block overflow-hidden bg-slate-950 ${className}`}
    >
      {/* Under the trailer: the key art, faded like a game page's backdrop */}
      {art && (
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0" style={{ top: SCREEN_W }}>
          <img src={art} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
          <span className="absolute inset-0 bg-gradient-to-b from-slate-950/45 via-slate-950/70 to-slate-950" />
          <span className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-950/20 to-transparent" />
        </span>
      )}
      {/* The trailer, square across the top */}
      <span className="absolute inset-x-0 top-0 overflow-hidden" style={{ height: SCREEN_W }}>
        {playing ? (
          <LoopingTrailer trailer={game.steamTrailer} still={still} onProgress={(time, duration) => setProgress({ time, duration: Number.isFinite(duration) ? duration : 0 })} />
        ) : (
          game.steamTrailer.poster && <img src={game.steamTrailer.poster} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
      </span>
      {/* The power line under it */}
      <span aria-hidden="true" className="absolute inset-x-0 -translate-y-1/2 flex items-center gap-3 px-4" style={{ top: SCREEN_W }}>
        <span className="h-px flex-1 bg-white/45" />
        <PowerIcon className="w-4 h-4 text-white/70" />
        <span className="h-px flex-1 bg-white/45" />
      </span>
      {/* Shades so the words read: the top (the feeds) and the bottom */}
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-slate-950/70 to-transparent" />
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent" />

      {/* What it is, and the actions at the right edge */}
      <span className="absolute inset-x-0 bottom-0 flex items-end gap-4 pl-4 pr-0.5 pb-12 text-left">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-200">
            {upcoming && <span className="px-2 py-0.5 rounded-sm border border-white/70 text-white text-xs font-semibold uppercase tracking-[.12em]">Coming soon</span>}
            <span>{releaseLine(game.releaseDate, now)}</span>
            {game.genres?.[0] && <span className="text-slate-300">{game.genres[0]}</span>}
          </span>
          <span className="block mt-2 font-display uppercase text-[34px] leading-[.88] tracking-[.005em] text-white [text-wrap:balance]">{game.title}</span>
          <span className="mt-2 flex flex-wrap items-center gap-x-2.5 text-sm text-slate-300" style={rarity ? { '--ink': rarity.color } : undefined}>
            {rarity ? (
              <>
                <RarityMark tier={rarity.key} className="text-(--ink)" />
                <span><span className="tabular-nums text-(--ink)">{score.toFixed(1)}</span> <span className="text-(--ink)">{rarity.label}</span> on IMGM · {game.reviewCount} review{game.reviewCount === 1 ? '' : 's'}</span>
              </>
            ) : (
              <span>{upcoming ? 'Not out yet: save it for launch day.' : 'No IMGM rating yet. Played it? Be the first.'}</span>
            )}
          </span>
          {game.description && (
            <span className="block mt-2 text-sm text-slate-300">
              <span className="line-clamp-1">{game.description}</span>
              <span className="block min-h-8 leading-8 font-semibold text-white">more</span>
            </span>
          )}
        </span>
        <span aria-hidden="true" className="shrink-0 flex flex-col items-center gap-3">
          <span className={RAIL}><span className={RAIL_ICON}><ThumbsUp className="w-5 h-5" strokeWidth={1.8} /></span><span className="tabular-nums">{count(votes?.up)}</span></span>
          <span className={RAIL}><span className={RAIL_ICON}><ThumbsDown className="w-5 h-5" strokeWidth={1.8} /></span><span className="tabular-nums">{count(votes?.down)}</span></span>
          <span className={RAIL}><span className={RAIL_ICON}><MessageCircle className="w-5 h-5" strokeWidth={1.8} /></span><span className="tabular-nums">{count(votes?.comments)}</span></span>
          <span className={RAIL}><span className={RAIL_ICON}><BookmarkPlus className="w-5 h-5" strokeWidth={1.8} /></span>Want it</span>
          {!upcoming && <span className={RAIL}><span className={RAIL_ICON}><Star className="w-5 h-5" strokeWidth={1.8} /></span>Played it?</span>}
          <span className={RAIL}><span className={RAIL_ICON}><Share2 className="w-5 h-5" strokeWidth={1.8} /></span>Share</span>
        </span>
      </span>

      {/* The timeline along the bottom edge */}
      {progress.duration > 0 && (
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 flex items-center gap-3 pl-4 pr-4 h-8">
          <span className="relative flex-1 h-[3px] rounded-full bg-[rgb(238_231_217/0.3)]">
            <span className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${done}%` }} />
            <span className="absolute top-1/2 w-[13px] h-[13px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_1px_4px_rgb(0_0_0/0.6)]" style={{ left: `${done}%` }} />
          </span>
          <span className="shrink-0 text-xs tabular-nums text-slate-200 [text-shadow:0_1px_3px_rgb(0_0_0/.8)]">
            {clock(progress.time)} / {clock(progress.duration)}
          </span>
        </span>
      )}
    </Link>
  );
};

const DiscoverSection = () => {
  const { enabled } = useDiscoverAccess();
  const still = usePrefersReducedMotion();
  const section = useRef(null);
  const screen = useRef(null);
  const [near, setNear] = useState(false); // close enough to load the feed
  const [seen, setSeen] = useState(false); // the phone is on screen (it swipes only then)
  const [held, setHeld] = useState(false); // the pointer or focus is on the phone
  const [zoom, setZoom] = useState(0.7); // the phone's screen, scaled to the frame
  const [feed, setFeed] = useState('hot');
  const [lists, setLists] = useState({}); // feed -> its playable games
  const [votes, setVotes] = useState({}); // gameId -> { up, down, comments }
  const [at, setAt] = useState(0); // the game on the phone's screen
  const [leaving, setLeaving] = useState(null); // the game swiping away, while it does
  const [arrival, setArrival] = useState('animate-fade-in'); // how the game on screen came in
  const [now] = useState(() => Date.now());

  useEffect(() => {
    const el = section.current;
    if (!el) return undefined;
    const watch = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setNear(true);
    }, { rootMargin: '800px 0px' });
    const view = new IntersectionObserver(([entry]) => setSeen(entry.isIntersecting), { threshold: 0.5 });
    const fit = new ResizeObserver(([entry]) => setZoom(entry.contentRect.width / SCREEN_W));
    watch.observe(el);
    if (screen.current) {
      view.observe(screen.current);
      fit.observe(screen.current);
    }
    return () => {
      watch.disconnect();
      view.disconnect();
      fit.disconnect();
    };
  }, [enabled]);

  // Each feed loads the first time it's needed, then stays; with its games' votes
  useEffect(() => {
    if (!near || lists[feed]) return undefined;
    const controller = new AbortController();
    getDiscoverGames(feed, controller.signal)
      .then((all) => {
        const playable = all.filter((g) => !g.mature && g.steamTrailer?.hls);
        setLists((had) => ({ ...had, [feed]: playable }));
        if (playable.length) {
          getDiscoverVotes(playable.map((g) => g.id), controller.signal)
            .then((found) => setVotes((had) => ({ ...had, ...found })))
            .catch(() => {}); // the counts show 0
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [near, feed, lists]);

  if (!enabled) return null;

  const games = lists[feed] ?? [];
  const star = games.length ? games[at % games.length] : null;
  const upNext = Array.from({ length: Math.min(UP_NEXT, Math.max(games.length - 1, 0)) }, (_, i) => games[(at + 1 + i) % games.length]);
  const swipes = !still && games.length > 1;

  const next = () => {
    setArrival('animate-swipe-in');
    setLeaving(at % games.length);
    setAt((i) => (i + 1) % games.length);
  };
  const pickFeed = (key) => {
    if (key === feed) return;
    setFeed(key);
    setAt(0);
    setLeaving(null);
    setArrival('animate-fade-in');
  };

  return (
    <section ref={section} aria-labelledby="discover-title" className="mt-24 sm:mt-36">
      <div className={WRAP}>
        {/* Phones: the words, the phone, then the covers. Computers: the words over the
            covers on the left, the phone beside them, close (not at the page's two edges). */}
        <div className="grid gap-y-12 lg:grid-cols-[minmax(0,540px)_auto] lg:grid-rows-[auto_1fr] lg:justify-center lg:gap-x-24 xl:gap-x-32">
          <div className="min-w-0 lg:self-end">
            <h2 id="discover-title" className={SECTION_TITLE}>Hot right now.</h2>
            <p className="mt-6 max-w-[480px] text-base leading-[1.6] text-white">
              The games everyone's playing, and the most wanted ones coming out, one trailer at a time.
            </p>
            <ul className="mt-6 grid gap-3">
              {POINTS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-base text-slate-200">
                  <Icon className="w-4.5 h-4.5 shrink-0 text-slate-400" strokeWidth={1.8} aria-hidden="true" />
                  {text}
                </li>
              ))}
            </ul>
            <Link to={feedLink(feed, star)} className={`mt-8 ${GHOST_BUTTON}`}>
              Open Discover <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </Link>
          </div>

          {/* The phone: the feed as it looks on one */}
          <div
            onMouseEnter={() => setHeld(true)}
            onMouseLeave={() => setHeld(false)}
            onFocus={() => setHeld(true)}
            onBlur={() => setHeld(false)}
            className="justify-self-center lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-center w-[min(280px,100%)] sm:w-[320px] rounded-[30px] border border-slate-600 bg-slate-950 p-2.5"
          >
            <div ref={screen} data-phone className="relative overflow-hidden rounded-[22px] bg-slate-950" style={{ aspectRatio: `${SCREEN_W} / ${SCREEN_H}` }}>
              {/* The screen at a phone's real size, scaled down to the frame */}
              <div className="absolute top-0 left-0" style={{ width: SCREEN_W, height: SCREEN_H, zoom }}>
                {leaving !== null && games[leaving] && (
                  <Slide
                    key={`out-${games[leaving].id}`}
                    game={games[leaving]}
                    feed={feed}
                    votes={votes[games[leaving].id]}
                    now={now}
                    still
                    className="animate-swipe-out"
                    onAnimationEnd={(e) => e.target === e.currentTarget && setLeaving(null)}
                  />
                )}
                {star && (
                  <Slide key={`${feed}-${star.id}`} game={star} feed={feed} votes={votes[star.id]} now={now} still={still} playing className={arrival} />
                )}

                {/* Over the top, as in the feed (they stay put while the games swipe):
                    the menu's pull tab, the feeds' words, and the full screen button */}
                <span aria-hidden="true" className="absolute top-0 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1 h-7 pl-2.5 pr-2 rounded-b-sm border border-t-0 border-white/30 bg-slate-950/70 backdrop-blur-sm text-white">
                  <PowerIcon className="w-3.5 h-3.5 text-brand" />
                  <ChevronDown className="w-4 h-4" strokeWidth={1.8} />
                </span>
                <div role="tablist" aria-label="Discover feeds" className="absolute top-8 left-1/2 -translate-x-1/2 z-10 flex gap-4">
                  {FEEDS.map((f) => (
                    <button key={f.key} type="button" role="tab" aria-selected={feed === f.key} onClick={() => pickFeed(f.key)} className={feedWord(feed === f.key)}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <span aria-hidden="true" className="absolute top-[30px] right-0.5 z-10 w-13 grid justify-items-center">
                  <span className={`${RAIL_ICON} text-white`}><Maximize className="w-5 h-5" strokeWidth={1.8} /></span>
                </span>
              </div>

              {/* The next swipe's clock: its end swipes (nothing shows; the timeline is the trailer's) */}
              {swipes && star && (
                <span
                  key={`timer-${feed}-${at}`}
                  aria-hidden="true"
                  onAnimationEnd={next}
                  className="absolute left-0 bottom-0 w-full h-px opacity-0 origin-left animate-reel-timer pointer-events-none"
                  style={{ '--reel-time': SWIPE_EVERY, animationPlayState: held || !seen ? 'paused' : 'running' }}
                />
              )}
            </div>
          </div>

          {/* What comes up next on the phone, each opening the feed on that game */}
          {upNext.length > 0 && (
            <div className="min-w-0 lg:col-start-1 lg:row-start-2 lg:self-start">
              <p className="text-sm text-slate-400">Up next in {FEEDS.find((f) => f.key === feed).label}</p>
              <ul className="mt-3 flex gap-3">
                {upNext.map((game) => (
                  <li key={game.id} className="w-[min(72px,calc((100%-48px)/5))] shrink-0 animate-fade-in">
                    <Link to={feedLink(feed, game)} aria-label={`${game.title} in Discover`} className="group block">
                      <img
                        src={game.coverUrl}
                        alt=""
                        loading="lazy"
                        className="w-full aspect-[3/4] object-cover rounded-xs border border-white/14 group-hover:border-white transition-colors duration-120"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default DiscoverSection;
