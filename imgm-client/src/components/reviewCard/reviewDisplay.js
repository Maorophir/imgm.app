/**
 * Helpers for showing a saved review (the card + written review on game pages).
 */
import { CHECKLIST } from '../reviewQuest/questOptions';

// A steady colour per reviewer name, for the letter avatar
export const avatarColor = (name = '?') => {
  const hue = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 360;
  return `hsl(${hue} 50% 40%)`;
};

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// The checklist answers this review ticked, each with its position in the ladder
// (the position decides its red → green colour). N/A answers get index 'na' (grey).
export const tickedChecklist = (review) =>
  CHECKLIST.map((category) => {
    const value = review[category.field];
    if (category.na && value === category.na.value) return { category, index: 'na', option: category.na };
    const index = category.options.findIndex((o) => o.value === value);
    return index === -1 ? null : { category, index, option: category.options[index] };
  }).filter(Boolean);

// A quick review = a score (and maybe one line), with none of the quest answered
export const isQuickReview = (r) =>
  !(
    r.platform || r.hoursPlayed != null || r.completionStatus || r.playStyle ||
    r.vibes?.length || r.gotGoodAfter || r.comparedA || r.comparedB ||
    r.pros?.length || r.cons?.length || r.bestMoment || r.worstMoment ||
    tickedChecklist(r).length
  );

// The author's public gamer tag (reviews never include real names)
export const reviewerName = (review) => review.user?.displayUsername || 'Player';
