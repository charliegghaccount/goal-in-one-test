import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import Matter from 'matter-js';
import { levels, arenaPolygon, WALL_WIDTH, type Level, type Point } from '../src/levels';
import authored from '../src/data/vnext';
import { FootballSimulation, MAX_PULL, rating } from '../src/simulation';
import { readProgress, saveProgress, recordBest } from '../src/progress';
import { CompletionCelebration } from '../src/celebration';
import { Audio } from '../src/audio';
import { vnextRoutes } from './vnext-routes';
import { playRoute, type Kick } from './solve';
const { Events } = Matter;
export function inPolygon(p: Point, poly: Point[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
      inside = !inside;
  }
  return inside;
}

test('all forty existing definitions remain byte-for-byte equal as JSON', () => {
  assert.deepEqual(
    JSON.parse(JSON.stringify(levels.slice(0, 40))),
    JSON.parse(readFileSync('docs/vnext-evidence/baseline-levels-1-40.json', 'utf8')),
  );
});
test('authored layouts are preserved apart from the four documented clearance/wind values', () => {
  const expected: Level[] = structuredClone(authored);
  expected[4].obstacles[0].points[1].x = 720;
  expected[4].obstacles[0].points[2].x = 720;
  expected[11].obstacles[2].points[1].y = 510;
  expected[16].mechanics!.winds![0].h = 380;
  assert.deepEqual(levels.slice(40), expected);
  assert.equal(levels.filter((l) => l.camera?.mode === 'fixed').length, 12);
  assert.equal(levels.filter((l) => l.camera && l.camera.mode !== 'fixed').length, 8);
});

export function diagnostic(id: number, route: Kick[]) {
  const s = new FootballSimulation(levels[id - 1]);
  const contacts = new Set<string>();
  const switches = new Set<string>();
  const crossings: { x: number; y: number; gate: string; open: boolean }[] = [];
  let windSteps = 0,
    iceSteps = 0,
    bridgeSteps = 0;
  let minY = s.ball.position.y;
  Events.on(s.engine, 'collisionStart', (e) => {
    for (const p of e.pairs)
      if (p.bodyA === s.ball || p.bodyB === s.ball)
        contacts.add((p.bodyA === s.ball ? p.bodyB : p.bodyA).label);
  });
  const step = () => {
    const prev = { ...s.ball.position };
    s.step();
    const p = s.ball.position;
    assert.ok(inPolygon(p, arenaPolygon(s.level)), `level ${id} escaped ${JSON.stringify(p)}`);
    minY = Math.min(minY, p.y);
    if (
      s.mechanics.defs.winds?.some(
        (w) => p.x >= w.x && p.x <= w.x + w.w && p.y >= w.y && p.y <= w.y + w.h,
      )
    )
      windSteps++;
    if (s.ball.friction < s.config.groundFriction) iceSteps++;
    if (id === 45 && p.x > 355 && p.x < 720 && p.y < 331) bridgeSteps++;
    for (const g of s.mechanics.gates) {
      if (g.target) switches.add(g.def.id);
      if (prev.x <= g.def.x && p.x > g.def.x)
        crossings.push({ ...p, gate: g.def.id, open: g.progress > 0.6 });
    }
  };
  for (let n = 0; n < 12; n++) step();
  for (const k of route) {
    for (let n = 0; n < Math.round((k.after ?? 0) * 120); n++) step();
    const a = (k.angle * Math.PI) / 180;
    assert.ok(
      s.shoot({
        x: (-Math.cos(a) * MAX_PULL * k.power) / 100,
        y: (Math.sin(a) * MAX_PULL * k.power) / 100,
      }),
    );
    for (let n = 0; n < Math.round((k.flight ?? 12) * 120) && s.phase !== 'won'; n++) step();
    if (s.phase === 'won') break;
  }
  return { s, contacts, switches, crossings, windSteps, iceSteps, bridgeSteps, minY };
}
const diagnostics: object[] = [];
for (const [id, route] of [
  [
    53,
    [
      { angle: 0, power: 60, flight: 0.7 },
      { angle: 10, power: 100, flight: 15 },
    ],
  ],
  [
    60,
    [
      { angle: 15, power: 90, flight: 5.2 },
      { angle: 60, power: 80, flight: 15 },
    ],
  ],
] as [number, Kick[]][])
  test(`level ${id}: alternate multi-kick route uses the spring and finishing rotor`, () => {
    const d = diagnostic(id, route);
    try {
      assert.equal(d.s.phase, 'won');
      assert.ok(d.contacts.has('rotor'));
      assert.ok(d.s.mechanics.springs.some((s) => s.last > 0));
      if (id === 60) {
        assert.ok(d.s.mechanics.breakables.some((b) => b.broken));
        assert.ok(d.windSteps > 0);
        assert.ok(d.switches.has('g60'));
      }
    } finally {
      d.s.destroy();
    }
  });
for (const [key, route] of Object.entries(vnextRoutes)) {
  const id = Number(key);
  test(`new level ${id}: legal route scores through net, remains enclosed and uses its puzzle`, () => {
    const d = diagnostic(id, route),
      { s } = d;
    try {
      assert.equal(s.phase, 'won');
      assert.equal(s.shots, route.length);
      assert.equal(s.resetCount, 0);
      assert.equal(rating(s.shots, s.level), 3);
      assert.equal(s.events.filter((e) => e.type === 'net').length, 1);
      assert.equal(s.events.filter((e) => e.type === 'win').length, 1);
      if ([44, 53, 56, 58, 60].includes(id))
        assert.ok(
          s.mechanics.springs.some((p) => p.last > 0),
          'spring route',
        );
      if ([46, 54, 57, 60].includes(id)) assert.ok(d.windSteps > 0, 'wind-assisted route');
      if ([49, 59].includes(id)) assert.ok(d.iceSteps > 0, 'ice runway');
      if ([47, 60].includes(id))
        assert.ok(
          s.mechanics.breakables.some((b) => b.broken),
          'breakable shortcut',
        );
      if (id === 45) assert.ok(d.bridgeSteps > 0, 'actual upper-bridge route');
      if (id === 41) {
        assert.ok(d.contacts.has('wall-3'), 'ceiling bank');
        assert.ok(d.contacts.has('angled-backboard'), 'angled backboard route');
      }
      if (id === 48) assert.ok(d.contacts.has('rotor'), 'rotor redirects the shot');
      for (const g of s.mechanics.gates) {
        assert.ok(d.switches.has(g.def.id), `switch for ${g.def.id} activated`);
        assert.ok(
          d.crossings.some((c) => c.gate === g.def.id && c.open),
          `required ${g.def.id} traversed open`,
        );
        assert.ok(
          !d.crossings.some((c) => c.gate === g.def.id && !c.open),
          'no closed-door bypass',
        );
      }
      diagnostics.push({
        id,
        route,
        shots: s.shots,
        time: s.time,
        windSteps: d.windSteps,
        iceSteps: d.iceSteps,
        bridgeSteps: d.bridgeSteps,
        contacts: [...d.contacts],
        gates: [...d.switches],
        springs: s.mechanics.springs.filter((p) => p.last > 0).length,
        broken: s.mechanics.breakables.filter((b) => b.broken).length,
        resets: s.resetCount,
      });
    } finally {
      s.destroy();
    }
  });
}
for (const l of levels.slice(40))
  for (const g of l.mechanics?.gates ?? []) {
    test(`level ${l.id}: ${g.id} seals the partition with its switch disabled`, () => {
      // Collision-only fixture starts immediately before each gate. This does NOT prove completion.
      for (const angle of [-35, 0, 25, 50, 75, 100, 140]) {
        const fixture = structuredClone(l);
        fixture.start = { x: g.x - 110, y: l.goal.y - 22 };
        fixture.mechanics!.switches = [];
        const s = new FootballSimulation(fixture);
        try {
          for (let i = 0; i < 600; i++) {
            if (i % 65 === 0)
              s.shoot({
                x: -Math.cos((angle * Math.PI) / 180) * 140,
                y: Math.sin((angle * Math.PI) / 180) * 140,
              });
            s.step();
            assert.ok(
              s.ball.position.x < g.x,
              `closed ${g.id} bypass at ${JSON.stringify(s.ball.position)}`,
            );
            assert.ok(inPolygon(s.ball.position, arenaPolygon(l)));
          }
        } finally {
          s.destroy();
        }
      }
    });
    test(`level ${l.id}: ${g.id} retracts into its partition, leaving a generous passage`, () => {
      const s = new FootballSimulation(l);
      try {
        for (const gate of s.mechanics.gates) gate.target = true;
        for (let i = 0; i < 720; i++) {
          s.step();
          for (const m of [...s.mechanics.gates, ...s.mechanics.rotors])
            for (const p of m.body.vertices) {
              // Designer doors seat through the floor by <= one timber thickness to weld the seam.
              assert.ok(
                inPolygon(p, arenaPolygon(l)) ||
                  (m.body.label === 'gate' && p.y >= l.goal.y && p.y <= l.goal.y + WALL_WIDTH),
              );
            }
        }
        const gate = s.mechanics.gates.find((x) => x.def.id === g.id)!;
        assert.equal(gate.progress, 1);
        const opening = l.goal.y - gate.body.bounds.max.y;
        assert.ok(opening >= 70, `only ${opening} units of door clearance`);
      } finally {
        s.destroy();
      }
    });
  }
test('sixty scores persist under the existing storage key without losing old records or sound', () => {
  const old = {
    best: Object.fromEntries(Array.from({ length: 40 }, (_, i) => [i + 1, i + 1])),
    sound: false,
  };
  const p = readProgress({
    getItem: (k) => (k === 'goal-in-one:grass:v5' ? JSON.stringify(old) : null),
  });
  for (let id = 41; id <= 60; id++) recordBest(p, id, 2);
  let key = '',
    data = '';
  saveProgress(p, {
    setItem: (k, v) => {
      key = k;
      data = v;
    },
  });
  assert.equal(key, 'goal-in-one:grass:v5');
  const restored = readProgress({ getItem: () => data });
  assert.equal(Object.keys(restored.best).length, 60);
  assert.deepEqual(
    Object.fromEntries(Object.entries(restored.best).filter(([k]) => +k <= 40)),
    old.best,
  );
  assert.equal(restored.sound, false);
});
test('one-kick and ordinary celebrations dispatch once per round, including mute and replay', () => {
  const c = new CompletionCelebration();
  assert.equal(c.take(1, 1), 'one-shot');
  assert.equal(c.take(1, 1), null);
  assert.equal(c.take(2, 2), 'standard');
  assert.equal(c.take(100, 3), 'standard');
  assert.equal(c.take(1, 4), 'one-shot');
  const a = new Audio();
  let count = 0,
    stops = 0;
  a.play = () => {
    count++;
  };
  a.stopVoice = () => {
    stops++;
  };
  a.celebrate(1, 1);
  a.celebrate(1, 1);
  assert.equal(count, 1);
  a.enabled = false;
  a.celebrate(1, 2);
  assert.equal(count, 1);
  assert.equal(stops, 2);
  a.enabled = true;
  a.celebrate(2, 3);
  assert.equal(count, 2);
});
test('record deterministic new-level route diagnostics for review', () => {
  assert.equal(diagnostics.length, 20);
  writeFileSync(
    'docs/vnext-evidence/runtime-routes.json',
    JSON.stringify(diagnostics, null, 2) + '\n',
  );
});

test('the optional recorded-voice hook never overlaps, repeats, or ignores mute', () => {
  const a = new Audio();
  let starts = 0,
    stops = 0,
    jingles = 0;
  const source = () => ({
    buffer: null,
    connect: () => {},
    onended: null,
    start: () => {
      starts++;
    },
    stop: () => {
      stops++;
    },
  });
  a.context = {
    currentTime: 0,
    destination: {},
    createBufferSource: source,
    createGain: () => ({ gain: { value: 0 }, connect: () => {} }),
  } as unknown as AudioContext;
  // A fake decoded buffer tests orchestration. It is NOT a shipped voice asset.
  const hook = a as unknown as { voice: AudioBuffer; tone: () => void };
  hook.voice = { duration: 1.4 } as AudioBuffer;
  hook.tone = () => {};
  a.play = () => {
    jingles++;
  };
  a.celebrate(1, 1);
  a.celebrate(1, 1);
  assert.equal(starts, 1);
  assert.equal(stops, 0);
  a.celebrate(1, 2);
  assert.equal(starts, 2);
  assert.equal(stops, 1);
  a.enabled = false;
  assert.equal(stops, 2);
  a.celebrate(1, 3);
  assert.equal(starts, 2);
  a.enabled = true;
  a.celebrate(2, 4);
  assert.equal(jingles, 1);
  assert.equal(starts, 2);
});
