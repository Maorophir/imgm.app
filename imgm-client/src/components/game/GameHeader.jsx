/**
 * GameHeader — the top of a game page, in the spirit of a store page but mirrored: the
 * game's facts on the left and its trailer and screenshots on the right (MediaViewer),
 * all over the game's artwork, so the media comes before the reviews.
 *
 * From the top: the breadcrumb, the title in big condensed capitals with "by studio ·
 * year", the players' sentiment and the Game of the Week badge. Then two columns:
 *   left   the cover beside the verdict (ImgmRating: the IMGM score, its tier and a
 *          link down to the reviews, or the way to write the first one, or the release
 *          date of a game that isn't out yet), the description (4 lines until "Read
 *          more"), the facts, the genres, "Add to Backlog" and where to buy it
 *   right  the media viewer
 * Phones and tablets stack them with the viewer first, so the pictures open the page.
 * A game with no media gets the facts alone.
 *
 * The artwork behind it is sharp and only lightly dimmed: it melts into the page at the
 * bottom, and a soft shade on the left keeps the facts readable.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Crown, ExternalLink } from 'lucide-react';
import SentimentBadge from '../SentimentBadge';
import BacklogButton from '../BacklogButton';
import ImgmRating from './ImgmRating';
import MediaViewer from './MediaViewer';
import { shortGenre } from '../../lib/gameLabels';
import { isUnreleased } from '../../lib/release';
import { WRAP, TEXT_LINK, TEXT_BUTTON } from '../../lib/ui';

// A row of the facts list: "Developer   Sandfall Interactive"
const Fact = ({ label, children }) => (
  <>
    <dt className="text-base text-slate-300">{label}</dt>
    <dd className="text-base font-medium text-white">{children}</dd>
  </>
);

const GameHeader = ({ game }) => {
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const backdrop = game.artworks?.[0] || game.screenshots?.[0] || game.coverUrl;
  // IGDB dates are midnight UTC, so they're read in UTC: in the visitor's own time zone
  // the Americas would see the day (or, on 1 January, the year) before
  const releaseYear = game.releaseDate ? new Date(game.releaseDate).getUTCFullYear() : null;
  // Longer descriptions start at 4 lines, with "Read more"
  const longDescription = (game.description?.length ?? 0) > 260;
  // No screenshots or videos: the facts get the width alone (MediaViewer draws nothing)
  const hasMedia = game.screenshots?.length > 0 || game.videos?.length > 0;

  return (
    <section className="relative overflow-hidden">
      {/* The game's key art, sharp and only lightly dimmed: the bottom melts into the
          page, and a soft shade on the left keeps the facts readable */}
      {backdrop && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${backdrop})` }} aria-hidden="true" />}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/50 to-slate-950" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-950/20 to-transparent" aria-hidden="true" />

      <div className={`relative ${WRAP} pt-6 pb-12`}>
        <nav className="flex items-center gap-1.5 text-sm text-slate-400 mb-4" aria-label="Breadcrumb">
          <Link to="/" className={`inline-flex items-center min-h-11 text-white ${TEXT_LINK}`}>Home</Link>
          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-500" strokeWidth={1.8} aria-hidden="true" />
          <span className="text-slate-300 truncate">{game.title}</span>
        </nav>

        <h1 className="font-display text-[length:clamp(34px,10vw,44px)] sm:text-[56px] lg:text-[64px] leading-[.9] tracking-[.005em] uppercase text-white text-balance break-words">
          {game.title}
        </h1>
        <div className="flex items-center flex-wrap gap-x-3 gap-y-2 text-base mt-3">
          {game.developer && (
            <span className="text-slate-400">by <span className="font-medium text-white">{game.developer}</span></span>
          )}
          {releaseYear && <span className="text-slate-400 tabular-nums">· {releaseYear}</span>}
          {game.aiSentiment && <SentimentBadge sentiment={game.aiSentiment} size="sm" />}
          {game.gameOfTheWeek && (
            <Link
              to="/game-of-the-week"
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-xs border border-rarity-legendary-edge text-rarity-legendary text-sm font-medium hover:border-rarity-legendary transition-colors duration-120"
            >
              <Crown className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" /> Game of the Week
            </Link>
          )}
        </div>

        {/* The facts on the left and the media on the right; stacked below 1024px with the
            media first (the facts move to the front with order-first) */}
        <div className={`mt-6 grid gap-8 items-start ${hasMedia ? 'lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[440px_minmax(0,1fr)]' : 'max-w-[75ch]'}`}>
          <MediaViewer game={game} />

          <aside className="min-w-0 flex flex-col gap-5 lg:order-first">
            <div className="flex items-center gap-4">
              {game.coverUrl && <img src={game.coverUrl} alt={`${game.title} cover`} className="w-[100px] shrink-0 aspect-[3/4] object-cover rounded-xs bg-slate-900" />}
              <ImgmRating average={game.ratings?.imgm} count={game.reviewStats?.count ?? 0} gameId={game.id} releaseDate={game.releaseDate} />
            </div>

            {game.description && (
              <div>
                <p className={`text-[17px] text-white leading-[1.6] ${descriptionOpen ? '' : 'line-clamp-4'}`}>{game.description}</p>
                {longDescription && (
                  <button type="button" onClick={() => setDescriptionOpen((o) => !o)} aria-expanded={descriptionOpen} className={TEXT_BUTTON}>
                    {descriptionOpen ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            )}

            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-2.5 border-t border-slate-700 pt-5">
              {game.releaseDate && (
                <Fact label={isUnreleased(game.releaseDate) ? 'Coming' : 'Released'}>
                  {new Date(game.releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}
                </Fact>
              )}
              {game.developer && <Fact label="Developer">{game.developer}</Fact>}
              {game.publisher && <Fact label="Publisher">{game.publisher}</Fact>}
              {game.platforms?.length > 0 && <Fact label="Platforms">{game.platforms.join(', ')}</Fact>}
            </dl>

            {game.genres?.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Genres">
                {game.genres.map((genre) => (
                  <li key={genre} className="inline-flex items-center h-8 px-3 rounded-xs bg-slate-800/80 text-sm font-medium text-slate-100">{shortGenre(genre)}</li>
                ))}
              </ul>
            )}

            <BacklogButton gameId={game.id} source="game_page" variant="pill" className="self-start" />

            {game.stores?.length > 0 && (
              <p className="flex flex-wrap items-center gap-x-4 text-base">
                <span className="text-slate-300">Buy on</span>
                {game.stores.map((store) => (
                  <a key={store.key} href={store.url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 h-10 font-medium text-white ${TEXT_LINK}`}>
                    {store.name}
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.8} aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                ))}
              </p>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
};

export default GameHeader;
