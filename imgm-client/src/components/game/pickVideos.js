/**
 * pickVideos — choose the few videos worth showing from IGDB's long list.
 *
 * IGDB often lists 10–20 videos per game (TV spots, recaps, anniversary videos,
 * three identical "Trailer"s…). We keep up to `max`, aiming for variety:
 * first the best video of each kind, in this order, then the next best ones.
 */

// Kinds of video, most wanted first. A video's kind is the first rule it matches.
const KINDS = [
  /\b(launch|release)\b/i,              // Launch trailer
  /gameplay|demo/i,                     // Gameplay
  /story|cinematic|opening/i,           // Story / cinematic
  /announce|reveal|debut|teaser/i,      // Announcement
  /trailer/i,                           // Any other trailer
];

// Rarely what someone opening a game page wants to watch
const SKIP = /tv spot|commercial|accolade|recap|anniversary|diary|behind the scenes|interview|livestream|dlc|expansion pass|season pass|patch|update/i;

const kindOf = (video) => {
  const i = KINDS.findIndex((rule) => rule.test(video.name));
  return i === -1 ? KINDS.length : i; // no match = least wanted
};

export const pickVideos = (videos = [], max = 4) => {
  // Drop duplicates (same YouTube id, or the same name like "Trailer" ×3)
  const seenIds = new Set();
  const seenNames = new Set();
  const unique = videos.filter((v) => {
    const name = v.name.trim().toLowerCase();
    if (seenIds.has(v.youtubeId) || seenNames.has(name)) return false;
    seenIds.add(v.youtubeId);
    seenNames.add(name);
    return true;
  });

  const relevant = unique.filter((v) => !SKIP.test(v.name));
  // If everything was skipped, better to show something than nothing
  if (relevant.length === 0) return unique.slice(0, max);

  // 1. The best video of each kind, for variety
  const picked = [];
  for (let kind = 0; kind <= KINDS.length && picked.length < max; kind++) {
    const video = relevant.find((v) => kindOf(v) === kind);
    if (video) picked.push(video);
  }
  // 2. Fill any free slots with the next most wanted (sort is stable: IGDB order breaks ties)
  const rest = relevant.filter((v) => !picked.includes(v)).sort((a, b) => kindOf(a) - kindOf(b));
  return [...picked, ...rest].slice(0, max);
};

// All videos without duplicates — for "Show all videos"
export const allVideos = (videos = []) => {
  const seen = new Set();
  return videos.filter((v) => !seen.has(v.youtubeId) && seen.add(v.youtubeId));
};
