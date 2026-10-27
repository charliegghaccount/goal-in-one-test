import { levels, arenaPolygon, type Level, type Point } from '../levels';
import { inPolygon, distanceToEdge, polygonError, cleanLoop } from '../geometry';
import type { Rect } from '../camera';
import type { Ref } from './objects';
export type Draft = {
  format: 'goal-in-one-level';
  version: 1;
  draftId: string;
  modified: string;
  difficulty: number;
  tags: string[];
  level: Level;
};
const key = 'goal-in-one:editor:drafts:v1',
  recovery = 'goal-in-one:editor:recovery:v1';
export const uid = () => crypto.randomUUID();
export function blank(template = 'rectangle'): Draft {
  const boundary: Point[] =
    template === 'tall'
      ? [
          { x: 60, y: 1100 },
          { x: 60, y: 80 },
          { x: 900, y: 80 },
          { x: 900, y: 1100 },
        ]
      : template === 'wide'
        ? [
            { x: 60, y: 640 },
            { x: 60, y: 100 },
            { x: 2600, y: 100 },
            { x: 2600, y: 640 },
          ]
        : template === 'stepped'
          ? [
              { x: 60, y: 720 },
              { x: 60, y: 100 },
              { x: 600, y: 100 },
              { x: 600, y: 230 },
              { x: 1400, y: 230 },
              { x: 1400, y: 720 },
              { x: 1050, y: 720 },
              { x: 1050, y: 660 },
              { x: 680, y: 660 },
              { x: 680, y: 720 },
            ]
          : [
              { x: 60, y: 640 },
              { x: 60, y: 120 },
              { x: 1120, y: 120 },
              { x: 1120, y: 640 },
            ];
  const right = boundary.reduce((a, p) => (p.x > a.x ? p : a), boundary[0]).x,
    floor = Math.max(...boundary.map((p) => p.y));
  return {
    format: 'goal-in-one-level',
    version: 1,
    draftId: uid(),
    modified: new Date().toISOString(),
    difficulty: 2,
    tags: [],
    level: {
      id: 1001,
      name: 'Untitled arena',
      tip: 'Find your route into the net.',
      par: 3,
      starShots: [3, 5],
      width: right + 160,
      start: { x: 130, y: floor - 22 },
      goal: { x: right, y: floor, w: 107, h: 100, roof: 82, direction: 1 },
      boundary,
      outline: structuredClone(boundary),
      obstacles: [],
      surfaces: [],
      movers: [],
      mechanics: {},
      camera: {
        mode: template === 'wide' ? 'follow-x' : template === 'tall' ? 'follow-xy' : 'fixed',
        viewWidth: 990,
        viewHeight: 560,
        minimumBallDiameterPx: 20,
        smoothing: 0.11,
      },
      experimental: true,
    },
  };
}
export function copyOfficial(id: number): Draft {
  const level = structuredClone(levels.find((l) => l.id === id)!);
  level.name += ' — copy';
  delete level.design;
  // Convert the old implicit floor into a complete editable perimeter, without altering any shape.
  if (!level.boundary) level.boundary = [...level.outline];
  const top = { x: level.goal.x, y: level.goal.y - level.goal.h };
  const last = level.boundary.at(-1)!;
  if (Math.hypot(last.x - top.x, last.y - top.y) > 0.01) level.boundary.push(top);
  const bottom = { x: level.goal.x, y: level.goal.y };
  if (
    !level.boundary.some((p) => Math.abs(p.x - bottom.x) < 0.01 && Math.abs(p.y - bottom.y) < 0.01)
  )
    level.boundary.push(bottom);
  level.outline = structuredClone(level.boundary);
  level.camera ??= { mode: 'fixed', viewWidth: 1250, viewHeight: 560 };
  return {
    format: 'goal-in-one-level',
    version: 1,
    draftId: uid(),
    modified: new Date().toISOString(),
    difficulty: 2,
    tags: [],
    level,
  };
}
export function syncBoundary(l: Level) {
  if (l.boundary) l.outline = structuredClone(l.boundary);
  l.width = Math.max(...l.outline.map((p) => p.x), l.goal.x + l.goal.w) + 30;
}
export function snapGoal(l: Level, p: Point) {
  const b = l.boundary ?? l.outline;
  const candidates = b
    .map((a, i) => ({ a, b: b[(i + 1) % b.length] }))
    .filter(({ a, b: end }) => {
      const cy = (a.y + end.y) / 2;
      return (
        Math.abs(a.x - end.x) < 0.01 &&
        Math.abs(a.y - end.y) >= l.goal.h &&
        inPolygon({ x: a.x - 1, y: cy }, b) &&
        !inPolygon({ x: a.x + 1, y: cy }, b)
      );
    });
  if (!candidates.length) return false;
  candidates.sort(
    (a, b) =>
      Math.hypot(p.x - a.a.x, p.y - (a.a.y + a.b.y) / 2) -
      Math.hypot(p.x - b.a.x, p.y - (b.a.y + b.b.y) / 2),
  );
  const edge = candidates[0],
    x = edge.a.x,
    y = Math.max(
      Math.min(edge.a.y, edge.b.y) + l.goal.h,
      Math.min(Math.max(edge.a.y, edge.b.y), p.y),
    );
  const entrance = Array.from({ length: 7 }, (_, i) => ({
    x: x + 17,
    y: y - l.goal.h + 22 + ((l.goal.h - 44) * i) / 6,
  }));
  if (
    l.obstacles.some((o) =>
      entrance.some(
        (p) =>
          inPolygon(p, o.points) ||
          o.points.some((a, i) => distanceToEdge(p, a, o.points[(i + 1) % o.points.length]) < 16),
      ),
    )
  )
    return false;
  const trial = { ...l, goal: { ...l.goal, x, y } };
  if (polygonError(cleanLoop(arenaPolygon(trial)))) return false;
  l.goal.x = x;
  l.goal.y = y;
  l.goal.direction = 1;
  return true;
}
/** Check structure and resource limits before trusting imported values in the UI/runtime. */
export function parseDraft(text: string): Draft | Draft[] {
  if (text.length > 5_000_000) throw Error('JSON exceeds the 5 MB import limit.');
  const raw = JSON.parse(text);
  if (raw?.format === 'goal-in-one-drafts') {
    if (raw.version !== 1 || !Array.isArray(raw.drafts) || raw.drafts.length > 100)
      throw Error('Unsupported draft backup.');
    return raw.drafts.map((d: unknown) => parseDraft(JSON.stringify(d)) as Draft);
  }
  const l = raw?.format === 'goal-in-one-level' ? raw.level : raw;
  if (
    !l ||
    typeof l !== 'object' ||
    !Array.isArray(l.outline) ||
    !Array.isArray(l.obstacles) ||
    !Array.isArray(l.surfaces) ||
    !Array.isArray(l.movers) ||
    !l.goal ||
    !l.start
  )
    throw Error(
      'Expected a native level or version 1 Goal In One draft with arena, spawn, goal and object arrays.',
    );
  if (raw?.format && (raw.format !== 'goal-in-one-level' || raw.version !== 1))
    throw Error('Unsupported draft format/version.');
  const check = (v: unknown, depth = 0): void => {
    if (depth > 15) throw Error('JSON is nested too deeply.');
    if (typeof v === 'number' && (!Number.isFinite(v) || Math.abs(v) > 100000))
      throw Error('Coordinates/settings must be finite and within ±100,000.');
    if (typeof v === 'string' && v.length > 2000) throw Error('Text field is too long.');
    if (v && typeof v === 'object') {
      if (Object.keys(v).some((k) => ['__proto__', 'constructor', 'prototype'].includes(k)))
        throw Error('Unsupported JSON key.');
      for (const x of Object.values(v)) check(x, depth + 1);
    }
  };
  check(l);
  const m = l.mechanics ?? {};
  for (const k of Object.keys(m))
    if (
      !['springs', 'winds', 'breakables', 'gates', 'switches', 'rotors', 'ice'].includes(k) ||
      !Array.isArray(m[k])
    )
      throw Error('Unsupported mechanic configuration: ' + k);
  const arrays = [l.obstacles, l.surfaces, l.movers, ...Object.values(m)] as unknown[][];
  if (arrays.reduce((n, a) => n + a.length, 0) > 500) throw Error('Limit: 500 objects per draft.');
  for (const points of [
    l.outline,
    l.boundary,
    ...l.obstacles.map((o: { points: unknown }) => o.points),
  ].filter(Boolean))
    if (
      !Array.isArray(points) ||
      points.length > 128 ||
      points.some((p: Point) => !p || typeof p.x !== 'number' || typeof p.y !== 'number')
    )
      throw Error('Polygons need numeric x/y vertices (maximum 128).');
  const converted = !l.boundary;
  if (converted) {
    l.boundary = [...l.outline];
    const top = { x: l.goal.x, y: l.goal.y - l.goal.h };
    const last = l.boundary.at(-1);
    if (!last || Math.hypot(last.x - top.x, last.y - top.y) > 0.01) l.boundary.push(top);
    l.boundary.push({ x: l.goal.x, y: l.goal.y });
  }
  const numeric = (o: any, fields: string[], label: string) => {
    if (!o || fields.some((k) => typeof o[k] !== 'number' || !Number.isFinite(o[k])))
      throw Error(label + ' requires numeric ' + fields.join(', ') + '.');
  };
  numeric(l.start, ['x', 'y'], 'Football spawn');
  numeric(l.goal, ['x', 'y', 'w', 'h', 'roof'], 'Goal');
  for (const o of l.obstacles)
    if (!o || !Array.isArray(o.points)) throw Error('Obstacle needs a vertex array.');
  for (const o of l.surfaces) numeric(o, ['x', 'y', 'w'], 'Surface');
  for (const o of l.movers) numeric(o, ['x', 'y', 'w', 'h', 'travel', 'period'], 'Moving block');
  for (const [kind, fields] of Object.entries({
    springs: ['x', 'y', 'w', 'angle', 'strength'],
    winds: ['x', 'y', 'w', 'h', 'angle', 'strength'],
    gates: ['x', 'y', 'w', 'h'],
    switches: ['x', 'y'],
    breakables: ['x', 'y', 'w', 'h', 'threshold'],
    rotors: ['x', 'y', 'w', 'h', 'speed'],
    ice: ['x', 'y', 'w', 'friction'],
  }))
    for (const o of m[kind] ?? []) numeric(o, fields, kind);
  for (const g of m.gates ?? []) numeric(g.offset, ['x', 'y'], 'Gate opening offset');
  if (!Array.isArray(l.starShots) || l.starShots.length !== 2)
    throw Error('Level needs two star thresholds.');
  l.name = typeof l.name === 'string' ? l.name : 'Imported arena';
  l.tip = typeof l.tip === 'string' ? l.tip : '';
  l.mechanics = m;
  l.camera ??= { mode: 'fixed', viewWidth: 990, viewHeight: 560 };
  const d: Draft = {
    format: 'goal-in-one-level',
    version: 1,
    draftId: typeof raw.draftId === 'string' ? raw.draftId : uid(),
    modified: typeof raw.modified === 'string' ? raw.modified : new Date().toISOString(),
    difficulty: Number(raw.difficulty) || 2,
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((x: unknown) => typeof x === 'string').slice(0, 20)
      : [],
    level: l,
  };
  if (converted) syncBoundary(l);
  return d;
}
export function savedDrafts(): Draft[] {
  try {
    const a = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(a)) return [];
    return a.flatMap((x) => {
      try {
        const d = parseDraft(JSON.stringify(x));
        return Array.isArray(d) ? [] : [d];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}
export function storeDraft(d: Draft) {
  parseDraft(JSON.stringify(d));
  const all = savedDrafts(),
    i = all.findIndex((x) => x.draftId === d.draftId);
  if (i >= 0) all[i] = structuredClone(d);
  else all.push(structuredClone(d));
  localStorage.setItem(key, JSON.stringify(all));
}
export function recovered(): Draft | null {
  try {
    const d = parseDraft(localStorage.getItem(recovery) || 'null');
    return Array.isArray(d) ? null : d;
  } catch {
    return null;
  }
}
export class EditorSession {
  doc: Draft;
  workspace?: {
    view: Rect;
    zoom: number;
    selection: Ref[];
    vertex: number;
    vertexMode: boolean;
    settings: boolean;
    grid: boolean;
    snap: boolean;
    spacing: number;
    collisions: boolean;
    coordinates: boolean;
    regions: boolean;
  };
  private undoStack: Draft[] = [];
  private redoStack: Draft[] = [];
  private pending: Draft | null = null;
  constructor(d = recovered() ?? blank()) {
    this.doc = structuredClone(d);
  }
  begin() {
    this.pending ??= structuredClone(this.doc);
  }
  commit() {
    if (this.pending && JSON.stringify(this.pending) !== JSON.stringify(this.doc)) {
      this.undoStack.push(this.pending);
      if (this.undoStack.length > 100) this.undoStack.shift();
      this.redoStack = [];
      this.doc.modified = new Date().toISOString();
    }
    this.pending = null;
    this.recover();
  }
  change(fn: () => void) {
    this.begin();
    fn();
    this.commit();
  }
  replace(d: Draft) {
    this.change(() => {
      this.doc = structuredClone(d);
    });
  }
  undo() {
    if (!this.undoStack.length) return;
    this.redoStack.push(structuredClone(this.doc));
    this.doc = this.undoStack.pop()!;
    this.pending = null;
    this.recover();
  }
  redo() {
    if (!this.redoStack.length) return;
    this.undoStack.push(structuredClone(this.doc));
    this.doc = this.redoStack.pop()!;
    this.pending = null;
    this.recover();
  }
  get canUndo() {
    return this.undoStack.length > 0;
  }
  get canRedo() {
    return this.redoStack.length > 0;
  }
  recover() {
    try {
      const text = JSON.stringify(this.doc);
      parseDraft(text);
      localStorage.setItem(recovery, text);
    } catch {
      /* Explicit save/export reports storage errors. */
    }
  }
}
