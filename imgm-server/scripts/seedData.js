/**
 * Seed data — fake IMGM players and their reviews, for local development.
 *
 * Each player has a distinct taste, so RAG and recommendations have something
 * real to work with ("cozy" should find Stardew, "brutal" should find Elden Ring).
 * Games are referenced by title and resolved through IGDB search when seeding.
 *
 * Review fields (all optional except game + rating), using the quest's option keys:
 *   year (picks a remake/re-release when titles repeat),
 *   platform, hours, completion, style, vibes (≤3), gotGood, checklist {…},
 *   meets [titleA, titleB], pros [], cons [], best, worst, spoilers, text
 */

export const SEED_PLAYERS = [
  {
    tag: 'CozyCass',
    reviews: [
      {
        game: 'Stardew Valley', rating: 10, platform: 'Nintendo Switch', hours: 320, completion: 'completed_100', style: 'coop',
        vibes: ['cozy', 'relaxing', 'addictive'], gotGood: 'instantly',
        checklist: { graphics: 'pretty', gameplay: 'one_more', audio: 'eargasm', story: 'good', difficulty: 'easy', grind: 'optional', gameLength: 'infinity', bugs: 'none', worthPrice: 'full', replay: 'already' },
        meets: ['Animal Crossing: New Horizons', 'Harvest Moon'],
        pros: ['Farming loop', 'Lovable villagers', 'Co-op with my partner'], cons: ['Winter drags'],
        best: 'Finishing the community center with my partner at 2am.',
        text: 'My comfort game. Every season feels like a fresh start, and playing co-op turned it into our evening ritual. If you want something calm that still keeps you hooked, this is it.',
      },
      {
        game: 'Animal Crossing: New Horizons', rating: 9, platform: 'Nintendo Switch', hours: 400, completion: 'playing', style: 'solo',
        vibes: ['cozy', 'relaxing', 'beautiful'], gotGood: 'few_hours',
        checklist: { graphics: 'screenshot', gameplay: 'good', difficulty: 'press_w', grind: 'lots', gameLength: 'infinity', worthPrice: 'full' },
        pros: ['Decorating', 'Seasonal events'], cons: ['Slow start', 'Grindy bells'],
        text: 'The slow first week is worth it. Once your island takes shape it becomes a little daily escape.',
      },
      {
        game: 'Spiritfarer', rating: 9, platform: 'PC', hours: 35, completion: 'finished', style: 'solo',
        vibes: ['emotional', 'cozy', 'beautiful'], gotGood: 'few_hours',
        checklist: { graphics: 'screenshot', story: 'tears', audio: 'eargasm', difficulty: 'easy', gameLength: 'average', worthPrice: 'full' },
        pros: ['Hand-drawn art', 'Every spirit has a story'], cons: ['Some fetch quests'],
        best: 'Saying goodbye to Gwen.', spoilers: true,
        text: 'A cozy management game about saying goodbye. I cried more than once, and I would do it again.',
      },
      {
        game: 'Dark Souls III', rating: 3, platform: 'PC', hours: 4, completion: 'dropped', style: 'solo',
        vibes: ['rage_inducing', 'challenging'], gotGood: 'never',
        checklist: { difficulty: 'dark_souls', gameplay: 'paint_dry', worthPrice: 'sale' },
        cons: ['Punishing', 'No pause'],
        text: 'I wanted to like it, but dying to the same knight for an hour is not my idea of fun.',
      },
      { game: 'A Short Hike', rating: 9, vibes: ['cozy', 'relaxing', 'beautiful'], text: 'Two hours of pure joy. Perfect lazy Sunday game.' },
      { game: 'Unpacking', rating: 8, vibes: ['relaxing', 'emotional'], text: 'Tells a whole life story through moving boxes. Short, sweet, surprisingly moving.' },
    ],
  },
  {
    tag: 'SoulsbornSam',
    reviews: [
      {
        game: 'Elden Ring', rating: 10, platform: 'PlayStation 5', hours: 210, completion: 'completed_100', style: 'solo',
        vibes: ['epic', 'challenging', 'atmospheric'], gotGood: 'few_hours',
        checklist: { graphics: 'screenshot', gameplay: 'one_more', audio: 'repeat', story: 'lore', difficulty: 'dark_souls', grind: 'optional', gameLength: 'long', bugs: 'minor', worthPrice: 'full', replay: 'already' },
        meets: ['Dark Souls III', 'The Legend of Zelda: Breath of the Wild'],
        pros: ['Open world exploration', 'Boss design', 'Build variety'], cons: ['Performance dips', 'Some recycled bosses'],
        best: 'Riding into Caelid for the first time and seeing the red sky.',
        worst: 'Malenia. Just Malenia.',
        text: 'The best open world I have ever explored. Every corner hides something, and every boss teaches you something. Brutal, fair and unforgettable.',
      },
      {
        game: 'Sekiro: Shadows Die Twice', rating: 10, platform: 'PC', hours: 80, completion: 'finished', style: 'solo',
        vibes: ['challenging', 'rage_inducing', 'epic'], gotGood: 'many_hours',
        checklist: { gameplay: 'one_more', difficulty: 'dark_souls', story: 'good', gameLength: 'average', worthPrice: 'full', replay: 'already' },
        meets: ['Dark Souls III', 'Ninja Gaiden'],
        pros: ['Parry combat', 'Boss fights'], cons: ['Brutal learning curve'],
        text: 'Once the parry rhythm clicks, it feels like a dance. The hardest game I have ever loved.',
      },
      {
        game: 'Hollow Knight', rating: 9, platform: 'Nintendo Switch', hours: 60, completion: 'finished', style: 'solo',
        vibes: ['atmospheric', 'challenging', 'beautiful'], gotGood: 'few_hours',
        checklist: { graphics: 'pretty', audio: 'eargasm', difficulty: 'hard', gameLength: 'long', worthPrice: 'full' },
        meets: ['Dark Souls III', 'Metroid'],
        pros: ['Haunting world', 'Tight controls', 'Insane value for the price'], cons: ['Easy to get lost'],
        text: 'A tiny bug in a huge, sad, gorgeous kingdom. Feels like a souls game in 2D.',
      },
      {
        game: 'Stardew Valley', rating: 5, platform: 'PC', hours: 10, completion: 'dropped', style: 'solo',
        vibes: ['relaxing', 'grindy'], gotGood: 'never',
        checklist: { difficulty: 'press_w', grind: 'lots', gameplay: 'fine' },
        text: 'I see why people love it, but without any challenge I got bored fast.',
      },
      { game: 'Dark Souls III', rating: 9, vibes: ['challenging', 'atmospheric', 'epic'], text: 'Gorgeous, grim and fair. The final bosses are some of the best in the series.' },
      { game: 'Celeste', rating: 8, vibes: ['challenging', 'emotional'], text: 'Hard as nails, kind at heart.' },
    ],
  },
  {
    tag: 'StoryNerd_Lena',
    reviews: [
      {
        game: 'The Witcher 3: Wild Hunt', rating: 10, platform: 'PC', hours: 150, completion: 'completed_100', style: 'solo',
        vibes: ['epic', 'emotional', 'atmospheric'], gotGood: 'few_hours',
        checklist: { graphics: 'screenshot', story: 'life', gameplay: 'good', audio: 'eargasm', difficulty: 'learn_master', gameLength: 'long', bugs: 'minor', worthPrice: 'full', replay: 'already' },
        meets: ['Red Dead Redemption 2', 'Dragon Age: Inquisition'],
        pros: ['Side quests better than most main stories', 'Characters', 'Blood and Wine'], cons: ['Clunky combat', 'Weight limit'],
        best: 'The Bloody Baron questline.',
        text: 'Every village has a story worth hearing. Combat is just okay, but you play this for the writing, and the writing is the best in the genre.',
      },
      {
        game: 'Disco Elysium', rating: 10, platform: 'PC', hours: 40, completion: 'finished', style: 'solo',
        vibes: ['mind_blowing', 'funny', 'emotional'], gotGood: 'instantly',
        checklist: { story: 'life', gameplay: 'great', audio: 'repeat', difficulty: 'brain', gameLength: 'average', worthPrice: 'full', replay: 'someday' },
        meets: ['Planescape: Torment', 'Baldur\'s Gate 3'],
        pros: ['Writing', 'Skills that argue with you'], cons: ['No combat at all'],
        best: 'Arguing with my own necktie.',
        text: 'Not a game you play, a novel you argue with. Hilarious and devastating in the same sentence.',
      },
      {
        game: 'Red Dead Redemption 2', rating: 9, platform: 'PlayStation 4', hours: 90, completion: 'finished', style: 'solo',
        vibes: ['atmospheric', 'emotional', 'beautiful'], gotGood: 'many_hours',
        checklist: { graphics: 'reality', story: 'tears', gameplay: 'fine', gameLength: 'long', worthPrice: 'full' },
        pros: ['Arthur Morgan', 'The world feels alive'], cons: ['Slow controls', 'Mission design is rigid'],
        best: 'Riding into Saint Denis at night.',
        worst: 'The ending of chapter 6.', spoilers: true,
        text: 'Slow, heavy and beautiful. The first few hours drag, then it becomes the most immersive western ever made.',
      },
      {
        game: 'Clair Obscur: Expedition 33', rating: 9, platform: 'PC', hours: 60, completion: 'finished', style: 'solo',
        vibes: ['emotional', 'beautiful', 'epic'], gotGood: 'instantly',
        checklist: { story: 'tears', audio: 'eargasm', gameplay: 'great', graphics: 'screenshot', worthPrice: 'full' },
        meets: ['Final Fantasy X', 'Sekiro: Shadows Die Twice'],
        pros: ['Soundtrack', 'Turn-based combat with parries'], cons: ['Some confusing level design'],
        text: 'Turn-based combat that keeps your hands busy, a story that hurts, and music I still listen to every day.',
      },
      { game: 'Fortnite', rating: 4, vibes: ['competitive', 'chaotic'], text: 'Not for me. Too loud, too fast, no story to care about.' },
      {
        game: 'Baldur\'s Gate 3', rating: 10, platform: 'PC', hours: 180, completion: 'finished', style: 'coop',
        vibes: ['epic', 'funny', 'mind_blowing'], gotGood: 'few_hours',
        checklist: { story: 'life', gameplay: 'one_more', difficulty: 'brain', gameLength: 'long', bugs: 'minor', worthPrice: 'full', replay: 'already' },
        pros: ['Freedom', 'Companions', 'Reactivity'], cons: ['Act 3 performance'],
        text: 'The game remembers everything you do. Played it with a friend and we still talk about our choices.',
      },
    ],
  },
  {
    tag: 'CouchCoopCrew',
    reviews: [
      {
        game: 'It Takes Two', rating: 10, platform: 'PlayStation 5', hours: 15, completion: 'finished', style: 'coop',
        vibes: ['funny', 'chaotic', 'emotional'], gotGood: 'instantly',
        checklist: { gameplay: 'one_more', graphics: 'pretty', story: 'good', difficulty: 'easy', gameLength: 'average', worthPrice: 'full', replay: 'someday' },
        meets: ['Portal 2', 'Super Mario Odyssey'],
        pros: ['Every level has a new mechanic', 'Built for two'], cons: ['Story is a bit cheesy'],
        best: 'The squirrel boss fight.',
        text: 'The best couch co-op game ever made. Every hour throws a new idea at you. Play it with your partner.',
      },
      {
        game: 'Overcooked! 2', rating: 8, platform: 'Nintendo Switch', hours: 25, completion: 'playing', style: 'coop',
        vibes: ['chaotic', 'funny', 'competitive'], gotGood: 'instantly',
        checklist: { gameplay: 'great', difficulty: 'learn_master', gameLength: 'average', worthPrice: 'sale' },
        pros: ['Party chaos'], cons: ['Can ruin friendships'],
        text: 'Pure screaming chaos in the best way. Shit gets real by the third star.',
      },
      {
        game: 'Minecraft', rating: 9, platform: 'PC', hours: 600, completion: 'playing', style: 'coop',
        vibes: ['relaxing', 'addictive', 'nostalgic'], gotGood: 'instantly',
        checklist: { graphics: 'potato', gameplay: 'one_more', gameLength: 'infinity', worthPrice: 'full', replay: 'already' },
        pros: ['Endless creativity', 'Great with friends'], cons: ['Little guidance for new players'],
        text: 'Ten years later our server is still alive. Nothing beats building something stupid with friends.',
      },
      { game: 'Stardew Valley', rating: 9, style: 'coop', vibes: ['cozy', 'relaxing'], text: 'Co-op farming with friends is so relaxing.' },
      { game: 'Among Us', rating: 7, vibes: ['funny', 'chaotic'], text: 'Great with the right group, awful with strangers.' },
    ],
  },
  {
    tag: 'HorrorHana',
    reviews: [
      {
        game: 'Silent Hill 2', year: 2024, rating: 10, platform: 'PlayStation 5', hours: 18, completion: 'finished', style: 'solo',
        vibes: ['scary', 'atmospheric', 'emotional'], gotGood: 'instantly',
        checklist: { graphics: 'reality', audio: 'eargasm', story: 'tears', difficulty: 'learn_master', gameLength: 'average', worthPrice: 'full' },
        meets: ['Resident Evil 4', 'Alan Wake 2'],
        pros: ['Fog and sound design', 'A story about grief'], cons: ['Combat is stiff'],
        best: 'The hospital radio static getting louder.',
        worst: 'Learning what really happened to Mary.', spoilers: true,
        text: 'Psychological horror at its absolute best. It does not just scare you, it makes you feel heavy for days.',
      },
      {
        game: 'Resident Evil 4', year: 2023, rating: 9, platform: 'PC', hours: 20, completion: 'finished', style: 'solo',
        vibes: ['scary', 'epic', 'addictive'], gotGood: 'instantly',
        checklist: { gameplay: 'one_more', graphics: 'screenshot', difficulty: 'learn_master', gameLength: 'average', worthPrice: 'full', replay: 'already' },
        pros: ['Action horror balance', 'Weapon upgrades'], cons: ['Escort sections'],
        text: 'More action than horror, but the tension never really lets go. Perfect pacing.',
      },
      {
        game: 'Phasmophobia', rating: 8, platform: 'PC', hours: 70, completion: 'playing', style: 'online',
        vibes: ['scary', 'funny', 'chaotic'], gotGood: 'few_hours',
        checklist: { gameplay: 'great', difficulty: 'learn_master', bugs: 'annoying', worthPrice: 'full' },
        pros: ['Ghost hunting with friends', 'Voice recognition'], cons: ['Bugs'],
        text: 'Screaming into a microphone at 1am with friends. Scary alone, hilarious together.',
      },
      { game: 'Outlast', rating: 7, vibes: ['scary', 'rage_inducing'], text: 'Terrifying, but hiding in lockers gets old.' },
      { game: 'Animal Crossing: New Horizons', rating: 4, vibes: ['relaxing'], text: 'Nothing happens. Ever.' },
    ],
  },
  {
    tag: 'IndieIvy',
    reviews: [
      {
        game: 'Hades', rating: 10, platform: 'Nintendo Switch', hours: 120, completion: 'completed_100', style: 'solo',
        vibes: ['addictive', 'challenging', 'funny'], gotGood: 'instantly',
        checklist: { gameplay: 'one_more', audio: 'eargasm', story: 'good', graphics: 'pretty', difficulty: 'learn_master', grind: 'average', gameLength: 'infinity', bugs: 'none', worthPrice: 'full', replay: 'already' },
        meets: ['Dead Cells', 'Bastion'],
        pros: ['Every death moves the story forward', 'Voice acting', 'Build variety'], cons: ['Late game gets repetitive'],
        text: 'The roguelike that made me love roguelikes. Dying never feels like losing, because every run adds a piece of story.',
      },
      {
        game: 'Outer Wilds', rating: 10, platform: 'PC', hours: 25, completion: 'finished', style: 'solo',
        vibes: ['mind_blowing', 'atmospheric', 'emotional'], gotGood: 'few_hours',
        checklist: { story: 'life', gameplay: 'great', audio: 'eargasm', difficulty: 'brain', gameLength: 'average', worthPrice: 'full', replay: 'once' },
        pros: ['Discovery is the only progression', 'The banjo'], cons: ['Can only be played once'],
        text: 'Go in completely blind. A solar system mystery that you solve with nothing but curiosity.',
      },
      {
        game: 'Celeste', rating: 10, platform: 'PC', hours: 30, completion: 'completed_100', style: 'solo',
        vibes: ['challenging', 'emotional', 'beautiful'], gotGood: 'instantly',
        checklist: { gameplay: 'one_more', difficulty: 'hard', story: 'tears', audio: 'eargasm', worthPrice: 'full' },
        meets: ['Super Meat Boy', 'Hollow Knight'],
        pros: ['Perfect controls', 'A real story about anxiety', 'Assist mode'], cons: ['B-sides are brutal'],
        text: 'Precise, hard platforming with a story about anxiety that hit me harder than I expected. Assist mode means anyone can see it through.',
      },
      {
        game: 'Inscryption', rating: 9, platform: 'PC', hours: 20, completion: 'finished', style: 'solo',
        vibes: ['mind_blowing', 'scary', 'addictive'], gotGood: 'instantly',
        pros: ['Card game that keeps changing'], cons: ['Act 3 is weaker'],
        text: 'A creepy deckbuilder that turns into something else entirely. Best to know nothing going in.',
      },
      { game: 'Hollow Knight', rating: 9, vibes: ['atmospheric', 'beautiful', 'challenging'], text: 'Huge, sad and beautiful.' },
      { game: 'Vampire Survivors', rating: 8, vibes: ['addictive', 'chaotic'], text: 'Five dollars, five hundred hours.' },
    ],
  },
  {
    tag: 'RankedRiley',
    reviews: [
      {
        game: 'Rocket League', rating: 9, platform: 'PC', hours: 900, completion: 'playing', style: 'online',
        vibes: ['competitive', 'addictive', 'rage_inducing'], gotGood: 'many_hours',
        checklist: { gameplay: 'one_more', difficulty: 'learn_master', grind: 'lots', gameLength: 'infinity', worthPrice: 'free', replay: 'already' },
        pros: ['Skill ceiling is endless', 'Short matches'], cons: ['Toxic chat', 'Item shop'],
        text: 'Easy to learn, impossible to master. Every match is five minutes of pure adrenaline.',
      },
      {
        game: 'Valorant', rating: 7, platform: 'PC', hours: 400, completion: 'playing', style: 'online',
        vibes: ['competitive', 'rage_inducing'], gotGood: 'many_hours',
        checklist: { gameplay: 'great', difficulty: 'hard', grind: 'lots', worthPrice: 'free', bugs: 'minor' },
        pros: ['Tight gunplay', 'Agent abilities'], cons: ['Solo queue pain', 'Smurfs'],
        text: 'Great tactical shooter, but solo queue can ruin your whole evening.',
      },
      {
        game: 'Apex Legends', rating: 8, platform: 'PC', hours: 300, completion: 'playing', style: 'online',
        vibes: ['competitive', 'chaotic', 'addictive'], gotGood: 'few_hours',
        checklist: { gameplay: 'one_more', worthPrice: 'free', grind: 'lots' },
        pros: ['Movement', 'Squad play'], cons: ['Monetization'],
        text: 'The best movement in any battle royale. Way better with a squad.',
      },
      { game: 'Fortnite', rating: 7, vibes: ['competitive', 'chaotic'], text: 'Fun with friends, sweaty in ranked.' },
      { game: 'Stardew Valley', rating: 6, vibes: ['relaxing'], text: 'Nice break between ranked matches, nothing more.' },
    ],
  },
  {
    tag: 'CasualCarl',
    reviews: [
      {
        game: 'Balatro', rating: 10, platform: 'Nintendo Switch', hours: 90, completion: 'playing', style: 'solo',
        vibes: ['addictive', 'mind_blowing'], gotGood: 'instantly',
        checklist: { gameplay: 'one_more', difficulty: 'learn_master', gameLength: 'infinity', worthPrice: 'full', replay: 'already' },
        meets: ['Vampire Survivors', 'Slay the Spire'],
        pros: ['Perfect for short sessions', 'Combos'], cons: ['Will eat your evenings'],
        text: 'Poker meets roguelike and it is dangerously addictive. One more blind turns into one more hour.',
      },
      {
        game: 'Mario Kart 8 Deluxe', rating: 9, platform: 'Nintendo Switch', hours: 150, completion: 'playing', style: 'coop',
        vibes: ['funny', 'competitive', 'chaotic'], gotGood: 'instantly',
        checklist: { gameplay: 'one_more', graphics: 'pretty', difficulty: 'easy', worthPrice: 'full' },
        pros: ['Anyone can play', 'Tons of tracks'], cons: ['Blue shells'],
        text: 'The perfect game for when friends come over, whether they play games or not.',
      },
      { game: 'Vampire Survivors', rating: 9, vibes: ['addictive', 'chaotic', 'relaxing'], text: 'Turn off your brain and watch the numbers go up. Great for 20 minute sessions.' },
      { game: 'Portal 2', rating: 10, vibes: ['funny', 'mind_blowing'], text: 'Funny, clever and short enough to finish in a weekend.' },
      { game: 'Elden Ring', rating: 5, vibes: ['rage_inducing', 'challenging'], text: 'Beautiful, but I do not have 100 hours and I do not enjoy dying.' },
      { game: 'Among Us', rating: 8, vibes: ['funny'], text: 'Quick rounds, lots of laughs.' },
    ],
  },
];
