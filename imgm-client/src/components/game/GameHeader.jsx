/**
 * GameHeader — the top of a game page. The game's artwork sits BEHIND the
 * details (blurred and darkened), so the page opens straight on the cover,
 * title and info instead of a tall empty hero image.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import SentimentBadge from '../SentimentBadge';
import BacklogButton from '../BacklogButton';
import ImgmRating from './ImgmRating';

// Outside score sources shown under the details — only the ones this game has.
// (The IMGM score has its own rarity-styled block, ImgmRating.)
const RATING_SOURCES = [
  { key: 'metacritic', label: 'Metacritic', color: 'text-yellow-400', bgColor: 'bg-yellow-400/10', borderColor: 'border-yellow-400/20', format: (v) => Math.round(v) },
  { key: 'ign', label: 'IGN', color: 'text-red-400', bgColor: 'bg-red-400/10', borderColor: 'border-red-400/20', format: (v) => v.toFixed(1) },
  { key: 'steam', label: 'Steam', color: 'text-sky-400', bgColor: 'bg-sky-400/10', borderColor: 'border-sky-400/20', format: (v) => `${Math.round(v)}%` },
];

const LONG_DESCRIPTION = 360; // characters — longer descriptions start collapsed

const Fact = ({ label, children }) => (
  <div>
    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{label}</p>
    <p className="text-sm text-white font-medium">{children}</p>
  </div>
);

const GameHeader = ({ game }) => {
  const [descriptionOpen, setDescriptionOpen] = useState(false);

  const backdrop = game.artworks?.[0] || game.screenshots?.[0] || game.coverUrl;
  const releaseYear = game.releaseDate ? new Date(game.releaseDate).getFullYear() : null;
  const ratings = RATING_SOURCES.filter((src) => game.ratings?.[src.key] != null);
  const longDescription = (game.description?.length ?? 0) > LONG_DESCRIPTION;

  return (
    <section className="relative overflow-hidden">
      {/* The artwork, behind everything — blurred a touch and darkened so text stays readable */}
      {backdrop && (
        <div className="absolute inset-0 bg-cover bg-center scale-105 blur-[2px]" style={{ backgroundImage: `url(${backdrop})` }} aria-hidden="true" />
      )}
      {/* Two fades: top → bottom melts into the page, left → right keeps the text readable */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-slate-950/65 to-slate-950" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/35 to-transparent" aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto px-6 pt-6 pb-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-white transition">Home</Link>
          <span className="text-slate-600">›</span>
          <span className="text-slate-300 truncate">{game.title}</span>
        </nav>

        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          {game.coverUrl && (
            <img
              src={game.coverUrl}
              alt={`${game.title} cover`}
              className="w-44 md:w-56 shrink-0 rounded-xl shadow-2xl shadow-black/60 border border-slate-700/50"
            />
          )}

          <div className="flex-1 min-w-0 flex flex-col gap-5 w-full">
            <div>
              <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight drop-shadow-2xl text-balance">
                {game.title}
              </h1>
              <div className="flex items-center flex-wrap gap-3 text-sm mt-3">
                {game.developer && (
                  <span className="text-slate-300">
                    <span className="text-slate-400">by </span>
                    <span className="font-semibold">{game.developer}</span>
                  </span>
                )}
                {releaseYear && <span className="text-slate-400">• {releaseYear}</span>}
                {game.aiSentiment && <SentimentBadge sentiment={game.aiSentiment} size="sm" />}
                {/* Its reign as Game of the Week: a gold badge for the whole week */}
                {game.gameOfTheWeek && (
                  <Link
                    to="/game-of-the-week"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-300 text-slate-950 text-xs font-black uppercase tracking-[0.15em] shadow-[0_0_20px_-4px_rgb(251_191_36/0.7)] hover:brightness-110 transition"
                  >
                    <Crown className="w-3.5 h-3.5" aria-hidden="true" /> Game of the Week
                  </Link>
                )}
              </div>
            </div>

            {game.description && (
              <div className="max-w-[75ch]">
                <p className={`text-slate-200 leading-relaxed ${longDescription && !descriptionOpen ? 'line-clamp-4' : ''}`}>
                  {game.description}
                </p>
                {longDescription && (
                  <button
                    type="button"
                    onClick={() => setDescriptionOpen((o) => !o)}
                    aria-expanded={descriptionOpen}
                    className="mt-1 text-sm font-bold text-white hover:text-brand"
                  >
                    {descriptionOpen ? 'Show less ▴' : 'Read more ▾'}
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {game.developer && <Fact label="Developer">{game.developer}</Fact>}
              {game.publisher && <Fact label="Publisher">{game.publisher}</Fact>}
              {game.releaseDate && (
                <Fact label="Release Date">
                  {new Date(game.releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </Fact>
              )}
            </div>

            {game.genres?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {game.genres.map((genre) => (
                  <span key={genre} className="text-xs font-semibold uppercase tracking-wider text-slate-200 bg-slate-800/70 border border-slate-700/50 px-3 py-1 rounded-lg">
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {game.platforms?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {game.platforms.map((platform) => (
                  <span key={platform} className="text-xs font-bold uppercase tracking-widest text-slate-200 bg-white/5 border border-slate-700 px-3 py-1 rounded-lg">
                    {platform}
                  </span>
                ))}
              </div>
            )}

            {/* IMGM's own score, in the loot-rarity style, and "play it later" */}
            <div className="flex flex-wrap items-center gap-4">
              <ImgmRating average={game.ratings?.imgm} count={game.reviewStats?.count ?? 0} />
              <BacklogButton gameId={game.id} source="game_page" variant="pill" />
            </div>

            {ratings.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {ratings.map((src) => {
                  const value = game.ratings[src.key];
                  const display = src.format ? src.format(value) : value.toFixed(1);
                  return (
                    <div
                      key={src.key}
                      className={`flex items-center gap-2 ${src.bgColor} ${src.borderColor} border rounded-xl px-4 py-2.5`}
                    >
                      <span className={`text-xs font-bold ${src.color} opacity-70`}>{src.label}</span>
                      <span className={`text-lg font-black ${src.color}`}>{display}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default GameHeader;
