import type { Level, Point } from '../levels';
import { points, center, rotation, resize, translate, type Ref } from './objects';
export const handleAxes: Point[] = [
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: -1, y: 1 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
];
export function frame(l: Level, r: Ref) {
  const c = center(l, r),
    a = ['obstacle', 'mover', 'rotor', 'ice'].includes(r.kind) ? rotation(l, r) : 0;
  const local = (p: Point) => ({
    x: (p.x - c.x) * Math.cos(a) + (p.y - c.y) * Math.sin(a),
    y: -(p.x - c.x) * Math.sin(a) + (p.y - c.y) * Math.cos(a),
  });
  const p = points(l, r).map(local),
    left = Math.min(...p.map((p) => p.x)),
    top = Math.min(...p.map((p) => p.y)),
    right = Math.max(...p.map((p) => p.x)),
    bottom = Math.max(...p.map((p) => p.y));
  const world = (p: Point) => ({
    x: c.x + p.x * Math.cos(a) - p.y * Math.sin(a),
    y: c.y + p.x * Math.sin(a) + p.y * Math.cos(a),
  });
  return {
    c,
    a,
    local,
    world,
    left,
    top,
    right,
    bottom,
    w: right - left,
    h: bottom - top,
    handles: handleAxes.map((h) =>
      world({
        x: h.x < 0 ? left : h.x > 0 ? right : (left + right) / 2,
        y: h.y < 0 ? top : h.y > 0 ? bottom : (top + bottom) / 2,
      }),
    ),
  };
}
/** Resize in local axes, then move the centre so the opposite edge/corner stays fixed. */
export function resizeHandle(
  l: Level,
  r: Ref,
  index: number,
  p: Point,
  options: { aspect?: boolean; centre?: boolean } = {},
) {
  const f = frame(l, r),
    axis = handleAxes[index],
    q = f.local(p);
  let left = f.left,
    right = f.right,
    top = f.top,
    bottom = f.bottom;
  if (axis.x < 0) left = Math.min(right - 8, q.x);
  if (axis.x > 0) right = Math.max(left + 8, q.x);
  if (axis.y < 0) top = Math.min(bottom - 8, q.y);
  if (axis.y > 0) bottom = Math.max(top + 8, q.y);
  if (options.centre) {
    if (axis.x) {
      const w = Math.max(8, Math.abs(q.x) * 2);
      left = -w / 2;
      right = w / 2;
    }
    if (axis.y) {
      const h = Math.max(8, Math.abs(q.y) * 2);
      top = -h / 2;
      bottom = h / 2;
    }
  }
  if (options.aspect) {
    const sx = (right - left) / f.w,
      sy = (bottom - top) / f.h,
      ratio = axis.x && axis.y ? (Math.abs(sx - 1) > Math.abs(sy - 1) ? sx : sy) : axis.x ? sx : sy;
    const w = Math.max(8, f.w * ratio),
      h = Math.max(8, f.h * ratio);
    if (options.centre) {
      left = -w / 2;
      right = w / 2;
      top = -h / 2;
      bottom = h / 2;
    } else {
      if (axis.x < 0) left = right - w;
      else right = left + w;
      if (axis.y < 0) top = bottom - h;
      else bottom = top + h;
    }
  }
  if (['surface', 'spring', 'ice'].includes(r.kind)) {
    top = f.top;
    bottom = f.bottom;
  }
  const target = f.world({ x: (left + right) / 2, y: (top + bottom) / 2 });
  resize(l, r, right - left, bottom - top);
  const after = center(l, r);
  translate(l, r, target.x - after.x, target.y - after.y);
}
