/**
 * Photographs a piece of the page (a ShareImage) into a PNG, in the visitor's browser.
 *
 * html-to-image copies the node with its styles, fonts and pictures into an SVG and
 * draws that on a canvas. The game art comes from IGDB, which allows that
 * (access-control-allow-origin: *), so the canvas can be saved. Every picture inside is
 * waited for first, or the photo could catch a blank art window.
 */
import { toBlob } from 'html-to-image';

// The shared picture: a 1080×1350 portrait, the size Instagram and most feeds show whole
export const SHARE_IMAGE_SIZE = { width: 1080, height: 1350 };

export async function makeCardImage(node, { width, height }) {
  const images = [...node.querySelectorAll('img')];
  await Promise.all(images.map((img) => (img.complete ? null : img.decode().catch(() => {}))));
  const blob = await toBlob(node, {
    width,
    height,
    pixelRatio: 1, // the node is already drawn at the picture's real size
    cacheBust: false, // IGDB's addresses never change, so the browser's copy is fine
  });
  if (!blob) throw new Error('The picture came out empty');
  return blob;
}
