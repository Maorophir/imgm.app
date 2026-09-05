/**
 * ReviewCard — Displays a single user review with rating, text, date,
 * and their individual AI-analyzed sentiment.
 *
 * Used on the Game Details page in the reviews section.
 */
import React from 'react';
import SentimentBadge from './SentimentBadge';
import StarRating from './StarRating';

const ReviewCard = ({ 
  username, 
  rating, 
  reviewText, 
  createdAt, 
  sentiment,
  hoursPlayed,
  platform,
  completionStatus,
  playStyle,
  difficulty,
  subScores,
  recommendation 
}) => {
  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Generate a deterministic avatar color from the username
  const avatarHue = username.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  return (
    <article className="
      bg-slate-900/40 backdrop-blur-sm
      border border-slate-800/40
      rounded-xl p-5
      transition-all duration-300
      hover:border-slate-700/60
    ">
      {/* Header: avatar, username, date, sentiment */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          {/* Generated avatar */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ backgroundColor: `hsl(${avatarHue}, 50%, 40%)` }}
          >
            {username.charAt(0).toUpperCase()}
          </div>

          <div>
            <p className="text-white font-semibold text-sm">{username}</p>
            <p className="text-slate-500 text-xs">{formattedDate}</p>
          </div>
        </div>

        {sentiment && <SentimentBadge sentiment={sentiment} size="sm" />}
      </div>

      {/* Rating stars + numeric score */}
      <div className="flex items-center gap-2.5 mb-4">
        <StarRating rating={rating} size="sm" />
        <span className="text-yellow-400 font-bold text-sm">{rating}/10</span>
        {recommendation && (
          <>
            <span className="text-slate-600 px-1">•</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
              recommendation === 'Yes' ? 'bg-emerald-500/10 text-emerald-400' :
              recommendation === 'No' ? 'bg-red-500/10 text-red-400' :
              'bg-yellow-500/10 text-yellow-400'
            }`}>
              {recommendation === 'Yes' ? '👍 Recommends' : 
               recommendation === 'No' ? '👎 Not Recommended' : 
               '⏳ Wait for Sale'}
            </span>
          </>
        )}
      </div>

      {/* Elaborated Context Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4 mb-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700/30 text-xs">
        {hoursPlayed && (
          <div className="flex flex-col">
            <span className="text-slate-500 font-semibold mb-0.5">Time Played</span>
            <span className="text-slate-300 flex items-center gap-1">🕒 {hoursPlayed}</span>
          </div>
        )}
        {platform && (
          <div className="flex flex-col">
            <span className="text-slate-500 font-semibold mb-0.5">Platform</span>
            <span className="text-slate-300 flex items-center gap-1">💻 {platform}</span>
          </div>
        )}
        {completionStatus && (
          <div className="flex flex-col">
            <span className="text-slate-500 font-semibold mb-0.5">Status</span>
            <span className="text-slate-300 flex items-center gap-1">🏆 {completionStatus}</span>
          </div>
        )}
        {playStyle && (
          <div className="flex flex-col">
            <span className="text-slate-500 font-semibold mb-0.5">Play Style</span>
            <span className="text-slate-300 flex items-center gap-1">🎮 {playStyle}</span>
          </div>
        )}
        {difficulty && (
          <div className="flex flex-col">
            <span className="text-slate-500 font-semibold mb-0.5">Difficulty</span>
            <span className="text-slate-300 flex items-center gap-1">⚔️ {difficulty}</span>
          </div>
        )}
      </div>

      {/* Sub-scores (if available) */}
      {subScores && (
        <div className="flex flex-wrap gap-3 mb-4 text-xs">
          {Object.entries(subScores).map(([key, score]) => (
            <div key={key} className="flex items-center gap-1.5 bg-slate-800/50 px-2 py-1 rounded">
              <span className="text-slate-400 capitalize">{key}:</span>
              <span className="text-yellow-400 font-bold">{score}</span>
            </div>
          ))}
        </div>
      )}

      {/* Review text */}
      <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
        {reviewText}
      </p>
    </article>
  );
};

export default ReviewCard;
