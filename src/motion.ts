import type { Mover, Point } from './levels';
import type { Rotor, Gate } from './mechanics';
/** Shared authoring preview / runtime trajectories. Period is a complete out-and-back cycle. */
export function movementLine(m: Mover): { start: Point; end: Point } {
  return (
    m.path ?? {
      start: { x: m.x - (m.axis === 'x' ? m.travel : 0), y: m.y - (m.axis === 'x' ? 0 : m.travel) },
      end: { x: m.x + (m.axis === 'x' ? m.travel : 0), y: m.y + (m.axis === 'x' ? 0 : m.travel) },
    }
  );
}
export function moverPosition(m: Mover, time: number): Point {
  if (!m.path) {
    const v = Math.cos((time * Math.PI * 2) / m.period) * m.travel;
    return { x: m.x + (m.axis === 'x' ? v : 0), y: m.y + (m.axis === 'x' ? 0 : v) };
  }
  const t = time / m.period + (m.phase ?? 0),
    u =
      m.loop === 'once'
        ? (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, t * 2)))) / 2
        : (1 - Math.cos(t * 2 * Math.PI)) / 2;
  return {
    x: m.path.start.x + (m.path.end.x - m.path.start.x) * u,
    y: m.path.start.y + (m.path.end.y - m.path.start.y) * u,
  };
}
export function rotorPose(r: Rotor, time: number) {
  const angle =
    r.amplitude !== undefined
      ? Math.sin((time * 2 * Math.PI) / (r.period ?? 5)) * r.amplitude + (r.phase ?? 0)
      : (r.phase ?? 0) + time * r.speed;
  return {
    angle,
    position: r.pivot
      ? { x: r.pivot.x - (Math.sin(angle) * r.h) / 2, y: r.pivot.y + (Math.cos(angle) * r.h) / 2 }
      : { x: r.x, y: r.y },
  };
}
export function gateDuration(g: Gate, opening: boolean) {
  return Math.max(0.05, opening ? (g.openDuration ?? 0.7) : (g.closeDuration ?? 0.7));
}
export function gatePosition(g: Gate, progress: number) {
  return { x: g.x + g.offset.x * progress, y: g.y + g.offset.y * progress };
}
/** A full preview cycle, with a brief hold at each end. Runtime uses the same duration and offset. */
export function gatePreview(g: Gate, time: number) {
  const a = gateDuration(g, true),
    b = gateDuration(g, false),
    t = time % (a + b + 1);
  const u = t < a ? t / a : t < a + 0.5 ? 1 : t < a + 0.5 + b ? 1 - (t - a - 0.5) / b : 0;
  return gatePosition(g, u);
}
