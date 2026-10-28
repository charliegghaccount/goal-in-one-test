import type { Point, Segment } from './levels';
let parkImage: HTMLImageElement | undefined;
const textures = new WeakMap<CanvasRenderingContext2D, CanvasPattern>();
function timber(c: CanvasRenderingContext2D) {
  let p = textures.get(c);
  if (p) return p;
  const tile = document.createElement('canvas');
  tile.width = 256;
  tile.height = 192;
  const t = tile.getContext('2d')!;
  for (let row = 0; row < 4; row++) {
    const y = row * 48,
      g = t.createLinearGradient(0, y, 0, y + 48);
    g.addColorStop(0, '#f0bb71');
    g.addColorStop(0.13, '#cd8f49');
    g.addColorStop(0.65, row % 2 ? '#b67537' : '#c28340');
    g.addColorStop(1, '#895125');
    t.fillStyle = g;
    t.fillRect(0, y, 256, 48);
    t.fillStyle = '#673e23';
    t.fillRect(0, y + 46, 256, 2);
    t.fillStyle = '#ffdc9b';
    t.fillRect(0, y, 256, 2);
    for (let n = 0; n < 7; n++) {
      t.beginPath();
      t.strokeStyle = n % 2 ? '#ffe1a343' : '#72401f4a';
      t.lineWidth = 0.8;
      const yy = y + 8 + n * 5;
      t.moveTo(0, yy);
      t.bezierCurveTo(50, yy - 5, 130, yy + 6, 256, yy - 2);
      t.stroke();
    }
    t.strokeStyle = '#75452380';
    t.lineWidth = 1.5;
    t.beginPath();
    t.ellipse(48 + row * 53, y + 25, 12, 4, 0.08, 0, Math.PI * 2);
    t.ellipse(48 + row * 53, y + 25, 5, 1.8, 0.08, 0, Math.PI * 2);
    t.stroke();
  }
  p = c.createPattern(tile, 'repeat')!;
  textures.set(c, p);
  return p;
}
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
export function wood(c: CanvasRenderingContext2D, points: Point[], bolts = true) {
  c.save();
  c.beginPath();
  points.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
  c.closePath();
  c.clip();
  const material = timber(c);
  material.setTransform(
    new DOMMatrix().translate(
      Math.min(...points.map((p) => p.x)),
      Math.min(...points.map((p) => p.y)),
    ),
  );
  c.fillStyle = material;
  const xs = points.map((p) => p.x),
    ys = points.map((p) => p.y);
  c.fillRect(
    Math.min(...xs),
    Math.min(...ys),
    Math.max(...xs) - Math.min(...xs),
    Math.max(...ys) - Math.min(...ys),
  );
  // Both bevels are clipped INSIDE the collider polygon.
  c.lineJoin = 'round';
  c.lineWidth = 8;
  c.strokeStyle = '#70401f';
  c.stroke();
  c.lineWidth = 2;
  c.strokeStyle = '#ffe1a2';
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
    c.strokeStyle = '#127c35';
    c.lineWidth = width;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(len, 0);
    c.stroke();
    c.strokeStyle = '#58ef45';
    c.lineWidth = width * 0.68;
    c.stroke();
    c.strokeStyle = '#c0ffa1';
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
    const g = c.createLinearGradient(0, -width / 2, 0, width / 2);
    g.addColorStop(0, '#f6cf89');
    g.addColorStop(0.28, '#c88b45');
    g.addColorStop(1, '#895028');
    c.strokeStyle = g;
    c.lineWidth = width * 0.8;
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
  c.fillStyle = '#835528';
  c.fillRect(a.x, a.y - 3, w, 6);
  c.fillStyle = '#b17a3b';
  for (let x = a.x + 4; x < b.x; x += 19) c.fillRect(x, a.y + 1, 3, 2);
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
