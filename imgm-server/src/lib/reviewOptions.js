/**
 * Review Quest answer options — the single source of truth for which values
 * each quest question accepts. The database stores these short keys; the
 * client maps them to labels/art (e.g. 'rage_inducing' → "Rage-inducing" + its icon).
 *
 * Checklist ladders are ordered worst → best (or less → more for neutral
 * ones like difficulty), matching the left → right order on screen.
 * 'na' (not applicable) is allowed for a few categories and always comes last —
 * it is NOT part of the ladder, so averages must skip it.
 */

// ② Your setup
export const COMPLETION_STATUSES = ['playing', 'finished', 'completed_100', 'dropped'];
export const PLAY_STYLES = ['solo', 'coop', 'online'];

// ③ Vibe check
export const VIBES = [
  'addictive', 'relaxing', 'rage_inducing', 'emotional', 'grindy', 'cozy',
  'chaotic', 'mind_blowing', 'scary', 'funny', 'competitive', 'epic',
  'atmospheric', 'nostalgic', 'challenging', 'beautiful',
];
export const MAX_VIBES = 3;

// ④ When did it get good?
export const GOT_GOOD_AFTER = ['never', 'many_hours', 'few_hours', 'instantly'];

// ⑤ The checklist — one optional ladder per category (field name → allowed keys)
export const CHECKLIST = {
  graphics:       ['ms_paint', 'potato', 'decent', 'pretty', 'screenshot', 'reality'],
  gameplay:       ['dont', 'paint_dry', 'fine', 'good', 'great', 'one_more'],
  audio:          ['deaf', 'mute', 'okay', 'good', 'repeat', 'eargasm'],
  story:          ['none', 'lore', 'average', 'good', 'tears', 'life', 'na'],
  difficulty:     ['press_w', 'easy', 'learn_master', 'brain', 'hard', 'dark_souls'],
  grind:          ['none', 'optional', 'average', 'lots', 'second_life'],
  gameLength:     ['coffee', 'short', 'average', 'long', 'infinity', 'na'],
  bugs:           ['terrarium', 'annoying', 'minor', 'none'],
  pcRequirements: ['toaster', 'potato', 'decent', 'fast', 'rich', 'nasa'],
  worthPrice:     ['never', 'free', 'sale', 'full', 'na'],
  replay:         ['once', 'someday', 'already', 'na'],
};

// Badges the server can award (see awardBadges in reviewsController)
export const BADGES = ['first_reviewer', 'deep_diver', 'completionist', 'veteran'];
export const VETERAN_HOURS = 100;

// XP per review, as in the quest: every answered screen (the rating included)
// earns XP_EASY, and the Final words earn XP_WRITTEN. A full review = 130 XP.
export const XP_EASY = 10;
export const XP_WRITTEN = 50;
