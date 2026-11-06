/**
 * The daily game's share picture helpers (components/share/DailyShareImage.jsx).
 */
import { RARITIES } from '../components/reviewQuest/questOptions';

const rarity = (key) => RARITIES.find((r) => r.key === key);
// Got it in 1 → Legendary … in 5 or 6 → Common; not got → Junk
export const resultRarity = (solved, tries) =>
  rarity(!solved ? 'junk' : ['legendary', 'epic', 'rare', 'uncommon', 'common', 'common'][tries - 1] ?? 'common');

/**
 * The first picture, blurred in a canvas (not with CSS: the picture is photographed
 * through an SVG, and Safari can leave a CSS blur out, which would show the answer
 * sharp). Shrunk to a few dozen pixels and stretched back: soft, and the same in every
 * browser. IGDB allows the canvas to read its pictures. → a data: address
 */
export const blurredPicture = async (url, { width = 1080, height = 608, detail = 44 } = {}) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  await img.decode();
  const small = document.createElement('canvas');
  small.width = detail;
  small.height = Math.round((detail * height) / width);
  const s = small.getContext('2d');
  s.imageSmoothingQuality = 'high';
  s.drawImage(img, 0, 0, small.width, small.height);
  const big = document.createElement('canvas');
  big.width = width;
  big.height = height;
  const b = big.getContext('2d');
  b.imageSmoothingQuality = 'high';
  b.drawImage(small, 0, 0, width, height);
  return big.toDataURL('image/jpeg', 0.86);
};
