/**
 * The Play Next "Tune it" questions and their options. The values are the keys the
 * AI understands (imgm-ai Preferences); players only ever see the labels.
 */

// One question each. `multi` = pick several (up to `max`); otherwise one at most.
// `custom` = the player can also type their own (up to MAX_CUSTOM).
export const MAX_CUSTOM = 3;
export const QUESTIONS = [
  {
    key: 'game_length',
    label: 'How much game?',
    multi: true, // a quick one AND an epic = either is fine
    options: [
      { value: 'short', label: 'A quick one', hint: 'an evening or two' },
      { value: 'medium', label: 'Something solid', hint: 'a few weeks' },
      { value: 'long', label: 'An epic', hint: 'I want to live in it' },
    ],
  },
  {
    key: 'moods',
    label: 'The mood',
    multi: true,
    max: 3,
    options: ['Cozy', 'Intense', 'Emotional', 'Brainy', 'Funny', 'Scary', 'Epic adventure'].map((label) => ({
      value: label.toLowerCase(),
      label,
    })),
  },
  {
    key: 'play_style',
    label: 'Playing with',
    options: [
      { value: 'solo', label: 'Just me' },
      { value: 'coop', label: 'Friends, together' },
      { value: 'online', label: 'Online' },
    ],
  },
  {
    key: 'difficulty',
    label: 'How hard?',
    options: [
      { value: 'relaxed', label: 'Relaxed' },
      { value: 'balanced', label: 'Balanced' },
      { value: 'hard', label: 'Bring the pain' },
    ],
  },
  {
    key: 'avoid',
    label: 'Avoid',
    summaryPrefix: 'Avoid: ', // so the summary doesn't read as wanting horror
    multi: true,
    custom: true,
    options: [
      'Horror',
      'Gore',
      'Microtransactions',
      'Grinding',
      'Time pressure',
      'Permadeath',
      'Online only',
      'Long cutscenes',
    ].map((label) => ({
      value: label.toLowerCase(),
      label,
    })),
  },
  {
    key: 'platforms',
    label: 'I play on',
    multi: true,
    // Names match the game catalog (IGDB), so the AI can check availability
    options: [
      { value: 'PC', label: 'PC' },
      { value: 'PlayStation 5', label: 'PS5' },
      { value: 'Xbox Series X|S', label: 'Xbox' },
      { value: 'Nintendo Switch', label: 'Switch' },
    ],
  },
];

/**
 * A short readable summary for the collapsed panel, e.g. "A quick one · Cozy, Funny · PC".
 */
export const summarize = (prefs) =>
  QUESTIONS.flatMap(({ key, options, summaryPrefix = '' }) => {
    const picked = [prefs[key]].flat().filter(Boolean);
    // An option's label, or the player's own words for one they typed
    const labels = picked.map((value) => options.find((o) => o.value === value)?.label ?? value);
    return labels.length ? [summaryPrefix + labels.join(', ')] : [];
  })
    .concat(prefs.loved_games?.length ? [`Loved: ${prefs.loved_games.join(', ')}`] : [])
    .join(' · ');
