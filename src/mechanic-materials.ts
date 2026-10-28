import { drawObjectGrass } from './grass-art';
// Scalable side-view artwork only: no bodies, sensors, definitions or state are changed here.
import { bolt, wood } from './art';
import type { Gate, Spring, Switch, Wind } from './mechanics';
import type { Surface } from './levels';
type C = CanvasRenderingContext2D;
const dark = '#202a34';
function gradient(c: C, y: number, h: number, colors: string[]) {
  const g = c.createLinearGradient(0, y, 0, y + h);
  colors.forEach((v, i) => g.addColorStop(i / (colors.length - 1), v));
  return g;
}
function panel(c: C, x: number, y: number, w: number, h: number, colors: string[], r = 3) {
  c.beginPath();
  c.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
  c.fillStyle = gradient(c, y, h, colors);
  c.fill();
  c.strokeStyle = dark;
  c.lineWidth = 1.5;
  c.stroke();
  c.beginPath();
  c.moveTo(x + 3, y + 2);
  c.lineTo(x + w - 3, y + 2);
  c.strokeStyle = '#ffffff66';
  c.lineWidth = 1;
  c.stroke();
}
const steel = ['#7d8c9a', '#414d5b', '#28313c'];
export function drawBoostStrip(c: C, s: Surface) {
  c.save();
  c.translate(s.x, s.y);
  const colors =
    s.kind === 'forward'
      ? ['#92f442', '#35d21c', '#169a22']
      : s.kind === 'backward'
        ? ['#ffc259', '#ff8b18', '#df5812']
        : ['#ff7161', '#ff332d', '#be1c2d'];
  panel(c, 0, -12, s.w, 12, steel, 3);
  panel(c, 5, -11, Math.max(1, s.w - 10), 8, colors, 3);
  c.save();
  c.beginPath();
  c.rect(6, -10, Math.max(0, s.w - 12), 6);
  c.clip();
  if (s.kind === 'delete') {
    c.strokeStyle = '#8f162a80';
    c.lineWidth = 7;
    for (let x = 0; x < s.w; x += 20) {
      c.beginPath();
      c.moveTo(x, -2);
      c.lineTo(x + 12, -14);
      c.stroke();
    }
  } else {
    const d = s.kind === 'forward' ? 1 : -1;
    for (let x = 18; x < s.w - 8; x += 28) {
      c.beginPath();
      c.moveTo(x - d * 5, -10);
      c.lineTo(x + d * 2, -10);
      c.lineTo(x + d * 7, -7);
      c.lineTo(x + d * 2, -4);
      c.lineTo(x - d * 5, -4);
      c.lineTo(x, -7);
      c.closePath();
      c.fillStyle = '#fffef4';
      c.fill();
    }
  }
  c.restore();
  if (s.kind === 'delete' && s.w >= 45) {
    c.beginPath();
    c.moveTo(s.w / 2, -11);
    c.lineTo(s.w / 2 + 6, -3);
    c.lineTo(s.w / 2 - 6, -3);
    c.closePath();
    c.fillStyle = '#fff5e5';
    c.fill();
    c.fillStyle = '#a51b2b';
    c.fillRect(s.w / 2 - 0.65, -8.5, 1.3, 2.4);
    c.fillRect(s.w / 2 - 0.65, -5.2, 1.3, 1);
  }
  if (s.w > 20) {
    bolt(c, 2.5, -6, 1.4);
    bolt(c, s.w - 2.5, -6, 1.4);
  }
  c.restore();
}
export function drawSpringLauncher(c: C, p: Spring, elapsed: number, reduced = false) {
  // A quick compression followed by a damped visual return; trigger timing is untouched.
  const squash =
    reduced || elapsed < 0 || elapsed > 0.42
      ? 0
      : Math.exp(-elapsed * 9) * Math.max(0, Math.cos(elapsed * 20));
  c.save();
  c.translate(p.x, p.y);
  const h = Math.min(28, Math.max(18, p.w * 0.3)),
    top = -h + squash * (h - 8),
    left = p.w * 0.28,
    right = p.w * 0.72;
  panel(c, 0, -6, p.w, 6, steel, 2);
  const coil = () => {
    c.beginPath();
    for (let i = 0; i <= 64; i++) {
      const f = i / 64,
        x = (left + right) / 2 + (Math.sin(f * Math.PI * 6) * (right - left)) / 2,
        y = top + 4 + f * (-8 - top);
      if (i) c.lineTo(x, y);
      else c.moveTo(x, y);
    }
  };
  c.lineJoin = 'round';
  c.lineCap = 'round';
  coil();
  c.strokeStyle = dark;
  c.lineWidth = 3.8;
  c.stroke();
  coil();
  c.strokeStyle = gradient(c, top, h, ['#f4f9ff', '#8d9caa', '#ecf7ff', '#6c7e8e']);
  c.lineWidth = 2.1;
  c.stroke();
  panel(c, 1, top - 3, Math.max(1, p.w - 2), 7, ['#ff9771', '#f64c3d', '#bf2732'], 3);
  bolt(c, 5, -3, 1.6);
  bolt(c, p.w - 5, -3, 1.6);
  // Keep the force direction legible even though the physical contact strip stays horizontal.
  const a = (p.angle * Math.PI) / 180;
  c.translate(p.w / 2, top - 5);
  c.rotate(-a);
  c.strokeStyle = '#fff8e8';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(-5, 0);
  c.lineTo(5, 0);
  c.moveTo(1, -3);
  c.lineTo(5, 0);
  c.lineTo(1, 3);
  c.stroke();
  c.restore();
}
export function drawSideFan(c: C, w: Wind, time: number) {
  // The force zone remains axis-aligned. The appliance rotates about its centre within it.
  const size = Math.max(6, Math.min(46, w.w * 0.55, w.h * 0.65));
  const a = (w.angle * Math.PI) / 180,
    dx = Math.cos(a),
    dy = -Math.sin(a),
    reach = Math.min(w.w / (2 * (Math.abs(dx) || 1e-8)), w.h / (2 * (Math.abs(dy) || 1e-8)));
  const x = w.x + w.w / 2 - dx * Math.max(0, reach - size * 0.5),
    y = w.y + w.h / 2 - dy * Math.max(0, reach - size * 0.5);
  c.save();
  c.translate(x, y);
  c.rotate(Math.PI / 2 - a);
  c.scale(size / 46, size / 46);
  // Cross-section of an upward-blowing impeller: outlet at the top, broad feet at the bottom.
  panel(c, -23, 16, 46, 7, steel, 3);
  panel(c, -17, 8, 8, 10, steel, 2);
  panel(c, 9, 8, 8, 10, steel, 2);
  panel(c, -21, -16, 42, 31, ['#8b9aaa', '#455365', '#252e3b'], 7);
  panel(c, -23, -21, 46, 8, ['#a1adba', '#586574', '#313c49'], 3);
  c.fillStyle = '#17222b';
  c.fillRect(-17, -18, 34, 3);
  c.save();
  c.beginPath();
  c.roundRect(-17, -10, 34, 21, 5);
  c.clip();
  c.fillStyle = '#253441';
  c.fillRect(-17, -10, 34, 21);
  c.translate(0, 1);
  c.rotate(time * 9);
  for (let i = 0; i < 4; i++) {
    c.rotate(Math.PI / 2);
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(-4, -6, 2, -16, 8, -12);
    c.bezierCurveTo(13, -6, 6, -2, 0, 0);
    c.fillStyle = gradient(c, -14, 25, ['#e0edf8', '#90a6ba', '#526a80']);
    c.fill();
    c.strokeStyle = '#243443';
    c.lineWidth = 1;
    c.stroke();
  }
  c.restore();
  c.strokeStyle = '#8293a4';
  c.lineWidth = 1.3;
  for (let x = -12; x <= 12; x += 8) {
    c.beginPath();
    c.moveTo(x, -10);
    c.lineTo(x, 10);
    c.stroke();
  }
  bolt(c, 0, 1, 3);
  bolt(c, -18, 19, 2);
  bolt(c, 18, 19, 2);
  c.restore();
}
export function drawPressurePlate(c: C, sw: Switch, pressed: boolean) {
  c.save();
  c.translate(sw.x, sw.y);
  const w = sw.w ?? 36,
    h = Math.min(sw.h ?? 36, 14),
    top = -h / 2;
  panel(c, -w / 2, top + h * 0.48, w, h * 0.52, steel, 2);
  const plateY = top + (pressed ? h * 0.38 : 0);
  panel(
    c,
    -w * 0.43,
    plateY,
    w * 0.86,
    h * 0.48,
    pressed ? ['#b5f776', '#62c532', '#368a27'] : ['#8be7ff', '#20b9f3', '#0877ae'],
    3,
  );
  if (w >= 20) {
    bolt(c, -w * 0.42, top + h * 0.78, Math.min(1.6, h * 0.12));
    bolt(c, w * 0.42, top + h * 0.78, Math.min(1.6, h * 0.12));
    c.fillStyle = pressed ? '#efffce' : '#def9ff';
    c.fillRect(-Math.min(5, w * 0.12), plateY + h * 0.16, Math.min(10, w * 0.24), 1.5);
  }
  c.restore();
}
export function drawTimberGate(c: C, g: Gate, x: number, y: number, angle: number) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  const w = g.w,
    h = g.h,
    x0 = -w / 2,
    y0 = -h / 2,
    rail = Math.min(10, w * 0.16),
    edge = Math.min(6, h * 0.12);
  // All decorative fittings stay inside the existing rectangular collision footprint.
  c.save();
  c.beginPath();
  c.rect(x0, y0, w, h);
  c.clip();
  wood(
    c,
    [
      { x: x0, y: y0 },
      { x: w / 2, y: y0 },
      { x: w / 2, y: h / 2 },
      { x: x0, y: h / 2 },
    ],
    false,
  );
  c.strokeStyle = '#613719';
  c.lineWidth = 1.5;
  const rows = Math.max(1, Math.ceil(h / 38));
  for (let i = 1; i < rows; i++) {
    const y = y0 + (h * i) / rows;
    c.beginPath();
    c.moveTo(x0 + rail, y);
    c.lineTo(w / 2 - rail, y);
    c.stroke();
    c.strokeStyle = '#ffe1a077';
    c.beginPath();
    c.moveTo(x0 + rail, y + 2);
    c.lineTo(w / 2 - rail, y + 2);
    c.stroke();
    c.strokeStyle = '#613719';
  }
  panel(c, x0, y0, rail, h, steel, 2);
  panel(c, w / 2 - rail, y0, rail, h, steel, 2);
  panel(c, x0, y0, w, edge, steel, 2);
  panel(c, x0, h / 2 - edge, w, edge, steel, 2);
  for (const bx of [x0 + rail / 2, w / 2 - rail / 2])
    for (const by of [y0 + Math.min(9, h * 0.18), h / 2 - Math.min(9, h * 0.18)])
      bolt(c, bx, by, Math.min(2.7, rail * 0.25, h * 0.1));
  c.restore();
  if (g.grass === true)
    drawObjectGrass(c, [
      { x: x0, y: y0 },
      { x: w / 2, y: y0 },
      { x: w / 2, y: h / 2 },
      { x: x0, y: h / 2 },
    ]);
  c.restore();
}
