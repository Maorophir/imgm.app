/**
 * What every trailer's <video> needs, on Discover and the home page, and the players
 * Discover's trailers share (see below).
 *
 * playsStreamsItself — whether to hand the browser the stream (HLS) to play itself, or
 * play it through hls.js. Only where hls.js can't run (an iPhone has no MediaSource):
 * Chrome on a computer plays streams itself too now, but it starts on the smallest one
 * whatever the playlist says, so an Xbox trailer sat at 180p for 7 seconds; hls.js
 * starts where it's told.
 *
 * releaseVideo — lets the browser drop a trailer's video once it's gone from the page.
 * Safari (every iPhone) keeps a removed <video> loading and holding its player until
 * it's tidied up much later, and an iPhone only allows a few players at a time: after
 * a few dozen swipes the leftovers crowded out new trailers (Upcoming, the feed watched
 * second, barely played). Emptying its address and calling load() stops it at once.
 */
export const playsStreamsItself = (el) => !window.MediaSource && Boolean(el.canPlayType('application/vnd.apple.mpegurl'));

export const releaseVideo = (el) => {
  if (!el) return;
  el.pause();
  el.removeAttribute('src');
  el.load();
};

// ── Discover's shared players ──
// An iPhone plays a video with sound only if that same <video> was once started by a
// tap. With a new <video> per game, the sound the player turned on was refused for the
// next trailers now and then (muted again, a tap each time). So Discover's trailers
// borrow from a few players kept for the whole visit, and every tap on a trailer starts
// them all for an instant (unlockVideos): from then on any of them may play with sound.
// Four: the game on screen and the next one use two, with room for a fast swipe.
const POOL = 4;
const free = [];
const lent = new Set();

const makeVideo = () => {
  const el = document.createElement('video');
  el.muted = true;
  el.playsInline = true;
  el.setAttribute('playsinline', '');
  el.loop = true;
  return el;
};

export const borrowVideo = () => {
  const el = free.pop() ?? makeVideo();
  lent.add(el);
  return el;
};

export const returnVideo = (el) => {
  lent.delete(el);
  el.remove();
  releaseVideo(el);
  el.removeAttribute('aria-label');
  if (free.length < POOL) free.push(el);
};

// Called inside a tap (an iPhone counts only what a tap starts): every player that isn't
// playing is started and stopped at once. A free one has nothing to play, which is fine:
// the tap is what counts.
export const unlockVideos = () => {
  while (free.length + lent.size < POOL) free.push(makeVideo());
  for (const el of [...free, ...lent]) {
    if (!el.paused) continue;
    if (!lent.has(el)) el.muted = false;
    el.play().catch(() => {});
    el.pause();
  }
};
