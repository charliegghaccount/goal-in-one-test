/** Presentation only: never used by the physics or the gameplay camera. */
export const grassParksConfig = {
  scale: 1.05,
  horizontalParallax: 0.14,
  verticalParallax: 0.12,
  verticalOffset: -0.03,
  maximumLandscapeRise: 0.25,
  skyFill: '#36a7ef',
  groundFill: '#76b92e',
};
export function backgroundLayout(
  width: number,
  height: number,
  imageWidth: number,
  imageHeight: number,
  dx = 0,
  dy = 0,
) {
  const h = height * grassParksConfig.scale,
    w = (h * imageWidth) / imageHeight;
  const shift = (dx * grassParksConfig.horizontalParallax * width) / 1280;
  // Repeat a mirrored pair: negative coordinates wrap exactly like positive ones.
  const period = 2 * w,
    phase = ((shift % period) + period) % period;
  const rawTop =
    height * grassParksConfig.verticalOffset -
    (dy * grassParksConfig.verticalParallax * height) / 720;
  const top = Math.max(-h * grassParksConfig.maximumLandscapeRise, rawTop);
  const tiles: { x: number; mirrored: boolean }[] = [];
  const first = Math.floor(phase / w);
  for (let i = first; i * w - phase < width; i++)
    tiles.push({ x: i * w - phase, mirrored: i % 2 !== 0 });
  return { tileWidth: w, tileHeight: h, top, tiles };
}
