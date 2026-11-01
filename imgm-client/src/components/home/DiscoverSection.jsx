/**
 * DiscoverSection — the home page's way into Discover (the trailer feed): "Hot right
 * now." and what Discover does, beside a phone showing the feed with a trailer playing,
 * so a visitor sees what it is instead of reading about it.
 *
 * The phone works like a small feed: its Hot Now / Upcoming words switch feeds, and
 * every 10 seconds it swipes up to the next game (a line along its bottom fills up until
 * then). It holds still while the pointer or focus is on it, while it's off screen, and
 * for people who ask for less motion (they also get still pictures, no trailers). The
 * covers under the words are the games coming up next in the phone, and every game
 * opens the feed on that game (/discover?feed=upcoming&game=<id>; no feed = Hot Now).
 *
 * Only games not rated for adults (Discover asks for an age first, the home page can't),
 * with a Steam trailer (no YouTube ads on the home page). Trailers are muted, loop, and
 * play only while on screen. A feed loads only when the section comes near the screen
 * (its first load after the server's 6h cache can take several seconds); until then, or
 * if it can't load, the phone's screen stays dark and the button still opens Discover.
 *
 * Shown only to visitors who may use Discover (useDiscoverAccess).
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookmarkPlus, MessageCircle, Play, Share2, Star, ThumbsDown, ThumbsUp } from 'lucide-react';
import { getDiscoverGames } from '../../lib/api';
import { useDiscoverAccess } from '../../hooks/useDiscoverAccess';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { PowerIcon } from '../Logo';
import { WRAP, SECTION_TITLE, GHOST_BUTTON } from '../../lib/ui';

const FEEDS = [
  { key: 'hot', label: 'Hot Now' },
  { key: 'upcoming', label: 'Upcoming' },
];
const UP_NEXT = 5; // the covers under the words
const SWIPE_EVERY = '10s';

const feedLink = (feed, game) => {
  if (!game) return feed === 'hot' ? '/discover' : `/discover?feed=${feed}`;
  return feed === 'hot' ? `/discover?game=${game.id}` : `/discover?feed=${feed}&game=${game.id}`;
};

// What Discover does, in three lines
const POINTS = [
  { icon: Play, text: 'One trailer a screen. Swipe for the next.' },
  { icon: ThumbsUp, text: 'Thumbs up or down, and see what players say.' },
  { icon: Star, text: 'Played it? Rate it in one tap.' },
];

// A Steam trailer playing on its own: muted, looping, and only while on screen (a video
// off screen still costs a phone its data). Safari plays the stream itself, other
// browsers through hls.js, loaded only when it's needed (as in Discover).
const LoopingTrailer = ({ trailer, still }) => {
  const video = useRef(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const el = video.current;
    if (still || !el) return undefined;
    let hls = null;
    let gone = false;
    // Set here too: React doesn't always put `muted` on the element, and a phone only
    // starts a video by itself when it's muted
    el.muted = true;
    if (el.canPlayType('application/vnd.apple.mpegurl')) el.src = trailer.hls;
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
          loop
          aria-hidden="true"
          onPlaying={() => setPlaying(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${playing ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </>
  );
};

// The feed's action column, drawn small: only a picture of what's in there
const RAIL = [ThumbsUp, ThumbsDown, MessageCircle, BookmarkPlus, Star, Share2];
const Rail = () => (
  <span aria-hidden="true" className="flex flex-col items-center gap-2">
    {RAIL.map((Icon, i) => (
      <span key={i} className="grid place-items-center w-7 h-7 rounded-full border border-white/40 bg-slate-950/50 backdrop-blur-sm text-white">
        <Icon className="w-3 h-3" strokeWidth={2} />
      </span>
    ))}
  </span>
);

// One game on the phone's screen, laid out like the feed on an upright phone: the
// trailer square at the top, the power line, the key art faded under it, the actions
// down the right and the words at the bottom. The whole screen opens the feed on it.
const Screen = ({ game, feed, still, playing, className = '', onAnimationEnd }) => {
  const genre = game.genres?.[0]?.replace(/ \(.*\)$/, '');
  return (
    <Link
      to={feedLink(feed, game)}
      aria-label={`Watch ${game.title} in Discover`}
      tabIndex={playing ? undefined : -1}
      onAnimationEnd={onAnimationEnd}
      className={`absolute inset-0 block bg-slate-900 ${className}`}
    >
      {game.artworks?.[0] && <img src={game.artworks[0]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-35" />}
      <span className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/40 to-slate-950" />
      <span className="absolute inset-x-0 top-0 aspect-square overflow-hidden bg-slate-950">
        {playing ? (
          <LoopingTrailer trailer={game.steamTrailer} still={still} />
        ) : (
          game.steamTrailer.poster && <img src={game.steamTrailer.poster} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
      </span>
      <span className="absolute left-3 right-3 flex items-center gap-2 text-slate-200" style={{ top: 'calc(50% + 2px)' }}>
        <span className="flex-1 h-px bg-slate-200/50" />
        <PowerIcon className="w-3 h-3" />
        <span className="flex-1 h-px bg-slate-200/50" />
      </span>
      <span className="absolute right-2 bottom-5">
        <Rail />
      </span>
      <span className="absolute left-3 right-14 bottom-5 text-left">
        {genre && <span className="block text-[10px] uppercase tracking-[.14em] text-slate-300">{genre}</span>}
        <span className="mt-1 font-display text-[26px] leading-[.95] uppercase text-white line-clamp-2">{game.title}</span>
        <span className="mt-1.5 text-[11px] leading-snug text-slate-300 line-clamp-1">{game.description}</span>
      </span>
    </Link>
  );
};

const DiscoverSection = () => {
  const { enabled } = useDiscoverAccess();
  const still = usePrefersReducedMotion();
  const section = useRef(null);
  const [near, setNear] = useState(false); // close enough to load the feed
  const [seen, setSeen] = useState(false); // the phone is on screen (it swipes only then)
  const [held, setHeld] = useState(false); // the pointer or focus is on the phone
  const [feed, setFeed] = useState('hot');
  const [lists, setLists] = useState({}); // feed -> its playable games
  const [at, setAt] = useState(0); // the game on the phone's screen
  const [leaving, setLeaving] = useState(null); // the game swiping away, while it does
  const [arrival, setArrival] = useState('animate-fade-in'); // how the game on screen came in

  useEffect(() => {
    const el = section.current;
    if (!el) return undefined;
    const watch = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setNear(true);
    }, { rootMargin: '800px 0px' });
    const view = new IntersectionObserver(([entry]) => setSeen(entry.isIntersecting), { threshold: 0.5 });
    watch.observe(el);
    const phone = el.querySelector('[data-phone]');
    if (phone) view.observe(phone);
    return () => {
      watch.disconnect();
      view.disconnect();
    };
  }, [enabled]);

  // Each feed loads the first time it's needed, then stays
  useEffect(() => {
    if (!near || lists[feed]) return undefined;
    const controller = new AbortController();
    getDiscoverGames(feed, controller.signal)
      .then((all) => setLists((had) => ({ ...had, [feed]: all.filter((g) => !g.mature && g.steamTrailer?.hls) })))
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
            data-phone
            onMouseEnter={() => setHeld(true)}
            onMouseLeave={() => setHeld(false)}
            onFocus={() => setHeld(true)}
            onBlur={() => setHeld(false)}
            className="justify-self-center lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-center w-[min(260px,100%)] sm:w-[300px] rounded-[28px] border border-slate-600 bg-slate-950 p-2.5"
          >
            <div className="relative aspect-[9/18] overflow-hidden rounded-[20px] bg-slate-900">
              {leaving !== null && games[leaving] && (
                <Screen
                  key={`out-${games[leaving].id}`}
                  game={games[leaving]}
                  feed={feed}
                  still
                  className="animate-swipe-out"
                  onAnimationEnd={() => setLeaving(null)}
                />
              )}
              {star && (
                <Screen
                  key={`${feed}-${star.id}`}
                  game={star}
                  feed={feed}
                  still={still}
                  playing
                  className={arrival}
                />
              )}

              {/* The feeds, as words over the top, like the feed's own (a light shade under
                  them, so they read over a bright trailer) */}
              <span aria-hidden="true" className="absolute inset-x-0 top-0 z-10 h-14 bg-gradient-to-b from-slate-950/55 to-transparent pointer-events-none" />
              <div role="tablist" aria-label="Discover feeds" className="absolute inset-x-0 top-0 z-10 pt-2 flex justify-center gap-4">
                {FEEDS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    role="tab"
                    aria-selected={feed === f.key}
                    onClick={() => pickFeed(f.key)}
                    className={`relative h-8 px-1 text-[12px] font-semibold [text-shadow:0_1px_3px_rgb(0_0_0/.8)] transition-colors duration-120 ${
                      feed === f.key
                        ? 'text-white after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-1 after:w-5 after:h-0.5 after:bg-white'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Until the next swipe: a line that fills along the bottom (its end swipes) */}
              {swipes && star && (
                <span
                  key={`timer-${feed}-${at}`}
                  aria-hidden="true"
                  onAnimationEnd={next}
                  className="absolute left-0 right-0 bottom-0 z-10 h-[2px] bg-white/80 origin-left animate-reel-timer"
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
