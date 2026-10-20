import { getRarity } from '../reviewQuest/questOptions';

// The frame for a game's IMGM score: its rarity's ink, the gilt for a 10/10, and none
// (null) for a game with no IMGM score. Colours come from the rarity table, so they
// always match the review cards. Used on the pick cards and the chat's covers.
export const scoreFrame = (rating) => {
  if (!rating) return null;
  const rarity = getRarity(rating);
  return {
    className: `rarity-frame ${rarity.key === 'legendary' ? 'is-legendary' : ''}`,
    style: { '--rc': rarity.color },
  };
};
