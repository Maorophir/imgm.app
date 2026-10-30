/**
 * The home page's two showcase cards: fixed, chosen by hand, never a player's real review.
 * The home page always looks the way it was designed, whatever the newest reviews say.
 * Both are share-edition cards (the words and the IMGM mark on the card) "Reviewed by
 * You": a sample of the card a player gets for a review.
 *
 *   heroes    the cards over the band of key art at the top, taking turns (a carousel):
 *             all-time greats and hot new games, alternating, picked by hand, each with
 *             its own score, words, checklist (the card's back) and backdrop. The first
 *             one shows first.
 *   rarity    the card beside "Your score sets the rarity": an Epic 8
 *   playNext  the samples under the hero's buttons that show what Play Next does: a
 *             request in a player's words and 5 games it would pick, Best Pick first.
 *             The panel rotates through them (big story games, cozy, an online squad)
 *
 * Each has the card's props (CollectibleCard), a review-shaped part the hero reads (the
 * score, the game, the checklist on the back; id null = a sample, so no Share or "Read
 * the review"), and for the heroes the band's backdrop. Pictures are IGDB addresses: an
 * official cover or artwork. Each backdrop is picked by hand: official key art, or an
 * official screenshot where that looks better (artLabel says so under the hero).
 * artPosition (CSS object-position) picks which part of a backdrop shows, when the
 * middle isn't the best part.
 */
const TODAY = new Date();

export const HOME_SHOWCASE = {
  heroes: [
    {
      review: {
        id: null,
        rating: 10,
        game: { id: 305152, title: 'Clair Obscur: Expedition 33' },
        checklist: { graphics: 'reality', gameplay: 'one_more', audio: 'eargasm', story: 'tears', difficulty: 'learn_master', grind: 'optional', gameLength: 'long', bugs: 'minor', worthPrice: 'full' },
      },
      card: {
        title: 'Clair Obscur: Expedition 33',
        score: 10,
        coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co9gam.jpg',
        meta: 'RPG · 2025',
        credit: 'Cover · Sandfall Interactive',
        reviewer: 'You',
        date: TODAY,
        quote: 'The best turn-based combat I\'ve played in years. Parrying turned every fight into a rhythm game and I was hooked.',
        badges: ['deep_diver'],
      },
      band: {
        id: 305152,
        title: 'Clair Obscur: Expedition 33',
        artworks: ['https://images.igdb.com/igdb/image/upload/t_1080p/scsoe2.jpg'],
        artLabel: 'Screenshot',
        developer: 'Sandfall Interactive',
        releaseDate: '2025-04-24T00:00:00.000Z',
      },
    },
    {
      review: {
        id: null,
        rating: 10,
        game: { id: 119133, title: 'Elden Ring' },
        checklist: { graphics: 'screenshot', gameplay: 'one_more', audio: 'eargasm', story: 'lore', difficulty: 'dark_souls', grind: 'optional', gameLength: 'infinity', bugs: 'minor', worthPrice: 'full' },
      },
      card: {
        title: 'Elden Ring',
        score: 10,
        coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg',
        meta: 'RPG · 2022',
        credit: 'Cover · FromSoftware',
        reviewer: 'You',
        date: TODAY,
        quote: 'I died to Margit thirty times and loved every one. Then the world opened up and I forgot to sleep for a month.',
        badges: ['completionist'],
      },
      band: {
        id: 119133,
        title: 'Elden Ring',
        artworks: ['https://images.igdb.com/igdb/image/upload/t_1080p/scagdm.jpg'],
        artLabel: 'Screenshot',
        developer: 'FromSoftware',
        releaseDate: '2022-02-25T00:00:00.000Z',
      },
    },
    {
      review: {
        id: null,
        rating: 9,
        game: { id: 347668, title: 'Resident Evil Requiem' },
        checklist: { graphics: 'reality', gameplay: 'great', audio: 'good', story: 'good', difficulty: 'hard', grind: 'none', gameLength: 'average', bugs: 'none', worthPrice: 'full' },
      },
      card: {
        title: 'Resident Evil Requiem',
        score: 9,
        coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/cobmj0.jpg',
        meta: 'Survival horror · 2026',
        credit: 'Cover · Capcom',
        reviewer: 'You',
        date: TODAY,
        quote: 'Grace has me hiding in closets, Leon has me kicking down doors, and the tension never lets up. One point off for a rushed ending.',
        badges: [],
      },
      band: {
        id: 347668,
        title: 'Resident Evil Requiem',
        artworks: ['https://images.igdb.com/igdb/image/upload/t_1080p/ar3otk.jpg'],
        artPosition: '50% 100%', // its logo sits at the top: keep it out from behind the words
        developer: 'Capcom',
        releaseDate: '2026-02-27T00:00:00.000Z',
      },
    },
    {
      review: {
        id: null,
        rating: 9,
        game: { id: 1942, title: 'The Witcher 3: Wild Hunt' },
        checklist: { graphics: 'pretty', gameplay: 'good', audio: 'repeat', story: 'life', difficulty: 'easy', grind: 'optional', gameLength: 'infinity', bugs: 'minor', worthPrice: 'full' },
      },
      card: {
        title: 'The Witcher 3: Wild Hunt',
        score: 9,
        coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/coaarl.jpg',
        meta: 'RPG · 2015',
        credit: 'Cover · CD Projekt RED',
        reviewer: 'You',
        date: TODAY,
        quote: 'The side quests beat most games\' main story, and Gwent ate forty of my hours. The combat feels stiff, so one point off.',
        badges: ['veteran'],
      },
      band: {
        id: 1942,
        title: 'The Witcher 3: Wild Hunt',
        artworks: ['https://images.igdb.com/igdb/image/upload/t_1080p/ar3lzk.jpg'], // Geralt and Ciri: the cover's own picture, by the owner's choice
        developer: 'CD Projekt RED',
        releaseDate: '2015-05-19T00:00:00.000Z',
      },
    },
    {
      review: {
        id: null,
        rating: 9,
        game: { id: 317627, title: 'Ghost of Yōtei' },
        checklist: { graphics: 'screenshot', gameplay: 'great', audio: 'repeat', story: 'tears', difficulty: 'learn_master', grind: 'average', gameLength: 'long', bugs: 'minor', worthPrice: 'full' },
      },
      card: {
        title: 'Ghost of Yōtei',
        score: 9,
        coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co9coo.jpg',
        meta: 'Action RPG · 2025',
        credit: 'Cover · Sucker Punch Productions',
        reviewer: 'You',
        date: TODAY,
        quote: 'Every view of Ezo looks like a painting, and Atsu\'s revenge hits hard. One point off for side quests that start to feel the same.',
        badges: [],
      },
      band: {
        id: 317627,
        title: 'Ghost of Yōtei',
        artworks: ['https://images.igdb.com/igdb/image/upload/t_1080p/scwk6i.jpg'],
        artLabel: 'Screenshot',
        developer: 'Sucker Punch Productions',
        releaseDate: '2025-10-02T00:00:00.000Z',
      },
    },
    {
      review: {
        id: null,
        rating: 10,
        game: { id: 25076, title: 'Red Dead Redemption 2' },
        checklist: { graphics: 'reality', gameplay: 'good', audio: 'eargasm', story: 'life', difficulty: 'easy', grind: 'optional', gameLength: 'infinity', bugs: 'minor', worthPrice: 'full' },
      },
      card: {
        title: 'Red Dead Redemption 2',
        score: 10,
        coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1q1f.jpg',
        meta: 'Open world · 2018',
        credit: 'Cover · Rockstar Games',
        reviewer: 'You',
        date: TODAY,
        quote: 'Arthur Morgan\'s story broke me. I spent whole evenings just riding, hunting and talking to strangers, and I\'d do it all again.',
        badges: ['veteran'],
      },
      band: {
        id: 25076,
        title: 'Red Dead Redemption 2',
        artworks: ['https://images.igdb.com/igdb/image/upload/t_1080p/ar3qms.jpg'],
        artPosition: '50% 100%', // its logo sits at the top: keep it out from behind the words
        developer: 'Rockstar Games',
        releaseDate: '2018-10-26T00:00:00.000Z',
      },
    },
  ],
  rarity: {
    game: { id: 115289, title: 'Hollow Knight: Silksong' },
    card: {
      title: 'Hollow Knight: Silksong',
      score: 8,
      coverUrl: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/ar4prg.jpg',
      meta: 'Platformer · 2025',
      credit: 'Art · Team Cherry',
      reviewer: 'You',
      date: TODAY,
      quote: 'Pharloom breaks you, then teaches you to fly. Every boss is a duel I lost twenty times and finally won. Two points off for the long runbacks.',
      badges: [],
    },
  },
  playNext: [
    {
      request: 'A story that will wreck me',
      picks: [
        { title: 'Red Dead Redemption 2', cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1q1f.jpg' },
        { title: 'The Last of Us Part II', cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co5ziw.jpg' },
        { title: 'God of War', cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/cobkt6.jpg' },
        { title: 'Clair Obscur: Expedition 33', cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co9gam.jpg' },
        { title: 'Life Is Strange', cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1r8e.jpg' },
      ],
    },
    {
      request: 'Something cozy for a rainy evening',
      picks: [
        { title: 'Stardew Valley', cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/coa93h.jpg' },
        { title: 'Animal Crossing: New Horizons', cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co3wls.jpg' },
        { title: 'Unpacking', cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1t45.jpg' },
        { title: 'A Short Hike', cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co6e83.jpg' },
        { title: 'Spiritfarer', cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2fe7.jpg' },
      ],
    },
    {
      request: 'Something to play with friends tonight',
      picks: [
        { title: 'Helldivers 2', cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/coabbf.jpg' },
        { title: 'Lethal Company', cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co5ive.jpg' },
        { title: 'Deep Rock Galactic', cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/coaat4.jpg' },
        { title: 'Phasmophobia', cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/coamcz.jpg' },
        { title: 'Sea of Thieves', cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2558.jpg' },
      ],
    },
  ],
};
