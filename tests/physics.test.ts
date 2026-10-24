import { test } from 'node:test';
import assert from 'node:assert/strict';
import Matter from 'matter-js';
import { levels } from '../src/levels';
import { FootballSimulation, rating } from '../src/simulation';
import { playRoute } from './solve';
import { solutions } from './solutions';
const { Body, Events } = Matter;
for (const l of levels) {
  test(`designer level ${l.id}: input route completes within par`, () => {
    const s = playRoute(l.id, solutions[l.id - 1]);
    assert.equal(s.phase, 'won');
    assert.equal(rating(s.shots, l), 3);
    s.destroy();
  });
  test(`level ${l.id}: repeated fast bank shots stay inside solid arena`, () => {
    const s = new FootballSimulation(l);
    for (let i = 0; i < 2400; i++) {
      if (i % 60 === 0) s.shoot({ x: Math.sin(i * 1.3) * 140, y: Math.cos(i * 2.7) * 140 });
      s.step();
      const p = s.ball.position;
      assert.ok(
        p.x >= 74 && p.x <= 1206 && p.y >= 102 && p.y <= 682,
        JSON.stringify({ id: l.id, p }),
      );
    }
    s.destroy();
  });
}
test('mid-flight impulse adds momentum; 100 kicks have no shot lock', () => {
  const s = new FootballSimulation(levels[0]);
  Body.setVelocity(s.ball, { x: 7, y: -4 });
  s.shoot({ x: -80, y: 40 });
  assert.ok(Math.abs(s.ball.velocity.x - 17) < 0.001);
  assert.ok(Math.abs(s.ball.velocity.y + 9) < 0.001);
  for (let i = 0; i < 99; i++) assert.equal(s.shoot({ x: 0, y: 7 }), true);
  assert.equal(s.shots, 100);
  s.destroy();
});
for (const l of levels)
  for (const pad of l.surfaces)
    test(`level ${l.id} ${pad.kind} actual contact`, () => {
      const s = new FootballSimulation(l);
      s.shots = 21;
      Body.setPosition(s.ball, { x: pad.x + pad.w / 2, y: pad.y - 20 });
      Body.setVelocity(s.ball, { x: 0, y: 1 });
      for (let i = 0; i < 12; i++) s.step();
      assert.equal(s.shots, 21);
      if (pad.kind === 'delete') {
        assert.ok(s.resetCount > 0);
        assert.ok(Math.abs(s.ball.position.x - l.start.x) < 1);
      } else assert.ok(s.ball.velocity.x * (pad.kind === 'forward' ? 1 : -1) > 1);
      s.destroy();
    });
for (const id of [1, 5])
  test(`goal ${id}: spawn inside/backside does not score, directional entry does`, () => {
    const s = new FootballSimulation(levels[id - 1]),
      g = s.level.goal;
    Body.setPosition(s.ball, { x: g.x + g.w / 2, y: g.y - 30 });
    for (let i = 0; i < 60; i++) s.step();
    assert.notEqual(s.phase, 'won');
    s.destroy();
    assert.equal(playRoute(id, solutions[id - 1]).phase, 'won');
  });
for (const id of [7, 9, 10])
  test(`mover ${id}: correct axis travel and physical ball contact`, () => {
    const s = new FootballSimulation(levels[id - 1]);
    const m = s.movers[0];
    let hits = 0;
    Events.on(s.engine, 'collisionStart', (e) => {
      for (const p of e.pairs)
        if (
          (p.bodyA === m.body && p.bodyB === s.ball) ||
          (p.bodyB === m.body && p.bodyA === s.ball)
        )
          hits++;
    });
    Body.setPosition(s.ball, {
      x: m.body.position.x - m.definition.w / 2 - 20,
      y: m.body.position.y,
    });
    Body.setVelocity(s.ball, { x: 5, y: 0 });
    const axis = m.definition.axis!;
    let min = Infinity,
      max = -Infinity;
    for (let i = 0; i < 600; i++) {
      s.step();
      min = Math.min(min, m.body.position[axis]);
      max = Math.max(max, m.body.position[axis]);
    }
    assert.ok(max - min > m.definition.travel);
    assert.ok(hits > 0);
    s.destroy();
  });
test('over-par goals still award one star', () => {
  const s = new FootballSimulation(levels[0]);
  s.shots = 20;
  s.shoot({ x: -84, y: 0 });
  for (let i = 0; i < 1440; i++) s.step();
  assert.equal(s.phase, 'won');
  assert.equal(rating(s.shots, s.level), 1);
  s.destroy();
});
for (const l of levels)
  test(`level ${l.id}: every arena edge and shelf top collides`, () => {
    for (const [p, v] of [
      [
        { x: 84, y: 400 },
        { x: -8, y: 0 },
      ],
      [
        { x: 1196, y: 400 },
        { x: 8, y: 0 },
      ],
      [
        { x: 300, y: 112 },
        { x: 0, y: -8 },
      ],
      [
        { x: 300, y: 672 },
        { x: 0, y: 8 },
      ],
    ] as const) {
      const s = new FootballSimulation(l);
      let contact = false;
      Events.on(s.engine, 'collisionStart', (e) => {
        if (
          e.pairs.some(
            (p) =>
              (p.bodyA === s.ball || p.bodyB === s.ball) && !p.bodyA.isSensor && !p.bodyB.isSensor,
          )
        )
          contact = true;
      });
      Body.setPosition(s.ball, p);
      Body.setVelocity(s.ball, v);
      for (let i = 0; i < 30; i++) s.step();
      assert.ok(contact);
      s.destroy();
    }
    for (const o of l.obstacles) {
      const s = new FootballSimulation(l);
      const x = Math.min(...o.points.map((p) => p.x)) + 25,
        y = Math.min(...o.points.map((p) => p.y));
      let hit = false;
      Events.on(s.engine, 'collisionStart', (e) => {
        if (e.pairs.some((p) => p.bodyA.label === o.id || p.bodyB.label === o.id)) hit = true;
      });
      Body.setPosition(s.ball, { x, y: y - 22 });
      Body.setVelocity(s.ball, { x: 0, y: 3 });
      for (let i = 0; i < 12; i++) s.step();
      assert.ok(hit);
      s.destroy();
    }
  });
