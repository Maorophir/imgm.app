/**
 * The Steam library's rows, in the Hall of Fame's style (pages/TopGames.jsx ChartRow): a
 * list on hairlines, and where the chart has its rank, the hours you played on Steam as
 * a big condensed numeral.
 *
 *   GameRow   a game on IMGM: its cover and title (both open its page), the year, and
 *             the row's one action as a text link or the Backlog button:
 *               rate   (To rate) Rate it, the quest with Steam's hours and PC filled in
 *               save   (Not played) Add to Backlog, and Played it? Rate it for a game
 *                      played somewhere else (nothing filled in: Steam knows nothing of it)
 *             A game that isn't out yet says when it's out and offers only the Backlog.
 *             A game played through Steam Family Sharing (not owned) says "Shared with you".
 *   OtherRow  a Steam app IMGM can't rate: its Steam name and hours, a plain link to its
 *             Steam store page, and a search on IMGM (it may be listed under another name)
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, PenLine, Search as SearchIcon } from 'lucide-react';
import { PowerIcon } from '../../Logo';
import BacklogButton from '../../BacklogButton';
import { hoursLabel } from '../../../lib/steam';
import { isUnreleased, releaseLabel } from '../../../lib/release';
import { TEXT_LINK } from '../../../lib/ui';
import { questLink, steamStoreUrl } from './libraryData';

const ROW = 'flex items-center gap-2.5 sm:gap-4 px-1 py-4 border-t border-slate-700 animate-fade-in';
// A row's text links: 44px tall to tap, in the row's 14px
const ROW_LINK = `inline-flex items-center gap-1.5 min-h-11 font-medium text-white ${TEXT_LINK}`;
const TITLE_LINK =
  'font-medium text-white text-lg leading-tight truncate underline decoration-1 underline-offset-4 decoration-transparent hover:decoration-white transition-[text-decoration-color] duration-120';
// The cover's box: smaller on phones, so a 320px screen still has room for the title
const COVER_BOX = 'w-12 h-16 sm:w-16 sm:h-[5.5rem] rounded-sm';

// Steam's hours as the row's numeral: "142" over a small "hours" (hoursLabel's rounding,
// "<1" for under an hour). Stacked, so even four-digit hours keep every cover in line;
// the column only grows for 10,000 hours and up.
const Hours = ({ minutes }) => {
  const value = hoursLabel(minutes ?? 0).replace(/\s*h$/, '');
  const one = value === '1' || value === '<1';
  return (
    <span className="min-w-14 sm:min-w-20 shrink-0 text-right whitespace-nowrap">
      <span className="sr-only">{value === '<1' ? 'Under an hour' : `${value} ${one ? 'hour' : 'hours'}`} on Steam</span>
      <span aria-hidden="true" className="block font-display text-[26px] sm:text-[34px] leading-none tabular-nums text-white">{value}</span>
      <span aria-hidden="true" className="block mt-1 text-xs text-slate-400">{one ? 'hour' : 'hours'}</span>
    </span>
  );
};

// The game's cover, or IMGM's power mark on dark stock when it has none (or it won't load)
const Cover = ({ url }) => {
  // The address that failed, so new art passed in later gets its own chance to load
  const [brokenUrl, setBrokenUrl] = useState(null);
  if (!url || brokenUrl === url) {
    return (
      <div className={`${COVER_BOX} grid place-items-center bg-slate-900`}>
        <PowerIcon className="w-5 h-5 text-slate-600" />
      </div>
    );
  }
  return <img src={url} alt="" loading="lazy" decoding="async" onError={() => setBrokenUrl(url)} className={`${COVER_BOX} object-cover bg-slate-800`} />;
};

export const GameRow = ({ game, action, showHours, hoursHidden }) => {
  const notOut = isUnreleased(game.releaseDate);
  // IGDB dates are midnight UTC, so the year is read in UTC (not the visitor's time zone)
  const year = game.releaseDate && !notOut ? new Date(game.releaseDate).getUTCFullYear() : null;
  const meta = [
    notOut ? releaseLabel(game.releaseDate) : year,
    showHours && game.minutes2Weeks > 0 && 'Played recently',
    game.shared && 'Shared with you',
  ]
    .filter(Boolean)
    .join(' · ');
  const page = `/game/${game.gameId}`;
  return (
    <li className={ROW}>
      {showHours && <Hours minutes={game.minutes} />}
      <Link to={page} className="shrink-0" tabIndex={-1} aria-hidden="true">
        <Cover url={game.coverUrl} />
      </Link>
      <div className="min-w-0 flex-1 flex flex-col gap-1">
        <Link to={page} className={TITLE_LINK}>
          {game.title}
        </Link>
        {meta && <p className="text-sm text-slate-400 truncate">{meta}</p>}
        <p className="flex flex-wrap items-center gap-x-5 text-sm">
          {action === 'save' && <BacklogButton gameId={game.gameId} source="steam" variant="pill" />}
          {notOut ? (
            // Nothing to rate yet. On a phone this row also has the hours, so the small
            // Backlog button (made 44px tall to tap) is the one that fits beside them.
            action === 'rate' && <BacklogButton gameId={game.gameId} source="steam" className="min-h-11" />
          ) : action === 'rate' ? (
            <Link to={questLink(game, { hoursHidden })} className={ROW_LINK}>
              <PenLine className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.8} aria-hidden="true" />
              Rate it<span className="sr-only">: {game.title}</span>
            </Link>
          ) : (
            <Link to={questLink(game, { setup: false })} className={ROW_LINK}>
              <PenLine className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.8} aria-hidden="true" />
              Played it? Rate it<span className="sr-only">: {game.title}</span>
            </Link>
          )}
        </p>
      </div>
    </li>
  );
};

// What IMGM can say about an app it can't rate (the rest just shows its name)
const KINDS = { dlc: 'DLC', bundle: 'Bundle' };

export const OtherRow = ({ app, showHours }) => {
  const store = steamStoreUrl(app.appid);
  const name = app.name || `Steam app ${app.appid}`;
  const meta = [KINDS[app.kind], app.shared && 'Shared with you'].filter(Boolean).join(' · ');
  return (
    <li className={ROW}>
      {showHours && <Hours minutes={app.minutes} />}
      <div className="min-w-0 flex-1 flex flex-col gap-1">
        <p className="font-medium text-white text-lg leading-tight truncate">{name}</p>
        {meta && <p className="text-sm text-slate-400">{meta}</p>}
        <p className="flex flex-wrap items-center gap-x-5 text-sm">
          {store && (
            <a href={store} target="_blank" rel="noopener noreferrer" className={ROW_LINK}>
              <span className="sr-only">{name} </span>On Steam
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.8} aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
          {app.name && (
            <Link to={`/search?q=${encodeURIComponent(app.name)}`} className={ROW_LINK}>
              <SearchIcon className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.8} aria-hidden="true" />
              Find it on IMGM<span className="sr-only">: {app.name}</span>
            </Link>
          )}
        </p>
      </div>
    </li>
  );
};
