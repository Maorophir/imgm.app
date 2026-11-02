/**
 * What every trailer's <video> needs, on Discover and the home page.
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
