/**
 * The home page's two showcase cards: fixed, chosen by hand, never a player's real review.
 * The home page always looks the way it was designed, whatever the newest reviews say.
 * Both are share-edition cards (the words and the IMGM mark on the card) "Reviewed by
 * You": a sample of the card a player gets for a review.
 *
 *   hero      the card over the band of key art at the top: a Legendary 10, which turns
 *             over to a sample checklist
 *   rarity    the card beside "Your score sets the rarity": an Epic 8
 *   playNext  the samples under the hero's buttons that show what Play Next does: a
 *             request in a player's words and 5 games it would pick, Best Pick first.
 *             The panel rotates through them (big story games, cozy, co-op)
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
      quote: "The best turn-based combat I've played in years. Parrying turned every fight into a rhythm game and I was hooked.",
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
        { title: 'A Little to the Left', cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co887d.jpg' },
        { title: 'Unpacking', cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1t45.jpg' },
        { title: 'A Short Hike', cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co6e83.jpg' },
        { title: 'Beacon Pines', cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co5d1x.jpg' },
        { title: 'Portal 2', cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1rs4.jpg' },
      ],
    },
    {
      request: 'Something to play with friends tonight',
      picks: [
        { title: 'It Takes Two', cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/cob22v.jpg' },
        { title: 'Split Fiction', cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co95gf.jpg' },
        { title: "Baldur's Gate 3", cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co670h.jpg' },
        { title: 'Helldivers 2', cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/coabbf.jpg' },
        { title: 'Deep Rock Galactic', cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/coaat4.jpg' },
      ],
    },
  ],
};
