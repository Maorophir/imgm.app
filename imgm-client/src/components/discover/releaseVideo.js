/**
 * releaseVideo — lets the browser drop a trailer's video once it's gone from the page.
 *
 * Safari (every iPhone) keeps a removed <video> loading and holding its player until
 * it's tidied up much later, and an iPhone only allows a few players at a time: after
 * a few dozen swipes the leftovers crowded out new trailers (Upcoming, the feed watched
 * second, barely played). Emptying its address and calling load() stops it at once.
 */
export const releaseVideo = (el) => {
  if (!el) return;
  el.pause();
  el.removeAttribute('src');
  el.load();
};
