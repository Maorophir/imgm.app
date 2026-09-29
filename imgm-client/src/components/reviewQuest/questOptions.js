/**
 * Review Quest options — labels and art for every answer.
 *
 * The `value` keys must match the server's src/lib/reviewOptions.js.
 * `art` is the "art slot": an emoji placeholder today, and later an
 * illustration (swap the emoji for an image path and render <img> instead).
 */

// ① Rating — a word for every score
export const RATING_LABELS = {
  1: 'Unplayable', 2: 'Awful', 3: 'Bad', 4: 'Weak', 5: 'Meh',
  6: 'Okay', 7: 'Good', 8: 'Great', 9: 'Amazing', 10: 'Masterpiece',
};

// Loot rarity — the review's verdict, from the reviewer's own score (not AI).
// Replaces positive / mixed / negative everywhere. Legendary is a perfect 10 only.
// `min` = lowest score of the tier; `range` is the label shown in the rarity index.
export const RARITIES = [
  { key: 'junk',      label: 'Junk',      min: 1,  range: '1–2', color: '#8b93a7' },
  { key: 'common',    label: 'Common',    min: 3,  range: '3–4', color: '#d4dae6' },
  { key: 'uncommon',  label: 'Uncommon',  min: 5,  range: '5',   color: '#4ade80' },
  { key: 'rare',      label: 'Rare',      min: 6,  range: '6–7', color: '#60a5fa' },
  { key: 'epic',      label: 'Epic',      min: 8,  range: '8–9', color: '#c084fc' },
  { key: 'legendary', label: 'Legendary', min: 10, range: '10',  color: '#fbbf24' },
];

// The tier for a score. Averages are rounded first, so one table serves both:
// 8 → Epic, 8.4 → 8 → Epic, 9.6 → 10 → Legendary, 5.4 → 5 → Uncommon.
export const getRarity = (rating) => {
  const score = Math.round(rating);
  return RARITIES.findLast((r) => score >= r.min);
};

// ② Your setup
export const COMPLETION_STATUSES = [
  { value: 'playing', label: 'Still playing', art: '🎮' },
  { value: 'finished', label: 'Finished it', art: '🏁' },
  { value: 'completed_100', label: '100% done', art: '🏆' },
  { value: 'dropped', label: 'Dropped it', art: '🚪' },
];
export const DIFFICULTIES = [
  { value: 'easy', label: 'Easy', art: '🌱' },
  { value: 'normal', label: 'Normal', art: '⚖️' },
  { value: 'hard', label: 'Hard', art: '🔥' },
  { value: 'extreme', label: 'Extreme', art: '💀' },
];
export const PLAY_STYLES = [
  { value: 'solo', label: 'Solo', art: '🧍' },
  { value: 'coop', label: 'Co-op', art: '🤝' },
  { value: 'online', label: 'Online', art: '🌐' },
];

// ③ Vibe check
export const VIBES = [
  { value: 'addictive', label: 'Addictive', art: '🎰' },
  { value: 'relaxing', label: 'Relaxing', art: '😌' },
  { value: 'rage_inducing', label: 'Rage-inducing', art: '😤' },
  { value: 'emotional', label: 'Emotional', art: '😭' },
  { value: 'grindy', label: 'Grindy', art: '⚙️' },
  { value: 'cozy', label: 'Cozy', art: '☕' },
  { value: 'chaotic', label: 'Chaotic', art: '🌪️' },
  { value: 'mind_blowing', label: 'Mind-blowing', art: '🤯' },
  { value: 'scary', label: 'Scary', art: '👻' },
  { value: 'funny', label: 'Funny', art: '😂' },
  { value: 'competitive', label: 'Competitive', art: '🏆' },
  { value: 'epic', label: 'Epic', art: '⚔️' },
  { value: 'atmospheric', label: 'Atmospheric', art: '🌫️' },
  { value: 'nostalgic', label: 'Nostalgic', art: '📼' },
  { value: 'challenging', label: 'Challenging', art: '🧗' },
  { value: 'beautiful', label: 'Beautiful', art: '🌅' },
];
export const MAX_VIBES = 3;

// ④ When did it get good? (art slot: the "bored → hooked" illustrations)
export const GOT_GOOD_AFTER = [
  { value: 'instantly', label: 'Instantly', art: '🤩', hint: 'Hooked from minute one' },
  { value: 'few_hours', label: 'After a few hours', art: '🙂', hint: 'Slow start, then it clicks' },
  { value: 'many_hours', label: 'After many hours', art: '🥱', hint: 'You have to push through' },
  { value: 'never', label: 'Never', art: '😴', hint: 'It never clicked for me' },
];

// ⑤ Rate the parts
export const PART_SCORES = [
  { field: 'scoreStory', label: 'Story', art: '📖' },
  { field: 'scoreGameplay', label: 'Gameplay', art: '🎮' },
  { field: 'scoreVisuals', label: 'Visuals', art: '🎨' },
  { field: 'scoreSound', label: 'Sound', art: '🎧' },
  { field: 'scorePerformance', label: 'Performance', art: '⚡' },
];

// ⑨ Worth the price + replay
export const WORTH_PRICE = [
  { value: 'full', label: 'Worth full price', art: '💎' },
  { value: 'sale', label: 'Wait for a sale', art: '🏷️' },
  { value: 'free', label: 'Only if free', art: '🆓' },
  { value: 'never', label: 'Not even free', art: '🗑️' },
];
export const REPLAY = [
  { value: 'already', label: 'Already replayed', art: '🔁' },
  { value: 'someday', label: 'Someday', art: '📅' },
  { value: 'once', label: 'Once was enough', art: '✅' },
];

// Badges (awarded by the server)
export const BADGES = {
  first_reviewer: { label: 'First Reviewer', art: '🥇' },
  deep_diver: { label: 'Deep Diver', art: '🔍' },
  completionist: { label: 'Completionist', art: '🏆' },
  veteran: { label: 'Veteran', art: '⏳' },
  beta_tester: { label: 'Beta Tester', art: '🧪' },
};

// Every answer, "skipped" — the starting point for a new review
export const EMPTY_ANSWERS = {
  rating: null,
  platform: null, hoursPlayed: null, completionStatus: null, difficulty: null, playStyle: null,
  vibes: [], gotGoodAfter: null,
  scoreStory: null, scoreGameplay: null, scoreVisuals: null, scoreSound: null, scorePerformance: null,
  comparedA: null, comparedB: null, // full game objects on the client; sent to the server as ids
  pros: [], cons: [],
  bestMoment: '', worstMoment: '', hasSpoilers: false,
  worthPrice: null, replay: null,
  reviewText: '',
};
