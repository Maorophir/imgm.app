/**
 * Card sets: hand-picked groups of games whose cards a player collects by rating them
 * (a studio's games, a series, a year's Game of the Year nominees, a theme). A set is
 * complete when the player has rated every game in it, and a complete set earns its
 * badge on their profile. Nothing is stored: a player's sets are worked out from their
 * reviews each time (controllers/cardSetsController.js).
 *
 * Each slot is one game, written as its IGDB ids: the first is the version whose title
 * and cover the slot shows, the others are remakes and remasters of the same game, so
 * rating Demon's Souls on PS5 or on PS3 collects the same card. The ids were checked
 * against IGDB's search on 2026-11-05. The titles are only a fallback, for when IGDB
 * can't be reached.
 *
 * Curated by hand on purpose: sets made from IGDB's companies or franchises pull in
 * ports, compilations and spin-offs nobody thinks of as part of the set.
 */

export const SET_KINDS = ['studio', 'series', 'yearly', 'collection'];

const slot = (title, ...ids) => ({ title, ids });

export const CARD_SETS = [
  {
    key: 'fromsoftware',
    name: 'FromSoftware',
    kind: 'studio',
    badge: 'Soulsborne',
    games: [
      slot("Demon's Souls", 134606, 5619),
      slot('Dark Souls', 2155, 81085),
      slot('Dark Souls III', 11133),
      slot('Bloodborne', 7334),
      slot('Sekiro: Shadows Die Twice', 76882),
      slot('Elden Ring', 119133),
    ],
  },
  {
    key: 'supergiant',
    name: 'Supergiant Games',
    kind: 'studio',
    badge: 'Supergiant',
    games: [
      slot('Bastion', 1983),
      slot('Transistor', 3022),
      slot('Pyre', 18822),
      slot('Hades', 113112),
      slot('Hades II', 228525),
    ],
  },
  {
    key: 'rockstar',
    name: 'Rockstar Games',
    kind: 'studio',
    badge: 'Outlaw',
    games: [
      slot('Grand Theft Auto III', 730, 178123),
      slot('Grand Theft Auto: Vice City', 733, 178125),
      slot('Grand Theft Auto: San Andreas', 732, 178126),
      slot('Bully', 2720, 6574, 88952),
      slot('Grand Theft Auto IV', 731),
      slot('Red Dead Redemption', 434, 260735),
      slot('Grand Theft Auto V', 1020, 334254),
      slot('Red Dead Redemption 2', 25076),
    ],
  },
  {
    key: 'zelda',
    name: 'The Legend of Zelda',
    kind: 'series',
    badge: 'Hero of Hyrule',
    games: [
      slot('The Legend of Zelda: A Link to the Past', 1026),
      slot('The Legend of Zelda: Ocarina of Time', 1029, 1039),
      slot("The Legend of Zelda: Majora's Mask", 1030, 8593),
      slot('The Legend of Zelda: The Wind Waker', 1033, 2276),
      slot('The Legend of Zelda: Twilight Princess', 1036, 18017),
      slot("The Legend of Zelda: Link's Awakening", 115284, 1028, 1027),
      slot('The Legend of Zelda: Breath of the Wild', 7346, 338072),
      slot('The Legend of Zelda: Tears of the Kingdom', 119388, 338073),
    ],
  },
  {
    key: 'mario',
    name: 'Super Mario',
    kind: 'series',
    badge: 'Mushroom Kingdom',
    games: [
      slot('Super Mario Bros.', 358),
      slot('Super Mario World', 1070),
      slot('Super Mario 64', 1074, 22301),
      slot('Super Mario Galaxy', 1077, 366899),
      slot('Super Mario Galaxy 2', 1078, 366900),
      slot('Super Mario 3D World', 2180, 229339),
      slot('Super Mario Odyssey', 26758),
      slot('Super Mario Bros. Wonder', 254339, 366881),
    ],
  },
  {
    // The Game Awards 2025's Game of the Year nominees
    key: 'goty-2025',
    name: 'Game of the Year 2025',
    kind: 'yearly',
    badge: 'Class of 2025',
    games: [
      slot('Clair Obscur: Expedition 33', 305152),
      slot('Death Stranding 2: On the Beach', 228530),
      slot('Donkey Kong Bananza', 338106),
      slot('Hades II', 228525),
      slot('Hollow Knight: Silksong', 115289),
      slot('Kingdom Come: Deliverance II', 298526),
    ],
  },
  {
    // The Game Awards 2024's Game of the Year nominees
    key: 'goty-2024',
    name: 'Game of the Year 2024',
    kind: 'yearly',
    badge: 'Class of 2024',
    games: [
      slot('Astro Bot', 303811),
      slot('Balatro', 251833),
      slot('Black Myth: Wukong', 136879),
      slot('Elden Ring: Shadow of the Erdtree', 240009),
      slot('Final Fantasy VII Rebirth', 133236),
      slot('Metaphor: ReFantazio', 26602),
    ],
  },
  {
    key: 'metroidvanias',
    name: 'Metroidvanias',
    kind: 'collection',
    badge: 'Map Completer',
    games: [
      slot('Super Metroid', 1103),
      slot('Castlevania: Symphony of the Night', 1128),
      slot('Hollow Knight', 14593),
      slot('Hollow Knight: Silksong', 115289),
      slot('Ori and the Blind Forest', 7344, 19456),
      slot('Ori and the Will of the Wisps', 37001),
      slot('Dead Cells', 26855),
      slot('Metroid Dread', 15698),
      slot('Blasphemous', 26820),
    ],
  },
  {
    key: 'indie-gems',
    name: 'Indie gems',
    kind: 'collection',
    badge: 'Indie Scout',
    games: [
      slot('Undertale', 12517),
      slot('Stardew Valley', 17000),
      slot('Inside', 7342),
      slot('Hollow Knight', 14593),
      slot('Cuphead', 9061),
      slot('Celeste', 26226),
      slot('Outer Wilds', 11737),
      slot('Disco Elysium', 26472, 141540),
      slot('Hades', 113112),
      slot('Balatro', 251833),
    ],
  },
  {
    key: 'cozy',
    name: 'Cozy games',
    kind: 'collection',
    badge: 'Cozy Corner',
    games: [
      slot('Stardew Valley', 17000),
      slot('A Short Hike', 116753),
      slot('Animal Crossing: New Horizons', 109462, 375733),
      slot('Spiritfarer', 119304, 375281),
      slot('Unpacking', 115843),
      slot('Dorfromantik', 134799),
    ],
  },
  {
    key: 'playstation',
    name: 'PlayStation greats',
    kind: 'collection',
    badge: 'PlayStation Loyal',
    games: [
      slot('The Last of Us', 1009, 6036, 204350),
      slot('Bloodborne', 7334),
      slot("Uncharted 4: A Thief's End", 7331, 168668),
      slot('Horizon Zero Dawn', 11156, 317103),
      slot('God of War', 19560),
      slot("Marvel's Spider-Man", 19565, 138949),
      slot('Ghost of Tsushima', 75235, 153700),
      slot('Astro Bot', 303811),
    ],
  },
];

// Every IGDB id any set mentions (remakes included), for looking games up in one go
export const SET_GAME_IDS = [...new Set(CARD_SETS.flatMap((set) => set.games.flatMap((s) => s.ids)))];
