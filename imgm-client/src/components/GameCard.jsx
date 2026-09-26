/**
 * GameCard — Reusable card component for displaying a game in grid/list views.
 *
 * Data sources:
 *   FROM IGDB (game metadata):
 *   - coverUrl, title, genres, platforms, releaseDate
 *
 *   FROM IMGM (our platform):
 *   - ratings.imgm: average score from IMGM user reviews (1-10 scale)
 *   - aiSentiment: AI-generated sentiment from our ReviewAnalysis pipeline
 *   - aiSummary: AI-generated summary from our GameAISummary table
 *
 *   FROM EXTERNAL SOURCES (scraped/API):
 *   - ratings.metacritic: Metacritic score (0-100)
 *   - ratings.ign: IGN score (1-10)
 *   - ratings.steam: Steam user review percentage (0-100)
 *
 * The IMGM score is displayed prominently as the hero badge.
 * External scores appear as a compact comparison row in the card body.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Maps sentiment strings to their visual styling (color + icon).
 * Keeps the rendering logic clean and makes it trivial to add new sentiments.
 */
const SENTIMENT_CONFIG = {
  Positive: {
    textColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/15',
    borderColor: 'border-emerald-500/30',
    icon: '▲',
  },
  Mixed: {
    textColor: 'text-amber-400',
    bgColor: 'bg-amber-500/15',
    borderColor: 'border-amber-500/30',
    icon: '◆',
  },
  Negative: {
    textColor: 'text-red-400',
    bgColor: 'bg-red-500/15',
    borderColor: 'border-red-500/30',
    icon: '▼',
  },
  Neutral: {
    textColor: 'text-slate-400',
    bgColor: 'bg-slate-500/15',
    borderColor: 'border-slate-500/30',
    icon: '●',
  },
};

/**
 * Configuration for each rating source — label, brand color, and display format.
 * Order matters: this is the order they render in the ratings row.
 */
const RATING_SOURCES = [
  {
    key: 'metacritic',
    label: 'MC',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    borderColor: 'border-yellow-400/20',
    format: (v) => Math.round(v),
  },
  {
    key: 'ign',
    label: 'IGN',
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
    borderColor: 'border-red-400/20',
    format: (v) => v.toFixed(1),
  },
  {
    key: 'steam',
    label: 'Steam',
    color: 'text-sky-400',
    bgColor: 'bg-sky-400/10',
    borderColor: 'border-sky-400/20',
    format: (v) => `${Math.round(v)}%`,
  },
];

/**
 * Returns a gradient color class for the IMGM score badge.
 * Green for great (8+), yellow for decent (6-8), red for low (<6).
 */
function getImgmScoreColor(score) {
  if (score >= 8.5) return 'from-emerald-400 to-emerald-600';
  if (score >= 7.0) return 'from-yellow-400 to-amber-500';
  if (score >= 5.0) return 'from-orange-400 to-orange-600';
  return 'from-red-400 to-red-600';
}

const GameCard = ({
  id,
  title,
  coverUrl,
  genres = [],
  platforms = [],
  ratings = {},
  aiSentiment,
  aiSummary,
  releaseDate,
  onClick,
}) => {
  const sentiment = SENTIMENT_CONFIG[aiSentiment] || SENTIMENT_CONFIG.Neutral;
  const imgmScore = ratings.imgm;
  const displayImgmScore = typeof imgmScore === 'number' ? imgmScore.toFixed(1) : null;
  const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : null;

  const navigate = useNavigate();

  // Filter to only external sources that have a value
  const externalRatings = RATING_SOURCES.filter((src) => ratings[src.key] != null);

  const handleClick = () => {
    if (onClick) {
      onClick(id);
    } else {
      navigate(`/game/${id}`);
    }
  };

  return (
    <article
      id={`game-card-${id}`}
      onClick={handleClick}
      className="
        group relative flex flex-col
        bg-slate-900/60 backdrop-blur-sm
        border border-slate-800/50
        rounded-2xl overflow-hidden
        cursor-pointer
        transition-all duration-300 ease-out
        hover:border-blue-500/50
        hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]
        hover:-translate-y-1
      "
    >
      {/* ── Cover Art ── */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={coverUrl}
          alt={`${title} cover art`}
          loading="lazy"
          className="
            w-full h-full object-cover
            transition-transform duration-500 ease-out
            group-hover:scale-105
          "
        />

        {/* IMGM score badge — hero position, top-right, blue-branded */}
        {displayImgmScore && (
          <div className="absolute top-2.5 right-2.5 flex flex-col items-center gap-0.5">
            <div
              className={`
                bg-gradient-to-br ${getImgmScoreColor(imgmScore)}
                text-white font-black text-sm
                w-11 h-11 rounded-xl
                flex items-center justify-center
                shadow-lg shadow-black/30
                ring-2 ring-white/10
                transition-transform duration-300
                group-hover:scale-110
              `}
            >
              {displayImgmScore}
            </div>
            <span className="text-[9px] font-bold text-white/70 uppercase tracking-wider drop-shadow">
              IMGM
            </span>
          </div>
        )}

        {/* Gradient fade at the bottom of the image */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-900/90 to-transparent" />
      </div>

      {/* ── Card Body ── */}
      <div className="flex flex-col gap-3 p-4 flex-1">
        {/* Title + Year */}
        <div>
          <h3 className="text-base font-bold text-white leading-tight line-clamp-2 group-hover:text-blue-300 transition-colors duration-300">
            {title}
          </h3>
          {releaseYear && (
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">
              {releaseYear}
            </span>
          )}
        </div>

        {/* Genre pills — show up to 2 to keep the card compact */}
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {genres.slice(0, 2).map((genre) => (
              <span
                key={genre}
                className="
                  text-[11px] font-semibold uppercase tracking-wider
                  text-slate-400
                  bg-slate-800/60 border border-slate-700/40
                  px-2 py-0.5 rounded-md
                "
              >
                {genre}
              </span>
            ))}
            {genres.length > 2 && (
              <span className="text-[11px] text-slate-500 font-medium self-center">
                +{genres.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Platform tags — show up to 3; IGDB games often list many platforms */}
        {platforms.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {platforms.slice(0, 3).map((platform) => (
              <span
                key={platform}
                className="
                  text-[10px] font-bold uppercase tracking-widest
                  text-blue-300/70
                  bg-blue-500/10 border border-blue-500/20
                  px-1.5 py-0.5 rounded
                "
              >
                {platform}
              </span>
            ))}
            {platforms.length > 3 && (
              <span className="text-[10px] text-slate-500 font-medium self-center">
                +{platforms.length - 3}
              </span>
            )}
          </div>
        )}

        {/* ── External Ratings Row ── */}
        {externalRatings.length > 0 && (
          <div className="flex items-center gap-1.5">
            {externalRatings.map((src) => (
              <div
                key={src.key}
                className={`
                  flex items-center gap-1
                  ${src.bgColor} ${src.borderColor}
                  border rounded-md px-1.5 py-1
                  flex-1 justify-center
                `}
              >
                <span className={`text-[9px] font-bold ${src.color} opacity-70`}>
                  {src.label}
                </span>
                <span className={`text-[11px] font-bold ${src.color}`}>
                  {src.format(ratings[src.key])}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Spacer to push sentiment to the bottom */}
        <div className="flex-1" />

        {/* AI Sentiment badge */}
        {aiSentiment && (
          <div
            className={`
              flex items-center gap-2
              ${sentiment.bgColor} ${sentiment.borderColor}
              border rounded-lg px-3 py-2
              transition-all duration-300
              group-hover:border-opacity-60
            `}
          >
            <span className={`text-xs ${sentiment.textColor}`}>
              {sentiment.icon}
            </span>
            <span className={`text-xs font-semibold ${sentiment.textColor}`}>
              {aiSentiment}
            </span>
          </div>
        )}
      </div>
    </article>
  );
};

export default GameCard;
