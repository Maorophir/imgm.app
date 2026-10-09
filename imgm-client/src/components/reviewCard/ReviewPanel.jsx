/**
 * ReviewPanel — the written side of a review, shown next to its RarityCard:
 * reviewer, rarity verdict, badges, the full Final words ("Read more" when
 * long), best/worst moments (behind a spoiler veil if marked) and pros & cons.
 * Empty or partial reviews get one calm line instead of an empty box.
 * Swearing shows masked ("f***") unless the viewer turned on strong language.
 */
import { EyeOff, Sparkles, ThumbsDown, TriangleAlert } from 'lucide-react';
import ArtIcon from '../ArtIcon';
import { useState } from 'react';
import { useStrongLanguage } from '../../hooks/useStrongLanguage';
import { getRarity, RATING_LABELS, BADGES } from '../reviewQuest/questOptions';
import { formatDate, tickedChecklist, reviewerName } from './reviewDisplay';
import { Avatar } from './RarityCard';
import { getProgress } from '../../lib/levels';

const LONG_REVIEW = 420; // characters — longer reviews start collapsed

const SectionLabel = ({ children }) => (
  <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">
    <span className="h-px flex-1 bg-slate-800" />
    {children}
    <span className="h-px flex-1 bg-slate-800" />
  </p>
);

const ReviewPanel = ({ review: original }) => {
  const [expanded, setExpanded] = useState(false);
  const [spoilersShown, setSpoilersShown] = useState(false);
  const [strongLanguage] = useStrongLanguage();

  // The server sends a masked copy of any text with swearing in `masked`
  const review = strongLanguage || !original.masked ? original : { ...original, ...original.masked };

  const rarity = getRarity(review.rating);
  const author = review.user?.xp != null ? getProgress(review.user.xp) : null;
  const name = reviewerName(review);
  const text = review.reviewText?.trim() ?? '';
  // Blank lines split paragraphs; single line breaks are kept inside a paragraph
  const paragraphs = text ? text.split(/\n\s*\n/) : [];
  const isLong = text.length > LONG_REVIEW;

  const hasMoments = review.bestMoment || review.worstMoment;
  const hasProsCons = review.pros?.length > 0 || review.cons?.length > 0;
  const hidden = review.hasSpoilers && !spoilersShown;

  const moment = (label, value) =>
    value && (
      <div className="text-sm">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className={`text-slate-200 break-words transition ${hidden ? 'blur-sm select-none' : ''}`} aria-hidden={hidden}>
          {value}
        </p>
      </div>
    );

  return (
    <article className="flex-1 min-w-0 w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={name} size="w-9 h-9 text-sm" />
          <span className="min-w-0">
            <span className="block font-bold text-white truncate">{name}</span>
            <span className="block text-xs text-slate-400">
              {author && (
                <span className="font-bold" style={{ color: author.tier.color }}>
                  {author.tier.label} · Lv {author.level} ·{' '}
                </span>
              )}
              {formatDate(review.createdAt)}
            </span>
          </span>
        </div>
        <span className="flex items-baseline gap-2 shrink-0">
          <span className="text-sm font-black uppercase tracking-[0.2em]" style={{ color: rarity.color }}>{rarity.label}</span>
          <span className="text-sm text-slate-400 font-semibold">{review.rating}/10 · {RATING_LABELS[review.rating]}</span>
        </span>
      </header>

      {review.badges?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {review.badges.map((b) => (
            <span key={b} className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-400/35 text-amber-200 whitespace-nowrap">
              <ArtIcon icon={BADGES[b]?.art} className="w-3.5 h-3.5" /> {BADGES[b]?.label ?? b}
            </span>
          ))}
        </div>
      )}

      {/* Final words — or a calm line when there are none */}
      {paragraphs.length > 0 ? (
        <div>
          <div className={`text-[15px] leading-relaxed text-slate-100 break-words max-w-[68ch] ${isLong && !expanded ? 'line-clamp-6' : ''}`}>
            {paragraphs.map((p, i) => (
              <p key={i} className="whitespace-pre-line mb-3 last:mb-0">{p}</p>
            ))}
          </div>
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              aria-expanded={expanded}
              className="mt-2 text-sm font-bold text-white hover:text-brand"
            >
              {expanded ? 'Show less ▴' : 'Read more ▾'}
            </button>
          )}
        </div>
      ) : (
        !hasMoments && !hasProsCons && (
          <p className="text-sm text-slate-400">
            {tickedChecklist(review).length > 0
              ? `No written review. Flip the card to see ${name}'s checklist ↻`
              : `Rated it ${review.rating}/10 · ${RATING_LABELS[review.rating]}. No written review, the card says it all.`}
          </p>
        )
      )}

      {(hasMoments || hasProsCons) && (
        <div className="grid sm:grid-cols-2 gap-5">
          {hasMoments && (
            <div>
              <SectionLabel>Moments</SectionLabel>
              <div className="relative flex flex-col gap-2">
                {moment(<><Sparkles className="inline w-3 h-3 mr-1 -mt-px" aria-hidden="true" />Best</>, review.bestMoment)}
                {moment(<><ThumbsDown className="inline w-3 h-3 mr-1 -mt-px" aria-hidden="true" />Worst</>, review.worstMoment)}
                {hidden && (
                  <button
                    type="button"
                    onClick={() => setSpoilersShown(true)}
                    className="absolute inset-0 flex items-center justify-center rounded-lg bg-slate-900/40 text-xs font-bold text-amber-300 hover:text-amber-200"
                  >
                    <TriangleAlert className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" /> Spoilers · tap to reveal
                  </button>
                )}
                {/* Revealed: hide them again */}
                {review.hasSpoilers && spoilersShown && (
                  <button
                    type="button"
                    onClick={() => setSpoilersShown(false)}
                    className="self-start inline-flex items-center gap-1.5 mt-1 text-xs font-bold text-slate-400 hover:text-amber-300 transition"
                  >
                    <EyeOff className="w-3.5 h-3.5" aria-hidden="true" /> Hide spoilers
                  </button>
                )}
              </div>
            </div>
          )}
          {hasProsCons && (
            <div>
              <SectionLabel>Pros &amp; cons</SectionLabel>
              <ul className="flex flex-col gap-1 text-sm">
                {review.pros?.map((p) => (
                  <li key={`+${p}`} className="text-slate-200 break-words"><span className="font-black text-emerald-400 mr-1.5">+</span>{p}</li>
                ))}
                {review.cons?.map((c) => (
                  <li key={`-${c}`} className="text-slate-200 break-words"><span className="font-black text-red-400 mr-1.5">−</span>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </article>
  );
};

export default ReviewPanel;
