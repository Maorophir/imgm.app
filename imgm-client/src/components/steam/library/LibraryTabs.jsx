/**
 * The library's lists as a segmented control (lib/ui.js SEGMENTS), each with its count,
 * working as tabs: the arrow keys (and Home / End) move between them and pick one, and
 * the page's list underneath is their tab panel (LIBRARY_PANEL, labelled by the picked tab).
 *
 * Four lists don't fit side by side on a phone, so the row scrolls sideways (the recipe
 * allows for that), and the picked one is always scrolled into view.
 */
import { useEffect, useRef } from 'react';
import { SEGMENTS, segment } from '../../../lib/ui';
import { LIBRARY_PANEL, tabId } from './libraryData';

const LibraryTabs = ({ tabs, counts, active, onChange }) => {
  const bar = useRef(null);

  // Sideways only: the page itself never scrolls for this
  useEffect(() => {
    const row = bar.current;
    const tab = row?.querySelector('[aria-selected="true"]');
    if (!tab) return;
    const t = tab.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    if (t.left < r.left) row.scrollLeft -= r.left - t.left;
    else if (t.right > r.right) row.scrollLeft += t.right - r.right;
  }, [active]);

  const moveWithKeys = (event) => {
    const at = tabs.findIndex((tab) => tab.key === active);
    const last = tabs.length - 1;
    const to = { ArrowRight: at === last ? 0 : at + 1, ArrowLeft: at === 0 ? last : at - 1, Home: 0, End: last }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    onChange(tabs[to].key);
    document.getElementById(tabId(tabs[to].key))?.focus();
  };

  return (
    <div ref={bar} role="tablist" aria-label="Your Steam library" onKeyDown={moveWithKeys} className={`${SEGMENTS} self-start`}>
      {tabs.map((tab) => {
        const on = tab.key === active;
        return (
          <button
            key={tab.key}
            id={tabId(tab.key)}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls={LIBRARY_PANEL}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(tab.key)}
            className={segment(on)}
          >
            {tab.label}
            <span className={`tabular-nums font-normal ${on ? 'text-slate-950/70' : 'text-slate-400'}`}>{counts[tab.key].toLocaleString('en-US')}</span>
          </button>
        );
      })}
    </div>
  );
};

export default LibraryTabs;
