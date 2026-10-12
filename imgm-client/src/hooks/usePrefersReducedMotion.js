/**
 * usePrefersReducedMotion — has this device asked for less motion?
 *
 * True when the player turned on "Reduce motion" (or the like) in their system
 * settings. It updates by itself if they change the setting while the page is open.
 * Things that move by themselves (the card tilt, a smooth scroll) check it first.
 */
import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

const subscribe = (onChange) => {
  const query = window.matchMedia(QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};

const read = () => window.matchMedia(QUERY).matches;

// The server (and the first render) assumes motion is fine
export const usePrefersReducedMotion = () => useSyncExternalStore(subscribe, read, () => false);
