/**
 * ReviewPanel — the written side of a review, shown next to its RarityCard:
 * reviewer, rarity verdict, badges, the full Final words ("Read more" when
 * long), best/worst moments (behind a spoiler veil if marked) and pros & cons.
 * The reviewer's gamer tag opens their public profile (/u/<tag>).
 * Empty or partial reviews get one calm line instead of an empty box.
 * Swearing shows masked ("f***") unless the viewer turned on strong language.
 *
 * Noir: no box around it (the card beside it is the object), sentence-case grey
 * labels, the tier as its mark and name in the ink, and plain square badges.
 */
import { EyeOff, Sparkles, ThumbsDown, TriangleAlert } from 'lucide-react';
import ArtIcon from '../ArtIcon';
import HelpfulVote from './HelpfulVote';
import RarityMark from '../RarityMark';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStrongLanguage } from '../../hooks/useStrongLanguage';
import { getRarity, RATING_LABELS, BADGES } from '../reviewQuest/questOptions';
import { formatDate, tickedChecklist, reviewerName } from './reviewDisplay';
import { Avatar } from './RarityCard';
import { getProgress } from '../../lib/levels';
import { TEXT_BUTTON_SM, TEXT_LINK } from '../../lib/ui';

const LONG_REVIEW = 420; // characters: longer reviews start collapsed

// A quiet label over a group ("Moments"), on a hairline
const SectionLabel = ({ children }) => (
  <p className="pt-3 mb-2 border-t border-slate-700 text-sm text-slate-400">{children}</p>
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
        <p className="text-sm text-slate-400">{label}</p>
        <p className={`text-white break-words transition ${hidden ? 'blur-sm select-none' : ''}`} aria-hidden={hidden}>
          {value}
        </p>
      </div>
    );

  return (
    <article className="flex-1 min-w-0 w-full flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={name} user={review.user} size="w-9 h-9 text-sm" />
          <span className="min-w-0">
            {review.user?.displayUsername ? (
              <Link
                to={`/u/${encodeURIComponent(review.user.displayUsername)}`}
                className={`block w-fit max-w-full font-semibold text-white truncate ${TEXT_LINK}`}
              >
                {name}
              </Link>
            ) : (
              <span className="block font-semibold text-white truncate">{name}</span>
            )}
            <span className="block text-sm text-slate-400">
              {author && (
                <span className="font-medium" style={{ color: author.tier.color }}>
                  {author.tier.label} · Lv {author.level} ·{' '}
                </span>
              )}
              {formatDate(review.createdAt)}
            </span>
          </span>
        </div>
        <span className="flex items-center gap-2 shrink-0 text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: rarity.color }}>
            <RarityMark tier={rarity.key} />
            {rarity.label}
          </span>
          <span className="text-slate-400 tabular-nums">{review.rating}/10 · {RATING_LABELS[review.rating]}</span>
        </span>
      </header>

      {review.badges?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {review.badges.map((b) => (
            <span key={b} className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-xs border border-slate-600 text-sm font-medium text-white whitespace-nowrap">
              <ArtIcon icon={BADGES[b]?.art} className="w-3.5 h-3.5 text-rarity-legendary" /> {BADGES[b]?.label ?? b}
            </span>
          ))}
        </div>
      )}

      {/* Final words — or a calm line when there are none */}
      {paragraphs.length > 0 ? (
        <div>
          <div className={`text-base leading-[1.6] text-white break-words max-w-[68ch] ${isLong && !expanded ? 'line-clamp-6' : ''}`}>
            {paragraphs.map((p, i) => (
              <p key={i} className="whitespace-pre-line mb-3 last:mb-0">{p}</p>
            ))}
          </div>
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              aria-expanded={expanded}
              className={TEXT_BUTTON_SM}
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      ) : (
        !hasMoments && !hasProsCons && (
          <p className="text-sm text-slate-400">
            {tickedChecklist(review).length > 0
              ? `No written review. Turn the card over to see ${name}'s checklist.`
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
                    className="absolute inset-0 flex items-center justify-center rounded-sm bg-slate-950/60 text-sm font-medium text-white"
                  >
                    <span className="inline-flex items-center gap-1.5 underline decoration-1 underline-offset-5 decoration-slate-500/80 hover:decoration-current">
                      <TriangleAlert className="w-4 h-4 text-slate-400" strokeWidth={1.8} aria-hidden="true" /> Spoilers · tap to reveal
                    </span>
                  </button>
                )}
                {/* Revealed: hide them again */}
                {review.hasSpoilers && spoilersShown && (
                  <button
                    type="button"
                    onClick={() => setSpoilersShown(false)}
                    className={`self-start inline-flex items-center gap-1.5 ${TEXT_BUTTON_SM}`}
                  >
                    <EyeOff className="w-4 h-4 text-slate-400" strokeWidth={1.8} aria-hidden="true" /> Hide spoilers
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
                  <li key={`+${p}`} className="text-white break-words"><span className="font-semibold text-rarity-uncommon mr-1.5">+</span>{p}</li>
                ))}
                {review.cons?.map((c) => (
                  <li key={`-${c}`} className="text-white break-words"><span className="font-semibold text-red-400 mr-1.5">−</span>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <HelpfulVote review={original} />
    </article>
  );
};

export default ReviewPanel;
