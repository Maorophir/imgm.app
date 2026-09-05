/**
 * SentimentBadge — Color-coded pill showing AI-analyzed sentiment.
 *
 * Used in two places:
 *   1. GameCard — shows overall game sentiment
 *   2. ReviewCard — shows individual review sentiment
 *
 * The sentiment config is centralized here so GameCard can import it
 * instead of duplicating the color/icon mapping.
 */
import React from 'react';

/**
 * Centralized sentiment styling — imported by GameCard and other components.
 */
export const SENTIMENT_CONFIG = {
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

const SentimentBadge = ({ sentiment, size = 'sm' }) => {
  const config = SENTIMENT_CONFIG[sentiment] || SENTIMENT_CONFIG.Neutral;

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-5 py-2.5',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        ${config.bgColor} ${config.borderColor}
        border rounded-lg font-semibold
        ${config.textColor}
        ${sizeClasses[size] || sizeClasses.sm}
        transition-all duration-300
      `}
    >
      <span>{config.icon}</span>
      <span>{sentiment}</span>
    </span>
  );
};

export default SentimentBadge;
