import type { FootballSimulation } from './simulation';
import { wood, bolt } from './art';
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
    const x = w.x + 16,
      y = w.y + w.h - 18;
    c.save();
    c.translate(x, y);
    c.fillStyle = '#2d738c';
    c.beginPath();
    c.arc(0, 0, 15, 0, Math.PI * 2);
    c.fill();
    c.rotate(t * 4);
    for (let i = 0; i < 3; i++) {
      c.rotate((Math.PI * 2) / 3);
      c.fillStyle = '#c9f8ff';
      c.beginPath();
      c.ellipse(0, -7, 4, 7, 0.4, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
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
  for (const g of m.gates) {
    wood(c, g.body.vertices);
    const { x, y } = g.body.position;
    c.strokeStyle = '#3298d1';
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(x - g.def.w / 2 + 6, y - g.def.h / 2 + 12);
    c.lineTo(x + g.def.w / 2 - 6, y + g.def.h / 2 - 12);
    c.moveTo(x + g.def.w / 2 - 6, y - g.def.h / 2 + 12);
    c.lineTo(x - g.def.w / 2 + 6, y + g.def.h / 2 - 12);
    c.stroke();
    bolt(c, x, y, 5);
  }
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
    c.fillStyle = g?.target ? '#7af14b' : '#42bdf5';
    c.strokeStyle = '#176083';
    c.lineWidth = 4;
    c.beginPath();
    if (sw.def.w !== undefined || sw.def.h !== undefined)
      c.roundRect(
        sw.def.x - (sw.def.w ?? 36) / 2,
        sw.def.y - (sw.def.h ?? 36) / 2,
        sw.def.w ?? 36,
        sw.def.h ?? 36,
        4,
      );
    else c.arc(sw.def.x, sw.def.y, 16, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = 'white';
    const glyphSize = Math.max(6, Math.min(18, Math.min(sw.def.w ?? 36, sw.def.h ?? 36) * 0.65));
    c.font = `bold ${glyphSize}px sans-serif`;
    c.textAlign = 'center';
    c.fillText(sw.def.mode === 'timed' ? '◷' : '↥', sw.def.x, sw.def.y + glyphSize * 0.32);
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
  for (const sp of s.mechanics.springs) {
    const p = sp.def;
    const squash = !reduced ? Math.max(0, 1 - (s.time - sp.last) / 0.3) : 0;
    c.save();
    c.translate(p.x + p.w / 2, p.y - 8);
    c.strokeStyle = '#6c3e9b';
    c.lineWidth = 11;
    c.beginPath();
    c.moveTo(-p.w / 2, 0);
    c.lineTo(p.w / 2, 0);
    c.stroke();
    c.strokeStyle = '#dba0ff';
    c.lineWidth = 7;
    c.stroke();
    c.strokeStyle = '#fff1fc';
    c.lineWidth = 2;
    c.beginPath();
    for (let x = -p.w / 2 + 10; x < p.w / 2 - 5; x += 10)
      c.lineTo(x, -3 - (x % 20 ? 3 : 0) * (1 - squash));
    c.stroke();
    const a = (p.angle * Math.PI) / 180,
      dx = Math.cos(a),
      dy = -Math.sin(a);
    c.strokeStyle = '#62368e';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(-dx * 7, dy * -7 - 12);
    c.lineTo(dx * 18, dy * 18 - 12);
    c.lineTo(dx * 18 - dx * 8 + dy * 6, dy * 18 - dy * 8 - dx * 6 - 12);
    c.moveTo(dx * 18, dy * 18 - 12);
    c.lineTo(dx * 18 - dx * 8 - dy * 6, dy * 18 - dy * 8 + dx * 6 - 12);
    c.stroke();
    c.restore();
  }
}
