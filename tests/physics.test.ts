import { test } from 'node:test';
import assert from 'node:assert/strict';
import Matter from 'matter-js';
import { levels } from '../src/levels';
import { GolfSimulation, MAX_PULL, rating, type Phase } from '../src/simulation';
const routes = [
  { angle: 15, power: 80 },
  { angle: 15, power: 100 },
  { angle: 21, power: 92 },
  { angle: 42, power: 94 },
  { angle: 15, power: 90 },
  { angle: 15, power: 80 },
  { angle: 42, power: 100 },
  { angle: 42, power: 100 },
  { angle: 33, power: 90 },
  { angle: 18, power: 90 },
];
function until(sim: GolfSimulation, expected: Phase[], limit = 3500) {
  for (let i = 0; i < limit && !expected.includes(sim.phase); i++) sim.step();
  assert.ok(
    expected.includes(sim.phase),
    `Expected ${expected}, got ${sim.phase} at ${JSON.stringify(sim.ball.position)}`,
  );
}
for (const [index, route] of routes.entries())
  test(`course ${index + 1}: a legal shot enters the physical cup and completes`, () => {
    const sim = new GolfSimulation(levels[index]);
    try {
      const a = (route.angle * Math.PI) / 180;
      assert.equal(
        sim.shoot({
          x: (-Math.cos(a) * MAX_PULL * route.power) / 100,
          y: (Math.sin(a) * MAX_PULL * route.power) / 100,
        }),
        true,
      );
      until(sim, ['won', 'ready']);
      assert.equal(sim.phase, 'won', `${sim.level.name} did not complete`);
      assert.equal(sim.shots, 1);
      assert.ok(Math.abs(sim.ball.position.x - sim.level.cup.x) < 14);
      assert.ok(sim.ball.position.y > sim.level.cup.y + 16, 'ball must visibly drop below the rim');
      assert.equal(sim.events.filter((e) => e.type === 'win').length, 1);
    } finally {
      sim.destroy();
    }
  });
test('shot power is capped and a second shot is rejected while moving', () => {
  const sim = new GolfSimulation(levels[0]);
  try {
    assert.equal(sim.shoot({ x: 1, y: 1 }), false);
    assert.equal(sim.shots, 0);
    sim.shoot({ x: -10000, y: 0 });
    assert.ok(sim.ball.speed <= MAX_PULL * 0.145 + 0.001);
    assert.equal(sim.shoot({ x: -50, y: 50 }), false);
    assert.equal(sim.shots, 1);
  } finally {
    sim.destroy();
  }
});
test('a short shot settles and permits a second shot', () => {
  const sim = new GolfSimulation(levels[0]);
  try {
    sim.shoot({ x: -25, y: 15 });
    until(sim, ['ready']);
    assert.ok(sim.ball.position.x > levels[0].start.x);
    assert.equal(sim.shoot({ x: -20, y: 10 }), true);
    assert.equal(sim.shots, 2);
  } finally {
    sim.destroy();
  }
});
test('water returns to the previous safe location without erasing the attempted stroke', () => {
  const sim = new GolfSimulation(levels[2]);
  try {
    sim.shoot({ x: -20, y: 20 });
    const safe = { ...sim.lastSafe };
    Matter.Body.setPosition(sim.ball, { x: 550, y: 630 });
    sim.step();
    assert.equal(sim.phase, 'respawning');
    until(sim, ['ready']);
    assert.ok(Math.hypot(sim.ball.position.x - safe.x, sim.ball.position.y - safe.y) < 1);
    assert.equal(sim.shots, 1);
    assert.ok(sim.events.some((e) => e.type === 'water'));
  } finally {
    sim.destroy();
  }
});
test('spring pad produces a strong upward impulse on contact', () => {
  const sim = new GolfSimulation(levels[4]);
  try {
    sim.phase = 'moving';
    Matter.Body.setPosition(sim.ball, { x: 530, y: 530 });
    Matter.Body.setVelocity(sim.ball, { x: 0, y: 4 });
    for (let i = 0; i < 30 && !sim.events.some((e) => e.type === 'bounce'); i++) sim.step();
    assert.ok(sim.events.some((e) => e.type === 'bounce'));
    assert.ok(sim.ball.velocity.y < -12);
  } finally {
    sim.destroy();
  }
});
test('moving obstacles traverse their declared path', () => {
  const sim = new GolfSimulation(levels[5]);
  try {
    const initial = sim.movers[0].body.position.y;
    for (let i = 0; i < 120; i++) sim.step();
    assert.ok(sim.movers[0].body.position.y > initial + 120);
  } finally {
    sim.destroy();
  }
});
test('being beside the hole is insufficient; dropping into its pocket wins', () => {
  const sim = new GolfSimulation(levels[0]);
  try {
    sim.phase = 'moving';
    Matter.Body.setPosition(sim.ball, { x: sim.level.cup.x - 32, y: sim.level.cup.y - 9 });
    for (let i = 0; i < 80; i++) sim.step();
    assert.equal(sim.phase, 'ready');
    sim.phase = 'moving';
    Matter.Body.setPosition(sim.ball, { x: sim.level.cup.x, y: sim.level.cup.y - 10 });
    Matter.Body.setVelocity(sim.ball, { x: 0, y: 0 });
    until(sim, ['won']);
    assert.ok(sim.ball.position.y > sim.level.cup.y + 16);
  } finally {
    sim.destroy();
  }
});
test('star ratings reward par, remain positive, and distinguish over-par scores', () => {
  assert.equal(rating(1, 3), 3);
  assert.equal(rating(3, 3), 3);
  assert.equal(rating(4, 3), 2);
  assert.equal(rating(5, 3), 2);
  assert.equal(rating(6, 3), 1);
});
test('a resting ball displaced by scenery must settle before another shot', () => {
  const sim = new GolfSimulation(levels[0]);
  try {
    Matter.Body.setVelocity(sim.ball, { x: 3, y: -2 });
    sim.step();
    assert.equal(sim.phase, 'moving');
    assert.equal(sim.shoot({ x: -40, y: 40 }), false);
    assert.equal(sim.shots, 0);
  } finally {
    sim.destroy();
  }
});
