/**
 * How the site's header shows: normally, tucked away, or laid over the page. Discover
 * tucks it away on an upright phone (the feed wants the whole screen), and its small
 * IMGM tab pulls it down over the trailer (not pushing the feed down, so nothing below
 * moves). One shared switch, so the Navbar and Discover agree without props through App.
 *   null       the usual sticky header
 *   'hidden'   tucked away
 *   'over'     laid over the top of the page
 */
import { useSyncExternalStore } from 'react';

let mode = null;
const listeners = new Set();

export const setNavMode = (value) => {
  if (mode === value) return;
  mode = value;
  listeners.forEach((listen) => listen());
};

const subscribe = (listen) => {
  listeners.add(listen);
  return () => listeners.delete(listen);
};

export const useNavMode = () => useSyncExternalStore(subscribe, () => mode, () => null);
