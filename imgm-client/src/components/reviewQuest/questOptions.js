import { Angry, Award, BookOpen, Brain, Bug, CassetteTape, CloudFog, Coffee, Cog, Coins, DoorOpen, Flag, Frown, Gamepad2, Ghost, Globe, Handshake, Headphones, HeartCrack, Hourglass, Infinity as InfinityIcon, Laugh, Leaf, Medal, Meh, Monitor, Mountain, Palette, Repeat, ScanSearch, Smile, Sparkles, Sunset, Swords, Tornado, Trophy, User, Zap } from 'lucide-react';

/**
 * Review Quest options — labels and art for every answer.
 *
 * The `value` keys must match the server's src/lib/reviewOptions.js.
 * `art` is the "art slot": an emoji placeholder today, and later an
 * illustration (swap the emoji for an image path and render <img> instead).
 */

// ① Rating — a word for every score
export const RATING_LABELS = {
  1: 'Unplayable', 2: 'Bad', 3: 'Weak', 4: 'Meh', 5: 'Okay',
  6: 'Good', 7: 'Great', 8: 'Excellent', 9: 'Amazing', 10: 'Masterpiece',
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
  { value: 'playing', label: 'Still playing', art: Gamepad2 },
  { value: 'finished', label: 'Finished it', art: Flag },
  { value: 'completed_100', label: '100% done', art: Trophy },
  { value: 'dropped', label: 'Dropped it', art: DoorOpen },
];
export const PLAY_STYLES = [
  { value: 'solo', label: 'Solo', art: User },
  { value: 'coop', label: 'Co-op', art: Handshake },
  { value: 'online', label: 'Online', art: Globe },
];

// ③ Vibe check
export const VIBES = [
  { value: 'addictive', label: 'Addictive', art: InfinityIcon },
  { value: 'relaxing', label: 'Relaxing', art: Leaf },
  { value: 'rage_inducing', label: 'Rage-inducing', art: Angry },
  { value: 'emotional', label: 'Emotional', art: HeartCrack },
  { value: 'grindy', label: 'Grindy', art: Cog },
  { value: 'cozy', label: 'Cozy', art: Coffee },
  { value: 'chaotic', label: 'Chaotic', art: Tornado },
  { value: 'mind_blowing', label: 'Mind-blowing', art: Sparkles },
  { value: 'scary', label: 'Scary', art: Ghost },
  { value: 'funny', label: 'Funny', art: Laugh },
  { value: 'competitive', label: 'Competitive', art: Trophy },
  { value: 'epic', label: 'Epic', art: Swords },
  { value: 'atmospheric', label: 'Atmospheric', art: CloudFog },
  { value: 'nostalgic', label: 'Nostalgic', art: CassetteTape },
  { value: 'challenging', label: 'Challenging', art: Mountain },
  { value: 'beautiful', label: 'Beautiful', art: Sunset },
];
export const MAX_VIBES = 3;

// ④ When did it get good? — worst → best, left to right
// (art slot: the "bored → hooked" illustrations)
export const GOT_GOOD_AFTER = [
  { value: 'never',      label: 'Never',             art: Frown, hint: 'It never clicked for me' },
  { value: 'many_hours', label: 'After many hours',  art: Meh, hint: 'You have to push through' },
  { value: 'few_hours',  label: 'After a few hours', art: Smile, hint: 'Slow start, then it clicks' },
  { value: 'instantly',  label: 'Instantly',         art: Zap, hint: 'Hooked from minute one' },
];

// ⑤ The checklist — every category is optional. Options go left → right:
//   kind 'scale'   = worst → best (the picked option is coloured red → green)
//   kind 'neutral' = less → more, neither good nor bad (picked option is blue)
// `na` (optional) = a "not applicable" answer shown apart from the ladder, in grey
//   (e.g. no story in an online shooter, no price for a free-to-play game).
// `values` (plus 'na') must match CHECKLIST in the server's src/lib/reviewOptions.js.
// Edit the jokes freely — only the `value` keys are stored.
export const CHECKLIST = [
  {
    field: 'graphics', title: 'Graphics', art: Palette, kind: 'scale',
    options: [
      { value: 'ms_paint',   label: 'MS Paint' },
      { value: 'potato',     label: 'Potato-core' },
      { value: 'decent',     label: 'Decent' },
      { value: 'pretty',     label: 'Pretty' },
      { value: 'screenshot', label: 'Screenshot every 5 seconds' },
      { value: 'reality',    label: 'You forget what reality is' },
    ],
  },
  {
    field: 'gameplay', title: 'Gameplay', art: Gamepad2, kind: 'scale',
    options: [
      { value: 'dont',      label: 'Just don\'t' },
      { value: 'paint_dry', label: 'Watching paint dry is more fun' },
      { value: 'fine',      label: 'It\'s… gameplay' },
      { value: 'good',      label: 'Good' },
      { value: 'great',     label: 'Great' },
      { value: 'one_more',  label: '"One more match" (it\'s 4 AM)' },
    ],
  },
  {
    field: 'audio', title: 'Audio', art: Headphones, kind: 'scale',
    options: [
      { value: 'deaf',    label: 'I\'m now deaf' },
      { value: 'mute',    label: 'Played it on mute' },
      { value: 'okay',    label: 'Not bad' },
      { value: 'good',    label: 'Good' },
      { value: 'repeat',  label: 'Soundtrack on repeat' },
      { value: 'eargasm', label: 'Eargasm' },
    ],
  },
  {
    field: 'story', title: 'Story', art: BookOpen, kind: 'scale',
    na: { value: 'na', label: 'N/A · It\'s not that kind of game' },
    options: [
      { value: 'none',    label: 'What story?' },
      { value: 'lore',    label: 'Some lore in the menus' },
      { value: 'average', label: 'Average' },
      { value: 'good',    label: 'Good' },
      { value: 'tears',   label: 'I cried (don\'t tell anyone)' },
      { value: 'life',    label: 'It\'ll replace your life' },
    ],
  },
  {
    field: 'difficulty', title: 'Difficulty', art: Brain, kind: 'neutral',
    options: [
      { value: 'press_w',      label: 'Just press W' },
      { value: 'easy',         label: 'Easy' },
      { value: 'learn_master', label: 'Easy to learn, hard to master' },
      { value: 'brain',        label: 'Brain required' },
      { value: 'hard',         label: 'Hard' },
      { value: 'dark_souls',   label: 'Dark Souls' },
    ],
  },
  {
    field: 'grind', title: 'Grind', art: Cog, kind: 'neutral',
    options: [
      { value: 'none',        label: 'Nothing to grind' },
      { value: 'optional',    label: 'Only for completionists' },
      { value: 'average',     label: 'Average grind' },
      { value: 'lots',        label: 'Too much grind' },
      { value: 'second_life', label: 'You\'ll need a second life' },
    ],
  },
  {
    field: 'gameLength', title: 'Game length', art: Hourglass, kind: 'neutral',
    na: { value: 'na', label: 'N/A · It\'s an endless online game' },
    options: [
      { value: 'coffee',   label: 'One cup of coffee' },
      { value: 'short',    label: 'Short' },
      { value: 'average',  label: 'Average' },
      { value: 'long',     label: 'Long' },
      { value: 'infinity', label: 'To infinity and beyond' },
    ],
  },
  {
    field: 'bugs', title: 'Bugs', art: Bug, kind: 'scale',
    options: [
      { value: 'terrarium', label: 'A bug terrarium with a game in it' },
      { value: 'annoying',  label: 'Can get annoying' },
      { value: 'minor',     label: 'Minor bugs' },
      { value: 'none',      label: 'Never heard of \'em' },
    ],
  },
  {
    field: 'pcRequirements', title: 'PC requirements', art: Monitor, kind: 'neutral',
    // Only for PC players — hidden when another platform was picked in Setup
    showIf: (answers) => !answers.platform || answers.platform === 'PC',
    options: [
      { value: 'toaster', label: 'Runs on a toaster' },
      { value: 'potato',  label: 'Potato-friendly' },
      { value: 'decent',  label: 'Decent' },
      { value: 'fast',    label: 'Fast' },
      { value: 'rich',    label: 'Rich kid rig' },
      { value: 'nasa',    label: 'Ask NASA for a spare' },
    ],
  },
  {
    field: 'worthPrice', title: 'Price', art: Coins, kind: 'scale',
    na: { value: 'na', label: 'N/A · It\'s free-to-play' },
    options: [
      { value: 'never', label: 'Burn your money instead' },
      { value: 'free',  label: 'Only if it\'s free' },
      { value: 'sale',  label: 'Wait for a sale' },
      { value: 'full',  label: 'Worth every penny' },
    ],
  },
  {
    field: 'replay', title: 'Replay', art: Repeat, kind: 'scale',
    na: { value: 'na', label: 'N/A · It never really ends' },
    options: [
      { value: 'once',    label: 'Once was enough' },
      { value: 'someday', label: 'Maybe someday' },
      { value: 'already', label: 'Already replaying it' },
    ],
  },
];

// Colour of a ticked checklist answer, from its position in the ladder.
// Scales go red (worst) → yellow → green (best); neutral categories are always blue.
// Used by the quest's checklist and by the back of the review card.
export const NA_COLOR = { solid: 'rgb(100 116 139)', soft: 'rgb(100 116 139 / 0.15)' }; // slate-500

export const checklistColor = (category, index) => {
  if (index === 'na') return NA_COLOR;
  if (category.kind === 'neutral') return { solid: 'rgb(96 165 250)', soft: 'rgb(96 165 250 / 0.15)' };
  const hue = Math.round((index / (category.options.length - 1)) * 130); // 0 = red … 130 = green
  return { solid: `hsl(${hue} 75% 58%)`, soft: `hsl(${hue} 75% 58% / 0.15)` };
};

// XP per quest screen: every easy screen +10, the written review +50
export const XP_EASY = 10;
export const XP_WRITTEN = 50;
export const QUEST_SCREENS = 9; // rating + 7 easy screens + final words
export const MAX_XP = (QUEST_SCREENS - 1) * XP_EASY + XP_WRITTEN; // 130

// Badges (awarded by the server)
export const BADGES = {
  first_reviewer: { label: 'First Reviewer', art: Medal },
  deep_diver: { label: 'Deep Diver', art: ScanSearch },
  completionist: { label: 'Completionist', art: Trophy },
  veteran: { label: 'Veteran', art: Award },
};

// Every answer, "skipped" — the starting point for a new review
export const EMPTY_ANSWERS = {
  rating: null,
  platform: null, hoursPlayed: null, completionStatus: null, playStyle: null,
  vibes: [], gotGoodAfter: null,
  ...Object.fromEntries(CHECKLIST.map((c) => [c.field, null])), // graphics: null, bugs: null, …
  comparedA: null, comparedB: null, // full game objects on the client; sent to the server as ids
  pros: [], cons: [],
  bestMoment: '', worstMoment: '', hasSpoilers: false,
  reviewText: '',
};
