/** One texture density for beams, polygons and mechanisms, in physics/world units. */
export const WOOD_TILE_WORLD_SIZE = 256;
export const woodImage = typeof Image === 'undefined' ? null : new Image();
if (woodImage) {
  woodImage.decoding = 'async';
  woodImage.src = new URL('./assets/wood/texture.webp', import.meta.url).href;
}
const patterns = new WeakMap<CanvasRenderingContext2D, CanvasPattern>();
export function woodFill(
  c: CanvasRenderingContext2D,
  x = 0,
  y = 0,
  angle = 0,
): CanvasPattern | string {
  if (!woodImage?.complete || !woodImage.naturalWidth) return '#d69843';
  let pattern = patterns.get(c);
  if (!pattern) {
    // Mirrored pairs keep source edges continuous without scaling to an object's dimensions.
    const w = woodImage.naturalWidth,
      h = woodImage.naturalHeight,
      tile = document.createElement('canvas');
    tile.width = w * 2;
    tile.height = h * 2;
    const t = tile.getContext('2d')!;
    for (const sx of [1, -1])
      for (const sy of [1, -1]) {
        t.save();
        t.translate(sx < 0 ? w * 2 : 0, sy < 0 ? h * 2 : 0);
        t.scale(sx, sy);
        t.drawImage(woodImage, 0, 0);
        t.restore();
      }
    pattern = c.createPattern(tile, 'repeat')!;
    patterns.set(c, pattern);
  }
  pattern.setTransform(
    new DOMMatrix()
      .translate(x, y)
      .rotate((angle * 180) / Math.PI)
      .scale(WOOD_TILE_WORLD_SIZE / woodImage.naturalWidth),
  );
  return pattern;
}
