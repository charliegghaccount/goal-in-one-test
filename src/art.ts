import { drawObjectGrass } from './grass-art';
import { woodFill } from './wood-material';
import { area } from './geometry';
import type { Point, Segment } from './levels';
let parkImage: HTMLImageElement | undefined;
export function scenery(c: CanvasRenderingContext2D, w: number, h: number) {
  if (!parkImage) {
    parkImage = new Image();
    parkImage.src = new URL('./assets/park.webp', import.meta.url).href;
  }
  if (parkImage.complete && parkImage.naturalWidth) {
    const s = Math.max(w / parkImage.width, h / parkImage.height);
    c.drawImage(
      parkImage,
      (w - parkImage.width * s) / 2,
      (h - parkImage.height * s) * 0.58,
      parkImage.width * s,
      parkImage.height * s,
    );
  } else {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#48b8f3');
    g.addColorStop(0.72, '#b5e7fb');
    g.addColorStop(1, '#79c450');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  }
}
export function wood(
  c: CanvasRenderingContext2D,
  points: Point[],
  bolts = true,
  textureAngle = 0,
  grass = false,
) {
  c.save();
  c.beginPath();
  points.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
  c.closePath();
  c.clip();
  const co = Math.cos(textureAngle),
    si = Math.sin(textureAngle);
  const local = points.map((p) => ({ x: p.x * co + p.y * si, y: -p.x * si + p.y * co }));
  const x = Math.min(...local.map((p) => p.x)),
    y = Math.min(...local.map((p) => p.y));
  c.fillStyle = woodFill(c, x * co - y * si, x * si + y * co, textureAngle);
  const xs = points.map((p) => p.x),
    ys = points.map((p) => p.y);
  c.fillRect(
    Math.min(...xs),
    Math.min(...ys),
    Math.max(...xs) - Math.min(...xs),
    Math.max(...ys) - Math.min(...ys),
  );
  // Decorative edge treatment stays entirely inside the actual collision polygon.
  c.lineJoin = 'round';
  c.lineWidth = 7;
  c.strokeStyle = '#713d1d88';
  c.stroke();
  const winding = Math.sign(area(points)) || 1;
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length],
      length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const light = (((b.y - a.y) * -0.6 - (b.x - a.x) * -0.8) * winding) / length;
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(b.x, b.y);
    c.lineWidth = light > 0 ? 4 : 7;
    c.strokeStyle = light > 0 ? '#ffe9b68c' : '#6d351e70';
    c.stroke();
  }
  c.beginPath();
  points.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
  c.closePath();
  c.lineWidth = 2.5;
  c.strokeStyle = '#613619';
  c.stroke();
  if (bolts) {
    let cx = 0,
      cy = 0;
    for (const p of points) {
      cx += p.x;
      cy += p.y;
    }
    cx /= points.length;
    cy /= points.length;
    for (const p of points) {
      const d = Math.hypot(cx - p.x, cy - p.y),
        f = Math.min(0.35, 13 / d);
      bolt(c, p.x + (cx - p.x) * f, p.y + (cy - p.y) * f, 3.2);
    }
  }
  c.restore();
  if (grass) drawObjectGrass(c, points, textureAngle);
}
export function bolt(c: CanvasRenderingContext2D, x: number, y: number, r = 2) {
  c.fillStyle = '#344651';
  c.beginPath();
  c.arc(x, y, r + 1, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#a4b6bc';
  c.beginPath();
  c.arc(x - 0.5, y - 0.5, r, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#46545c';
  c.lineWidth = 0.8;
  c.beginPath();
  c.moveTo(x - r * 0.5, y);
  c.lineTo(x + r * 0.5, y);
  c.stroke();
}
export function beam(c: CanvasRenderingContext2D, s: Segment, width: number) {
  const dx = s.b.x - s.a.x,
    dy = s.b.y - s.a.y,
    len = Math.hypot(dx, dy);
  c.save();
  c.translate(s.a.x, s.a.y);
  c.rotate(Math.atan2(dy, dx));
  c.lineCap = 'round';
  if (s.kind === 'goal') {
    c.strokeStyle = '#465360';
    c.lineWidth = width;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(len, 0);
    c.stroke();
    c.strokeStyle = '#f4f7fa';
    c.lineWidth = width * 0.68;
    c.stroke();
    c.strokeStyle = '#ffffff';
    c.lineWidth = width * 0.15;
    c.beginPath();
    c.moveTo(0, -width * 0.22);
    c.lineTo(len, -width * 0.22);
    c.stroke();
  } else {
    c.strokeStyle = '#6b3b1e';
    c.lineWidth = width;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(len, 0);
    c.stroke();
    c.strokeStyle = woodFill(c);
    c.lineWidth = width * 0.8;
    c.stroke();
    c.strokeStyle = '#ffe6ad99';
    c.lineWidth = Math.min(1.2, width * 0.12);
    c.beginPath();
    c.moveTo(0, -width * 0.28);
    c.lineTo(len, -width * 0.28);
    c.stroke();
    c.strokeStyle = '#65331966';
    c.lineWidth = Math.min(1.2, width * 0.12);
    c.beginPath();
    c.moveTo(0, width * 0.28);
    c.lineTo(len, width * 0.28);
    c.stroke();
    for (const yy of [-width * 0.16, width * 0.18]) {
      c.strokeStyle = '#6d3d2366';
      c.lineWidth = 0.7;
      c.beginPath();
      c.moveTo(1, yy);
      c.bezierCurveTo(len * 0.3, yy - 1, len * 0.6, yy + 1, len - 1, yy);
      c.stroke();
    }
  }
  c.restore();
}
export function joint(c: CanvasRenderingContext2D, p: Point, width: number) {
  c.save();
  c.translate(p.x, p.y);
  c.fillStyle = '#34454c';
  c.beginPath();
  c.roundRect(-width * 0.46, -width * 0.46, width * 0.92, width * 0.92, 2);
  c.fill();
  bolt(c, 0, 0, width * 0.15);
  c.restore();
}
export function turf(c: CanvasRenderingContext2D, a: Point, b: Point) {
  c.save();
  const w = b.x - a.x;
  c.fillStyle = woodFill(c, a.x, a.y);
  c.fillRect(a.x, a.y - 3, w, 6);
  // Grass stays within the visual floor stroke; it doesn't invent a raised platform.
  c.fillStyle = '#47ab32';
  c.fillRect(a.x, a.y - 5, w, 3);
  c.strokeStyle = '#b4ed59';
  c.lineWidth = 1.5;
  for (let x = a.x + 3; x < b.x - 2; x += 9) {
    c.beginPath();
    c.moveTo(x, a.y - 2);
    c.lineTo(x + 2, a.y - 5);
    c.lineTo(x + 4, a.y - 2);
    c.stroke();
  }
  c.restore();
}
