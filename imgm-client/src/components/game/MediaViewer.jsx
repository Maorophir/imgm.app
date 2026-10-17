/**
 * MediaViewer — a game's trailer and screenshots in one big viewer, with a row of
 * thumbnails under it (the game page's header, beside the facts).
 *
 * The order: the best video first, then every screenshot, then the other videos (up to
 * three in all, picked by pickVideos). A video plays right in the viewer (YouTube's
 * no-cookie player); a screenshot opens big (Lightbox).
 *
 * Our own touches on the store-page idea:
 *   a highlight reel   the viewer moves on by itself every few seconds: the active
 *                      thumbnail's timer line fills up (its end moves the reel on) and
 *                      the picture drifts slowly closer. It waits while the pointer or
 *                      focus is on it, while a video plays or a screenshot is open, and
 *                      never runs for people who ask their device for less motion.
 *   a rarity frame     the viewer is edged in the game's IMGM tier, like a card (a plain
 *                      hairline before anyone has rated it)
 *
 * Renders nothing for a game with no screenshots or videos.
 */
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Play } from 'lucide-react';
import Lightbox from './Lightbox';
import { pickVideos } from './pickVideos';
import { getRarity } from '../reviewQuest/questOptions';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

const REEL_TIME = '6s'; // how long each picture stays before the reel moves on

const thumb = (url) => url.replace('/t_1080p/', '/t_screenshot_med/');
const youtubePoster = (id, size = 'maxresdefault') => `https://i.ytimg.com/vi/${id}/${size}.jpg`;

const MediaViewer = ({ game }) => {
  const videos = pickVideos(game.videos ?? [], 3);
  const shots = game.screenshots ?? [];
  // The best video opens the reel, then the screenshots, then the other videos
  const asVideo = (v) => ({ kind: 'video', key: v.youtubeId, name: v.name, poster: youtubePoster(v.youtubeId), small: youtubePoster(v.youtubeId, 'mqdefault') });
  const items = [
    ...videos.slice(0, 1).map(asVideo),
    ...shots.map((url, n) => ({ kind: 'shot', key: url, n, poster: url, small: thumb(url) })),
    ...videos.slice(1).map(asVideo),
  ];

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false); // a video is playing in the viewer
  const [held, setHeld] = useState(false); // pointer or focus on the viewer: the reel waits
  const [open, setOpen] = useState(null); // the screenshot open big, or null
  const reducedMotion = usePrefersReducedMotion();
  const stripRef = useRef(null);

  // Keep the active thumbnail in view (sideways only: the page itself never moves)
  useEffect(() => {
    const strip = stripRef.current;
    const active = strip?.children[index];
    if (!active) return;
    strip.scrollTo({ left: active.offsetLeft - strip.clientWidth / 2 + active.clientWidth / 2, behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [index, reducedMotion]);

  if (items.length === 0) return null;
  const item = items[index];
  const running = items.length > 1 && !playing && !held && open === null && !reducedMotion;
  const go = (next) => {
    setPlaying(false);
    setIndex((next + items.length) % items.length);
  };
  // A thumbnail: a video starts playing, a screenshot just shows
  const choose = (i) => {
    go(i);
    if (items[i].kind === 'video') setPlaying(true);
  };

  // The tier's edge, like a card's; a quiet hairline before anyone has rated it
  const average = game.ratings?.imgm;
  const tier = average != null && game.reviewStats?.count ? getRarity(average) : null;
  const frame = tier ? `linear-gradient(135deg, ${tier.edge}, ${tier.color} 45%, ${tier.edge})` : '#2e2a25';

  const arrow =
    'absolute top-1/2 -translate-y-1/2 w-11 h-11 grid place-items-center rounded-sm bg-slate-950/80 border border-slate-500 text-white hover:border-white opacity-0 group-hover/viewer:opacity-100 focus-visible:opacity-100 transition-opacity duration-120';

  return (
    <div
      className="min-w-0"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setHeld(false)}
    >
      <div className="rounded-sm p-0.5" style={{ background: frame }}>
        <div className="group/viewer relative aspect-video overflow-hidden rounded-[1px] bg-slate-950">
          {item.kind === 'video' && playing ? (
            <iframe
              key={item.key}
              src={`https://www.youtube-nocookie.com/embed/${item.key}?autoplay=1&rel=0`}
              title={item.name}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          ) : (
            <button
              type="button"
              onClick={() => (item.kind === 'video' ? setPlaying(true) : setOpen(item.n))}
              aria-label={item.kind === 'video' ? `Play ${item.name}` : `Open screenshot ${item.n + 1} big`}
              className="absolute inset-0 animate-fade-in"
              key={item.key}
            >
              <img
                src={item.poster}
                alt=""
                onError={(e) => item.kind === 'video' && (e.currentTarget.src = youtubePoster(item.key, 'hqdefault'))}
                className="w-full h-full object-cover animate-reel-drift motion-reduce:animate-none"
                style={{ '--reel-time': REEL_TIME, animationPlayState: running ? 'running' : 'paused' }}
              />
              {item.kind === 'video' && (
                <span className="absolute inset-0 grid place-items-center">
                  <span className="w-18 h-18 grid place-items-center rounded-full bg-slate-950/75 border border-white/70 hover:bg-slate-950/90 transition-colors">
                    <Play className="w-7 h-7 text-white translate-x-0.5" fill="currentColor" aria-hidden="true" />
                  </span>
                </span>
              )}
            </button>
          )}

          {/* The bottom line: the video's name, and where the reel is */}
          {!(item.kind === 'video' && playing) && (
            <div key={`say-${item.key}`} className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 px-4 pt-14 pb-3 sm:px-5 sm:pb-4 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent animate-fade-in">
              {item.kind === 'video' ? <p className="text-sm font-semibold text-white">{item.name}</p> : <span />}
              <span className="shrink-0 text-xs tabular-nums text-slate-300">{index + 1} / {items.length}</span>
            </div>
          )}

          {items.length > 1 && !(item.kind === 'video' && playing) && (
            <>
              <button type="button" onClick={() => go(index - 1)} aria-label="Previous" className={`${arrow} left-3`}>
                <ArrowLeft className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => go(index + 1)} aria-label="Next" className={`${arrow} right-3`}>
                <ArrowRight className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* The thumbnails: the active one ivory-edged, with the reel's timer filling under it */}
      <div ref={stripRef} className="relative mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {items.map((it, i) => (
          <button
            key={it.key}
            type="button"
            onClick={() => choose(i)}
            aria-label={it.kind === 'video' ? `Play ${it.name}` : `Screenshot ${it.n + 1}`}
            aria-current={i === index}
            className={`relative shrink-0 w-[112px] sm:w-[124px] aspect-video overflow-hidden rounded-xs border transition-[border-color,opacity] duration-120 ${
              i === index ? 'border-white' : 'border-slate-700 opacity-60 hover:opacity-100'
            }`}
          >
            <img src={it.small} alt="" loading="lazy" className="w-full h-full object-cover" />
            {it.kind === 'video' && (
              <span className="absolute inset-0 grid place-items-center bg-slate-950/30">
                <Play className="w-5 h-5 text-white" fill="currentColor" aria-hidden="true" />
              </span>
            )}
            {i === index && running && (
              <span
                className="absolute left-0 right-0 bottom-0 h-[3px] bg-brand origin-left animate-reel-timer"
                style={{ '--reel-time': REEL_TIME }}
                onAnimationEnd={() => go(index + 1)}
                aria-hidden="true"
              />
            )}
          </button>
        ))}
      </div>

      {open !== null && <Lightbox images={shots} index={open} onChange={setOpen} onClose={() => setOpen(null)} />}
    </div>
  );
};

export default MediaViewer;
