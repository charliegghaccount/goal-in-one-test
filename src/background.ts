import { backgroundLayout, grassParksConfig } from './background-layout';
/** Optimised derivative of the approved PNG; original bytes are preserved beside it. */
export const approvedGrassParksUrl = new URL(
  './assets/grass-parks/background.webp',
  import.meta.url,
).href;
export const grassParksImage = typeof Image === 'undefined' ? null : new Image();
if (grassParksImage) {
  grassParksImage.decoding = 'async';
  grassParksImage.src = approvedGrassParksUrl;
}
const patterns = new WeakMap<
  CanvasRenderingContext2D,
  { image: HTMLImageElement; pattern: CanvasPattern }
>();
function landscapePattern(c: CanvasRenderingContext2D, image: HTMLImageElement) {
  const old = patterns.get(c);
  if (old?.image === image) return old.pattern;
  const strip = document.createElement('canvas');
  strip.width = image.naturalWidth * 2;
  strip.height = image.naturalHeight;
  const ctx = strip.getContext('2d')!;
  ctx.drawImage(image, 0, 0);
  ctx.translate(strip.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(image, 0, 0);
  const pattern = c.createPattern(strip, 'repeat')!;
  patterns.set(c, { image, pattern });
  return pattern;
}
let illustrated = true;
try {
  illustrated = localStorage.getItem('goal-in-one:background:illustrated') !== 'false';
} catch {}
export const artworkEnabled = () => illustrated;
export function setArtworkEnabled(value: boolean) {
  illustrated = value;
  try {
    localStorage.setItem('goal-in-one:background:illustrated', String(value));
  } catch {}
}
export function drawGrassParks(
  c: CanvasRenderingContext2D,
  width: number,
  height: number,
  dx: number,
  dy: number,
  image: HTMLImageElement | null = grassParksImage,
) {
  if (!image?.complete || !image.naturalWidth) return false;
  const layout = backgroundLayout(width, height, image.naturalWidth, image.naturalHeight, dx, dy);
  c.fillStyle = grassParksConfig.skyFill;
  c.fillRect(0, 0, width, height);
  for (const tile of layout.tiles) {
    c.save();
    c.translate(tile.x + (tile.mirrored ? layout.tileWidth : 0), 0);
    c.scale(tile.mirrored ? -1 : 1, 1);
    // Edge-row extensions join the source exactly and never repeat the landscape vertically.
    if (layout.top > 0)
      c.drawImage(image, 0, 0, image.naturalWidth, 1, 0, 0, layout.tileWidth, layout.top + 1);
    if (layout.top + layout.tileHeight < height)
      c.drawImage(
        image,
        0,
        image.naturalHeight - 1,
        image.naturalWidth,
        1,
        0,
        Math.max(0, layout.top + layout.tileHeight - 1),
        layout.tileWidth,
        height - Math.max(0, layout.top + layout.tileHeight - 1),
      );
    c.restore();
  }
  // One continuous pattern avoids fractional-pixel gaps between individual tile draw calls.
  const scale = layout.tileHeight / image.naturalHeight,
    phase = -layout.tiles[0].x + (layout.tiles[0].mirrored ? layout.tileWidth : 0);
  c.save();
  c.beginPath();
  c.rect(
    0,
    Math.max(0, layout.top),
    width,
    Math.max(0, Math.min(height, layout.top + layout.tileHeight) - Math.max(0, layout.top)),
  );
  c.clip();
  const pattern = landscapePattern(c, image);
  pattern.setTransform(new DOMMatrix().translate(-phase, layout.top).scale(scale));
  c.fillStyle = pattern;
  c.fillRect(0, 0, width, height);
  c.restore();
  return true;
}
