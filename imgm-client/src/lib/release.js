/**
 * release — is a game out yet? A game whose release date is still ahead can't be
 * reviewed yet (the server refuses a new review too, reviewsController saveReview), so
 * pages offer "Out 19 Nov 2026" and Add to Backlog instead of a review quest.
 *
 * A game with no release date counts as out: plenty of older games have none on IGDB.
 */

// True when the game's release date is still in the future
export const isUnreleased = (releaseDate) =>
  Boolean(releaseDate) && new Date(releaseDate).getTime() > Date.now();

// "Out 19 Nov 2026", for a game that isn't out yet. IGDB dates are midnight UTC, so the
// date is read in UTC: in the visitor's own time zone the Americas would see the day before.
export const releaseLabel = (releaseDate) =>
  `Out ${new Date(releaseDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}`;
