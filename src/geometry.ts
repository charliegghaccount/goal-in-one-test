import type { Point } from './levels';
export const cross = (a: Point, b: Point, c: Point) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
export const area = (p: Point[]) =>
  p.reduce((n, a, i) => {
    const b = p[(i + 1) % p.length];
    return n + a.x * b.y - b.x * a.y;
  }, 0) / 2;
export function inPolygon(p: Point, points: Point[]) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i],
      b = points[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
      inside = !inside;
  }
  return inside;
}
export function distanceToEdge(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
}
export function intersects(a: Point, b: Point, c: Point, d: Point) {
  const ab1 = cross(a, b, c),
    ab2 = cross(a, b, d),
    cd1 = cross(c, d, a),
    cd2 = cross(c, d, b);
  if (ab1 * ab2 < -1e-7 && cd1 * cd2 < -1e-7) return true;
  return (
    (Math.abs(ab1) < 1e-7 && distanceToEdge(c, a, b) < 1e-6) ||
    (Math.abs(ab2) < 1e-7 && distanceToEdge(d, a, b) < 1e-6) ||
    (Math.abs(cd1) < 1e-7 && distanceToEdge(a, c, d) < 1e-6) ||
    (Math.abs(cd2) < 1e-7 && distanceToEdge(b, c, d) < 1e-6)
  );
}
export function polygonError(p: Point[]): string | null {
  if (p.length < 3) return 'needs at least three vertices';
  if (p.length > 128) return 'has more than 128 vertices';
  if (p.some((a) => !Number.isFinite(a.x) || !Number.isFinite(a.y)))
    return 'has a non-finite coordinate';
  for (let i = 0; i < p.length; i++) {
    if (Math.hypot(p[i].x - p[(i + 1) % p.length].x, p[i].y - p[(i + 1) % p.length].y) < 0.1)
      return 'has duplicate adjacent vertices';
    for (let j = i + 1; j < p.length; j++) {
      if (j === i + 1 || (i === 0 && j === p.length - 1)) continue;
      if (intersects(p[i], p[(i + 1) % p.length], p[j], p[(j + 1) % p.length]))
        return 'has self-intersecting edges';
    }
  }
  if (Math.abs(area(p)) < 4) return 'has zero or negligible area';
  return null;
}
export function isConvex(p: Point[]) {
  const sign = Math.sign(area(p));
  return p.every((a, i) => cross(a, p[(i + 1) % p.length], p[(i + 2) % p.length]) * sign >= -1e-7);
}
/** Ear clipping keeps concave empty space empty; never fall back to a convex hull. */
export function convexParts(points: Point[]): Point[][] {
  const error = polygonError(points);
  if (error) throw Error('Invalid polygon: ' + error);
  if (isConvex(points)) return [points.map((p) => ({ ...p }))];
  const p = points.map((p) => ({ ...p })),
    sign = Math.sign(area(p)),
    result: Point[][] = [];
  for (let i = p.length - 1; i >= 0; i--)
    if (Math.abs(cross(p[(i + p.length - 1) % p.length], p[i], p[(i + 1) % p.length])) < 1e-7)
      p.splice(i, 1);
  while (p.length > 3) {
    let ear = false;
    for (let i = 0; i < p.length; i++) {
      const a = p[(i + p.length - 1) % p.length],
        b = p[i],
        c = p[(i + 1) % p.length];
      if (cross(a, b, c) * sign < 1e-7) continue;
      if (
        p.some(
          (v) =>
            v !== a &&
            v !== b &&
            v !== c &&
            cross(a, b, v) * sign >= -1e-7 &&
            cross(b, c, v) * sign >= -1e-7 &&
            cross(c, a, v) * sign >= -1e-7,
        )
      )
        continue;
      result.push([a, b, c]);
      p.splice(i, 1);
      ear = true;
      break;
    }
    if (!ear) throw Error('Polygon cannot be decomposed safely');
  }
  result.push(p);
  return result;
}
export function boxPoints(x: number, y: number, w: number, h: number, angle = 0): Point[] {
  return [
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [-w / 2, h / 2],
  ].map(([dx, dy]) => ({
    x: x + dx * Math.cos(angle) - dy * Math.sin(angle),
    y: y + dx * Math.sin(angle) + dy * Math.cos(angle),
  }));
}
export function cleanLoop(points: Point[]) {
  const p = points.filter(
    (v, i) => i === 0 || Math.hypot(v.x - points[i - 1].x, v.y - points[i - 1].y) > 0.001,
  );
  if (p.length > 1 && Math.hypot(p[0].x - p.at(-1)!.x, p[0].y - p.at(-1)!.y) < 0.001) p.pop();
  // Legacy PDF contours have a 1.3-unit collinear roof/mouth weld. Simplify
  // zero-area stitch-backs for union validation only; collision strokes stay exact.
  let changed = true;
  while (changed && p.length > 3) {
    changed = false;
    for (let i = 0; i < p.length; i++) {
      const a = p[(i + p.length - 1) % p.length],
        b = p[i],
        c = p[(i + 1) % p.length];
      if (
        Math.abs(cross(a, b, c)) < 1e-6 &&
        (distanceToEdge(b, a, c) < 0.001 ||
          Math.min(Math.hypot(b.x - a.x, b.y - a.y), Math.hypot(c.x - b.x, c.y - b.y)) < 2)
      ) {
        p.splice(i, 1);
        changed = true;
        break;
      }
    }
  }
  return p;
}
