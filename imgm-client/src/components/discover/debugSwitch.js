// Discover's playback debug panel (PlaybackDebug.jsx): ?debug=1 turns it on for the tab,
// ?debug=0 off. Off whenever the browser won't keep it.
const KEY = 'imgm.discover.debug';

export const playbackDebugOn = () => {
  try {
    const asked = new URLSearchParams(window.location.search).get('debug');
    if (asked === '1') sessionStorage.setItem(KEY, '1');
    if (asked === '0') sessionStorage.removeItem(KEY);
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};
