export type Point = { x: number; y: number };
export type Polygon = { id: string; points: Point[] };
export type Surface = { x: number; y: number; w: number; kind: 'forward' | 'backward' | 'delete' };
export type Mover = { x: number; y: number; w: number; h: number; travel: number; period: number };
export type Goal = { x: number; y: number; w: number; h: number; roof: number };
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
// Uniform mapping from the PDF's 842 × 595 vector pages. All ten layouts
// share this transform: no per-level stretching or invented obstacle positions.
export const PDF_SCALE = 1.6;
export function fromPDF(x: number, y: number): Point {
  return { x: 52 + (x - 50) * PDF_SCALE, y: 92 + (y - 84) * PDF_SCALE };
}
const path = (points: number[][]) => points.map(([x, y]) => fromPDF(x, y));
export const WALL_WIDTH = 10.4;
export const FLOOR = fromPDF(0, 419.0852).y;
const LEFT = 53.4429,
  RIGHT = 700.2021;
const goal: Goal = {
  x: fromPDF(699.386, 0).x,
  y: FLOOR,
  w: (784.065 - 699.386) * PDF_SCALE,
  h: (419.0852 - 351.8) * PDF_SCALE,
  roof: (749.097 - 699.386) * PDF_SCALE,
};
const normal = [
  [LEFT, 419.0852],
  [LEFT, 282.2],
  [120, 215.3793],
  [632, 215.3793],
  [RIGHT, 283.2],
  [RIGHT, 351.8],
];
const peaked = [
  [LEFT, 419.0852],
  [LEFT, 282.2],
  [120, 215.3793],
  [419.63, 84.61],
  [RIGHT, 351.8],
];
const poly = (id: string, p: number[][]): Polygon => ({ id, points: path(p) });
const names = [
  'First touch',
  'Up the ramp',
  'Over the edge',
  'Under one roof',
  'Full speed ahead',
  'Against the flow',
  'Double trouble',
  'Thread the gap',
  'Moving target',
  'The red line',
];
const tips = [
  'Bank shots off any black border. Drag and kick again even while the ball is moving.',
  'A solid rising triangle sits below the peaked roof. Use its slope or clear its tall end.',
  'The triangle faces the other way: clear its vertical face, then follow the downhill slope.',
  'The supported platform has a flat top and a descending slope. The roof steps down too.',
  'The green floor surface throws the ball to the right. Its arrows show the impulse direction.',
  'The orange surface throws the ball left. Kick in the air to clear it or use the rebound.',
  'Two triangles face each other beneath a low roof. Keep control through the middle.',
  'Pass between the hanging roof triangle and the floor triangle. You can correct mid-flight.',
  'The block slowly travels from floor to ceiling. Pick your moment or adjust a moving ball.',
  'Touching the red strip returns the ball to its start. Every kick already taken still counts.',
];
const outlines = [
  normal,
  peaked,
  peaked,
  [
    [LEFT, 419.0852],
    [LEFT, 282.2],
    [120, 215.3793],
    [306, 215.3793],
    [372, 283.1988],
    [RIGHT, 283.1988],
    [RIGHT, 351.8],
  ],
  normal,
  normal,
  [
    [LEFT, 419.0852],
    [LEFT, 284.1507],
    [636.7348, 284.1507],
    [RIGHT, 351.8],
  ],
  [
    [LEFT, 419.0852],
    [LEFT, 282.2],
    [120, 215.3793],
    [269.3307, 149.7696],
    [532.7077, 149.7696],
    [RIGHT, 351.8],
  ],
  [
    [LEFT, 419.0852],
    [LEFT, 199.2077],
    [RIGHT, 199.2077],
    [RIGHT, 351.8],
  ],
  normal,
];
const obstacles: Polygon[][] = [
  [],
  [
    poly('rising-triangle', [
      [168.3936, 419.0852],
      [370.2677, 315.8352],
      [370.2677, 419.0852],
    ]),
  ],
  [
    poly('falling-triangle', [
      [168.3936, 315.8352],
      [168.3936, 419.0852],
      [370.2677, 419.0852],
    ]),
  ],
  [
    poly('supported-platform', [
      [135.3359, 419.0852],
      [135.3359, 354.0981],
      [305.4561, 354.0981],
      [365, 419.0852],
    ]),
  ],
  [],
  [],
  [
    poly('left-triangle', [
      [194.0522, 419.0852],
      [344.6092, 376.2365],
      [344.6092, 419.0852],
    ]),
    poly('right-triangle', [
      [407.7487, 376.2365],
      [407.7487, 419.0852],
      [558.3057, 419.0852],
    ]),
  ],
  [
    poly('hanging-triangle', [
      [269.3307, 149.7696],
      [532.7077, 149.7696],
      [401.0192, 250.116],
    ]),
    poly('floor-triangle', [
      [269.3307, 419.0852],
      [401.0192, 315.5011],
      [532.7077, 419.0852],
    ]),
  ],
  [],
  [],
];
const surface = (x: number, end: number, kind: Surface['kind']): Surface => ({
  x: fromPDF(x, 0).x,
  y: FLOOR,
  w: (end - x) * PDF_SCALE,
  kind,
});
export const levels: Level[] = outlines.map((outline, i) => ({
  id: i + 1,
  name: names[i],
  tip: tips[i],
  par: i === 5 ? 2 : 1,
  starShots: i === 5 ? [2, 4] : [1, 3],
  width: 1280,
  start: { x: fromPDF(i === 8 ? 142.5 : 87.5, 0).x, y: FLOOR - 22 },
  goal: { ...goal },
  outline: path(outline),
  obstacles: obstacles[i],
  surfaces:
    i === 4
      ? [surface(354.8897, 627.1455, 'forward')]
      : i === 5
        ? [surface(376.92, 627.1455, 'backward')]
        : i === 9
          ? [surface(311.8696, 441.9704, 'delete')]
          : [],
  movers:
    i === 8
      ? [
          {
            x: fromPDF((277.6667 + 307.3736) / 2, 0).x,
            y: (fromPDF(0, 199.2077).y + FLOOR) / 2,
            w: (307.3736 - 277.6667) * PDF_SCALE,
            h: 160,
            travel: 89,
            period: 8,
          },
        ]
      : [],
}));
export type Segment = { id: string; a: Point; b: Point; kind: 'wall' | 'goal' };
export function segments(l: Level): Segment[] {
  const g = l.goal,
    lines: Segment[] = [];
  for (let i = 1; i < l.outline.length; i++)
    lines.push({ id: `wall-${i}`, a: l.outline[i - 1], b: l.outline[i], kind: 'wall' });
  // Weld the hand-drawn roof/right-wall junction to the exact mouth top.
  lines.push({
    id: 'mouth-junction',
    a: l.outline.at(-1)!,
    b: { x: g.x, y: g.y - g.h },
    kind: 'wall',
  });
  lines.push({ id: 'floor', a: l.outline[0], b: { x: g.x + g.w, y: g.y }, kind: 'wall' });
  lines.push({
    id: 'goal-roof',
    a: { x: g.x, y: g.y - g.h },
    b: { x: g.x + g.roof, y: g.y - g.h },
    kind: 'goal',
  });
  lines.push({
    id: 'goal-back',
    a: { x: g.x + g.roof, y: g.y - g.h },
    b: { x: g.x + g.w, y: g.y },
    kind: 'goal',
  });
  return lines.filter((s) => Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) > 0.01);
}
export function arenaPolygon(l: Level): Point[] {
  const g = l.goal;
  return [
    ...l.outline,
    { x: g.x, y: g.y - g.h },
    { x: g.x + g.roof, y: g.y - g.h },
    { x: g.x + g.w, y: g.y },
  ];
}
