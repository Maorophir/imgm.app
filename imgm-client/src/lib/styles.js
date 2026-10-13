/**
 * styles — the button-and-type styles being tried in local development, and how one is
 * put on the page: data-style on <html>, which index.css ("Style previews") answers by
 * restyling the elements that carry a ui-* hook class (lib/ui.js) and by swapping font
 * tokens. A style that uses other fonts loads them from Google Fonts when picked. The
 * switcher is components/StylePreview.jsx.
 *
 * Local development only (main.jsx and App check import.meta.env.DEV). A pick is kept
 * in this browser (localStorage), and an address can carry one: /?style=printed.
 * Once a style is chosen, it moves into the real recipes and this goes.
 */

// '' is the site as it is. `fonts` is the Google Fonts css2 family query a style needs.
export const STYLES = [
  { key: '', name: 'Now' },
  { key: 'printed', name: 'Printed', fonts: 'Libre+Franklin:wght@400..800' },
  { key: 'tactile', name: 'Tactile', fonts: 'Archivo:ital,wdth,wght@0,62..125,100..900;1,62..125,100..900' },
  { key: 'open', name: 'Printed Stock', fonts: 'Libre+Franklin:ital,wght@0,400..800;1,400..800' },
];

const STORE = 'imgm:style';

const loadFonts = (query) => {
  if (!query || query === 'none') return;
  const href = `https://fonts.googleapis.com/css2?family=${query}&display=swap`;
  if ([...document.querySelectorAll('link[data-style-fonts]')].some((l) => l.href === href)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.styleFonts = '';
  document.head.append(link);
};

export const setStyle = (key) => {
  const style = STYLES.find((s) => s.key === key);
  if (key && style) {
    loadFonts(style.fonts);
    document.documentElement.dataset.style = key;
  } else {
    delete document.documentElement.dataset.style;
  }
};

export const rememberStyle = (key) => {
  try {
    localStorage.setItem(STORE, key);
  } catch {
    // no storage: the pick lasts until the page reloads
  }
};

// Before the first paint: the style the address asks for (?style=…), else the last pick
export const applySavedStyle = () => {
  const asked = new URLSearchParams(window.location.search).get('style');
  if (asked !== null) rememberStyle(asked);
  let key = asked;
  if (key === null) {
    try {
      key = localStorage.getItem(STORE) ?? '';
    } catch {
      key = '';
    }
  }
  setStyle(key);
};
