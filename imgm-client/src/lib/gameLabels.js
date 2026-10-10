/**
 * Short labels for game cards — IGDB's genre and platform names are long
 * ("Role-playing (RPG)", "Xbox Series X|S", "Nintendo Switch 2"). Cards show one quiet
 * line instead, e.g. "2025 · RPG · PC, PS, Xbox". Game pages keep the full names.
 */

const SHORT_GENRE = {
  'Role-playing (RPG)': 'RPG',
  'Turn-based strategy (TBS)': 'Turn-based',
  'Real Time Strategy (RTS)': 'RTS',
  "Hack and slash/Beat 'em up": 'Hack & slash',
  'Point-and-click': 'Point & click',
  Platform: 'Platformer',
  Sport: 'Sports',
};

// Platforms grouped into families: PS4 and PS5 are both "PS".
// Anything not listed keeps its IGDB name (old consoles, Satellaview, …).
const PLATFORM_FAMILY = {
  PC: 'PC',
  'PlayStation 5': 'PS',
  'PlayStation 4': 'PS',
  'PlayStation 3': 'PS',
  'PlayStation 2': 'PS',
  PlayStation: 'PS',
  'PlayStation Vita': 'PS Vita',
  'PlayStation Portable': 'PSP',
  'Xbox Series X|S': 'Xbox',
  'Xbox One': 'Xbox',
  'Xbox 360': 'Xbox',
  Xbox: 'Xbox',
  'Nintendo Switch 2': 'Switch',
  'Nintendo Switch': 'Switch',
  'Nintendo 64': 'N64',
  'Super Nintendo Entertainment System': 'SNES',
  'Nintendo Entertainment System': 'NES',
  'Family Computer': 'Famicom',
  'Family Computer Disk System': 'Famicom',
  'Nintendo GameCube': 'GameCube',
  'Nintendo 3DS': '3DS',
  'New Nintendo 3DS': '3DS',
  'Nintendo DS': 'DS',
  'Game Boy Advance': 'GBA',
  Android: 'Mobile',
  iOS: 'Mobile',
  Mobile: 'Mobile',
  'Web browser': 'Browser',
};

// Today's big platforms first, so a 2025 game reads "PC, PS, Xbox"
const FAMILY_ORDER = ['PC', 'PS', 'Xbox', 'Switch'];
const MAX_PLATFORMS = 3;

export const shortGenre = (genre) => SHORT_GENRE[genre] ?? genre;

// ['Xbox Series X|S', 'PC', 'PlayStation 5', 'PlayStation 4'] → 'PC, PS, Xbox'
// (at most 3: the card is a summary, the game page lists them all)
export const platformFamilies = (platforms = []) => {
  const families = [...new Set(platforms.map((p) => PLATFORM_FAMILY[p] ?? p))];
  const rank = (family) => {
    const i = FAMILY_ORDER.indexOf(family);
    return i === -1 ? FAMILY_ORDER.length : i;
  };
  // sort is stable: families outside FAMILY_ORDER keep IGDB's order
  return families.sort((a, b) => rank(a) - rank(b)).slice(0, MAX_PLATFORMS).join(', ');
};

// The parts of the card's one line: year, first genre, platforms (any may be missing)
export const gameMetaParts = ({ releaseDate, genres = [], platforms = [] }) =>
  [
    releaseDate ? String(new Date(releaseDate).getFullYear()) : null,
    genres[0] ? shortGenre(genres[0]) : null,
    platformFamilies(platforms) || null,
  ].filter(Boolean);
