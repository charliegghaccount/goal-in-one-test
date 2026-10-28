import type { Goal, Point } from './levels';
/** Three open-ended tubes only. There is deliberately no fourth edge across the mouth. */
export function drawGoalFrame(c: CanvasRenderingContext2D, g: Goal, width: number) {
  const top = { x: g.x, y: g.y - g.h },
    bend = { x: g.x + g.roof, y: g.y - g.h },
    back = { x: g.x + g.w, y: g.y },
    bottom = { x: g.x, y: g.y };
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (const [a, b] of [
    [top, bend],
    [bend, back],
    [back, bottom],
  ]) {
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 0.01) continue;
    c.save();
    c.translate(a.x, a.y);
    c.rotate(Math.atan2(b.y - a.y, b.x - a.x));
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(len, 0);
    c.strokeStyle = '#465360';
    c.lineWidth = width;
    c.stroke();
    const metal = c.createLinearGradient(0, -width / 2, 0, width / 2);
    metal.addColorStop(0, '#c0cbd5');
    metal.addColorStop(0.22, '#ffffff');
    metal.addColorStop(0.5, '#f4f7fa');
    metal.addColorStop(1, '#a5b3c0');
    c.strokeStyle = metal;
    c.lineWidth = width * 0.76;
    c.stroke();
    c.beginPath();
    c.moveTo(1, -width * 0.23);
    c.lineTo(Math.max(1, len - 1), -width * 0.23);
    c.strokeStyle = '#ffffff';
    c.lineWidth = Math.max(0.7, width * 0.12);
    c.stroke();
    c.restore();
  }
  // Small metal collars at the two closed corners, with no bulky fittings at the opening.
  for (const p of [bend, back]) {
    c.beginPath();
    c.arc(p.x, p.y, width * 0.34, 0, Math.PI * 2);
    c.fillStyle = '#eaf0f5';
    c.fill();
    c.strokeStyle = '#9aa9b5';
    c.lineWidth = 0.8;
    c.stroke();
    c.beginPath();
    c.arc(p.x - width * 0.09, p.y - width * 0.09, width * 0.12, 0, Math.PI * 2);
    c.fillStyle = '#fff';
    c.fill();
  }
  c.restore();
}
export function goalNetPoints(g: Goal): Point[] {
  return [
    { x: g.x, y: g.y - g.h },
    { x: g.x + g.roof, y: g.y - g.h },
    { x: g.x + g.w, y: g.y },
    { x: g.x, y: g.y },
  ];
}
export function drawGoalNet(
  c: CanvasRenderingContext2D,
  g: Goal,
  timeSinceGoal: number,
  reduced: boolean,
) {
  const d = Math.sign(g.w) || 1,
    mesh = 13,
    inset = 5;
  c.save();
  c.beginPath();
  goalNetPoints(g).forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
  c.closePath();
  c.clip();
  // Keep the entrance free of a vertical net edge or dashed faux post.
  c.beginPath();
  c.rect(
    Math.min(g.x, g.x + g.w) + (d < 0 ? 0 : inset),
    g.y - g.h,
    Math.max(0, Math.abs(g.w) - inset),
    g.h,
  );
  c.clip();
  const ripple =
    !reduced && timeSinceGoal >= 0 && timeSinceGoal < 1.4
      ? Math.sin(timeSinceGoal * 24) * Math.exp(-timeSinceGoal * 3) * 2
      : 0;
  const lines = () => {
    c.beginPath();
    for (let u = mesh; u < Math.abs(g.w); u += mesh) {
      const x = g.x + d * u;
      c.moveTo(x, g.y - g.h);
      c.quadraticCurveTo(x + d * ripple, g.y - g.h / 2, x, g.y);
    }
    for (let y = g.y - g.h + mesh; y < g.y; y += mesh) {
      c.moveTo(g.x + d * inset, y);
      c.quadraticCurveTo(g.x + g.w / 2, y + ripple, g.x + g.w, y);
    }
  };
  lines();
  c.strokeStyle = '#40586944';
  c.lineWidth = 2;
  c.stroke();
  lines();
  c.strokeStyle = '#fffffff0';
  c.lineWidth = 1.15;
  c.stroke();
  c.fillStyle = '#ffffffdd';
  for (let u = mesh; u < Math.abs(g.w); u += mesh)
    for (let y = g.y - g.h + mesh; y < g.y; y += mesh) {
      c.beginPath();
      c.arc(g.x + d * u, y, 0.95, 0, Math.PI * 2);
      c.fill();
    }
  c.restore();
}
