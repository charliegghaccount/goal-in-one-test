import type { Level, Point } from '../levels';
import { arenaPolygon, segments } from '../levels';
import {
  polygonError,
  isConvex,
  inPolygon,
  distanceToEdge,
  boxPoints,
  cleanLoop,
} from '../geometry';
export type Issue = { severity: 'error' | 'warning'; message: string };
export function validateLevel(l: Level): Issue[] {
  const issues: Issue[] = [],
    error = (message: string) => issues.push({ severity: 'error', message }),
    warn = (message: string) => issues.push({ severity: 'warning', message });
  const finite = (...v: unknown[]) => v.every((n) => typeof n === 'number' && Number.isFinite(n));
  const b = l.boundary ?? l.outline;
  if (!Array.isArray(b) || b.length < 3) {
    error('Arena: a closed perimeter needs at least three vertices.');
    return issues;
  }
  const e = polygonError(b);
  if (e) error('Arena ' + e + '.');
  if (!l.start || !finite(l.start.x, l.start.y))
    error('Place a football spawn with numeric coordinates.');
  if (!l.goal || !finite(l.goal.x, l.goal.y, l.goal.w, l.goal.h, l.goal.roof)) {
    error('Place a valid training goal.');
    return issues;
  }
  const g = l.goal;
  if ((g.direction ?? 1) !== 1)
    error('Only right-hand goal entrances are supported in the editor.');
  if (g.h < 70 || g.w < 60 || g.roof < 20 || g.roof > g.w)
    error('Goal: height ≥70, depth ≥60 and a roof between 20 and its depth are required.');
  if (
    l.boundary &&
    !b.some((a, i) => {
      const z = b[(i + 1) % b.length];
      return (
        Math.abs(a.x - g.x) < 0.01 &&
        Math.abs(z.x - g.x) < 0.01 &&
        Math.min(a.y, z.y) <= g.y - g.h + 0.01 &&
        Math.max(a.y, z.y) >= g.y - 0.01 &&
        inPolygon({ x: g.x - 1, y: g.y - g.h / 2 }, b) &&
        !inPolygon({ x: g.x + 1, y: g.y - g.h / 2 }, b)
      );
    })
  )
    error(
      'Goal needs a vertical external boundary segment covering its full opening. Drag the goal onto the right wall.',
    );
  if (!e && l.boundary && polygonError(cleanLoop(arenaPolygon(l))))
    error('The net overlaps another arena boundary. Choose a clear right-facing wall.');
  if (!e && l.start && finite(l.start.x, l.start.y)) {
    if (!inPolygon(l.start, arenaPolygon(l)))
      error('Football spawn is outside the enclosed arena.');
    else if (segments(l).some((s) => distanceToEdge(l.start, s.a, s.b) < 20))
      error('Football spawn overlaps a timber boundary; leave at least 21 units of clearance.');
  }
  if (!Number.isInteger(l.id) || l.id < 1) error('Level number must be a positive integer.');
  if (
    !Number.isInteger(l.par) ||
    l.par < 1 ||
    !Array.isArray(l.starShots) ||
    l.starShots.length !== 2 ||
    l.starShots.some((n) => !Number.isInteger(n) || n < 1) ||
    l.starShots[1] < l.starShots[0]
  )
    error(
      'Par and star thresholds must be positive integers, with two-star budget ≥ three-star budget.',
    );
  const solid: { name: string; points: Point[] }[] = [];
  for (const [i, o] of l.obstacles.entries()) {
    const err = polygonError(o.points);
    if (err) {
      error(`Obstacle ${i + 1} ${err}.`);
      continue;
    }
    if (!isConvex(o.points))
      warn(`Obstacle ${i + 1} is concave: the runtime will use exact triangle decomposition.`);
    solid.push({ name: o.id || `obstacle ${i + 1}`, points: o.points });
  }
  const rects: [string, any[], string[]][] = [
    ['Moving block', l.movers, ['x', 'y', 'w', 'h', 'travel', 'period']],
    ['Wind', l.mechanics?.winds ?? [], ['x', 'y', 'w', 'h', 'angle', 'strength']],
    ['Gate', l.mechanics?.gates ?? [], ['x', 'y', 'w', 'h']],
    ['Breakable', l.mechanics?.breakables ?? [], ['x', 'y', 'w', 'h', 'threshold']],
    ['Rotor', l.mechanics?.rotors ?? [], ['x', 'y', 'w', 'h', 'speed']],
  ];
  for (const [name, all, keys] of rects)
    for (const [oIndex, o] of all.entries()) {
      if (!keys.every((k) => finite(o[k]))) {
        error(`${name} ${oIndex + 1} has missing or non-numeric properties.`);
        continue;
      }
      if (o.w < 8 || o.h < 8) error(`${name} ${oIndex + 1} must be at least 8 units wide/high.`);
      if (
        name === 'Moving block' &&
        (o.travel < 0 || o.period < 0.5 || !['x', 'y', undefined].includes(o.axis))
      )
        error('Moving block: use axis x/y, nonnegative travel and period ≥0.5 seconds.');
      if (name === 'Wind' && (o.strength <= 0 || o.strength > 5))
        error('Wind strength must be in (0, 5].');
      if (name === 'Breakable' && (o.threshold <= 0 || o.threshold > 40))
        error('Breakable threshold must be in (0, 40].');
      if (name === 'Gate' && (!o.id || !o.offset || !finite(o.offset.x, o.offset.y)))
        error('Gate needs a unique ID and numeric opening offset.');
      if (
        name === 'Rotor' &&
        (Math.abs(o.speed) > 1 ||
          (o.amplitude !== undefined &&
            (!finite(o.amplitude, o.period) ||
              o.period < 1 ||
              o.amplitude < 0 ||
              o.amplitude > Math.PI)))
      )
        error('Rotor: speed ≤1 rad/s; swing needs a nonnegative range ≤π and period ≥1 second.');
      if (
        name === 'Rotor' &&
        ((o.phase !== undefined && !finite(o.phase)) || (o.pivot && !finite(o.pivot.x, o.pivot.y)))
      )
        error('Rotor angle and pivot coordinates must be numeric.');
      if (name === 'Moving block' && o.angle !== undefined && !finite(o.angle))
        error('Moving block rotation must be numeric.');
      if (name === 'Gate' || name === 'Breakable')
        solid.push({ name: o.id || name, points: boxPoints(o.x, o.y, o.w, o.h) });
    }
  const gates = l.mechanics?.gates ?? [],
    gateIds = new Set(gates.map((g) => g.id));
  if (gateIds.size !== gates.length || gates.some((g) => typeof g.id !== 'string' || !g.id.trim()))
    error('Gate IDs must be unique nonempty strings.');
  const switches = l.mechanics?.switches ?? [];
  if (new Set(switches.map((s) => s.id)).size !== switches.length)
    error('Switch IDs must be unique.');
  for (const s of switches) {
    if (!s.id || !finite(s.x, s.y) || !gateIds.has(s.gateId))
      error(`Switch ${s.id || '(unnamed)'} needs coordinates and a link to an existing gate.`);
    if (
      !['toggle', 'timed'].includes(s.mode) ||
      (s.mode === 'timed' && (!finite(s.duration) || s.duration! < 0.5))
    )
      error('Switch needs toggle/timed mode and a timer ≥0.5 seconds when timed.');
  }
  for (const g of gates)
    if (!switches.some((s) => s.gateId === g.id))
      warn(`Gate ${g.id} has no switch. It will remain closed.`);
  for (const s of l.surfaces) {
    if (!finite(s.x, s.y, s.w) || s.w < 8 || !['forward', 'backward', 'delete'].includes(s.kind))
      error('Surface needs numeric coordinates, length ≥8 and a supported type.');
    if (
      s.acceleration !== undefined &&
      (!finite(s.acceleration) || s.acceleration <= 0 || s.acceleration > 2)
    )
      error('Boost acceleration must be in (0, 2].');
  }
  for (const s of l.mechanics?.springs ?? [])
    if (
      !finite(s.x, s.y, s.w, s.angle, s.strength) ||
      s.w < 8 ||
      s.strength <= 0 ||
      s.strength > 24
    )
      error('Spring needs length ≥8, numeric direction and strength in (0,24].');
  for (const s of l.mechanics?.ice ?? [])
    if (
      !finite(s.x, s.y, s.w, s.friction, s.angle ?? 0) ||
      s.w < 8 ||
      s.friction < 0 ||
      s.friction > 0.04
    )
      error('Ice needs length ≥8, a numeric angle and friction in [0, 0.04].');
  if (
    l.camera &&
    (!['fixed', 'follow-x', 'follow-xy'].includes(l.camera.mode) ||
      !finite(l.camera.viewWidth, l.camera.viewHeight) ||
      l.camera.viewWidth < 100 ||
      l.camera.viewHeight < 100)
  )
    error('Camera needs a supported mode and viewport dimensions ≥100.');
  for (const o of solid) {
    if (
      l.start &&
      finite(l.start.x, l.start.y) &&
      (inPolygon(l.start, o.points) ||
        o.points.some(
          (a, i) => distanceToEdge(l.start, a, o.points[(i + 1) % o.points.length]) < 16,
        ))
    )
      error(`Football spawn overlaps ${o.name}.`);
    if (
      Array.from({ length: 5 }, (_, i) => ({
        x: g.x + 17,
        y: g.y - g.h + 22 + ((g.h - 44) * i) / 4,
      })).some(
        (p) =>
          inPolygon(p, o.points) ||
          o.points.some((a, i) => distanceToEdge(p, a, o.points[(i + 1) % o.points.length]) < 16),
      )
    ) {
      const openableGate = gates.some(
        (g) =>
          g.id === o.name &&
          switches.some((s) => s.gateId === g.id) &&
          Math.hypot(g.offset.x, g.offset.y) > 32,
      );
      const breakable = l.mechanics?.breakables?.some((b) => b.id === o.name);
      if (openableGate || breakable)
        warn(`Goal starts blocked by ${o.name}; test the opening/break route.`);
      else error(`Goal entrance is blocked by ${o.name}.`);
    }
    if (
      !e &&
      o.points.some(
        (p) =>
          !inPolygon(p, arenaPolygon(l)) &&
          b.every((a, i) => distanceToEdge(p, a, b[(i + 1) % b.length]) > 12),
      )
    )
      warn(`${o.name} extends outside the arena; inspect collisions in test mode.`);
  }
  if (!issues.some((i) => i.severity === 'error'))
    warn('Basic validation cannot prove that this level is completable. Test real kick routes.');
  return issues;
}
