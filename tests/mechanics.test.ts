import { test } from 'node:test';
import assert from 'node:assert/strict';
import Matter from 'matter-js';
import { FootballSimulation } from '../src/simulation';
import { levels, FLOOR, arenaPolygon } from '../src/levels';
import type { Mechanics } from '../src/mechanics';
import { defaultPhysics, sanitizePhysics } from '../src/physics';
import { readFileSync } from 'node:fs';
const { Body, Composite, Events } = Matter;
const make = (mechanics: Mechanics) =>
  new FootballSimulation({ ...levels[1], obstacles: [], surfaces: [], movers: [], mechanics });
test('first twenty geometry, starts, goals and paths match the pre-update baseline', () =>
  assert.deepEqual(
    JSON.parse(JSON.stringify(levels.slice(0, 20))),
    JSON.parse(readFileSync('docs/expansion-evidence/baseline-levels-1-20.json', 'utf8')),
  ));
for (const angle of [0, 45, 90])
  test(`spring ${angle} degrees launches once per distinct contact`, () => {
    const s = make({ springs: [{ x: 300, y: FLOOR, w: 120, angle, strength: 14 }] });
    Body.setPosition(s.ball, { x: 350, y: FLOOR - 20 });
    Body.setVelocity(s.ball, { x: 0, y: 0 });
    s.step();
    assert.ok(s.events.some((e) => e.type === 'spring'));
    if (angle === 0) assert.ok(s.ball.velocity.x > 10);
    if (angle === 90) assert.ok(s.ball.velocity.y < -10);
    if (angle === 45) assert.ok(s.ball.velocity.x > 7 && s.ball.velocity.y < -7);
    Body.setPosition(s.ball, { x: 350, y: FLOOR - 20 });
    Body.setVelocity(s.ball, { x: 0, y: 0 });
    s.step();
    assert.equal(s.events.filter((e) => e.type === 'spring').length, 1);
    Body.setPosition(s.ball, { x: 150, y: FLOOR - 100 });
    s.step();
    Body.setPosition(s.ball, { x: 350, y: FLOOR - 20 });
    s.step();
    assert.equal(s.events.filter((e) => e.type === 'spring').length, 2);
    s.destroy();
  });
test('wind acts continuously only inside its field and can lift against gravity', () => {
  const s = make({ winds: [{ x: 300, y: 300, w: 300, h: 300, angle: 0, strength: 0.3 }] });
  Body.setPosition(s.ball, { x: 350, y: 400 });
  Body.setVelocity(s.ball, { x: 0, y: 0 });
  s.step();
  const first = s.ball.velocity.x;
  s.step();
  assert.ok(first > 0 && s.ball.velocity.x > first);
  Body.setPosition(s.ball, { x: 200, y: 500 });
  Body.setVelocity(s.ball, { x: 0, y: 0 });
  s.step();
  assert.ok(Math.abs(s.ball.velocity.x) < 0.001);
  s.destroy();
  const up = make({ winds: [{ x: 300, y: 200, w: 300, h: 400, angle: 90, strength: 0.7 }] });
  Body.setPosition(up.ball, { x: 350, y: 450 });
  for (let i = 0; i < 20; i++) up.step();
  assert.ok(up.ball.velocity.y < -1);
  up.destroy();
});
test('destructible threshold distinguishes weak impact, strong impact and restart', () => {
  const defs = { breakables: [{ id: 'wood', x: 500, y: FLOOR - 60, w: 25, h: 120, threshold: 6 }] };
  const s = make(defs);
  Body.setPosition(s.ball, { x: 450, y: FLOOR - 60 });
  Body.setVelocity(s.ball, { x: 2, y: 0 });
  for (let i = 0; i < 50; i++) s.step();
  assert.equal(s.mechanics.breakables[0].broken, false);
  assert.ok(s.mechanics.breakables[0].damage > 0);
  Body.setPosition(s.ball, { x: 400, y: FLOOR - 60 });
  Body.setVelocity(s.ball, { x: 0, y: 0 });
  for (let i = 0; i < 3; i++) s.step();
  Body.setVelocity(s.ball, { x: 14, y: 0 });
  for (let i = 0; i < 25; i++) s.step();
  assert.equal(s.mechanics.breakables[0].broken, true);
  assert.ok(!Composite.allBodies(s.engine.world).includes(s.mechanics.breakables[0].body));
  s.destroy();
  const retry = make(defs);
  assert.equal(retry.mechanics.breakables[0].broken, false);
  retry.destroy();
});
for (const mode of ['toggle', 'timed'] as const)
  test(`${mode} switch controls a colliding gate with distinct contacts`, () => {
    const s = make({
      switches: [{ id: 's', x: 300, y: FLOOR - 22, gateId: 'g', mode, duration: 1 }],
      gates: [{ id: 'g', x: 700, y: FLOOR - 90, w: 30, h: 180, offset: { x: 0, y: -220 } }],
    });
    Body.setPosition(s.ball, { x: 300, y: FLOOR - 22 });
    s.step();
    assert.equal(s.mechanics.gates[0].target, true);
    for (let i = 0; i < 90; i++) s.step();
    assert.ok(s.mechanics.gates[0].progress > 0.9);
    if (mode === 'timed') {
      for (let i = 0; i < 180; i++) s.step();
      assert.equal(s.mechanics.gates[0].target, false);
      assert.equal(s.mechanics.gates[0].progress, 0);
    } else {
      Body.setPosition(s.ball, { x: 200, y: FLOOR - 22 });
      s.step();
      Body.setPosition(s.ball, { x: 300, y: FLOOR - 22 });
      s.step();
      assert.equal(s.mechanics.gates[0].target, false);
    }
    s.destroy();
  });
test('closing gate stops against a ball instead of crushing or teleporting it', () => {
  const s = make({
    gates: [{ id: 'g', x: 600, y: FLOOR - 90, w: 35, h: 180, offset: { x: 0, y: -220 } }],
  });
  const g = s.mechanics.gates[0];
  g.target = true;
  for (let i = 0; i < 90; i++) s.step();
  Body.setPosition(s.ball, { x: 600, y: FLOOR - 22 });
  Body.setVelocity(s.ball, { x: 0, y: 0 });
  g.target = false;
  for (let i = 0; i < 180; i++) {
    s.step();
    assert.ok(s.ball.position.y <= FLOOR - 14);
  }
  assert.ok(g.progress > 0);
  assert.equal(s.shoot({ x: 100, y: 30 }), true);
  s.destroy();
});
test('rotor collides with ball; swinging body remains attached to its pivot', () => {
  const s = make({ rotors: [{ x: 600, y: 440, w: 160, h: 22, speed: 0.4 }] });
  let hits = 0;
  Events.on(s.engine, 'collisionStart', (e) => {
    hits += e.pairs.filter((p) => p.bodyA.label === 'rotor' || p.bodyB.label === 'rotor').length;
  });
  Body.setPosition(s.ball, { x: 490, y: 440 });
  Body.setVelocity(s.ball, { x: 8, y: 0 });
  for (let i = 0; i < 100; i++) s.step();
  assert.ok(hits > 0);
  assert.ok(Math.abs(s.mechanics.rotors[0].body.angle) > 0.2);
  s.destroy();
  const p = make({
    rotors: [
      {
        x: 600,
        y: 400,
        w: 22,
        h: 160,
        speed: 0,
        amplitude: 0.5,
        period: 4,
        pivot: { x: 600, y: 320 },
      },
    ],
  });
  for (let i = 0; i < 100; i++) {
    p.step();
    assert.ok(
      Math.abs(
        Math.hypot(
          p.mechanics.rotors[0].body.position.x - 600,
          p.mechanics.rotors[0].body.position.y - 320,
        ) - 80,
      ) < 0.01,
    );
  }
  p.destroy();
});
test('slippery contact retains more speed and normal friction returns after exit', () => {
  const run = (icy: boolean) => {
    const s = make(icy ? { ice: [{ x: 200, y: FLOOR, w: 900, friction: 0.0001 }] } : {});
    Body.setPosition(s.ball, { x: 300, y: FLOOR - 22 });
    for (let i = 0; i < 60; i++) s.step();
    Body.setVelocity(s.ball, { x: 6, y: 0 });
    for (let i = 0; i < 200; i++) s.step();
    return s;
  };
  const normal = run(false),
    ice = run(true);
  assert.ok(ice.ball.velocity.x > normal.ball.velocity.x + 1);
  assert.ok(ice.ball.friction < normal.ball.friction);
  Body.setPosition(ice.ball, { x: 150, y: FLOOR - 80 });
  ice.step();
  assert.equal(ice.ball.friction, defaultPhysics.groundFriction);
  normal.destroy();
  ice.destroy();
});
test('tuning configuration rejects invalid values and clamps dangerous limits', () => {
  const c = sanitizePhysics({ kickStrength: 100, spinDamping: NaN, windStrength: -20 });
  assert.equal(c.kickStrength, 0.16);
  assert.equal(c.windStrength, 0.4);
  assert.equal(c.spinDamping, defaultPhysics.spinDamping);
});
function inPoly(p: { x: number; y: number }, poly: { x: number; y: number }[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j],
      dx = b.x - a.x,
      dy = b.y - a.y,
      t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
    if (Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy) < 0.2) return true;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
      inside = !inside;
  }
  return inside;
}
for (const l of levels.slice(20, 40))
  test(`level ${l.id} gates and rotating wood stay inside the authored arena`, () => {
    const s = new FootballSimulation(l);
    for (const g of s.mechanics.gates) g.target = true;
    for (let i = 0; i < 720; i++) {
      s.step();
      for (const b of [
        ...s.mechanics.gates.map((g) => g.body),
        ...s.mechanics.rotors.map((r) => r.body),
      ])
        for (const p of b.vertices)
          assert.ok(
            inPoly(p, arenaPolygon(l)),
            `${l.id} ${b.label} at ${JSON.stringify({ x: p.x, y: p.y })}`,
          );
    }
    s.destroy();
  });
test('spring and wind act together without repeated spring activation or nonfinite state', () => {
  const s = make({
    springs: [{ x: 300, y: FLOOR, w: 100, angle: 90, strength: 14 }],
    winds: [{ x: 250, y: 250, w: 400, h: 400, angle: 0, strength: 0.3 }],
  });
  Body.setPosition(s.ball, { x: 340, y: FLOOR - 20 });
  s.step();
  assert.ok(s.ball.velocity.y < -10 && s.ball.velocity.x > 0);
  for (let i = 0; i < 100; i++) s.step();
  assert.ok(Number.isFinite(s.ball.position.x));
  assert.equal(s.events.filter((e) => e.type === 'spring').length, 1);
  s.destroy();
});

test('Double Bounce can chain both springs in a legal one-kick route', async () => {
  const { playRoute } = await import('./solve');
  const s = playRoute(23, [{ angle: 0, power: 50 }]);
  assert.equal(s.phase, 'won');
  assert.ok(s.mechanics.springs.every((sp) => sp.last >= 0));
  s.destroy();
});
test('Chain Reaction permits a two-kick route breaking all three barriers', async () => {
  const { playRoute } = await import('./solve');
  const s = playRoute(29, [
    { angle: 0, power: 100 },
    { angle: 0, power: 100 },
  ]);
  assert.equal(s.phase, 'won');
  assert.equal(s.mechanics.breakables.filter((b) => b.broken).length, 3);
  s.destroy();
});
for (const id of [39, 40])
  test(`level ${id} supports a spring route and a different break-through route`, async () => {
    const { playRoute } = await import('./solve');
    const a = playRoute(id, [{ angle: 0, power: id === 39 ? 70 : 80 }]);
    const b = playRoute(id, [{ angle: id === 39 ? 25 : 35, power: id === 39 ? 80 : 100 }]);
    assert.equal(a.phase, 'won');
    assert.equal(b.phase, 'won');
    assert.equal(a.mechanics.breakables.filter((b) => b.broken).length, 0);
    assert.ok(b.mechanics.breakables.some((b) => b.broken));
    a.destroy();
    b.destroy();
  });
