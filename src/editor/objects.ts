import type { Level, Point } from '../levels';
import { boxPoints, inPolygon, distanceToEdge } from '../geometry';
import { snapGoal, syncBoundary } from './model';
export type Kind =
  | 'obstacle'
  | 'surface'
  | 'mover'
  | 'spring'
  | 'wind'
  | 'breakable'
  | 'gate'
  | 'switch'
  | 'rotor'
  | 'ice'
  | 'spawn'
  | 'goal'
  | 'boundary'
  | 'region';
export type Ref = { kind: Kind; index: number };
export type Tool =
  | 'block'
  | 'ramp'
  | 'platform'
  | 'wall'
  | 'barrier'
  | 'slope'
  | 'ceiling'
  | 'passage'
  | 'polygon'
  | 'forward'
  | 'backward'
  | 'delete'
  | 'ice'
  | 'spring'
  | 'mover-x'
  | 'mover-y'
  | 'rotor'
  | 'swing'
  | 'switch'
  | 'gate'
  | 'timed-gate'
  | 'breakable'
  | 'wind'
  | 'fan'
  | 'spawn'
  | 'goal'
  | 'region';
export const library: [string, [Tool, string][]][] = [
  [
    'Build',
    [
      ['block', 'Block'],
      ['ramp', 'Triangle ramp'],
      ['platform', 'Platform'],
      ['wall', 'Wall'],
      ['barrier', 'Angled barrier'],
      ['slope', 'Slope'],
      ['ceiling', 'Ceiling block'],
      ['passage', 'Passage kit'],
      ['polygon', 'Draw polygon'],
    ],
  ],
  [
    'Surfaces',
    [
      ['forward', 'Forward boost'],
      ['backward', 'Backward boost'],
      ['delete', 'Red reset'],
      ['ice', 'Slippery ice'],
      ['spring', 'Spring'],
    ],
  ],
  [
    'Motion',
    [
      ['mover-x', 'Moving block ↔'],
      ['mover-y', 'Moving block ↕'],
      ['rotor', 'Rotating paddle'],
      ['swing', 'Swinging timber'],
    ],
  ],
  [
    'Interactions',
    [
      ['switch', 'Switch'],
      ['gate', 'Toggle gate'],
      ['timed-gate', 'Timed gate kit'],
      ['breakable', 'Breakable wood'],
      ['wind', 'Wind zone'],
      ['fan', 'Fan'],
    ],
  ],
  [
    'Level',
    [
      ['spawn', 'Football spawn'],
      ['goal', 'Training goal'],
      ['region', 'Camera region'],
    ],
  ],
];
const arrays: Partial<Record<Kind, string>> = {
  obstacle: 'obstacles',
  surface: 'surfaces',
  mover: 'movers',
  spring: 'springs',
  wind: 'winds',
  breakable: 'breakables',
  gate: 'gates',
  switch: 'switches',
  rotor: 'rotors',
  ice: 'ice',
  region: 'windows',
};
export function list(l: Level, k: Kind): any[] {
  if (['obstacle', 'surface', 'mover'].includes(k)) return (l as any)[arrays[k]!] ?? [];
  if (k === 'region') return l.camera?.windows ?? [];
  return (l.mechanics as any)?.[arrays[k]!] ?? [];
}
function target(l: Level, k: Kind): any[] {
  if (['obstacle', 'surface', 'mover'].includes(k)) return (l as any)[arrays[k]!];
  if (k === 'region') {
    l.camera ??= { mode: 'fixed', viewWidth: 990, viewHeight: 560 };
    return (l.camera.windows ??= []);
  }
  l.mechanics ??= {};
  return ((l.mechanics as any)[arrays[k]!] ??= []);
}
export function object(l: Level, r: Ref): any {
  return r.kind === 'spawn'
    ? l.start
    : r.kind === 'goal'
      ? l.goal
      : r.kind === 'boundary'
        ? { points: l.boundary ?? l.outline }
        : list(l, r.kind)[r.index];
}
export const refKey = (r: Ref) => `${r.kind}:${r.index}`;
export function refs(l: Level): Ref[] {
  return (
    [
      'obstacle',
      'surface',
      'mover',
      'spring',
      'wind',
      'breakable',
      'gate',
      'switch',
      'rotor',
      'ice',
      'region',
    ] as Kind[]
  )
    .flatMap((kind) => list(l, kind).map((_, index) => ({ kind, index })))
    .concat([
      { kind: 'goal', index: 0 },
      { kind: 'spawn', index: 0 },
    ]);
}
export function points(l: Level, r: Ref): Point[] {
  const o = object(l, r);
  if (!o) return [];
  if (r.kind === 'obstacle' || r.kind === 'boundary') return o.points;
  if (r.kind === 'spawn') return boxPoints(o.x, o.y, 32, 32);
  if (r.kind === 'goal')
    return [
      { x: o.x, y: o.y - o.h },
      { x: o.x + o.roof, y: o.y - o.h },
      { x: o.x + o.w, y: o.y },
      { x: o.x, y: o.y },
    ];
  if (r.kind === 'region')
    return boxPoints(
      o.x + l.camera!.viewWidth / 2,
      o.y + l.camera!.viewHeight / 2,
      l.camera!.viewWidth,
      l.camera!.viewHeight,
    );
  if (r.kind === 'switch') return boxPoints(o.x, o.y, 36, 36);
  if (r.kind === 'surface' || r.kind === 'spring')
    return boxPoints(o.x + o.w / 2, o.y - 6, o.w, 12);
  if (r.kind === 'ice') {
    const a = o.angle ?? 0;
    return boxPoints(
      o.x + (Math.cos(a) * o.w) / 2 + Math.sin(a) * 6,
      o.y + (Math.sin(a) * o.w) / 2 - Math.cos(a) * 6,
      o.w,
      12,
      a,
    );
  }
  if (r.kind === 'wind') return boxPoints(o.x + o.w / 2, o.y + o.h / 2, o.w, o.h);
  return boxPoints(
    o.x,
    o.y,
    o.w,
    o.h,
    r.kind === 'rotor' ? (o.phase ?? 0) : r.kind === 'mover' ? (o.angle ?? 0) : 0,
  );
}
export function bounds(l: Level, r: Ref) {
  const p = points(l, r);
  const x = Math.min(...p.map((p) => p.x)),
    y = Math.min(...p.map((p) => p.y));
  return { x, y, w: Math.max(...p.map((p) => p.x)) - x, h: Math.max(...p.map((p) => p.y)) - y };
}
export function center(l: Level, r: Ref) {
  const b = bounds(l, r);
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}
export function translate(l: Level, r: Ref, dx: number, dy: number) {
  const o = object(l, r);
  if (!o) return;
  if (r.kind === 'goal') {
    snapGoal(l, { x: o.x + dx, y: o.y + dy });
    return;
  }
  if (r.kind === 'obstacle' || r.kind === 'boundary') {
    for (const p of o.points) {
      p.x += dx;
      p.y += dy;
    }
    if (r.kind === 'boundary') {
      syncBoundary(l);
      snapGoal(l, { x: l.goal.x + dx, y: l.goal.y + dy });
    }
  } else {
    o.x += dx;
    o.y += dy;
    if (r.kind === 'rotor' && o.pivot) {
      o.pivot.x += dx;
      o.pivot.y += dy;
    }
  }
}
export function resizable(r: Ref) {
  return !['spawn', 'switch', 'boundary', 'region'].includes(r.kind);
}
export function rotatable(r: Ref) {
  return ['obstacle', 'mover', 'rotor', 'ice'].includes(r.kind);
}
export function rotation(l: Level, r: Ref) {
  const o = object(l, r);
  return r.kind === 'rotor'
    ? (o.phase ?? 0)
    : r.kind === 'obstacle'
      ? (o.rotation ?? 0)
      : (o.angle ?? 0);
}
export function rotate(l: Level, r: Ref, angle: number) {
  const o = object(l, r);
  if (!rotatable(r)) return;
  if (r.kind === 'obstacle') {
    const c = center(l, r),
      d = angle - (o.rotation ?? 0);
    o.points = o.points.map((p: Point) => ({
      x: c.x + (p.x - c.x) * Math.cos(d) - (p.y - c.y) * Math.sin(d),
      y: c.y + (p.x - c.x) * Math.sin(d) + (p.y - c.y) * Math.cos(d),
    }));
    o.rotation = angle;
  } else if (r.kind === 'rotor') o.phase = angle;
  else o.angle = angle;
}
export function resize(l: Level, r: Ref, w: number, h: number) {
  const o = object(l, r);
  w = Math.max(8, w);
  h = Math.max(8, h);
  if (r.kind === 'obstacle') {
    const b = bounds(l, r),
      c = center(l, r);
    o.points = o.points.map((p: Point) => ({
      x: c.x + ((p.x - c.x) * w) / b.w,
      y: c.y + ((p.y - c.y) * h) / b.h,
    }));
  } else if (r.kind === 'goal') {
    const ratio = o.roof / o.w;
    o.w = w;
    o.roof = w * ratio;
    o.h = Math.max(70, h);
    snapGoal(l, { x: o.x, y: o.y });
  } else if (resizable(r)) {
    o.w = w;
    if (['mover', 'rotor', 'wind', 'breakable', 'gate'].includes(r.kind)) o.h = h;
  }
}
export function hit(l: Level, p: Point): Ref | null {
  const all = refs(l)
    .filter((r) => r.kind !== 'region')
    .reverse();
  for (const r of all) {
    const poly = points(l, r);
    if (
      inPolygon(p, poly) ||
      poly.some((a, i) => distanceToEdge(p, a, poly[(i + 1) % poly.length]) < 8)
    )
      return r;
  }
  return null;
}
export function remove(l: Level, rs: Ref[]) {
  for (const k of new Set(rs.map((r) => r.kind))) {
    if (['spawn', 'goal', 'boundary'].includes(k)) continue;
    for (const r of rs.filter((r) => r.kind === k).sort((a, b) => b.index - a.index))
      list(l, k).splice(r.index, 1);
  }
}
export function duplicate(l: Level, rs: Ref[]): Ref[] {
  const copies = rs
    .filter((r) => !['spawn', 'goal', 'boundary'].includes(r.kind))
    .map((r) => ({ r, value: structuredClone(object(l, r)) }));
  const gateIds = new Map<string, string>(),
    reserved = new Set(refs(l).map((r) => object(l, r)?.id));
  for (const c of copies)
    if (c.r.kind === 'gate') {
      const base = String(c.value.id) + '-copy';
      let id = base,
        n = 2;
      while (reserved.has(id)) id = base + '-' + n++;
      reserved.add(id);
      gateIds.set(c.value.id, id);
      c.value.id = id;
    }
  return copies.map(({ r, value }) => {
    if (r.kind === 'switch') {
      value.id = unique(l, 'switch');
      value.gateId = gateIds.get(value.gateId) ?? value.gateId;
    }
    if (r.kind === 'obstacle' || r.kind === 'breakable') value.id = unique(l, r.kind);
    const a = target(l, r.kind);
    a.push(value);
    const ref = { kind: r.kind, index: a.length - 1 };
    translate(l, ref, 20, 20);
    return ref;
  });
}
function unique(l: Level, k: Kind) {
  const ids = new Set(refs(l).map((r) => object(l, r)?.id));
  let i = 1;
  while (ids.has(`${k}-${i}`)) i++;
  return `${k}-${i}`;
}
export function add(l: Level, t: Tool, p: Point): Ref[] {
  const mk = (kind: Kind, o: any) => {
    const a = target(l, kind);
    a.push(o);
    return { kind, index: a.length - 1 };
  };
  const polygon = (pts: Point[]) => mk('obstacle', { id: unique(l, 'obstacle'), points: pts });
  if (t === 'spawn') {
    l.start = { ...p };
    return [{ kind: 'spawn', index: 0 }];
  }
  if (t === 'goal') {
    snapGoal(l, p);
    return [{ kind: 'goal', index: 0 }];
  }
  if (t === 'polygon') return [];
  if (['block', 'platform', 'wall', 'barrier', 'ceiling'].includes(t)) {
    const w =
        t === 'platform'
          ? 220
          : t === 'wall'
            ? 32
            : t === 'barrier'
              ? 200
              : t === 'ceiling'
                ? 160
                : 130,
      h = t === 'platform' ? 28 : t === 'wall' ? 180 : t === 'barrier' ? 24 : 100;
    return [polygon(boxPoints(p.x, p.y, w, h, t === 'barrier' ? -0.4 : 0))];
  }
  if (t === 'passage')
    return [
      polygon(boxPoints(p.x, p.y - 110, 45, 100)),
      polygon(boxPoints(p.x, p.y + 110, 45, 100)),
    ];
  if (t === 'ramp' || t === 'slope')
    return [
      polygon([
        { x: p.x - 90, y: p.y + 50 },
        { x: p.x + 90, y: p.y - 50 },
        { x: p.x + 90, y: p.y + 50 },
      ]),
    ];
  if (['forward', 'backward', 'delete'].includes(t))
    return [mk('surface', { x: p.x - 70, y: p.y, w: 140, kind: t })];
  if (t === 'ice') return [mk('ice', { x: p.x - 80, y: p.y, w: 160, friction: 0.00015, angle: 0 })];
  if (t === 'spring')
    return [mk('spring', { x: p.x - 45, y: p.y, w: 90, angle: 70, strength: 17 })];
  if (t === 'mover-x' || t === 'mover-y')
    return [
      mk('mover', {
        x: p.x,
        y: p.y,
        w: 70,
        h: 100,
        travel: 100,
        period: 6,
        axis: t === 'mover-x' ? 'x' : 'y',
        angle: 0,
      }),
    ];
  if (t === 'rotor' || t === 'swing')
    return [
      mk('rotor', {
        x: p.x,
        y: p.y,
        w: t === 'swing' ? 28 : 200,
        h: t === 'swing' ? 160 : 24,
        speed: 0.35,
        phase: 0,
        ...(t === 'swing' ? { pivot: { x: p.x, y: p.y - 80 }, amplitude: 0.65, period: 5 } : {}),
      }),
    ];
  if (t === 'wind' || t === 'fan')
    return [mk('wind', { x: p.x - 100, y: p.y - 100, w: 200, h: 200, angle: 70, strength: 1.3 })];
  if (t === 'breakable')
    return [
      mk('breakable', { id: unique(l, 'breakable'), x: p.x, y: p.y, w: 48, h: 120, threshold: 5 }),
    ];
  if (t === 'gate' || t === 'timed-gate') {
    const id = unique(l, 'gate'),
      ref = mk('gate', { id, x: p.x, y: p.y, w: 48, h: 140, offset: { x: 0, y: -160 } });
    if (t === 'timed-gate')
      return [
        ref,
        mk('switch', {
          id: unique(l, 'switch'),
          x: p.x - 150,
          y: p.y + 40,
          gateId: id,
          mode: 'timed',
          duration: 8,
        }),
      ];
    return [ref];
  }
  if (t === 'switch')
    return [
      mk('switch', {
        id: unique(l, 'switch'),
        x: p.x,
        y: p.y,
        gateId: l.mechanics?.gates?.[0]?.id ?? '',
        mode: 'toggle',
        duration: 8,
      }),
    ];
  return [
    mk('region', { label: `View ${list(l, 'region').length + 1}`, x: p.x - 495, y: p.y - 280 }),
  ];
}
