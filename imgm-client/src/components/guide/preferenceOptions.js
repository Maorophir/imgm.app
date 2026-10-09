/**
 * The Play Next questions: asked once as the "Find my game" quest (one screen each),
 * then editable in the chat's "Tune it" panel. The values are the keys the AI
 * understands (imgm-ai Preferences); players only ever see the labels.
 */

// One question each. `multi` = pick several (up to `max`); otherwise one at most.
// `custom` = the player can also type their own (up to MAX_CUSTOM).
// `hint` and `examples` only show on the quest's cards: the AI never sees them.
export const MAX_CUSTOM = 3;
export const MAX_LOVED = 3;

export const QUESTIONS = [
  {
    key: "platforms",
    label: "I play on",
    multi: true,
    // Names match the game catalog (IGDB), so the AI can check availability
    options: [
      { value: "PC", label: "PC" },
      { value: "PlayStation 5", label: "PS5" },
      { value: "Xbox Series X|S", label: "Xbox" },
      { value: "Nintendo Switch", label: "Switch" },
    ],
  },
  {
    key: "moods",
    label: "The vibe",
    multi: true,
    max: 2,
    options: [
      { value: "cozy", label: "Chill and cozy" },
      { value: "intense", label: "Heart-pumping" },
      { value: "brainy", label: "Make me think" },
      { value: "emotional", label: "Make me feel" },
      { value: "scary", label: "Scare me" },
      { value: "funny", label: "Make me laugh" },
      { value: "epic adventure", label: "Get lost in a world" },
    ],
  },
  {
    key: "wants_to",
    label: "I want to",
    multi: true,
    max: 2,
    options: [
      {
        value: "story",
        label: "Follow a story",
        hint: "Characters and choices pull me forward",
        examples: "The Last of Us, Disco Elysium",
      },
      {
        value: "combat",
        label: "Master the combat",
        hint: "Get better until it clicks",
        examples: "Sekiro, Devil May Cry 5",
      },
      {
        value: "explore",
        label: "Explore a world",
        hint: "Wander off the path, find secrets",
        examples: "Breath of the Wild, Outer Wilds",
      },
      {
        value: "puzzles",
        label: "Solve puzzles",
        hint: 'Chase the "aha" moment',
        examples: "Portal 2, The Witness",
      },
      {
        value: "build",
        label: "Build and manage",
        hint: "Make something grow",
        examples: "Stardew Valley, Factorio",
      },
      {
        value: "strategy",
        label: "Plan and outsmart",
        hint: "Every move counts",
        examples: "XCOM 2, Into the Breach",
      },
      {
        value: "runs",
        label: "One more run",
        hint: "Die, learn, go again",
        examples: "Hades, Slay the Spire",
      },
      {
        value: "compete",
        label: "Compete and race",
        hint: "Sports, racing, beating real people",
        examples: "Rocket League, Forza Horizon",
      },
    ],
  },
  {
    key: "play_style",
    label: "Playing with",
    options: [
      { value: "solo", label: "Just me" },
      { value: "couch", label: "Couch co-op", hint: "Same screen, same sofa" },
      { value: "online", label: "Online with friends" },
      { value: "competitive", label: "Against other people" },
    ],
  },
  {
    key: "session_length",
    label: "Per sitting",
    options: [
      { value: "short", label: "15-minute bites" },
      { value: "medium", label: "An hour or two" },
      { value: "long", label: "Whole evenings" },
    ],
  },
  {
    key: "game_length",
    label: "The whole game",
    multi: true, // a quick one AND an epic = either is fine
    options: [
      { value: "short", label: "A quick one", hint: "An evening or two" },
      { value: "medium", label: "Something solid", hint: "A few weeks" },
      { value: "long", label: "An epic", hint: "I want to live in it" },
    ],
  },
  {
    key: "difficulty",
    label: "How hard?",
    options: [
      { value: "relaxed", label: "Relaxed", hint: "Just let me enjoy it" },
      { value: "balanced", label: "Balanced", hint: "A fair challenge" },
      { value: "hard", label: "Bring the pain", hint: "I want to earn it" },
    ],
  },
  {
    key: "avoid",
    label: "Avoid",
    summaryPrefix: "Avoid: ", // so the summary doesn't read as wanting horror
    multi: true,
    custom: true,
    options: [
      "Horror",
      "Gore",
      "Microtransactions",
      "Grinding",
      "Time pressure",
      "Permadeath",
      "Online only",
      "Long cutscenes",
    ].map((label) => ({ value: label.toLowerCase(), label })),
  },
];

export const questionFor = (key) => QUESTIONS.find((q) => q.key === key);

/**
 * The "Find my game" quest: one screen at a time, in this order.
 * `keys` = the questions on the screen; `any` = the way out that answers "no preference";
 * `optional` screens can be skipped (the loved game, and the last words).
 */
export const QUEST_SCREENS = [
  {
    id: "platforms",
    title: "Where do you play?",
    subtitle: "Pick all you have.",
    keys: ["platforms"],
    any: "I play on everything",
  },
  {
    id: "vibe",
    title: "What's the vibe?",
    subtitle: "Pick up to 2.",
    keys: ["moods"],
    any: "Surprise me",
  },
  {
    id: "do",
    title: "What do you want to do?",
    subtitle: "What you'll spend your hours doing. Pick up to 2.",
    keys: ["wants_to"],
    any: "Surprise me",
  },
  {
    id: "who",
    title: "Who's playing?",
    keys: ["play_style"],
    any: "Doesn't matter",
  },
  {
    id: "time",
    title: "How much time?",
    keys: ["session_length", "game_length"],
    any: "Any length",
  },
  { id: "hard", title: "How hard?", keys: ["difficulty"], any: "Surprise me" },
  {
    id: "loved",
    title: "A game you loved lately?",
    subtitle: "The best clue you can give. Up to 3, or skip it.",
    optional: true,
  },
  {
    id: "avoid",
    title: "Any deal-breakers?",
    subtitle: "Pick any, or add your own.",
    keys: ["avoid"],
    any: "None",
  },
  {
    id: "note",
    title: "Anything else?",
    subtitle: "Optional. Say it in your own words.",
    optional: true,
  },
];

/**
 * One tap on an option: single answers switch (tap again = un-pick), multi answers
 * add or remove (never past `max`). Returns the new prefs.
 */
export const toggleAnswer = (prefs, { key, multi, max }, value) => {
  if (!multi)
    return { ...prefs, [key]: prefs[key] === value ? undefined : value };
  const current = prefs[key] ?? [];
  if (current.includes(value))
    return { ...prefs, [key]: current.filter((v) => v !== value) };
  if (max && current.length >= max) return prefs;
  return { ...prefs, [key]: [...current, value] };
};

/** Has the player answered this question? */
export const hasAnswer = (prefs, key) =>
  [prefs[key]].flat().filter(Boolean).length > 0;

/**
 * A short readable summary for the collapsed panel, e.g. "PC · Chill and cozy · A quick one".
 */
export const summarize = (prefs) =>
  QUESTIONS.flatMap(({ key, options, summaryPrefix = "" }) => {
    const picked = [prefs[key]].flat().filter(Boolean);
    // An option's label, or the player's own words for one they typed
    const labels = picked.map(
      (value) => options.find((o) => o.value === value)?.label ?? value,
    );
    return labels.length ? [summaryPrefix + labels.join(", ")] : [];
  })
    .concat(
      prefs.loved_games?.length
        ? [`Loved: ${prefs.loved_games.join(", ")}`]
        : [],
    )
    .join(" · ");
