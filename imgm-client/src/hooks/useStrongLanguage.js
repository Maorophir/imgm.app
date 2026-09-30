/**
 * useStrongLanguage — the viewer's "Show strong language" setting.
 *
 * Off by default: swearing in reviews shows masked ("f***"). The choice is
 * remembered in this browser (localStorage), and every component using the
 * hook updates together when it changes.
 */
import { useSyncExternalStore } from 'react';

const KEY = 'imgm:showStrongLanguage';
const EVENT = 'imgm:strong-language';

// Storage can be blocked (private windows, strict settings) — then the choice
// lives in memory until the page reloads
let inMemory = false;

const read = () => {
  try {
    return localStorage.getItem(KEY) === 'true';
  } catch {
    return inMemory;
  }
};

const subscribe = (onChange) => {
  window.addEventListener(EVENT, onChange);
  window.addEventListener('storage', onChange); // changed in another tab
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
};

const setShown = (value) => {
  inMemory = value;
  try {
    localStorage.setItem(KEY, String(value));
  } catch {
    // not saved — works until reload, that's all
  }
  window.dispatchEvent(new Event(EVENT));
};

export const useStrongLanguage = () => [useSyncExternalStore(subscribe, read), setShown];
