import { arenaPolygon, segments, WALL_WIDTH, type Level, type Point } from './levels';
import { movementLine, moverPosition, rotorPose } from './motion';
import { boxPoints } from './geometry';
/** Schematic thumbnails share native geometry and mechanic markers across game and studio. */
export function levelThumbnail(l: Level, cls = 'mini-course') {
  const p = arenaPolygon(l),
    x = Math.min(...p.map((p) => p.x)) - 30,
    y = Math.min(...p.map((p) => p.y)) - 30,
    w = Math.max(...p.map((p) => p.x)) - x + 30,
    h = Math.max(...p.map((p) => p.y)) - y + 30;
  const path = (p: Point[]) => p.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ') + 'Z';
  const rect = (o: { x: number; y: number; w: number; h: number }, fill: string) =>
    `<rect x="${o.x - o.w / 2}" y="${o.y - o.h / 2}" width="${o.w}" height="${o.h}" fill="${fill}"/>`;
  return `<svg viewBox="${x} ${y} ${w} ${h}" aria-hidden="true" class="${cls}"><path d="${path(p)}" fill="#d7f0e555"/>${l.obstacles.map((o) => `<path d="${path(o.points)}" fill="#bc8244"/>`).join('')}${segments(
    l,
  )
    .map(
      (s) =>
        `<path d="M${s.a.x} ${s.a.y}L${s.b.x} ${s.b.y}" stroke="${s.kind === 'goal' ? '#48bc35' : '#82502b'}" stroke-width="${WALL_WIDTH}" stroke-linecap="round"/>`,
    )
    .join(
      '',
    )}${l.surfaces.map((s) => `<path d="M${s.x} ${s.y - 6}h${s.w}" stroke="${s.kind === 'forward' ? '#72c636' : s.kind === 'backward' ? '#f5a126' : '#ed4b52'}" stroke-width="10"/>`).join('')}${l.movers
    .map((m) => {
      const line = movementLine(m),
        pos = moverPosition(m, 0);
      return `<path d="M${line.start.x} ${line.start.y}L${line.end.x} ${line.end.y}" stroke="#9660c3" stroke-width="4" stroke-dasharray="8 6"/><path d="${path(boxPoints(pos.x, pos.y, m.w, m.h, m.angle ?? 0))}" fill="#98663d"/>`;
    })
    .join(
      '',
    )}${(l.mechanics?.gates ?? []).map((g) => rect(g, '#319bb8')).join('')}${(l.mechanics?.breakables ?? []).map((b) => rect(b, '#d3a35c')).join('')}${(l.mechanics?.springs ?? []).map((s) => `<path d="M${s.x} ${s.y - 7}h${s.w}" stroke="#b3519d" stroke-width="10"/>`).join('')}${(l.mechanics?.winds ?? []).map((z) => `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" fill="#74cced66"/>`).join('')}${(l.mechanics?.ice ?? []).map((s) => `<path d="M${s.x} ${s.y - 6}l${Math.cos(s.angle ?? 0) * s.w} ${Math.sin(s.angle ?? 0) * s.w}" stroke="#40c8ec" stroke-width="8"/>`).join('')}${(
    l.mechanics?.rotors ?? []
  )
    .map((r) => {
      const pose = rotorPose(r, 0);
      return `<path d="${path(boxPoints(pose.position.x, pose.position.y, r.w, r.h, pose.angle))}" fill="#bd8140"/>`;
    })
    .join(
      '',
    )}${(l.mechanics?.switches ?? []).map((s) => `<circle cx="${s.x}" cy="${s.y}" r="${Math.max(8, (s.w ?? 36) / 2)}" fill="#3eb3f2"/>`).join('')}<circle cx="${l.start.x}" cy="${l.start.y}" r="16" fill="#fff" stroke="#17394f" stroke-width="3"/><path d="m${l.start.x} ${l.start.y - 7} 7 5-3 8h-8l-3-8z" fill="#17394f"/></svg>`;
}
