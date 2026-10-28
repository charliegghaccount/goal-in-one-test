import type { FootballSimulation } from './simulation';
import { wood, bolt } from './art';
import {
  drawSideFan,
  drawSpringLauncher,
  drawPressurePlate,
  drawTimberGate,
} from './mechanic-materials';
export function drawMechanics(
  c: CanvasRenderingContext2D,
  s: FootballSimulation,
  reduced: boolean,
) {
  const m = s.mechanics,
    t = reduced ? 0 : s.time;
  for (const w of m.defs.winds ?? []) {
    c.save();
    c.fillStyle = '#83e5ff28';
    c.strokeStyle = '#a4eaffaa';
    c.lineWidth = 2;
    c.setLineDash([5, 7]);
    c.fillRect(w.x, w.y, w.w, w.h);
    c.strokeRect(w.x, w.y, w.w, w.h);
    c.setLineDash([]);
    c.beginPath();
    c.rect(w.x, w.y, w.w, w.h);
    c.clip();
    const a = (w.angle * Math.PI) / 180,
      dx = Math.cos(a),
      dy = -Math.sin(a);
    for (let row = 0; row < 5; row++)
      for (let col = 0; col < 5; col++) {
        const x = w.x + ((((col * 60 + t * dx * 36) % (w.w + 60)) + w.w + 60) % (w.w + 60)),
          y = w.y + ((((row * 45 + t * dy * 36) % (w.h + 45)) + w.h + 45) % (w.h + 45));
        c.strokeStyle = '#efffffbb';
        c.beginPath();
        c.moveTo(x - dx * 13, y - dy * 13);
        c.lineTo(x + dx * 13, y + dy * 13);
        c.moveTo(x + dx * 13 - dx * 6 + dy * 5, y + dy * 13 - dy * 6 - dx * 5);
        c.lineTo(x + dx * 13, y + dy * 13);
        c.lineTo(x + dx * 13 - dx * 6 - dy * 5, y + dy * 13 - dy * 6 + dx * 5);
        c.stroke();
      }
    c.restore();
    drawSideFan(c, w, t);
  }
  for (const b of m.breakables)
    if (!b.broken) {
      wood(c, b.body.vertices);
      const { x, y } = b.body.position;
      c.strokeStyle = '#704024';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x - 6, y - b.def.h / 2 + 8);
      c.lineTo(x + 5, y - 8);
      c.lineTo(x - 4, y + 2);
      c.lineTo(x + 6, y + b.def.h / 2 - 8);
      c.stroke();
      c.strokeStyle = b.damage > 0.4 ? '#fff1b3' : '#f4cb85';
      c.strokeRect(x - b.def.w / 2 + 4, y - b.def.h / 2 + 4, b.def.w - 8, b.def.h - 8);
    }
  for (const g of m.gates)
    drawTimberGate(c, g.def, g.body.position.x, g.body.position.y, g.body.angle);
  for (const sw of m.switches) {
    const g = m.gates.find((g) => g.def.id === sw.def.gateId);
    c.save();
    c.strokeStyle = '#349ed1a0';
    c.lineWidth = 2;
    c.setLineDash([5, 8]);
    if (g) {
      c.beginPath();
      c.moveTo(sw.def.x, sw.def.y);
      c.lineTo(g.def.x, g.def.y - g.def.h / 2);
      c.stroke();
    }
    c.setLineDash([]);
    drawPressurePlate(c, sw.def, sw.active);
    c.restore();
  }
  for (const r of m.rotors) {
    if (r.def.pivot) {
      c.strokeStyle = '#455d65';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(r.def.pivot.x, r.def.pivot.y);
      c.lineTo(r.body.position.x, r.body.position.y);
      c.stroke();
      bolt(c, r.def.pivot.x, r.def.pivot.y, 6);
    }
    c.save();
    c.translate(r.body.position.x, r.body.position.y);
    c.rotate(r.body.angle);
    wood(c, [
      { x: -r.def.w / 2, y: -r.def.h / 2 },
      { x: r.def.w / 2, y: -r.def.h / 2 },
      { x: r.def.w / 2, y: r.def.h / 2 },
      { x: -r.def.w / 2, y: r.def.h / 2 },
    ]);
    c.restore();
    bolt(c, r.body.position.x, r.body.position.y, 7);
  }
}
export function drawMechanicSurfaces(
  c: CanvasRenderingContext2D,
  s: FootballSimulation,
  reduced: boolean,
) {
  for (const i of s.mechanics.defs.ice ?? []) {
    c.save();
    c.translate(i.x, i.y);
    c.rotate(i.angle ?? 0);
    c.strokeStyle = '#398fbb';
    c.lineWidth = 10;
    c.beginPath();
    c.moveTo(0, -6);
    c.lineTo(i.w, -6);
    c.stroke();
    c.strokeStyle = '#b7f1ff';
    c.lineWidth = 7;
    c.stroke();
    c.strokeStyle = '#ffffffdd';
    c.lineWidth = 1.5;
    for (let x = 10; x < i.w - 10; x += 27) {
      c.beginPath();
      c.moveTo(x, -8);
      c.lineTo(x + 9, -4);
      c.stroke();
    }
    c.restore();
  }
  for (const sp of s.mechanics.springs) drawSpringLauncher(c, sp.def, s.time - sp.last, reduced);
}
