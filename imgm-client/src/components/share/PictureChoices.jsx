/**
 * PictureChoices — a sideways-scrolling row of a game's pictures to put on your card:
 * its cover, then its artworks and screenshots. The chosen one has a white edge.
 *
 * Props:
 *   pictures  the addresses to choose from (from GET /api/reviews/mine/:gameId/card)
 *   current   the one on the card now
 *   onChoose  (address) => …
 *   busy      true while a choice is being saved (the row waits)
 */
import { igdbImage, isCover } from '../../lib/igdbImage';

const PictureChoices = ({ pictures, current, onChoose, busy = false }) => (
  <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Pictures for your card">
    {pictures.map((picture) => {
      const on = picture === current;
      return (
        <button
          key={picture}
          type="button"
          disabled={busy}
          onClick={() => !on && onChoose(picture)}
          aria-pressed={on}
          aria-label={isCover(picture) ? 'The cover' : 'Game art'}
          className={`shrink-0 rounded-sm border-2 transition-colors duration-120 disabled:opacity-50 ${on ? 'border-white' : 'border-transparent hover:border-slate-500'}`}
        >
          <img
            src={isCover(picture) ? picture : igdbImage(picture, 't_screenshot_med')}
            alt=""
            loading="lazy"
            className={`block h-16 rounded-[1px] object-cover ${isCover(picture) ? 'w-12' : 'w-28'}`}
          />
        </button>
      );
    })}
  </div>
);

export default PictureChoices;
