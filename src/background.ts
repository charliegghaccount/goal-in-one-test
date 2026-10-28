import { backgroundLayout, grassParksConfig } from './background-layout';
/** Pending the original approved PNG/WebP attachment. Never substitute generated artwork here. */
export const approvedGrassParksUrl: string | null = null;
export const grassParksImage = typeof Image === 'undefined' ? null : new Image();
if (grassParksImage && approvedGrassParksUrl) grassParksImage.src = approvedGrassParksUrl;
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
    c.drawImage(
      image,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight,
      0,
      layout.top,
      layout.tileWidth,
      layout.tileHeight,
    );
    c.restore();
  }
  return true;
}
