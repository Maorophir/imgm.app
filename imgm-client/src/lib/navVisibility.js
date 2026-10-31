/**
 * Whether the site's header is tucked away: Discover hides it on an upright phone (the
 * feed wants the whole screen) and shows a small arrow to pull it back down. One shared
 * switch, so the Navbar and Discover agree without passing props through App.
 */
import { useSyncExternalStore } from 'react';

let hidden = false;
const listeners = new Set();

export const setNavHidden = (value) => {
  if (hidden === value) return;
  hidden = value;
  listeners.forEach((listen) => listen());
};

const subscribe = (listen) => {
  listeners.add(listen);
  return () => listeners.delete(listen);
};

export const useNavHidden = () => useSyncExternalStore(subscribe, () => hidden, () => false);
