/**
 * Shrinks a picture the player picked to a square SIZE×SIZE image (centre-cropped, like
 * a profile picture), as a data URL ready to upload. WebP when the browser can make it,
 * JPEG otherwise. Keeps uploads tiny (~10-40 KB) whatever the camera made.
 */
const SIZE = 256;

export async function resizeToAvatar(file) {
  if (!file?.type.startsWith('image/')) throw new Error('Please choose a picture.');
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas
    .getContext('2d')
    .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close?.();
  const webp = canvas.toDataURL('image/webp', 0.85);
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.85);
}
