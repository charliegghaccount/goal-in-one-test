import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Matter from 'matter-js';
import { levels, arenaPolygon, segments } from '../src/levels';
import { FootballSimulation } from '../src/simulation';
import { blank, copyOfficial, parseDraft, EditorSession, snapGoal } from '../src/editor/model';
import { add, translate, resize, rotate, duplicate, object, library } from '../src/editor/objects';
import { validateLevel } from '../src/editor/validation';
import { convexParts, area, inPolygon } from '../src/geometry';
const step = (s: FootballSimulation, n = 240) => {
  for (let i = 0; i < n; i++) s.step();
};
const errors = (l: (typeof levels)[number]) =>
  validateLevel(l).filter((i) => i.severity === 'error');
test('all sixty official definitions exactly preserve their pre-editor baseline', () =>
  assert.deepEqual(
    JSON.parse(JSON.stringify(levels)),
    JSON.parse(readFileSync('docs/editor-evidence/baseline-levels-1-60.json', 'utf8')),
  ));
for (const template of ['rectangle', 'wide', 'tall', 'stepped'])
  test(
    'editable ' + template + ' perimeter is closed, validated, and has a real net opening',
    () => {
      const l = blank(template).level;
      assert.deepEqual(errors(l), []);
      const s = new FootballSimulation(l);
      assert.ok(segments(l).every((e) => s.walls.some((w) => w.definition.id === e.id)));
      assert.ok(
        !s.walls.some(
          (w) =>
            w.definition.a.x === l.goal.x &&
            w.definition.b.x === l.goal.x &&
            w.definition.a.y < l.goal.y - l.goal.h &&
            w.definition.b.y > l.goal.y,
        ),
      );
      s.destroy();
    },
  );
for (const l of levels)
  test('official ' + l.id + ' opens as a validated, independent editable copy', () => {
    const d = copyOfficial(l.id);
    assert.equal(d.level.id, l.id);
    assert.deepEqual(errors(d.level), []);
    const s = new FootballSimulation(d.level);
    step(s, 2);
    s.destroy();
    d.level.start.x += 40;
    assert.notEqual(d.level.start.x, l.start.x);
  });
test('concave polygons decompose without filling the empty notch', () => {
  const l = blank().level;
  l.obstacles = [
    {
      id: 'L',
      points: [
        { x: 300, y: 300 },
        { x: 500, y: 300 },
        { x: 500, y: 340 },
        { x: 340, y: 340 },
        { x: 340, y: 500 },
        { x: 300, y: 500 },
      ],
    },
  ];
  const p = l.obstacles[0].points,
    parts = convexParts(p);
  assert.ok(parts.length > 1);
  assert.ok(Math.abs(parts.reduce((n, p) => n + Math.abs(area(p)), 0) - Math.abs(area(p))) < 1e-7);
  const s = new FootballSimulation(l);
  const probe = Matter.Bodies.circle(420, 420, 10);
  assert.equal(Matter.Query.collides(probe, [s.obstacles[0].body]).length, 0);
  Matter.Body.setPosition(probe, { x: 320, y: 400 });
  assert.ok(Matter.Query.collides(probe, [s.obstacles[0].body]).length);
  s.destroy();
});
test('self-intersections, degenerate polygons, blocked goals, spawns and broken links are rejected', () => {
  const l = blank().level;
  l.obstacles = [
    {
      id: 'bow',
      points: [
        { x: 300, y: 300 },
        { x: 500, y: 500 },
        { x: 300, y: 500 },
        { x: 500, y: 300 },
      ],
    },
  ];
  assert.ok(errors(l).some((e) => e.message.includes('self-intersect')));
  l.obstacles = [
    {
      id: 'flat',
      points: [
        { x: 300, y: 300 },
        { x: 400, y: 300 },
        { x: 500, y: 300 },
      ],
    },
  ];
  assert.ok(errors(l).length);
  l.obstacles = [];
  add(l, 'block', l.start);
  assert.ok(errors(l).some((e) => e.message.includes('spawn overlaps')));
  l.obstacles = [];
  add(l, 'block', { x: l.goal.x, y: l.goal.y - 50 });
  assert.ok(errors(l).some((e) => e.message.includes('Goal entrance')));
  l.obstacles = [];
  add(l, 'switch', { x: 500, y: 500 });
  assert.ok(errors(l).some((e) => e.message.includes('existing gate')));
});
test('moving a goal snaps to a vertical wall and only removes its entrance segment', () => {
  const l = blank().level;
  assert.ok(snapGoal(l, { x: 1000, y: 460 }));
  assert.equal(l.goal.x, 1120);
  assert.equal(l.goal.y, 460);
  const lines = segments(l);
  assert.ok(lines.some((s) => s.a.x === 1120 && s.b.x === 1120 && Math.max(s.a.y, s.b.y) === 640));
  assert.ok(arenaPolygon(l).some((p) => p.x === l.goal.x + l.goal.w));
});
test('every library item uses a real native object; transformations, IDs, and links survive export', () => {
  const d = blank();
  for (const [, tools] of library)
    for (const [t] of tools)
      if (t !== 'polygon' && t !== 'goal' && t !== 'spawn') add(d.level, t, { x: 600, y: 300 });
  const gate = d.level.mechanics!.gates![0];
  d.level.mechanics!.switches![0].gateId = gate.id;
  const ref = { kind: 'obstacle' as const, index: 0 },
    before = structuredClone(object(d.level, ref));
  translate(d.level, ref, 40, 20);
  resize(d.level, ref, 200, 70);
  rotate(d.level, ref, 0.5);
  assert.notDeepEqual(object(d.level, ref), before);
  const copy = duplicate(d.level, [
    { kind: 'gate', index: 0 },
    { kind: 'switch', index: 0 },
  ]);
  assert.equal(object(d.level, copy[1]).gateId, object(d.level, copy[0]).id);
  assert.deepEqual((parseDraft(JSON.stringify(d)) as typeof d).level, d.level);
});
test('history records whole gestures, supports undo/redo, and isolates state from simulation', () => {
  const session = new EditorSession(blank()),
    original = JSON.stringify(session.doc);
  session.begin();
  for (let i = 0; i < 10; i++) session.doc.level.start.x++;
  session.commit();
  assert.ok(session.canUndo);
  session.undo();
  assert.equal(JSON.stringify(session.doc), original);
  session.redo();
  assert.equal(session.doc.level.start.x, 140);
  const before = JSON.stringify(session.doc),
    s = new FootballSimulation(structuredClone(session.doc.level));
  s.shoot({ x: -140, y: 0 });
  step(s, 600);
  assert.equal(s.phase, 'won');
  s.destroy();
  assert.equal(JSON.stringify(session.doc), before);
});
test('saved/exported native levels and all-draft backups roundtrip, malformed imports fail safely', () => {
  const d = blank('stepped');
  assert.deepEqual(parseDraft(JSON.stringify(d)), d);
  assert.equal(
    (
      parseDraft(
        JSON.stringify({ format: 'goal-in-one-drafts', version: 1, drafts: [d, blank()] }),
      ) as unknown[]
    ).length,
    2,
  );
  for (const data of [
    '{bad',
    'null',
    '{"foo":1}',
    JSON.stringify({ ...d, version: 77 }),
    JSON.stringify({ ...d, level: { ...d.level, start: null } }),
  ])
    assert.throws(() => parseDraft(data));
});
test('custom floor contours and wall/goal seams keep repeated kicks physically enclosed', () => {
  const l = blank().level;
  l.boundary!.splice(4, 0, { x: 780, y: 600 }, { x: 500, y: 680 });
  l.outline = structuredClone(l.boundary!);
  assert.deepEqual(errors(l), []);
  const s = new FootballSimulation(l);
  for (let n = 0; n < 3000 && s.phase !== 'won'; n++) {
    if (n % 40 === 0) s.shoot({ x: Math.sin(n) * 140, y: Math.cos(n) * 140 });
    s.step();
    assert.ok(inPolygon(s.ball.position, arenaPolygon(l)));
  }
  s.destroy();
});
test('per-pad acceleration and rotated movers use the runtime settings', () => {
  const l = blank().level;
  l.surfaces = [{ x: 100, y: 640, w: 220, kind: 'forward', acceleration: 0.7 }];
  l.movers = [{ x: 600, y: 350, w: 90, h: 40, axis: 'x', travel: 70, period: 4, angle: 0.5 }];
  const s = new FootballSimulation(l);
  assert.equal(s.movers[0].body.angle, 0.5);
  step(s, 200);
  assert.ok(s.ball.position.x > 300);
  s.destroy();
});
test('group duplication creates unique gate IDs and preserves each paired switch link', () => {
  const l = blank().level;
  add(l, 'timed-gate', { x: 500, y: 400 });
  add(l, 'timed-gate', { x: 800, y: 400 });
  const copies = duplicate(l, [
    { kind: 'gate', index: 0 },
    { kind: 'gate', index: 1 },
    { kind: 'switch', index: 0 },
    { kind: 'switch', index: 1 },
  ]);
  const ids = l.mechanics!.gates!.map((g) => g.id);
  assert.equal(new Set(ids).size, 4);
  assert.equal(object(l, copies[2]).gateId, object(l, copies[0]).id);
  assert.equal(object(l, copies[3]).gateId, object(l, copies[1]).id);
});
test('goal snapping refuses to put an entrance inside static wood', () => {
  const l = blank().level;
  add(l, 'block', { x: 1120, y: 350 });
  const before = { ...l.goal };
  assert.equal(snapGoal(l, { x: 1120, y: 400 }), false);
  assert.deepEqual(l.goal, before);
});
test('a switch-operated gate may legitimately guard the goal entrance', () => {
  const l = blank().level;
  add(l, 'gate', { x: l.goal.x + 10, y: l.goal.y - 50 });
  add(l, 'switch', { x: 600, y: 500 });
  assert.ok(!errors(l).some((e) => e.message.includes('Goal entrance')));
});
test('custom moving blocks cannot crush a ball into a raised floor', () => {
  const l = blank().level;
  l.obstacles = [
    {
      id: 'raised',
      points: [
        { x: 400, y: 460 },
        { x: 800, y: 460 },
        { x: 800, y: 640 },
        { x: 400, y: 640 },
      ],
    },
  ];
  l.movers = [{ x: 600, y: 350, w: 90, h: 80, travel: 100, period: 3 }];
  const s = new FootballSimulation(l);
  step(s, 180);
  Matter.Body.setPosition(s.ball, { x: 600, y: 438.8 });
  Matter.Body.setVelocity(s.ball, { x: 0, y: 0 });
  for (let i = 0; i < 1000; i++) {
    s.step();
    assert.ok(s.ball.position.y < 460);
    assert.ok(inPolygon(s.ball.position, arenaPolygon(l)));
  }
  s.destroy();
});
test('one malformed saved draft cannot hide valid drafts, and invalid structures cannot overwrite them', async () => {
  const { savedDrafts, storeDraft } = await import('../src/editor/model');
  const d = blank();
  let data = JSON.stringify([null, d, { bad: true }]);
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: () => data, setItem: (_k: string, v: string) => (data = v) },
  });
  try {
    assert.equal(savedDrafts().length, 1);
    assert.equal(savedDrafts()[0].draftId, d.draftId);
    const before = data;
    assert.throws(() => storeDraft({ ...d, level: { ...d.level, start: null as any } }));
    assert.equal(data, before);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
