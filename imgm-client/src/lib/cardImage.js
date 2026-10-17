/**
 * Photographs a piece of the page (a ShareImage) into a PNG, in the visitor's browser.
 *
 * html-to-image copies the node with its styles, fonts and pictures into an SVG and
 * draws that on a canvas. The game art comes from IGDB, which allows that
 * (access-control-allow-origin: *), so the canvas can be saved.
 *
 * Safari (every browser on an iPhone or iPad) draws that SVG before the pictures inside
 * it are ready, so its first photo comes out with a black art window. Two things fix it:
 * every picture is copied into the page first (a data: address, nothing left to fetch),
 * and on Safari the photo is taken three times, keeping the last: the earlier ones get
 * the pictures decoded.
 */
import { toBlob } from 'html-to-image';

// The shared picture: a 1080×1350 portrait, the size Instagram and most feeds show whole
export const SHARE_IMAGE_SIZE = { width: 1080, height: 1350 };

// Safari's engine (WebKit): Safari itself, and every browser on iOS
const isWebKit = () => {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg|OPR|Android/.test(ua));
};

const asDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

// Each picture's address becomes its own data (the browser's cached copy, so it's quick)
async function inlineImages(node) {
  const images = [...node.querySelectorAll('img')];
  await Promise.all(
    images.map(async (img) => {
      const src = img.currentSrc || img.src;
      if (!src || src.startsWith('data:')) return;
      try {
        const response = await fetch(src, { mode: 'cors' });
        if (!response.ok) return;
        img.removeAttribute('srcset');
        img.src = await asDataUrl(await response.blob());
      } catch {
        // Left as it is: html-to-image will try to fetch it itself
      }
      await img.decode().catch(() => {});
    })
  );
}

export async function makeCardImage(node, { width, height }) {
  await inlineImages(node);
  const options = {
    width,
    height,
    pixelRatio: 1, // the node is already drawn at the picture's real size
    cacheBust: false, // IGDB's addresses never change, so the browser's copy is fine
  };
  let blob = null;
  for (let take = isWebKit() ? 3 : 1; take > 0; take--) blob = await toBlob(node, options);
  if (!blob) throw new Error('The picture came out empty');
  return blob;
}
