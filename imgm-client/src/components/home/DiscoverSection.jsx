/**
 * DiscoverSection — the home page's way into Discover (the trailer feed): "Hot right
 * now." beside a trailer that plays by itself, so a visitor sees what Discover is
 * instead of reading about it, and the next few games as pictures that open the feed
 * on that game (/discover?game=<id>).
 *
 * The trailer is Hot Now's hottest game that isn't rated for adults (Discover asks for
 * an age first, the home page can't), from Steam only (no YouTube ads on the home page).
 * It's muted, loops, and plays only while it's on screen; people who ask for less motion
 * get its still picture. The feed loads only when the section comes near the screen
 * (its first load after the server's 6h cache can take several seconds); until then, or
 * if it can't load, a quiet frame holds the space.
 *
 * Shown only to visitors who may use Discover (useDiscoverAccess).
 *
 * Props:
 *   look  'phone' (the trailer in a phone-shaped frame, like the feed on a phone) or
 *         'strip' (a wide trailer band across the page). TEMPORARY: the home page's
 *         ?look= switch, to compare the two; the one not picked goes.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookmarkPlus, MessageCircle, Share2, Star, ThumbsDown, ThumbsUp } from 'lucide-react';
import { getDiscoverGames } from '../../lib/api';
import { useDiscoverAccess } from '../../hooks/useDiscoverAccess';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { PowerIcon } from '../Logo';
import { WRAP, SECTION_TITLE, GHOST_BUTTON } from '../../lib/ui';

const UP_NEXT = 5; // the pictures under the words

const feedLink = (game) => `/discover?game=${game.id}`;

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
  <span aria-hidden="true" className="flex flex-col items-center gap-2.5">
    {RAIL.map((Icon, i) => (
      <span key={i} className="grid place-items-center w-8 h-8 rounded-full border border-white/40 bg-slate-950/50 backdrop-blur-sm text-white">
        <Icon className="w-3.5 h-3.5" strokeWidth={2} />
      </span>
    ))}
  </span>
);

// The next games: their covers, each opening the feed on that game
const UpNext = ({ games, className = '' }) => (
  <div className={className}>
    <p className="text-sm text-slate-400">Up next in the feed</p>
    <ul className="mt-3 flex gap-3">
      {games.map((game) => (
        <li key={game.id} className="w-[min(72px,calc((100%-48px)/5))] shrink-0">
          <Link to={feedLink(game)} aria-label={`${game.title} in Discover`} className="group block">
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
);

const Words = ({ star }) => (
  <>
    <h2 id="discover-title" className={SECTION_TITLE}>Hot right now.</h2>
    <p className="mt-6 max-w-[520px] text-base leading-[1.6] text-white">
      Trailers of the games everyone's playing, one swipe at a time. Give them a thumbs up or down, see what
      players say, and rate the ones you've played in one tap.
    </p>
    <Link to={star ? feedLink(star) : '/discover'} className={`mt-8 ${GHOST_BUTTON}`}>
      Open Discover <ArrowRight className="w-4 h-4" strokeWidth={2} />
    </Link>
  </>
);

const DiscoverSection = ({ look = 'phone' }) => {
  const { enabled } = useDiscoverAccess();
  const still = usePrefersReducedMotion();
  const section = useRef(null);
  const [near, setNear] = useState(false);
  const [games, setGames] = useState(null);

  useEffect(() => {
    const el = section.current;
    if (!el || near) return undefined;
    const watch = new IntersectionObserver(([entry]) => entry.isIntersecting && setNear(true), { rootMargin: '800px 0px' });
    watch.observe(el);
    return () => watch.disconnect();
  }, [near, enabled]);

  useEffect(() => {
    if (!near) return undefined;
    const controller = new AbortController();
    getDiscoverGames('hot', controller.signal)
      .then((list) => setGames(list.filter((g) => g.videos?.length)))
      .catch(() => {}); // the frame stays empty; the button still opens Discover
    return () => controller.abort();
  }, [near]);

  if (!enabled) return null;

  const star = games?.find((g) => !g.mature && g.steamTrailer?.hls) ?? null;
  const upNext = (games ?? []).filter((g) => g !== star).slice(0, UP_NEXT);
  const genre = star?.genres?.[0]?.replace(/ \(.*\)$/, '');

  if (look === 'strip') {
    return (
      <section ref={section} aria-labelledby="discover-title" className="mt-24 sm:mt-36">
        <div className={WRAP}>
          {/* Phones: the trailer on top, uncovered, and the words under it. From tablets
              up: one wide band, the words over its darkened left. */}
          <div className="sm:relative sm:overflow-hidden sm:rounded-sm sm:border sm:border-white/14 sm:bg-slate-900 sm:aspect-[16/9] lg:aspect-[21/9]">
            <div className="relative overflow-hidden rounded-sm border border-white/14 bg-slate-900 aspect-[16/9] sm:absolute sm:inset-0 sm:aspect-auto sm:border-0 sm:rounded-none">
              {star && (
                <Link to={feedLink(star)} aria-label={`Watch ${star.title} in Discover`} className="absolute inset-0">
                  <LoopingTrailer trailer={star.steamTrailer} still={still} />
                </Link>
              )}
            </div>
            <div aria-hidden="true" className="hidden sm:block absolute inset-0 pointer-events-none bg-gradient-to-r from-slate-950 via-slate-950/70 via-45% to-transparent" />
            <div className="mt-6 sm:mt-0 sm:absolute sm:inset-x-0 sm:bottom-0 sm:p-8 lg:p-12 sm:max-w-[560px] sm:pointer-events-none sm:[&_a]:pointer-events-auto">
              {star && (
                <p className="mb-4 text-sm text-slate-300">
                  Now playing: <Link to={feedLink(star)} className="text-white underline decoration-slate-500 underline-offset-[3px]">{star.title}</Link>
                </p>
              )}
              <Words star={star} />
            </div>
          </div>
          {upNext.length > 0 && <UpNext games={upNext} className="mt-8" />}
        </div>
      </section>
    );
  }

  return (
    <section ref={section} aria-labelledby="discover-title" className="mt-24 sm:mt-36">
      <div className={WRAP}>
        {/* The words and the phone side by side, close together (not at the page's two edges) */}
        <div className="grid gap-y-12 items-center lg:grid-cols-[minmax(0,560px)_auto] lg:justify-center lg:gap-x-24 xl:gap-x-32">
          <div className="min-w-0">
            <Words star={star} />
            {upNext.length > 0 && <UpNext games={upNext} className="mt-10" />}
          </div>

          {/* The phone: the feed as it looks on one, with the trailer playing. The whole
              screen opens Discover on this game. */}
          <Link
            to={star ? feedLink(star) : '/discover'}
            aria-label={star ? `Watch ${star.title} in Discover` : 'Open Discover'}
            className="group justify-self-center w-[min(260px,100%)] sm:w-[300px] rounded-[28px] border border-slate-600 bg-slate-950 p-2.5 hover:border-slate-400 transition-colors duration-120"
          >
            <span className="relative block aspect-[9/18] overflow-hidden rounded-[20px] bg-slate-900">
              {star && (
                <>
                  {/* Under the trailer: the game's key art, faded, as in the feed */}
                  {star.artworks?.[0] && (
                    <img src={star.artworks[0]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-35" />
                  )}
                  <span className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/40 to-slate-950" />
                  {/* The trailer: square at the top */}
                  <span className="absolute inset-x-0 top-0 aspect-square overflow-hidden">
                    <LoopingTrailer trailer={star.steamTrailer} still={still} />
                    <span className="absolute inset-x-0 top-0 pt-3 flex justify-center gap-4 text-[11px] font-medium text-white [text-shadow:0_1px_3px_rgb(0_0_0/.8)]">
                      <span className="border-b border-white pb-0.5">Hot Now</span>
                      <span className="text-white/70">Upcoming</span>
                    </span>
                  </span>
                  {/* The power line under it */}
                  <span className="absolute left-3 right-3 flex items-center gap-2 text-slate-200" style={{ top: 'calc(50% + 2px)' }}>
                    <span className="flex-1 h-px bg-slate-200/50" />
                    <PowerIcon className="w-3 h-3" />
                    <span className="flex-1 h-px bg-slate-200/50" />
                  </span>
                  <span className="absolute right-2 bottom-4">
                    <Rail />
                  </span>
                  <span className="absolute left-3 right-14 bottom-4 text-left">
                    {genre && <span className="block text-[10px] uppercase tracking-[.14em] text-slate-300">{genre}</span>}
                    <span className="mt-1 block font-display text-[24px] leading-[.95] uppercase text-white line-clamp-2">{star.title}</span>
                    <span className="mt-1.5 block text-[11px] leading-snug text-slate-300 line-clamp-2">{star.description}</span>
                  </span>
                </>
              )}
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default DiscoverSection;
