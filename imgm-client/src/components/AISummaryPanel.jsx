/**
 * AISummaryPanel — The hero component of the Game Details page.
 *
 * Displays the AI-generated summary and overall sentiment in a premium
 * glassmorphism card with subtle animations. This is the core differentiator
 * of IMGM — the feature that makes reading dozens of reviews unnecessary.
 *
 * Data comes from the GameAISummary table in production.
 */
import React from 'react';
import SentimentBadge from './SentimentBadge';

const AISummaryPanel = ({ aiSummary, aiSentiment, reviewCount }) => {
  return (
    <div className="
      relative overflow-hidden
      bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-blue-900/20
      backdrop-blur-xl
      border border-blue-500/20
      rounded-2xl p-6 md:p-8
    ">
      {/* Decorative glow behind the card */}
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-3">
          {/* AI icon */}
          <div className="
            w-10 h-10 rounded-xl
            bg-gradient-to-br from-blue-500 to-indigo-600
            flex items-center justify-center
            shadow-lg shadow-blue-500/25
          ">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>

          <div>
            <h3 className="text-lg font-bold text-white">AI Summary</h3>
            <p className="text-xs text-slate-400">
              Generated from {reviewCount || '—'} community review{reviewCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <SentimentBadge sentiment={aiSentiment} size="md" />
      </div>

      {/* Divider */}
      <div className="relative h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent mb-5" />

      {/* AI summary text */}
      <blockquote className="relative text-slate-200 leading-relaxed text-[15px] italic">
        <span className="text-blue-400 text-2xl font-serif leading-none mr-1">"</span>
        {aiSummary}
        <span className="text-blue-400 text-2xl font-serif leading-none ml-1">"</span>
      </blockquote>

      {/* Powered by IMGM badge */}
      <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        Powered by IMGM AI
      </div>
    </div>
  );
};

export default AISummaryPanel;
