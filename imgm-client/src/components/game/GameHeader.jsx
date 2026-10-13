/**
 * GameHeader — the top of a game page. The game's artwork sits BEHIND the
 * details (darkened by two scrims), so the page opens straight on the cover,
 * title and info instead of a tall empty hero image.
 *
 * The verdict comes first: right under the title, one line with the IMGM score, its
 * tier and a link down to the reviews (ImgmRating), or, for a game nobody has
 * reviewed, a quiet line with the way to write the first card. A game that isn't out
 * yet shows its release date there instead.
 *
 * On phones the cover sits small beside the title (not stacked above it), and the
 * description shows 2 lines until "Read more"; from 768px the cover is big on the
 * left with everything else in a column beside it.
 *
 * Noir: the title in big condensed capitals, everything else quiet. Facts are small
 * grey labels over ivory values, the genres and platforms one grey line, and the links
 * are text links.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Crown, ExternalLink, ShoppingBag } from 'lucide-react';
import SentimentBadge from '../SentimentBadge';
import BacklogButton from '../BacklogButton';
import ImgmRating from './ImgmRating';
import { shortGenre } from '../../lib/gameLabels';
import { WRAP, TEXT_LINK, TEXT_BUTTON_SM, LABEL } from '../../lib/ui';

// Characters: longer descriptions start collapsed, at 4 lines from 640px. A phone's
// line holds about 45 characters, so there anything past 2 lines' worth collapses.
const LONG_DESCRIPTION = 360;
const LONG_ON_PHONE = 80;

// A small grey label over its value ("Developer" / "CD Projekt RED")
const Fact = ({ label, children }) => (
  <div>
    <p className={`${LABEL} mb-0.5`}>{label}</p>
    <p className="text-base text-white font-medium">{children}</p>
  </div>
);

const GameHeader = ({ game }) => {
  const [descriptionOpen, setDescriptionOpen] = useState(false);

  const backdrop = game.artworks?.[0] || game.screenshots?.[0] || game.coverUrl;
  // IGDB dates are midnight UTC, so they're read in UTC: in the visitor's own time zone
  // the Americas would see the day (or, on 1 January, the year) before
  const releaseYear = game.releaseDate ? new Date(game.releaseDate).getUTCFullYear() : null;
  const descriptionLength = game.description?.length ?? 0;
  const longDescription = descriptionLength > LONG_DESCRIPTION;
  const longOnPhone = descriptionLength > LONG_ON_PHONE;
  // Collapsed: 2 lines on phones and 4 from 640px, each only when that size offers
  // "Read more" (so no text is ever cut off without a way to read it)
  const clamp = descriptionOpen
    ? ''
    : `${longOnPhone ? 'line-clamp-2' : ''} ${longDescription ? 'sm:line-clamp-4' : 'sm:line-clamp-none'}`;
  // One quiet line: "RPG, Adventure · PC, PlayStation 5, Xbox Series X|S" (the game
  // page keeps every platform's full name; only the cards shorten them)
  const kinds = [
    game.genres?.map(shortGenre).join(', '),
    game.platforms?.join(', '),
  ].filter(Boolean).join(' · ');

  return (
    <section className="relative overflow-hidden">
      {/* The artwork, behind everything, darkened so the text stays readable */}
      {backdrop && (
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${backdrop})` }} aria-hidden="true" />
      )}
      {/* Two scrims: top → bottom melts into the page, left → right keeps the text readable */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/75 to-slate-950" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/45 to-transparent" aria-hidden="true" />

      <div className={`relative ${WRAP} pt-6 pb-12`}>
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-slate-400 mb-6" aria-label="Breadcrumb">
          <Link to="/" className={`inline-flex items-center min-h-11 text-white ${TEXT_LINK}`}>Home</Link>
          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-500" strokeWidth={1.8} aria-hidden="true" />
          <span className="text-slate-300 truncate">{game.title}</span>
        </nav>

        {/* With a cover: a grid. On phones the cover and the title share the first row
            and everything else runs full width under them; from 768px the cover spans
            both rows on the left. Without one, a single column. */}
        <div
          className={
            game.coverUrl
              ? 'grid grid-cols-[6rem_minmax(0,1fr)] sm:grid-cols-[8rem_minmax(0,1fr)] md:grid-cols-[14rem_minmax(0,1fr)] items-start gap-x-4 sm:gap-x-6 md:gap-x-8 gap-y-6'
              : 'flex flex-col gap-6'
          }
        >
          {game.coverUrl && (
            // A fixed 3:4 shape, so the page doesn't shift when the cover arrives
            <img
              src={game.coverUrl}
              alt={`${game.title} cover`}
              className="md:row-span-2 w-full aspect-[3/4] object-cover rounded-sm bg-slate-900"
            />
          )}

          <div className="min-w-0">
            {/* Phones: the title shares the row with the cover (216px of a 360px screen),
                so it scales with the screen, up to 40px: a 12-letter word like
                PHASMOPHOBIA (about 5.8em) still fits on one line at 360px (36px type) */}
            <h1 className="font-display text-[length:clamp(30px,10vw,40px)] sm:text-[54px] md:text-[88px] leading-[.9] tracking-[.005em] uppercase text-white text-balance break-words">
              {game.title}
            </h1>
            <div className="flex items-center flex-wrap gap-x-3 gap-y-2 text-sm mt-3 md:mt-4">
              {game.developer && (
                <span className="text-slate-400">
                  by <span className="font-medium text-white">{game.developer}</span>
                </span>
              )}
              {releaseYear && <span className="text-slate-400 tabular-nums">· {releaseYear}</span>}
              {game.aiSentiment && <SentimentBadge sentiment={game.aiSentiment} size="sm" />}
              {/* Its reign as Game of the Week: a gilt-ink badge for the whole week */}
              {game.gameOfTheWeek && (
                <Link
                  to="/game-of-the-week"
                  className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-xs border border-rarity-legendary-edge text-rarity-legendary text-sm font-medium hover:border-rarity-legendary transition-colors duration-120"
                >
                  <Crown className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" /> Game of the Week
                </Link>
              )}
            </div>
          </div>

          <div className={`min-w-0 flex flex-col gap-6 ${game.coverUrl ? 'col-span-2 md:col-span-1 md:col-start-2' : ''}`}>
            {/* The verdict first: what players made of it, before what it is */}
            <ImgmRating
              average={game.ratings?.imgm}
              count={game.reviewStats?.count ?? 0}
              gameId={game.id}
              releaseDate={game.releaseDate}
            />

            {game.description && (
              <div className="max-w-[75ch]">
                <p className={`text-white leading-[1.6] ${clamp}`}>
                  {game.description}
                </p>
                {longOnPhone && (
                  <button
                    type="button"
                    onClick={() => setDescriptionOpen((o) => !o)}
                    aria-expanded={descriptionOpen}
                    className={`${TEXT_BUTTON_SM} ${longDescription ? '' : 'sm:hidden'}`}
                  >
                    {descriptionOpen ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {game.developer && <Fact label="Developer">{game.developer}</Fact>}
              {game.publisher && <Fact label="Publisher">{game.publisher}</Fact>}
              {game.releaseDate && (
                <Fact label="Release date">
                  {new Date(game.releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                </Fact>
              )}
            </div>

            {kinds && <p className="text-sm leading-[1.6] text-slate-400">{kinds}</p>}

            {/* "Play it later" */}
            <BacklogButton gameId={game.id} source="game_page" variant="pill" className="self-start" />

            {/* Where to buy: the stores IGDB lists for it (opens the store in a new tab) */}
            {game.stores?.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-5">
                <span className={`inline-flex items-center gap-1.5 ${LABEL}`}>
                  <ShoppingBag className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /> Where to buy
                </span>
                {game.stores.map((store) => (
                  <a
                    key={store.key}
                    href={store.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 h-11 text-sm font-medium text-white ${TEXT_LINK}`}
                  >
                    {store.name}
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.8} aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default GameHeader;
