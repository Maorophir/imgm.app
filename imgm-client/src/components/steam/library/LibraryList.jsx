/**
 * One of the library's lists, under its tab: rows on hairlines (To rate, Not played, Not
 * on IMGM) or your cards (Rated). 50 at first, then "Show more (N left)" adds 50 and
 * moves the keyboard focus to the first new one (the button is gone after the last).
 * The page gives each list and each search its own key, so a new one starts at 50 again.
 *
 * An empty list says why, in a line (no box), and so does a search that finds nothing.
 */
import { useEffect, useRef, useState } from 'react';
import { CircleCheck, Gamepad2 } from 'lucide-react';
import FaceDownCard from '../../home/FaceDownCard';
import { GHOST_BUTTON, TEXT_BUTTON } from '../../../lib/ui';
import { PAGE_SIZE, TABS } from './libraryData';
import { GameRow, OtherRow } from './LibraryRows';
import RatedCards from './RatedCards';

const EMPTY = 'py-12 text-center border-t border-slate-700';
const EMPTY_TITLE = 'text-xl font-semibold text-white break-words';
const EMPTY_ICON = 'w-8 h-8 mx-auto mb-3 text-slate-400';

const ListEmpty = ({ tab, ratedCount }) => {
  if (tab === 'rated') {
    return (
      <div className={EMPTY}>
        {/* The card still to be earned */}
        <FaceDownCard small className="w-24 mx-auto mb-6" />
        <p className={EMPTY_TITLE}>No cards yet</p>
        <p className="text-slate-400 mt-1">Rate a game from To rate, and it becomes a card here.</p>
      </div>
    );
  }
  const [title, text] =
    tab === 'to-rate'
      ? ratedCount > 0
        ? ['You rated everything you played', 'Each one became a card: see them under Rated.']
        : ['Nothing to rate here yet', 'Games you play on Steam show up here, with your hours. Played one lately? Press Refresh.']
      : tab === 'not-played'
        ? ['Nothing unplayed', 'Every game on this account has some hours on it.']
        : ["Everything's on IMGM", 'Every game on this account can be rated here.'];
  const Icon = tab === 'to-rate' && ratedCount > 0 ? CircleCheck : Gamepad2;
  return (
    <div className={EMPTY}>
      <Icon className={EMPTY_ICON} strokeWidth={1.8} aria-hidden="true" />
      <p className={EMPTY_TITLE}>{title}</p>
      <p className="text-slate-400 mt-1">{text}</p>
    </div>
  );
};

const LibraryList = ({ tab, items, hoursHidden, query, ratedCount, onClearQuery }) => {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const box = useRef(null);
  // Which item "Show more" should move the focus to, once it's on screen
  const firstNew = useRef(null);

  useEffect(() => {
    if (firstNew.current == null) return;
    const item = box.current?.querySelector('ol, ul')?.children[firstNew.current];
    firstNew.current = null;
    item?.querySelector('a:not([tabindex="-1"]), button')?.focus();
  }, [limit]);

  if (items.length === 0) {
    if (query.trim()) {
      const list = TABS.find((t) => t.key === tab)?.label ?? 'this list';
      return (
        <div className={EMPTY}>
          <p className={EMPTY_TITLE}>No “{query.trim()}” in {list}</p>
          <p className="text-slate-400 mt-1">Check the spelling, or look in the other lists.</p>
          <button type="button" onClick={onClearQuery} className={`${TEXT_BUTTON} mt-4`}>
            Clear the search
          </button>
        </div>
      );
    }
    return <ListEmpty tab={tab} ratedCount={ratedCount} />;
  }

  const shown = items.slice(0, limit);
  const left = items.length - shown.length;
  const more = () => {
    firstNew.current = limit;
    setLimit(limit + PAGE_SIZE);
  };

  return (
    <div ref={box} className="flex flex-col gap-10">
      {tab === 'rated' ? (
        <RatedCards games={shown} hoursHidden={hoursHidden} />
      ) : (
        <ol className="flex flex-col border-b border-slate-700">
          {tab === 'not-on-imgm'
            ? shown.map((app) => <OtherRow key={app.appid} app={app} showHours={!hoursHidden} />)
            : shown.map((game) => (
                <GameRow
                  key={game.gameId}
                  game={game}
                  action={tab === 'to-rate' ? 'rate' : 'save'}
                  // Not played is all zeros: no numeral to show there
                  showHours={tab === 'to-rate' && !hoursHidden}
                  hoursHidden={hoursHidden}
                />
              ))}
        </ol>
      )}
      {left > 0 && (
        <div className="flex justify-center">
          <button type="button" onClick={more} className={GHOST_BUTTON}>
            Show more ({left.toLocaleString('en-US')} left)
          </button>
        </div>
      )}
    </div>
  );
};

export default LibraryList;
