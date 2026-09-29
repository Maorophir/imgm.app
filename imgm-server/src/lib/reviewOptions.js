/**
 * Review Quest answer options — the single source of truth for which values
 * each quest question accepts. The database stores these short keys; the
 * client maps them to labels/art (e.g. 'rage_inducing' → "Rage-inducing 😤").
 */

// ② Your setup
export const COMPLETION_STATUSES = ['playing', 'finished', 'completed_100', 'dropped'];
export const DIFFICULTIES = ['easy', 'normal', 'hard', 'extreme'];
export const PLAY_STYLES = ['solo', 'coop', 'online'];

// ③ Vibe check
export const VIBES = [
  'addictive', 'relaxing', 'rage_inducing', 'emotional', 'grindy', 'cozy',
  'chaotic', 'mind_blowing', 'scary', 'funny', 'competitive', 'epic',
  'atmospheric', 'nostalgic', 'challenging', 'beautiful',
];
export const MAX_VIBES = 3;

// ④ When did it get good?
export const GOT_GOOD_AFTER = ['instantly', 'few_hours', 'many_hours', 'never'];

// ⑨ Worth the price + replay
export const WORTH_PRICE = ['full', 'sale', 'free', 'never'];
export const REPLAY = ['already', 'someday', 'once'];

// Badges the server can award (see awardBadges in reviewsController)
export const BADGES = ['first_reviewer', 'deep_diver', 'completionist', 'veteran', 'beta_tester'];
export const VETERAN_HOURS = 100;
