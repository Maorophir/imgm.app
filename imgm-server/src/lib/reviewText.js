/**
 * Review text moderation — applies IMGM's policy to a review's free-text fields:
 * slurs block posting (findSlurField), swearing is masked for display (withMaskedText).
 */
import { hasSlur, maskProfanity } from './moderation.js';

// Every free-text part of a review, with the name used in messages
const TEXT_FIELDS = { reviewText: 'final words', bestMoment: 'best moment', worstMoment: 'worst moment' };
const LIST_FIELDS = { pros: 'pros', cons: 'cons' };

/**
 * The label of the first field containing a slur ("final words"), or null.
 */
export const findSlurField = (review) => {
  for (const [field, label] of Object.entries(TEXT_FIELDS)) {
    if (review[field] && hasSlur(review[field])) return label;
  }
  for (const [field, label] of Object.entries(LIST_FIELDS)) {
    if (review[field]?.some((item) => hasSlur(item))) return label;
  }
  return null;
};

/**
 * Adds `masked` — the fields that contain swearing, with it masked ("f***").
 * The original text is untouched, so the site can show either one depending on
 * the viewer's "show strong language" setting. Clean reviews get no `masked`.
 */
export const withMaskedText = (review) => {
  const masked = {};
  for (const field of Object.keys(TEXT_FIELDS)) {
    if (!review[field]) continue;
    const clean = maskProfanity(review[field]);
    if (clean !== review[field]) masked[field] = clean;
  }
  for (const field of Object.keys(LIST_FIELDS)) {
    if (!review[field]?.length) continue;
    const clean = review[field].map(maskProfanity);
    if (clean.some((item, i) => item !== review[field][i])) masked[field] = clean;
  }
  return Object.keys(masked).length ? { ...review, masked } : review;
};
