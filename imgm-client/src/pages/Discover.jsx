/**
 * Discover — Route: /discover
 *
 * A full-height feed of games, one per screen, snapping like Reels or TikTok: swipe or
 * scroll for the next one. The game on screen plays its trailer (muted) edge to edge,
 * cropped to fill the screen like a phone video: Steam's (no ads) when the game is on
 * Steam, YouTube's otherwise. The others wait as their key art, so only one video ever
 * loads at a time. A game rated for adults asks "18 or older?" first (once per device). Over it, at the bottom:
 * when it's out ("Out in 12 days", "Coming 2027" when IGDB knows only the year), the
 * title, the IMGM verdict and a line about it.
 *
 * Beside that, the actions:
 *   Thumbs up     a vote (GET/PUT /api/discover/votes), with its count; tap again to
 *                 take it back
 *   Thumbs down   the same: just an opinion, the game stays on screen
 *   Want it       the real Backlog (logged out: log in, then back here)
 *   Played it?    a 1–10 picker: one tap saves the score as a quick review, and the card
 *                 pops up, with Add details (the quest). A game the player has rated
 *                 says "Your 8" instead and opens their review: a one-tap score never
 *                 replaces a written review (it's checked again just before saving).
 *   Share         the game's page (the phone's share sheet, or the link copied)
 *
 * The trailer: tapping it the first time turns the sound on; after that a tap pauses
 * or plays it. The speaker button mutes and unmutes. Sound stays as set from game to
 * game. A timeline along the bottom edge moves through the video (drag or tap). None of
 * it reloads the video (it would start over): the player is told what to do.
 *
 * Feeds (GET /api/games/discover, IGDB's popularity rankings): Hot Now (released in the
 * last 2 years, what people are into right now) and Upcoming (the next year's most
 * wishlisted, the hottest first).
 * Each feed reopens where the player left it (remembered on the device); the arrow at
 * the top left, or the feed's own tab, goes back to its first game; after the last one,
 * "That's all for now" offers the top and the other feeds.
 *
 * On a phone the feed covers the whole screen, the site's header too, like an app: an X
 * at the top left leaves, and the first tap (sound on) also asks for the browser's full
 * screen where there is one (Android; not iPhones). On a computer, a button does that.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUp, BookmarkCheck, BookmarkPlus, ChevronDown, Maximize, Minimize, Play, Share2, Star, ThumbsDown, ThumbsUp, Volume2, VolumeX, X } from 'lucide-react';
import { getDiscoverGames, getDiscoverVotes, getMyReview, saveReview, voteOnGame } from '../lib/api';
import CollectibleCard from '../components/CollectibleCard';
import { useSession } from '../lib/authClient';
import { useBacklog } from '../context/BacklogContext';
import { pickVideos } from '../components/game/pickVideos';
import { getRarity } from '../components/reviewQuest/questOptions';
import RarityMark from '../components/RarityMark';
import { GHOST_BUTTON, GHOST_BUTTON_SM, PRIMARY_BUTTON, SEGMENTS, segment, TEXT_LINK } from '../lib/ui';

const DAY = 24 * 60 * 60 * 1000;
// "I'm 18 or older", remembered on this device (storage can be off: then it's asked again)
const MATURE_OK = 'imgm.discover.matureOk';
const readMatureOk = () => {
  try {
    return localStorage.getItem(MATURE_OK) === 'yes';
  } catch {
    return false;
  }
};
const FEEDS = [
  { key: 'hot', label: 'Hot Now' }, // released games people are into right now
  { key: 'upcoming', label: 'Upcoming' }, // the next year's most wishlisted, hottest first
];

// Where the player left each feed (the game on screen), so coming back carries on there
const PLACES = 'imgm.discover.places';
const readPlaces = () => {
  try {
    return JSON.parse(localStorage.getItem(PLACES)) ?? {};
  } catch {
    return {};
  }
};
const savePlace = (feed, gameId) => {
  try {
    localStorage.setItem(PLACES, JSON.stringify({ ...readPlaces(), [feed]: gameId }));
  } catch { /* this visit only */ }
};

// A phone (upright, or on its side): the feed takes the whole screen, over the site's
// header, like an app
const PHONE = '(max-width: 767px), (max-height: 500px)';
const isPhone = () => window.matchMedia(PHONE).matches;
// The browser's own full screen (no address bar): Android and computers; iPhones have
// none for a page (there, Add to Home Screen opens the site without Safari's bars)
const canFullScreen = () => Boolean(document.fullscreenEnabled);

// 75 seconds as "1:15"
const clock = (seconds) => {
  const s = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

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

const YOUTUBE = 'https://www.youtube-nocookie.com';
// Tells the YouTube player something (mute, unMute, playVideo, pauseVideo…)
const tellPlayer = (frame, message) => frame?.contentWindow?.postMessage(JSON.stringify(message), YOUTUBE);
const command = (frame, func, args = []) => tellPlayer(frame, { event: 'command', func, args });
const YT_PLAYING = 1; // the player's states, as it reports them
const YT_PAUSED = 2;

const HAVE_CURRENT_DATA = 2; // a video's readyState once it has a frame to show

// Starts a video. Only the browser refusing sound without a tap (NotAllowedError) turns
// the sound off for the feed; any other failure (nothing loaded yet) waits for canplay.
const startVideo = (el, onSoundBlocked) =>
  el.play().catch((error) => {
    if (error?.name !== 'NotAllowedError' || el.muted) return;
    el.muted = true;
    onSoundBlocked();
    el.play().catch(() => {});
  });

// A Steam trailer, streamed from Steam's own video servers (HLS: no ads, no logo).
// Safari and iPhones play the stream themselves; other browsers through hls.js, loaded
// only when it's needed. Sound and pausing are the video's own.
const SteamTrailer = ({ trailer, title, muted, paused, seek, onFail, onSoundBlocked, onProgress }) => {
  const video = useRef(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const el = video.current;
    let hls = null;
    let gone = false;
    if (el.canPlayType('application/vnd.apple.mpegurl')) el.src = trailer.hls;
    else {
      import('hls.js')
        .then(({ default: Hls }) => {
          if (gone) return;
          if (!Hls.isSupported()) return onFail();
          hls = new Hls({ capLevelToPlayerSize: true }); // no 1080p stream for a phone
          hls.on(Hls.Events.ERROR, (_, data) => data.fatal && onFail());
          hls.loadSource(trailer.hls);
          hls.attachMedia(el);
        })
        .catch(onFail);
    }
    return () => {
      gone = true;
      hls?.destroy();
    };
  }, [trailer.hls, onFail]);
  useEffect(() => {
    video.current.muted = muted;
  }, [muted]);
  useEffect(() => {
    const el = video.current;
    if (paused) el.pause();
    else if (el.readyState >= HAVE_CURRENT_DATA) startVideo(el, onSoundBlocked); // else onCanPlay starts it
  }, [paused, onSoundBlocked]);
  // The timeline moved: jump there
  useEffect(() => {
    if (seek) video.current.currentTime = seek.to;
  }, [seek]);
  return (
    <video
      ref={video}
      aria-label={title}
      muted
      playsInline
      loop
      // Started here, once there's something to play (not before: that "fails" too early)
      onCanPlay={() => !paused && startVideo(video.current, onSoundBlocked)}
      onPlaying={() => setReady(true)}
      onTimeUpdate={(e) => onProgress(e.currentTarget.currentTime, e.currentTarget.duration)}
      onError={onFail}
      // Hidden until it plays, so the key art shows instead of a black box
      className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'}`}
    />
  );
};

// A YouTube trailer, edge to edge: for games Steam has no trailer of. Its address is fixed
// once it starts (a new address would restart it), so sound and pausing go to the player
// as messages. If YouTube won't play it here (an age-restricted video, or one its owner
// keeps off other sites), it says so, and the key art stays instead of an error screen.
// It always starts muted: iPhones only start a video by themselves without sound (with
// sound, YouTube's own play button waits for a tap), and the sound comes on once it plays.
// It shows only once it's really playing, so its play button never does.
const YouTubeTrailer = ({ video, title, muted, paused, seek, tries, onFail, onSoundBlocked, onStuck, onProgress }) => {
  const frame = useRef(null);
  const [ready, setReady] = useState(false); // the player takes messages
  const [playing, setPlaying] = useState(false); // it has played: show it
  const [src] = useState(
    () => `${YOUTUBE}/embed/${video.youtubeId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${video.youtubeId}&playsinline=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&enablejsapi=1`
  );
  // What the page last asked for, for the player's messages below
  const asked = useRef({ muted, paused });
  useEffect(() => {
    asked.current = { muted, paused };
  }, [muted, paused]);
  useEffect(() => {
    let duration = 0; // YouTube sends it once, the time many times a second
    let state = null;
    const heard = (event) => {
      if (event.source !== frame.current?.contentWindow) return;
      try {
        const message = JSON.parse(event.data);
        if (message?.event === 'onError') onFail();
        const info = message?.event === 'infoDelivery' || message?.event === 'initialDelivery' ? message.info : null;
        if (info?.duration) duration = info.duration;
        if (typeof info?.currentTime === 'number') onProgress(info.currentTime, duration);
        const now = message?.event === 'onStateChange' ? message.info : info?.playerState;
        if (typeof now !== 'number' || now === state) return;
        state = now;
        if (now === YT_PLAYING) {
          setPlaying(true);
          onStuck(false);
        }
        // Paused, but not by the page: the browser stopped it when the sound came on
        // (iPhones want a tap for that). It carries on muted, and the speaker says so.
        if (now === YT_PAUSED && !asked.current.paused && !asked.current.muted) {
          command(frame.current, 'mute');
          command(frame.current, 'playVideo');
          onSoundBlocked();
        }
      } catch { /* not one of YouTube's messages */ }
    };
    window.addEventListener('message', heard);
    return () => window.removeEventListener('message', heard);
  }, [onFail, onProgress, onSoundBlocked, onStuck]);
  // Not playing a few seconds after loading (an iPhone in Low Power Mode starts no video
  // by itself): the page shows its own play button, and the next tap starts it
  useEffect(() => {
    if (!ready || playing) return undefined;
    const wait = setTimeout(() => onStuck(true), 3500);
    return () => clearTimeout(wait);
  }, [ready, playing, onStuck]);
  // The timeline moved: jump there
  useEffect(() => {
    if (seek) command(frame.current, 'seekTo', [seek.to, true]);
  }, [seek]);
  // Sound once it plays (before that, an unmuted start is what iPhones refuse)
  useEffect(() => {
    if (!ready) return;
    if (muted || !playing) command(frame.current, 'mute');
    else {
      command(frame.current, 'unMute');
      command(frame.current, 'setVolume', [100]);
    }
  }, [muted, ready, playing]);
  // (a tap also starts a trailer that didn't start by itself)
  useEffect(() => {
    if (ready) command(frame.current, paused ? 'pauseVideo' : 'playVideo');
  }, [paused, muted, tries, ready]);
  useEffect(() => () => onStuck(false), [onStuck]); // its play button goes with it
  return (
    <iframe
      ref={frame}
      title={title}
      src={src}
      allow="autoplay; encrypted-media; picture-in-picture"
      onLoad={() => {
        setReady(true);
        tellPlayer(frame.current, { event: 'listening', id: 1, channel: 'widget' }); // send us its time, state and errors
      }}
      // Hidden until it plays, so the key art shows instead of a black box or a play button
      className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none border-0 transition-opacity duration-500 ${playing ? 'opacity-100' : 'opacity-0'}`}
      style={COVER_VIDEO}
    />
  );
};

// A round action on the rail: icon over a short word, 44px+ to tap
const RAIL = 'flex flex-col items-center gap-1 min-w-14 text-xs font-medium text-white [text-shadow:0_1px_3px_rgb(0_0_0/.8)]';
const RAIL_ICON = 'grid place-items-center w-12 h-12 rounded-full border border-white/40 bg-slate-950/50 backdrop-blur-sm hover:border-white transition-colors duration-120';

const Slide = ({ game, now, active, muted, paused, clear, votes, matureOk, onConfirmAge, onTapVideo, onToggleMute, onSoundBlocked, onVote, onRated }) => {
  const backlog = useBacklog();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [rating, setRating] = useState(false); // the score picker is open
  const [shared, setShared] = useState(false);
  const [saving, setSaving] = useState(null); // the score being saved
  const [problem, setProblem] = useState(null);
  const [popped, setPopped] = useState(null); // the score just saved: its card pops up
  const myRating = votes?.myRating ?? null;
  // The trailer's timeline: where it is, and where the player moved it to (a new object
  // each time, so picking the same spot twice still jumps)
  const [progress, setProgress] = useState({ time: 0, duration: 0 });
  const [seek, setSeek] = useState(null);
  const [scrubbing, setScrubbing] = useState(null); // the time under the finger while dragging
  const onProgress = useCallback((time, duration) => setProgress({ time, duration: Number.isFinite(duration) ? duration : 0 }), []);
  const shownTime = scrubbing ?? progress.time;
  const video = useMemo(() => pickVideos(game.videos ?? [], 1)[0] ?? null, [game.videos]);
  // Steam's trailer first (no ads), YouTube's when there's none or it won't play
  const [steamFailed, setSteamFailed] = useState(false);
  const [youtubeFailed, setYoutubeFailed] = useState(false);
  const failSteam = useCallback(() => setSteamFailed(true), []);
  const failYoutube = useCallback(() => setYoutubeFailed(true), []);
  const [stuck, setStuck] = useState(false); // a trailer that didn't start by itself
  const [tries, setTries] = useState(0); // taps on it to start it (with the sound already on)
  const source = game.steamTrailer && !steamFailed ? 'steam' : video && !youtubeFailed ? 'youtube' : null;
  // A game rated for adults waits for the viewer to say they're 18 or older
  const gated = game.mature && !matureOk;
  const art = game.artworks?.[0] ?? game.screenshots?.[0] ?? game.coverUrl;
  const score = game.ratings?.imgm;
  const rarity = typeof score === 'number' && game.reviewCount > 0 ? getRarity(score) : null;
  const saved = backlog?.has(game.id);
  const upcoming = game.releaseDate && new Date(game.releaseDate).getTime() > now;

  const want = () => {
    if (!backlog?.loggedIn) return navigate(`/login?redirect=${encodeURIComponent(pathname)}`);
    backlog.toggle(game.id);
  };
  // Played it? One tap saves the score as a quick review (logged out: log in first).
  // A review written since the page loaded is never replaced: it's checked again here.
  const rate = async (score) => {
    if (!backlog?.loggedIn) return navigate(`/login?redirect=${encodeURIComponent(pathname)}`);
    setSaving(score);
    setProblem(null);
    try {
      const existing = await getMyReview(game.id).catch(() => null);
      if (existing?.rating) {
        onRated(existing.rating);
      } else {
        await saveReview({ gameId: game.id, rating: score });
        onRated(score);
        setPopped(score);
      }
      setRating(false);
    } catch (error) {
      setProblem(error?.data?.error ?? "Couldn't save your score. Please try again.");
    } finally {
      setSaving(null);
    }
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
          it keeps swipes and scrolls for the feed: its first tap turns the sound on,
          then taps pause and play. */}
      {active && !gated && source === 'steam' && (
        <SteamTrailer
          trailer={game.steamTrailer}
          title={`${game.title}: ${game.steamTrailer.name}`}
          muted={muted}
          paused={paused}
          seek={seek}
          onFail={failSteam}
          onSoundBlocked={onSoundBlocked}
          onProgress={onProgress}
        />
      )}
      {active && !gated && source === 'youtube' && (
        <YouTubeTrailer
          key={video.youtubeId}
          video={video}
          title={`${game.title}: ${video.name}`}
          muted={muted}
          paused={paused}
          seek={seek}
          onFail={failYoutube}
          onSoundBlocked={onSoundBlocked}
          onStuck={setStuck}
          tries={tries}
          onProgress={onProgress}
        />
      )}
      <button
        type="button"
        onClick={stuck && !muted && !paused ? () => setTries((n) => n + 1) : onTapVideo}
        aria-label={stuck ? 'Play the trailer' : muted ? 'Turn the sound on' : paused ? 'Play the trailer' : 'Pause the trailer'}
        className="absolute inset-0 cursor-pointer"
      />
      {active && (paused || stuck) && source && !gated && (
        <span aria-hidden="true" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 grid place-items-center w-20 h-20 rounded-full bg-slate-950/60 backdrop-blur-sm text-white pointer-events-none">
          <Play className="w-9 h-9 translate-x-0.5" strokeWidth={1.6} />
        </span>
      )}

      {/* The trailer's timeline along the bottom edge: drag it, or tap a spot, to move
          through the video (it stays above the tap layer, so it never pauses it) */}
      {active && !gated && source && progress.duration > 0 && (
        // (short of the bottom-right corner, where the site's Feedback button sits, unless
        // the feed covers the whole screen)
        <div className={`absolute inset-x-0 bottom-0 z-2 flex items-center gap-3 pl-4 sm:pl-8 ${clear ? 'pr-4 sm:pr-8' : 'pr-16 sm:pr-40'}`}>
          <input
            type="range"
            min={0}
            max={progress.duration}
            step={0.1}
            value={shownTime}
            onChange={(e) => {
              const to = Number(e.target.value);
              setScrubbing(to);
              setSeek({ to });
            }}
            onPointerUp={() => setScrubbing(null)}
            onKeyUp={() => setScrubbing(null)}
            onBlur={() => setScrubbing(null)}
            aria-label={`${game.title} trailer timeline`}
            aria-valuetext={`${clock(shownTime)} of ${clock(progress.duration)}`}
            className="discover-timeline flex-1"
            style={{ '--done': `${Math.min(100, (shownTime / progress.duration) * 100)}%` }}
          />
          <span className="shrink-0 text-xs tabular-nums text-slate-200 [text-shadow:0_1px_3px_rgb(0_0_0/.8)]">
            {clock(shownTime)} / {clock(progress.duration)}
          </span>
        </div>
      )}

      {/* Rated for adults: the trailer waits for a tap that says the viewer is 18 or older
          (remembered on this device), like Steam's own age check. On a phone it stays
          clear of the actions on the right. */}
      {gated && source && (
        <div className="absolute inset-x-0 top-[22%] z-1 flex justify-center pl-4 pr-20 sm:px-4">
          <div className="max-w-[360px] w-full text-center rounded-sm border border-white/30 bg-slate-950/75 backdrop-blur-sm px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-300">Mature trailer</p>
            <p className="mt-1 text-sm text-slate-200">This game is rated for adults (M / 18+).</p>
            <button type="button" onClick={onConfirmAge} className={`${GHOST_BUTTON_SM} mt-3`}>
              I'm 18 or older: play it
            </button>
          </div>
        </div>
      )}

      {/* Shades so the words read over any video: the top (the feeds) and the bottom */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-slate-950/70 to-transparent pointer-events-none" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent pointer-events-none" />

      {/* What it is, and the actions, over the bottom of the video */}
      <div className="absolute inset-x-0 bottom-0 px-4 pb-16 sm:px-8 pointer-events-none">
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
                <span>
                  {upcoming
                    ? 'Not out yet: save it for launch day.'
                    : myRating !== null
                      ? `Your ${myRating} is its first score on IMGM.`
                      : 'No IMGM rating yet. Played it? Be the first.'}
                </span>
              )}
              {game.platforms?.length > 0 && <span className="hidden sm:inline">· {game.platforms.slice(0, 4).join(', ')}</span>}
            </p>
            {game.description && <p className="mt-2 max-w-[620px] text-sm text-slate-300 line-clamp-2">{game.description}</p>}

            {/* Played it? One tap on a score saves it */}
            {rating && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 animate-fade-in" role="group" aria-label={`Your score for ${game.title}`}>
                <span className="text-sm text-slate-200 mr-1">Your score:</span>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                  const tier = getRarity(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => rate(n)}
                      disabled={saving !== null}
                      className={`grid place-items-center w-10 h-10 rounded-sm border bg-slate-950/60 text-sm font-semibold tabular-nums transition-colors duration-120 hover:border-(--ink) hover:text-(--ink) disabled:opacity-50 ${
                        saving === n ? 'border-(--ink) text-(--ink)' : 'border-white/30 text-white'
                      }`}
                      style={{ '--ink': tier.color }}
                      aria-label={`${n} out of 10, ${tier.label}`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            )}
            {problem && <p role="alert" className="mt-2 text-sm text-red-200">{problem}</p>}

            {/* Saved: the card the score earned, and the way to the full review */}
            {popped && (
              <div
                role="status"
                className="mt-3 flex w-fit items-center gap-3 rounded-sm border border-(--ink) bg-slate-950/85 p-2 pr-4 animate-pop"
                style={{ '--ink': getRarity(popped).color }}
              >
                <div className="w-14 shrink-0">
                  <CollectibleCard variant="mini" title={game.title} score={popped} coverUrl={game.coverUrl} />
                </div>
                <div className="text-sm">
                  <p className="text-white">
                    Rated {popped} · <span className="text-(--ink)">{getRarity(popped).label}</span>. The card is yours.
                  </p>
                  <Link to={`/game/${game.id}/review`} className={`inline-flex items-center min-h-11 font-medium text-white ${TEXT_LINK}`}>
                    Add details
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* The actions */}
          <div className="shrink-0 flex flex-col items-center gap-3 pointer-events-auto">
            <button type="button" onClick={() => onVote(votes?.mine === 1 ? 0 : 1)} aria-pressed={votes?.mine === 1} aria-label={`Thumbs up: ${votes?.up ?? 0}`} className={RAIL}>
              <span className={`${RAIL_ICON} ${votes?.mine === 1 ? 'border-white bg-white/15' : ''}`}>
                <ThumbsUp className="w-5 h-5" strokeWidth={1.8} fill={votes?.mine === 1 ? 'currentColor' : 'none'} />
              </span>
              <span className="tabular-nums">{(votes?.up ?? 0).toLocaleString('en-US')}</span>
            </button>
            <button
              type="button"
              onClick={() => onVote(votes?.mine === -1 ? 0 : -1)}
              aria-pressed={votes?.mine === -1}
              aria-label={`Thumbs down: ${votes?.down ?? 0}`}
              className={RAIL}
            >
              <span className={`${RAIL_ICON} ${votes?.mine === -1 ? 'border-white bg-white/15' : ''}`}>
                <ThumbsDown className="w-5 h-5" strokeWidth={1.8} fill={votes?.mine === -1 ? 'currentColor' : 'none'} />
              </span>
              <span className="tabular-nums">{(votes?.down ?? 0).toLocaleString('en-US')}</span>
            </button>
            <button type="button" onClick={want} aria-pressed={Boolean(saved)} className={RAIL}>
              <span className={`${RAIL_ICON} ${saved ? 'border-white bg-white/15' : ''}`}>
                {saved ? <BookmarkCheck className="w-5 h-5" strokeWidth={1.8} /> : <BookmarkPlus className="w-5 h-5" strokeWidth={1.8} />}
              </span>
              {saved ? 'Saved' : 'Want it'}
            </button>
            {!upcoming && myRating !== null && (
              // Rated already: their score, which opens their review (never a new one-tap score)
              <Link to={`/game/${game.id}/review`} className={RAIL} style={{ '--ink': getRarity(myRating).color }}>
                <span className={`${RAIL_ICON} border-(--ink) text-(--ink) font-display text-[22px] leading-none`}>{myRating}</span>
                Your {myRating}
              </Link>
            )}
            {!upcoming && myRating === null && (
              <button type="button" onClick={() => setRating((open) => !open)} aria-expanded={rating} className={RAIL}>
                <span className={`${RAIL_ICON} ${rating ? 'border-white' : ''}`}><Star className="w-5 h-5" strokeWidth={1.8} /></span>
                Played it?
              </button>
            )}
            <button type="button" onClick={share} className={RAIL}>
              <span className={RAIL_ICON}><Share2 className="w-5 h-5" strokeWidth={1.8} /></span>
              {shared ? 'Copied' : 'Share'}
            </button>
          </div>
        </div>
      </div>

      {/* Sound, for the whole feed */}
      <button type="button" onClick={onToggleMute} aria-label={muted ? 'Turn the sound on' : 'Mute'} className="absolute top-3 right-4 sm:right-8 grid place-items-center w-11 h-11 rounded-full bg-slate-950/50 backdrop-blur-sm border border-white/40 text-white hover:border-white">
        {muted ? <VolumeX className="w-5 h-5" strokeWidth={1.8} /> : <Volume2 className="w-5 h-5" strokeWidth={1.8} />}
      </button>
    </section>
  );
};

function Discover() {
  const [feed, setFeed] = useState('hot');
  const [lists, setLists] = useState({}); // feed -> games ([] if it couldn't load)
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false); // the game on screen's trailer
  const [matureOk, setMatureOk] = useState(readMatureOk);
  const confirmAge = () => {
    setMatureOk(true);
    try {
      localStorage.setItem(MATURE_OK, 'yes');
    } catch { /* this visit only */ }
  };
  // The browser played the trailer muted after all: the speaker shows it
  const soundBlocked = useCallback(() => setMuted(true), []);
  const [votes, setVotes] = useState({}); // gameId -> { up, down, mine }
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [height, setHeight] = useState(null);
  const [phone, setPhone] = useState(isPhone);
  const [full, setFull] = useState(false); // in the browser's full screen
  const page = useRef(null);
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

  // The feed fills the screen under the site's header; on a phone, or in full screen,
  // the whole screen (dvh: what's left beside the browser's own bars, as they come and go)
  useEffect(() => {
    const fit = () => {
      const whole = isPhone() || document.fullscreenElement === page.current;
      setPhone(isPhone());
      setFull(document.fullscreenElement === page.current);
      if (whole) setHeight('100dvh');
      else if (scroller.current) setHeight(window.innerHeight - scroller.current.getBoundingClientRect().top - window.scrollY);
    };
    fit();
    window.addEventListener('resize', fit);
    document.addEventListener('fullscreenchange', fit);
    return () => {
      window.removeEventListener('resize', fit);
      document.removeEventListener('fullscreenchange', fit);
    };
  }, []);

  // Over the site, the page under it stays put (no scrolling it from behind the feed)
  useEffect(() => {
    if (!phone) return undefined;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = before;
    };
  }, [phone]);

  const toggleFullScreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    else page.current?.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => {});
  };
  // Out of Discover, on a phone: back where the player came from on IMGM, or home
  const leave = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'));

  // Only games with a trailer to play
  const list = useMemo(() => (games ?? []).filter((g) => g.videos?.length), [games]);

  // Which game is on screen: the one most of the feed shows
  useEffect(() => {
    const box = scroller.current;
    if (!box) return undefined;
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = Number(entry.target.dataset.index);
          setActive(index);
          setPaused(false); // a new game on screen plays
          if (list[index]) savePlace(feed, list[index].id); // (not the closing card)
        }),
      { root: box, threshold: 0.6 }
    );
    box.querySelectorAll('[data-index]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [list, feed]);

  // Opening a feed (this visit or a later one) starts where the player left it, or at
  // its first game when that game has left the feed
  const restored = useRef(null); // the feed whose place has been put back
  useEffect(() => {
    if (!games || restored.current === feed) return;
    restored.current = feed;
    const box = scroller.current;
    const index = list.findIndex((g) => g.id === readPlaces()[feed]);
    const slide = index > 0 ? box?.querySelector(`[data-index="${index}"]`) : null;
    box?.scrollTo({ top: slide ? slide.offsetTop : 0 });
  }, [games, list, feed]);

  // The votes on this feed's games, and the player's own (again after logging in or out)
  useEffect(() => {
    if (list.length === 0) return undefined;
    const controller = new AbortController();
    getDiscoverVotes(list.map((g) => g.id), controller.signal)
      .then((found) => setVotes((all) => ({ ...all, ...found })))
      .catch(() => {}); // the buttons just show 0
    return () => controller.abort();
  }, [list, userId]);

  // A vote shows at once, then the server's count replaces it (or the old one comes back)
  const vote = async (gameId, value) => {
    if (!userId) return navigate(`/login?redirect=${encodeURIComponent(pathname)}`);
    const before = votes[gameId] ?? { up: 0, down: 0, mine: 0 };
    const after = { ...before, mine: value };
    if (before.mine === 1) after.up -= 1;
    if (before.mine === -1) after.down -= 1;
    if (value === 1) after.up += 1;
    if (value === -1) after.down += 1;
    setVotes((all) => ({ ...all, [gameId]: after }));
    try {
      const saved = await voteOnGame(gameId, value);
      setVotes((all) => ({ ...all, [gameId]: saved }));
    } catch {
      setVotes((all) => ({ ...all, [gameId]: before }));
    }
  };

  // The first tap on a trailer turns the sound on (and, on a phone that can, goes full
  // screen: no address bar, like an app); after that, taps pause and play
  const tapVideo = () => {
    if (muted) {
      setMuted(false);
      setPaused(false);
      if (phone && canFullScreen() && !document.fullscreenElement) toggleFullScreen();
    } else setPaused((p) => !p);
  };

  // Scrolls the feed itself to a game (scrollIntoView would also nudge the page, sliding
  // the feeds' tabs under the site's header)
  const goTo = (index) => {
    const box = scroller.current;
    const slide = box?.querySelector(`[data-index="${index}"]`);
    if (slide) box.scrollTo({ top: slide.offsetTop, behavior: 'smooth' });
  };
  const backToTop = () => scroller.current?.scrollTo({ top: 0, behavior: 'smooth' });
  // A feed's tab opens it where the player left it; its tab again goes back to the top
  const pickFeed = (key) => {
    if (key === feed) return backToTop();
    restored.current = null; // its place goes back once its games are in
    setFeed(key);
    setActive(0);
  };
  const feedLabel = FEEDS.find((f) => f.key === feed)?.label;

  return (
    <main ref={page} className={`bg-slate-950 ${phone ? 'fixed inset-0 z-[55]' : 'relative'}`}>
      {/* On a phone the site's header is covered: the way out */}
      {phone && (
        <button
          type="button"
          onClick={leave}
          aria-label="Leave Discover"
          className="absolute top-3 left-4 z-10 grid place-items-center w-11 h-11 rounded-full bg-slate-950/50 backdrop-blur-sm border border-white/40 text-white hover:border-white"
        >
          <X className="w-5 h-5" strokeWidth={1.8} />
        </button>
      )}

      {/* Full screen, where the browser has it (on a phone the first tap does it: no room
          up here beside the feeds) */}
      {!phone && canFullScreen() && (
        <button
          type="button"
          onClick={toggleFullScreen}
          aria-label={full ? 'Leave full screen' : 'Full screen'}
          className="absolute top-3 right-[4.25rem] sm:right-[5.25rem] z-10 grid place-items-center w-11 h-11 rounded-full bg-slate-950/50 backdrop-blur-sm border border-white/40 text-white hover:border-white"
        >
          {full ? <Minimize className="w-5 h-5" strokeWidth={1.8} /> : <Maximize className="w-5 h-5" strokeWidth={1.8} />}
        </button>
      )}

      {/* Back to the feed's first game (the hottest ones are at the top). On a phone its
          place is the way out: the feed's own tab goes back to the top there. */}
      {!phone && active > 0 && list.length > 0 && (
        <button
          type="button"
          onClick={backToTop}
          aria-label={`Back to the first game in ${feedLabel}`}
          className="absolute top-3 left-4 sm:left-8 z-10 grid place-items-center w-11 h-11 rounded-full bg-slate-950/50 backdrop-blur-sm border border-white/40 text-white hover:border-white"
        >
          <ArrowUp className="w-5 h-5" strokeWidth={1.8} />
        </button>
      )}

      {/* The feeds, floating over the top of the feed */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 max-w-[calc(100%-120px)]">
        <div className={`${SEGMENTS} bg-slate-950/60 backdrop-blur-sm`} role="tablist" aria-label="Discover feeds">
          {FEEDS.map((f) => (
            <button key={f.key} type="button" role="tab" aria-selected={feed === f.key} onClick={() => pickFeed(f.key)} className={`${segment(feed === f.key)} max-sm:px-3`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={scroller} className="overflow-y-auto snap-y snap-mandatory overscroll-contain" style={{ height: height ?? '100vh' }}>
        {games === null && <div className="h-full grid place-items-center text-slate-400">Loading games…</div>}
        {games && list.length === 0 && (
          <div className="h-full grid place-items-center text-center px-6 text-slate-300">
            <p>
              Nothing here right now.{' '}
              {FEEDS.filter((f) => f.key !== feed).map((f) => (
                <button key={f.key} type="button" onClick={() => pickFeed(f.key)} className={`font-medium text-white ${TEXT_LINK}`}>
                  See {f.label}
                </button>
              ))}
            </p>
          </div>
        )}
        {list.map((game, i) => (
          <div key={game.id} data-index={i} className="h-full">
            <Slide
              game={game}
              now={now}
              active={i === active}
              muted={muted}
              paused={paused}
              clear={phone || full}
              votes={votes[game.id]}
              onTapVideo={tapVideo}
              matureOk={matureOk}
              onConfirmAge={confirmAge}
              onToggleMute={() => setMuted((m) => !m)}
              onSoundBlocked={soundBlocked}
              onVote={(value) => vote(game.id, value)}
              onRated={(score) => setVotes((all) => ({ ...all, [game.id]: { up: 0, down: 0, mine: 0, ...all[game.id], myRating: score } }))}
            />
          </div>
        ))}

        {/* After the last game: back to the top, or another feed (it counts as a place
            of its own, so no trailer keeps playing behind it) */}
        {list.length > 0 && (
          <div data-index={list.length} className="h-full snap-start snap-always grid place-items-center px-6 text-center">
            <div className="max-w-[520px]">
              <p className="font-display uppercase text-[44px] sm:text-[64px] leading-[.88] tracking-[.005em] text-white">That's all for now</p>
              <p className="mt-3 text-slate-300">You've seen every game in {feedLabel}. The lists refresh every few hours.</p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={backToTop} className={PRIMARY_BUTTON}>Back to the top</button>
                {FEEDS.filter((f) => f.key !== feed).map((f) => (
                  <button key={f.key} type="button" onClick={() => pickFeed(f.key)} className={GHOST_BUTTON}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* A hint on the first game that there's more below */}
      {active === 0 && list.length > 1 && (
        <button type="button" onClick={() => goTo(1)} className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1 text-sm text-slate-300 hover:text-white motion-safe:animate-bounce">
          Swipe for more <ChevronDown className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </main>
  );
}

export default Discover;
