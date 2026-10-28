import { area } from './geometry';
import type { Point } from './levels';
/** Cosmetic edging on the object's local upper-facing edges, carried along by rotation. */
export function drawObjectGrass(c: CanvasRenderingContext2D, points: Point[], rotation = 0) {
  const winding = Math.sign(area(points)) || 1,
    co = Math.cos(rotation),
    si = Math.sin(rotation);
  c.save();
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length],
      dx = b.x - a.x,
      dy = b.y - a.y,
      len = Math.hypot(dx, dy);
    if (len < 5 || ((dx * co + dy * si) * winding) / len < 0.35) continue;
    const start = winding > 0 ? a : b,
      end = winding > 0 ? b : a;
    c.save();
    c.translate(start.x, start.y);
    c.rotate(Math.atan2(end.y - start.y, end.x - start.x));
    c.fillStyle = '#47ab32';
    c.fillRect(0, -1.8, len, 3);
    c.strokeStyle = '#b4ed59';
    c.lineWidth = 1.2;
    for (let x = 3; x < len - 3; x += 9) {
      c.beginPath();
      c.moveTo(x, 1);
      c.lineTo(x + 2, -3.6);
      c.lineTo(x + 4, 1);
      c.stroke();
    }
    c.restore();
  }
  c.restore();
}
