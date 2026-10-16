/**
 * The home page's two showcase cards: fixed, chosen by hand, never a player's real review.
 * The home page always looks the way it was designed, whatever the newest reviews say.
 * Both are share-edition cards (the words and the IMGM mark on the card) "Reviewed by
 * You": a sample of the card a player gets for a review.
 *
 *   hero    the card over the band of key art at the top: a Legendary 10, which turns
 *           over to a sample checklist
 *   rarity  the card beside "Your score sets the rarity": an Epic 8
 *
 * Each has the card's props (CollectibleCard), a review-shaped part the hero reads (the
 * score, the game, the checklist on the back; id null = a sample, so no Share or "Read
 * the review"), and for the hero the band's key art. Pictures are IGDB addresses: an
 * official cover or artwork, never a screenshot.
 */
const TODAY = new Date();

export const HOME_SHOWCASE = {
  hero: {
    review: {
      id: null,
      rating: 10,
      game: { id: 305152, title: 'Clair Obscur: Expedition 33' },
      checklist: {
        graphics: 'reality', gameplay: 'one_more', audio: 'eargasm', story: 'tears',
        difficulty: 'learn_master', grind: 'optional', gameLength: 'long', bugs: 'minor', worthPrice: 'full',
      },
    },
    card: {
      title: 'Clair Obscur: Expedition 33',
      score: 10,
      coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co9gam.jpg',
      meta: 'RPG · 2025',
      credit: 'Cover · Sandfall Interactive',
      reviewer: 'You',
      date: TODAY,
      quote: 'Turn-based combat that plays like a rhythm game, and a story I still think about.',
      badges: ['deep_diver'],
    },
    band: {
      id: 305152,
      title: 'Clair Obscur: Expedition 33',
      artworks: ['https://images.igdb.com/igdb/image/upload/t_1080p/ar3lza.jpg'],
      developer: 'Sandfall Interactive',
      releaseDate: '2025-04-24T00:00:00.000Z',
    },
  },
  rarity: {
    card: {
      title: 'Hollow Knight: Silksong',
      score: 8,
      coverUrl: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/ar4prg.jpg',
      meta: 'Platformer · 2025',
      credit: 'Art · Team Cherry',
      reviewer: 'You',
      date: TODAY,
      quote: 'Brutal, beautiful and worth every death. Hornet moves like a dancer.',
      badges: [],
    },
  },
};
