/**
 * Review scoring — how a saved review earns XP and badges. Shared by the review
 * routes and the seed script, so seeded reviews score exactly like real ones.
 */
import { VETERAN_HOURS, CHECKLIST, XP_EASY, XP_WRITTEN } from './reviewOptions.js';

// A skipped quest screen = null / empty. Starting every save from this means
// that editing a review and skipping a screen clears the old answer.
const CHECKLIST_FIELDS = Object.keys(CHECKLIST);

export const EMPTY_ANSWERS = {
  platform: null, hoursPlayed: null, completionStatus: null, playStyle: null,
  vibes: [], gotGoodAfter: null,
  ...Object.fromEntries(CHECKLIST_FIELDS.map((f) => [f, null])), // graphics: null, bugs: null, …
  comparedAId: null, comparedBId: null,
  pros: [], cons: [],
  bestMoment: null, worstMoment: null, hasSpoilers: false,
  reviewText: null,
};

const OPTIONAL_SCREENS = 8;

/**
 * How many of the 8 optional quest screens (② – ⑨) were answered.
 */
const countAnsweredScreens = (r) =>
  [
    r.platform || r.hoursPlayed != null || r.completionStatus || r.playStyle, // ② setup
    r.vibes.length > 0,                                                       // ③ vibes
    r.gotGoodAfter,                                                           // ④ got good
    CHECKLIST_FIELDS.some((f) => r[f]),                                       // ⑤ checklist
    r.comparedAId || r.comparedBId,                                           // ⑥ X meets Y
    r.pros.length > 0 || r.cons.length > 0,                                   // ⑦ pros & cons
    r.bestMoment || r.worstMoment,                                            // ⑧ moments
    r.reviewText,                                                             // ⑨ final words
  ].filter(Boolean).length;

/**
 * The XP a review earns — the same as the quest shows: the rating and each
 * answered screen earn XP_EASY, the Final words earn XP_WRITTEN (max 130).
 */
export const reviewXp = (r) =>
  XP_EASY + (countAnsweredScreens(r) - (r.reviewText ? 1 : 0)) * XP_EASY + (r.reviewText ? XP_WRITTEN : 0);

/**
 * Works out which badges a review earns. "First Reviewer" is kept when a
 * review is edited later, even if someone else has reviewed the game since.
 */
export const awardBadges = (answers, { previousBadges = [], isFirstForGame }) => {
  const badges = new Set();

  if (previousBadges.includes('first_reviewer') || isFirstForGame) badges.add('first_reviewer');
  // Earned from helpful votes (lib/reviewVotes.js); editing the review keeps it
  if (previousBadges.includes('trusted_voice')) badges.add('trusted_voice');
  if (countAnsweredScreens(answers) === OPTIONAL_SCREENS) badges.add('deep_diver');
  if (answers.completionStatus === 'completed_100') badges.add('completionist');
  if (answers.hoursPlayed >= VETERAN_HOURS) badges.add('veteran');

  return [...badges];
};
