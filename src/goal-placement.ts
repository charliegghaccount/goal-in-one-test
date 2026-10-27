import type { Level, Point } from './levels';
import { inPolygon, distanceToEdge, cross, intersects } from './geometry';
export function netOutline(l: Level): Point[] {
  const g = l.goal;
  return [
    { x: g.x, y: g.y - g.h },
    { x: g.x + g.roof, y: g.y - g.h },
    { x: g.x + g.w, y: g.y },
    { x: g.x, y: g.y },
  ];
}
export function freeGoalFits(l: Level) {
  const arena = l.boundary ?? l.outline,
    net = netOutline(l);
  const on = (p: Point, poly: Point[]) =>
    poly.some((a, i) => distanceToEdge(p, a, poly[(i + 1) % poly.length]) < 0.01);
  if (net.some((p) => !inPolygon(p, arena) && !on(p, arena))) return false;
  for (let i = 0; i < net.length; i++)
    for (let j = 0; j < arena.length; j++) {
      const a = net[i],
        b = net[(i + 1) % net.length],
        c = arena[j],
        d = arena[(j + 1) % arena.length];
      if (cross(a, b, c) * cross(a, b, d) < -1e-7 && cross(c, d, a) * cross(c, d, b) < -1e-7)
        return false;
    }
  if (arena.some((p) => inPolygon(p, net) && !on(p, net))) return false;
  return !l.obstacles.some(
    (o) =>
      o.points.some((p) => inPolygon(p, net)) ||
      net.some((p) => inPolygon(p, o.points)) ||
      net.some((a, i) =>
        o.points.some((b, j) =>
          intersects(a, net[(i + 1) % net.length], b, o.points[(j + 1) % o.points.length]),
        ),
      ),
  );
}
