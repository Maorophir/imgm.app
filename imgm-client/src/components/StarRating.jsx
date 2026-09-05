/**
 * StarRating — Visual star display for showing ratings on a 1-10 scale.
 *
 * Renders 10 stars with partial fill support.
 * For example, a rating of 7.3 shows 7 full stars, 1 partial (30%), and 2 empty.
 *
 * Currently read-only — will become interactive for the review form in Phase 2.
 */
import React from 'react';

const StarRating = ({ rating, maxRating = 10, size = 'sm' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const starSize = sizeClasses[size] || sizeClasses.sm;

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxRating }, (_, i) => {
        const fillPercentage = Math.min(1, Math.max(0, rating - i)) * 100;

        return (
          <div key={i} className={`relative ${starSize}`}>
            {/* Empty star (background) */}
            <svg
              viewBox="0 0 24 24"
              className="absolute inset-0 w-full h-full text-slate-700"
              fill="currentColor"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            {/* Filled star (foreground with clip) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fillPercentage}%` }}
            >
              <svg
                viewBox="0 0 24 24"
                className="w-full h-full text-yellow-400"
                fill="currentColor"
                style={{ minWidth: starSize === 'w-6 h-6' ? '24px' : starSize === 'w-5 h-5' ? '20px' : '16px' }}
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StarRating;
