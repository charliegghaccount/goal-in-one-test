import { test } from 'node:test';
import assert from 'node:assert/strict';
import Matter from 'matter-js';
import { CampaignRepository, parseCampaign, scoreKey, CAMPAIGN_KEY } from '../src/campaign';
import { bestFor, recordLevelBest, readProgress, type Progress } from '../src/progress';
import { blank, parseDraft } from '../src/editor/model';
import { validateLevel } from '../src/editor/validation';
import { frame, resizeHandle } from '../src/editor/transform';
import { add, object, rotate } from '../src/editor/objects';
import { moverPosition, movementLine, rotorPose } from '../src/motion';
import { FootballSimulation, STEP } from '../src/simulation';
import { defaultPhysics, loadPhysics, savePhysics, sanitizePhysics } from '../src/physics';
function store() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
  };
}
test('draft, publish, reload, revision, order, unpublish/archive/restore and full campaign interchange', () => {
  const s = store(),
    r = new CampaignRepository(s);
  assert.equal(r.playable().length, 60);
  assert.ok(r.data.designs.every((d) => r.status(d) === 'Published'));
  const d = structuredClone(r.find('builtin-9')!.draft),
    before = r.playable()[8];
  d.level.name = 'Edited nine';
  d.level.movers[0].w = 90;
  r.saveDraft(d);
  assert.equal(r.playable()[8].name, before.name);
  assert.match(r.status(r.find('builtin-9')!), /newer draft/);
  r.publish(d);
  assert.equal(r.playable()[8].name, 'Edited nine');
  assert.equal(r.playable()[8].revision, 2);
  const reload = new CampaignRepository(s);
  assert.equal(reload.playable()[8].movers[0].w, 90);
  const n = blank();
  n.level.name = 'New middle';
  r.publish(n, 9);
  assert.equal(r.playable()[8].name, 'New middle');
  assert.equal(r.playable().length, 61);
  r.move('builtin-35', 2);
  assert.equal(r.playable()[1].campaignId, 'builtin-35');
  assert.equal(r.playable()[1].id, 2);
  r.unpublish(n.designId!);
  assert.equal(r.playable().length, 60);
  assert.equal(r.status(r.find(n.designId!)!), 'Unpublished');
  r.publish(r.find(n.designId!)!.draft, 3);
  r.archive(n.designId!);
  assert.equal(r.playable().length, 60);
  r.restore(n.designId!, 3);
  assert.equal(r.playable()[2].campaignId, n.designId);
  const exported = r.export(),
    parsed = parseCampaign(exported);
  assert.deepEqual(parsed.order, r.data.order);
  const copy = new CampaignRepository(store());
  copy.import(exported);
  assert.deepEqual(copy.playable(), r.playable());
  r.restoreRevision('builtin-9', 1);
  assert.equal(r.playable().find((l) => l.campaignId === 'builtin-9')!.name, before.name);
  r.reset();
  assert.equal(r.playable().length, 60);
  assert.equal(r.playable()[8].name, before.name);
  assert.ok(r.data.designs.some((d) => d.archived));
});
test('progress follows permanent design and revision rather than campaign position', () => {
  const r = new CampaignRepository(store()),
    p: Progress = { best: { '9': 2, '35': 1 }, sound: true };
  r.move('builtin-35', 9);
  assert.equal(bestFor(p, r.playable()[8]), 1);
  assert.equal(bestFor(p, r.playable().find((l) => l.campaignId === 'builtin-9')!), 2);
  const d = r.find('builtin-35')!.draft;
  r.publish(d);
  const l = r.playable()[8];
  assert.equal(bestFor(p, l), undefined);
  recordLevelBest(p, l, 4);
  assert.equal(bestFor(p, l), 4);
  r.move('builtin-35', 1);
  assert.equal(bestFor(p, r.playable()[0]), 4);
  assert.equal(p.best['35'], 1);
  assert.ok(p.records?.[scoreKey(l)] === 4);
  const restored = readProgress({
    getItem: (k) => (k === 'goal-in-one:grass:v5' ? JSON.stringify(p) : null),
  });
  assert.equal(bestFor(restored, r.playable()[0]), 4);
});
test('quota errors never expose false publishes and corrupt data stays recoverable', () => {
  const s = store(),
    r = new CampaignRepository(s),
    before = r.export();
  s.setItem = () => {
    throw Error('quota');
  };
  assert.throws(() => r.publish(blank()), /quota/);
  assert.equal(r.export(), before);
  const broken = store();
  broken.data.set(CAMPAIGN_KEY, '{broken');
  const fallback = new CampaignRepository(broken);
  assert.equal(fallback.playable().length, 60);
  assert.match(fallback.warning, /could not/);
  assert.equal(broken.getItem(CAMPAIGN_KEY), '{broken');
  assert.equal(
    new CampaignRepository({
      getItem: () => {
        throw Error('denied');
      },
      setItem: () => {
        throw Error('denied');
      },
    }).playable().length,
    60,
  );
  assert.throws(
    () => parseCampaign(JSON.stringify({ ...JSON.parse(before), order: ['missing'] })),
    /order/,
  );
});
for (const template of [
  'rectangle',
  'wide',
  'tall',
  'stepped',
  'sloping floor',
  'sloping ceiling',
  'multi-platform',
  'long scrolling',
  'multi-section exploration',
])
  test(`V2 ${template} editable template validates`, () => {
    const d = blank(template);
    assert.deepEqual(
      validateLevel(d.level).filter((i) => i.severity === 'error'),
      [],
    );
    const s = new FootballSimulation(d.level);
    for (let i = 0; i < 100; i++) s.step();
    assert.equal(s.resetCount, 0);
    s.destroy();
  });
for (const angle of [0, 0.5, -1.1])
  for (const index of [0, 1, 2, 3, 4, 5, 6, 7])
    test(`anchored handle ${index} at rotation ${angle}`, () => {
      const l = blank().level,
        r = add(l, 'block', { x: 500, y: 350 })[0];
      rotate(l, r, angle);
      const f = frame(l, r),
        opposite = [7, 6, 5, 4, 3, 2, 1, 0][index],
        fixed = f.handles[opposite],
        handle = f.handles[index];
      const target = {
        x: handle.x + Math.cos(angle) * 50 - Math.sin(angle) * 30,
        y: handle.y + Math.sin(angle) * 50 + Math.cos(angle) * 30,
      };
      resizeHandle(l, r, index, target);
      const after = frame(l, r);
      assert.ok(
        Math.hypot(after.handles[opposite].x - fixed.x, after.handles[opposite].y - fixed.y) <
          0.00001,
      );
      assert.ok(Math.abs(after.a - angle) < 0.00001);
    });
test('diagonal mover trajectory matches real runtime with legacy positions preserved', () => {
  const l = blank().level;
  l.movers = [
    {
      x: 500,
      y: 350,
      w: 50,
      h: 50,
      travel: 100,
      period: 6,
      path: { start: { x: 300, y: 450 }, end: { x: 700, y: 200 } },
    },
  ];
  const s = new FootballSimulation(l);
  assert.deepEqual(s.movers[0].body.position, moverPosition(l.movers[0], 0));
  for (let i = 0; i < 600; i++) {
    s.step();
    const desired = moverPosition(l.movers[0], s.time);
    assert.ok(
      Math.hypot(desired.x - s.movers[0].body.position.x, desired.y - s.movers[0].body.position.y) <
        0.001,
    );
  }
  s.destroy();
  const m = { x: 400, y: 300, w: 30, h: 50, axis: 'x' as const, travel: 80, period: 4 };
  assert.equal(moverPosition(m, 0).x, 480);
  assert.equal(moverPosition(m, 2).x, 320);
  const once = { ...l.movers[0], loop: 'once' as const };
  assert.deepEqual(moverPosition(once, 20), once.path!.end);
});
test('small switch is a real configured sensor and gate follows separate 2s open/1s close durations', () => {
  const l = blank().level;
  l.mechanics = {
    switches: [{ id: 's', x: 350, y: 400, w: 12, h: 20, gateId: 'g', mode: 'timed', duration: 3 }],
    gates: [
      {
        id: 'g',
        x: 700,
        y: 400,
        w: 80,
        h: 160,
        offset: { x: 120, y: -160 },
        openDuration: 2,
        closeDuration: 1,
      },
    ],
  };
  const s = new FootballSimulation(l),
    g = s.mechanics.gates[0];
  assert.equal(
    s.mechanics.switches[0].body.bounds.max.x - s.mechanics.switches[0].body.bounds.min.x,
    12,
  );
  Matter.Body.setPosition(s.ball, { x: 350, y: 400 });
  s.step();
  assert.equal(g.target, true);
  Matter.Body.setPosition(s.ball, { x: 130, y: 300 });
  for (let i = 0; i < 120; i++) s.step();
  assert.ok(Math.abs(g.progress - 0.5) < 0.01);
  for (let i = 0; i < 120; i++) s.step();
  assert.ok(g.progress > 0.99);
  assert.ok(Math.abs(g.body.position.x - 820) < 1);
  for (let i = 0; i < 240; i++) s.step();
  assert.equal(g.target, false);
  assert.ok(g.progress < 0.01);
  s.destroy();
});
test('shared rotor preview agrees with runtime and supports configured clockwise/counterclockwise speeds', () => {
  for (const speed of [-2, 2]) {
    const l = blank().level;
    l.mechanics = { rotors: [{ x: 600, y: 300, w: 140, h: 20, speed, phase: 0.1 }] };
    const s = new FootballSimulation(l);
    for (let i = 0; i < 120; i++) s.step();
    assert.ok(
      Math.abs(s.mechanics.rotors[0].body.angle - rotorPose(l.mechanics.rotors![0], s.time).angle) <
        0.001,
    );
    s.destroy();
  }
});
test('global boost baseline 2.0, range, legacy tuning migration and explicit new overrides', () => {
  assert.equal(defaultPhysics.boostAcceleration, 2);
  assert.equal(sanitizePhysics({ boostAcceleration: 2 }).boostAcceleration, 2);
  const s = store();
  Object.defineProperty(globalThis, 'localStorage', { value: s, configurable: true });
  s.setItem(
    'goal-in-one:physics:v1',
    JSON.stringify({ ...defaultPhysics, kickStrength: 0.13, boostAcceleration: 0.32 }),
  );
  assert.equal(loadPhysics().boostAcceleration, 2);
  assert.equal(loadPhysics().kickStrength, 0.13);
  savePhysics({ ...defaultPhysics, boostAcceleration: 0.6 });
  assert.equal(loadPhysics().boostAcceleration, 0.6);
  delete (globalThis as any).localStorage;
});
test('legacy per-pad override is migrated once; a marked new low override stays intentional', () => {
  const legacy = blank();
  delete legacy.level.boostVersion;
  legacy.level.surfaces = [{ x: 200, y: 640, w: 200, kind: 'forward', acceleration: 0.32 }];
  const converted = parseDraft(JSON.stringify(legacy));
  assert.ok(!Array.isArray(converted));
  if (Array.isArray(converted)) return;
  assert.equal(converted.level.surfaces[0].acceleration, 2);
  assert.equal(converted.level.boostVersion, 2);
  assert.deepEqual(parseDraft(JSON.stringify(converted)), converted);
  const custom = blank();
  custom.level.surfaces = [{ x: 200, y: 640, w: 200, kind: 'forward', acceleration: 0.2 }];
  const restored = parseDraft(JSON.stringify(custom));
  assert.ok(!Array.isArray(restored));
  if (!Array.isArray(restored)) assert.equal(restored.level.surfaces[0].acceleration, 0.2);
});
test('imported same-ID changed content receives a fresh revision and displaced work is archived', () => {
  const r = new CampaignRepository(store()),
    data = JSON.parse(r.export());
  data.designs[0].published.level.name = 'A different puzzle';
  r.import(JSON.stringify(data));
  assert.equal(r.playable()[0].revision, 2);
  assert.ok(r.data.designs.some((d) => d.archived && d.draft.level.name.includes('before import')));
});
test('Shift keeps proportions and Alt keeps the centre during edge resizing', () => {
  const l = blank().level,
    r = add(l, 'block', { x: 500, y: 350 })[0];
  const before = frame(l, r);
  resizeHandle(l, r, 7, { x: 700, y: 500 }, { aspect: true });
  let after = frame(l, r);
  assert.ok(Math.abs(before.w / before.h - after.w / after.h) < 1e-7);
  assert.ok(Math.abs(before.handles[0].x - after.handles[0].x) < 1e-7);
  const c = after.c;
  resizeHandle(l, r, 4, { x: c.x + 250, y: c.y }, { centre: true });
  after = frame(l, r);
  assert.ok(Math.abs(after.c.x - c.x) < 1e-7);
  assert.ok(Math.abs(after.c.y - c.y) < 1e-7);
});
test('unsafe movement and gate speed configurations are rejected before publication', () => {
  const l = blank().level;
  l.movers = [
    {
      x: 300,
      y: 300,
      w: 40,
      h: 40,
      travel: 0,
      period: 1,
      path: { start: { x: 100, y: 200 }, end: { x: 1000, y: 200 } },
    },
  ];
  assert.ok(validateLevel(l).some((i) => i.message.includes('400')));
  l.movers = [];
  l.mechanics = {
    gates: [
      {
        id: 'g',
        x: 600,
        y: 400,
        w: 40,
        h: 100,
        offset: { x: 1000, y: 0 },
        openDuration: 0.1,
        closeDuration: 1,
      },
    ],
  };
  assert.ok(validateLevel(l).some((i) => i.message.includes('400')));
});
for (const kind of ['wind', 'mover-x', 'gate', 'breakable', 'switch'] as const)
  test(`${kind} anchored resizing changes native dimensions without moving the opposite side`, () => {
    const l = blank().level,
      r = add(l, kind, { x: 500, y: 350 })[0],
      before = frame(l, r);
    resizeHandle(l, r, 4, { x: before.right + before.c.x + 45, y: before.c.y });
    const after = frame(l, r);
    assert.ok(Math.abs(after.handles[3].x - before.handles[3].x) < 1e-7);
    assert.ok(after.w > before.w + 44);
    const s = new FootballSimulation(l);
    if (r.kind === 'gate')
      assert.ok(
        Math.abs(
          s.mechanics.gates[0].body.bounds.max.x - s.mechanics.gates[0].body.bounds.min.x - after.w,
        ) < 1e-7,
      );
    if (r.kind === 'switch')
      assert.ok(
        Math.abs(
          s.mechanics.switches[0].body.bounds.max.x -
            s.mechanics.switches[0].body.bounds.min.x -
            after.w,
        ) < 1e-7,
      );
    s.destroy();
  });

test('published metadata snapshots distinguish newer difficulty/tag edits', () => {
  const r = new CampaignRepository(store()),
    d = structuredClone(r.find('builtin-9')!.draft);
  d.difficulty = 4;
  d.tags = ['timing'];
  r.saveDraft(d);
  assert.match(r.status(r.find('builtin-9')!), /newer draft/);
  r.publish(d);
  assert.equal(r.status(r.find('builtin-9')!), 'Published');
  assert.equal(r.find('builtin-9')!.published!.difficulty, 4);
  assert.deepEqual(
    parseCampaign(r.export()).designs.find((d) => d.id === 'builtin-9')!.published!.tags,
    ['timing'],
  );
});
test('weak published pad overrides migrate without changing legacy perimeter contours', () => {
  const r = new CampaignRepository(store()),
    raw = JSON.parse(r.export()),
    d = raw.designs[0],
    outline = structuredClone(d.published.level.outline);
  d.published.level.surfaces = [
    { x: 200, y: d.published.level.goal.y, w: 200, kind: 'forward', acceleration: 0.32 },
  ];
  const parsed = parseCampaign(JSON.stringify(raw)),
    level = parsed.designs[0].published!.level;
  assert.equal(level.surfaces[0].acceleration, 2);
  assert.equal(level.boostVersion, 2);
  assert.deepEqual(level.outline, outline);
  assert.equal(level.boundary, undefined);
});
test('custom hanging pivot has the same phase-adjusted starting pose in editor and simulation', () => {
  const l = blank().level,
    def = {
      x: 600,
      y: 400,
      w: 24,
      h: 160,
      speed: 0.8,
      phase: 0.5,
      pivot: { x: 600, y: 320 },
      amplitude: 0.5,
      period: 5,
    };
  l.mechanics = { rotors: [def] };
  const s = new FootballSimulation(l),
    pose = rotorPose(def, 0);
  assert.ok(
    Math.hypot(
      s.mechanics.rotors[0].body.position.x - pose.position.x,
      s.mechanics.rotors[0].body.position.y - pose.position.y,
    ) < 1e-7,
  );
  s.destroy();
});
test('an invalid draft difficulty cannot create a published edition that fails on reload', () => {
  const s = store(),
    r = new CampaignRepository(s),
    d = blank();
  d.difficulty = 6;
  r.saveDraft(d);
  const before = r.export();
  assert.throws(() => r.publish(d), /Difficulty/);
  assert.equal(r.export(), before);
  assert.equal(new CampaignRepository(s).playable().length, 60);
});
