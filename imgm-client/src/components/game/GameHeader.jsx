/**
 * GameHeader — the top of a game page. The game's artwork sits BEHIND the
 * details (darkened by two scrims), so the page opens straight on the cover,
 * title and info instead of a tall empty hero image.
 *
 * Noir: the title in big condensed capitals, everything else quiet. Facts are small
 * grey labels over ivory values, the genres and platforms one grey line, the outside
 * scores plain numerals split by hairlines, and the links are text links.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Crown, ExternalLink, ShoppingBag } from 'lucide-react';
import SentimentBadge from '../SentimentBadge';
import BacklogButton from '../BacklogButton';
import ImgmRating from './ImgmRating';
import { shortGenre } from '../../lib/gameLabels';
import { WRAP, TEXT_LINK, TEXT_BUTTON_SM, LABEL } from '../../lib/ui';

// Outside score sources shown under the details: only the ones this game has.
// (The IMGM score has its own block, ImgmRating.)
const RATING_SOURCES = [
  { key: 'metacritic', label: 'Metacritic', format: (v) => Math.round(v) },
  { key: 'ign', label: 'IGN', format: (v) => v.toFixed(1) },
  { key: 'steam', label: 'Steam', format: (v) => `${Math.round(v)}%` },
];

const LONG_DESCRIPTION = 360; // characters: longer descriptions start collapsed

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
  const releaseYear = game.releaseDate ? new Date(game.releaseDate).getFullYear() : null;
  const ratings = RATING_SOURCES.filter((src) => game.ratings?.[src.key] != null);
  const longDescription = (game.description?.length ?? 0) > LONG_DESCRIPTION;
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

        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          {game.coverUrl && (
            <img
              src={game.coverUrl}
              alt={`${game.title} cover`}
              className="w-44 md:w-56 shrink-0 rounded-sm bg-slate-900"
            />
          )}

          <div className="flex-1 min-w-0 flex flex-col gap-6 w-full">
            <div>
              <h1 className="font-display text-[54px] md:text-[88px] leading-[.9] tracking-[.005em] uppercase text-white text-balance break-words">
                {game.title}
              </h1>
              <div className="flex items-center flex-wrap gap-x-3 gap-y-2 text-sm mt-4">
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

            {game.description && (
              <div className="max-w-[75ch]">
                <p className={`text-white leading-[1.6] ${longDescription && !descriptionOpen ? 'line-clamp-4' : ''}`}>
                  {game.description}
                </p>
                {longDescription && (
                  <button
                    type="button"
                    onClick={() => setDescriptionOpen((o) => !o)}
                    aria-expanded={descriptionOpen}
                    className={TEXT_BUTTON_SM}
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
                  {new Date(game.releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </Fact>
              )}
            </div>

            {kinds && <p className="text-sm leading-[1.6] text-slate-400">{kinds}</p>}

            {/* IMGM's own score, and "play it later" */}
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <ImgmRating average={game.ratings?.imgm} count={game.reviewStats?.count ?? 0} />
              <BacklogButton gameId={game.id} source="game_page" variant="pill" />
            </div>

            {/* What the critics gave it: plain numerals, split by hairlines */}
            {ratings.length > 0 && (
              <dl className="flex flex-wrap gap-y-3">
                {ratings.map((src) => {
                  const value = game.ratings[src.key];
                  return (
                    <div key={src.key} className="pr-5 not-first:pl-5 not-first:border-l not-first:border-slate-700">
                      <dt className={LABEL}>{src.label}</dt>
                      <dd className="font-display text-2xl leading-tight tabular-nums text-white">{src.format(value)}</dd>
                    </div>
                  );
                })}
              </dl>
            )}

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
