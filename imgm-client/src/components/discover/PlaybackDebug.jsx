/**
 * PlaybackDebug — what Discover's trailers are doing, over the page, for finding out why
 * an iPhone stops playing them (Playwright's browser never does, so only a real phone
 * can show it). Off for everyone: /discover?debug=1 turns it on for the tab, ?debug=0
 * turns it off.
 *
 * It only watches, so it can't change what it's watching: every <video> on the page
 * (its state, how much is loaded, its error), how many there are and how many YouTube
 * players, and the last media events (they don't bubble, but a capturing listener on
 * the document hears them all), including a play() the browser refused.
 */
import { useEffect, useState } from 'react';

const EVENTS = ['loadstart', 'loadedmetadata', 'canplay', 'playing', 'waiting', 'stalled', 'error', 'abort', 'emptied'];
const KEEP = 14; // events shown

const short = (text, n = 16) => (text ?? '?').replace(/:.*/, '').slice(0, n);
// Where a video's stream comes from: our copy of the playlist, Steam's own, or hls.js
const sourceOf = (el) => {
  const src = el.currentSrc || el.getAttribute('src') || '';
  if (!src) return 'none';
  if (src.startsWith('blob:')) return 'hls.js';
  if (src.includes('/api/discover/stream.m3u8')) return 'ours';
  if (src.includes('steamstatic')) return 'steam';
  return 'other';
};
const ahead = (el) => {
  for (let i = 0; i < el.buffered.length; i += 1) {
    if (el.buffered.start(i) <= el.currentTime && el.currentTime <= el.buffered.end(i)) return el.buffered.end(i) - el.currentTime;
  }
  return 0;
};

const PlaybackDebug = () => {
  const [log, setLog] = useState([]);
  const [, setTick] = useState(0);
  const [counts] = useState(() => ({ loads: 0, plays: 0, errors: 0 }));

  useEffect(() => {
    const opened = performance.now();
    const add = (what, el) =>
      setLog((all) => [`${((performance.now() - opened) / 1000).toFixed(1)} ${what} ${short(el?.getAttribute?.('aria-label'))}`, ...all].slice(0, KEEP));
    const heard = (event) => {
      if (!(event.target instanceof HTMLMediaElement)) return;
      const el = event.target;
      if (event.type === 'loadstart' && el.getAttribute('src')) counts.loads += 1;
      if (event.type === 'playing') counts.plays += 1;
      if (event.type === 'error') counts.errors += 1;
      add(event.type === 'error' ? `error ${el.error?.code ?? '?'} ${el.error?.message ?? ''}`.trim() : event.type, el);
    };
    EVENTS.forEach((type) => document.addEventListener(type, heard, true));
    // A play() the browser refused says why (NotAllowedError: no sound without a tap, or
    // Low Power Mode)
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function debugPlay(...args) {
      const started = play.apply(this, args);
      started?.catch?.((error) => add(`play refused ${error?.name}`, this));
      return started;
    };
    const timer = setInterval(() => setTick((n) => n + 1), 500);
    return () => {
      EVENTS.forEach((type) => document.removeEventListener(type, heard, true));
      HTMLMediaElement.prototype.play = play;
      clearInterval(timer);
    };
  }, [counts]);

  const videos = [...document.querySelectorAll('video')];
  const youtube = document.querySelectorAll('iframe[src*="youtube"]').length;
  return (
    <div aria-hidden="true" className="fixed left-1 top-1 z-[100] max-w-[min(360px,calc(100vw-8px))] pointer-events-none bg-black/80 p-1.5 font-mono text-[10px] leading-tight text-lime-300">
      <p>
        videos {videos.length} · youtube {youtube} · loads {counts.loads} · played {counts.plays} · errors {counts.errors}
      </p>
      {videos.map((el, i) => (
        <p key={i} className="text-white">
          {short(el.getAttribute('aria-label'), 14)} {sourceOf(el)} rs{el.readyState} ns{el.networkState} {el.paused ? 'paused' : 'playing'} t{el.currentTime.toFixed(1)} +{ahead(el).toFixed(1)}s {el.videoHeight}p{el.error ? ` err${el.error.code}` : ''}
        </p>
      ))}
      {log.map((line, i) => (
        <p key={i} className="text-slate-300">{line}</p>
      ))}
    </div>
  );
};

export default PlaybackDebug;
