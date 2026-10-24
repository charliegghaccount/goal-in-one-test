import blueprint from './blueprints.json';
export type Point = { x: number; y: number };
export type Polygon = { id: string; points: Point[] };
export type Surface = { x: number; y: number; w: number; kind: 'forward' | 'backward' | 'delete' };
export type Mover = {
  x: number;
  y: number;
  w: number;
  h: number;
  travel: number;
  period: number;
  axis?: 'x' | 'y';
};
export type Goal = { x: number; y: number; w: number; h: number; roof: number; direction?: 1 | -1 };
export type Level = {
  id: number;
  name: string;
  tip: string;
  par: number;
  starShots: [number, number];
  width: number;
  start: Point;
  goal: Goal;
  outline: Point[];
  obstacles: Polygon[];
  surfaces: Surface[];
  movers: Mover[];
};

export const WALL_WIDTH = 10.4;
export const FLOOR = 692;
const point = (x: number, y: number): Point => ({ x: 40 + x * 12, y: 740 - y * 12 });
export const levels: Level[] = blueprint.levels.map((d) => {
  const dir = d.goal[2] === 'left' ? -1 : 1;
  const gx = Number(d.goal[0]),
    gy = Number(d.goal[1]) - (d.id === 10 ? 1 : 0);
  return {
    id: d.id,
    name: d.name,
    tip: d.intended,
    par: d.par,
    starShots: [d.par, d.par + 2],
    width: 1280,
    start: point(d.start[0], d.start[1]),
    goal: { ...point(gx - dir * 4, gy), w: dir * 96, h: 96, roof: dir * 96, direction: dir },
    outline: [
      [2, 4],
      [2, 54],
      [98, 54],
      [98, 4],
    ].map(([x, y]) => point(x, y)),
    obstacles: d.solids.map((r, i) => ({
      id: `solid-${i}`,
      points: [
        [r.x, r.y],
        [r.x, r.y + (d.id === 2 ? 10 : r.h)],
        [r.x + r.w, r.y + (d.id === 2 ? 10 : r.h)],
        [r.x + r.w, r.y],
      ].map(([x, y]) => point(x, y)),
    })),
    surfaces: [
      ...d.pads.map((p) => ({ ...point(p.x, p.y), w: p.w * 12, kind: p.kind as Surface['kind'] })),
      ...d.hazards.map((p) => ({
        ...point(p.x + (d.id === 9 ? 3 : 0), p.y),
        w: (p.w - (d.id === 9 ? 6 : 0)) * 12,
        kind: 'delete' as const,
      })),
    ],
    movers: d.movers.map((m) => {
      const axis = m.axis as 'x' | 'y';
      const end = d.id === 7 ? 12 : m.range_end;
      const center = (m.range_start + end) / 2;
      return {
        ...point(
          axis === 'x' ? center + m.w / 2 : m.x + m.w / 2,
          axis === 'y' ? center + m.h / 2 : m.y + m.h / 2,
        ),
        w: m.w * 12,
        h: m.h * 12,
        travel: (end - m.range_start) * 6,
        period: m.period_seconds,
        axis,
      };
    }),
  };
});
export type Segment = { id: string; a: Point; b: Point; kind: 'wall' | 'goal' };
export function segments(l: Level): Segment[] {
  const g = l.goal;
  const lines: Segment[] = l.outline.map((a, i) => ({
    id: `wall-${i}`,
    a,
    b: l.outline[(i + 1) % l.outline.length],
    kind: 'wall',
  }));
  lines.push(
    {
      id: 'goal-roof',
      a: { x: g.x, y: g.y - g.h },
      b: { x: g.x + g.roof, y: g.y - g.h },
      kind: 'goal',
    },
    {
      id: 'goal-back',
      a: { x: g.x + g.roof, y: g.y - g.h },
      b: { x: g.x + g.w, y: g.y },
      kind: 'goal',
    },
    { id: 'goal-floor', a: { x: g.x, y: g.y }, b: { x: g.x + g.w, y: g.y }, kind: 'goal' },
  );
  return lines;
}
export function arenaPolygon(l: Level): Point[] {
  return l.outline;
}
