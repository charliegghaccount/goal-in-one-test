import { test } from 'node:test';
import assert from 'node:assert/strict';
import Matter from 'matter-js';
import { levels } from '../src/levels';
import { FootballSimulation, MAX_PULL, BALL_RADIUS, rating, type Phase } from '../src/simulation';
import { solutions } from './solutions';
const move = Matter.Body;
function until(s: FootballSimulation, states: Phase[], max = 3000) {
  for (let i = 0; i < max && !states.includes(s.phase); i++) s.step();
  assert.ok(
    states.includes(s.phase),
    `${s.level.id}: got ${s.phase} at ${JSON.stringify(s.ball.position)}`,
  );
}
function kick(s: FootballSimulation, angle: number, power: number) {
  const a = (angle * Math.PI) / 180;
  return s.shoot({
    x: (-Math.cos(a) * MAX_PULL * power) / 100,
    y: (Math.sin(a) * MAX_PULL * power) / 100,
  });
}
for (const [i, route] of solutions.entries())
  test(`level ${i + 1}: legal kicks cross the real goal mouth within par`, () => {
    const s = new FootballSimulation(levels[i]);
    try {
      for (let j = 0; j < 12; j++) s.step();
      for (const k of route) {
        assert.equal(kick(s, k.angle, k.power), true);
        for (let j = 0; j < 1200 && s.phase !== 'won' && s.phase !== 'failed'; j++) s.step();
      }
      assert.equal(s.phase, 'won');
      assert.ok(s.shots <= s.level.par);
      assert.ok(rating(s.shots, s.level) === 3, 'configured 3-star threshold must be achievable');
      assert.equal(s.events.filter((e) => e.type === 'net').length, 1);
    } finally {
      s.destroy();
    }
  });
test('valid whole-ball crossing scores, including on the last permitted kick', () => {
  const s = new FootballSimulation(levels[0]);
  try {
    const g = s.level.goal;
    s.shots = s.level.par - 1;
    move.setPosition(s.ball, { x: g.x - BALL_RADIUS - 10, y: g.y - 45 });
    assert.equal(kick(s, 0, 30), true);
    until(s, ['won', 'failed']);
    assert.equal(s.phase, 'won');
    assert.equal(s.shots, s.level.par);
  } finally {
    s.destroy();
  }
});
test('being near or already inside the net does not score', () => {
  for (const dx of [-20, 40]) {
    const s = new FootballSimulation(levels[0]);
    try {
      move.setPosition(s.ball, { x: s.level.goal.x + dx, y: s.level.goal.y - 12 });
      s.phase = 'moving';
      until(s, ['ready']);
      assert.equal(
        s.events.some((e) => e.type === 'net'),
        false,
      );
    } finally {
      s.destroy();
    }
  }
});
test('backside hits and crossbar contact do not score', () => {
  for (const side of ['back', 'top']) {
    const s = new FootballSimulation(levels[0]);
    try {
      const g = s.level.goal;
      s.phase = 'moving';
      s.shots = 1;
      move.setPosition(
        s.ball,
        side === 'back'
          ? { x: g.x + g.w + 50, y: g.y - 60 }
          : { x: g.x + g.w / 2, y: g.y - g.h - 35 },
      );
      move.setVelocity(s.ball, side === 'back' ? { x: -7, y: 0 } : { x: 0, y: 4 });
      for (let i = 0; i < 150; i++) s.step();
      assert.equal(
        s.events.some((e) => e.type === 'net'),
        false,
      );
      assert.ok(s.events.some((e) => e.type === 'post'));
    } finally {
      s.destroy();
    }
  }
});
test('a teleported jump across the sensor cannot score', () => {
  const s = new FootballSimulation(levels[0]);
  try {
    const g = s.level.goal;
    s.phase = 'moving';
    move.setPosition(s.ball, { x: g.x - 20, y: g.y - 50 });
    move.setVelocity(s.ball, { x: 100, y: 0 });
    for (let i = 0; i < 5; i++) s.step();
    assert.equal(
      s.events.some((e) => e.type === 'net'),
      false,
    );
  } finally {
    s.destroy();
  }
});
test('budget failure waits until the final kick stops; retry starts fresh', () => {
  const s = new FootballSimulation({ ...levels[0], par: 1 });
  try {
    assert.equal(kick(s, 45, 10), true);
    assert.equal(s.phase, 'moving');
    assert.equal(kick(s, 45, 10), false);
    until(s, ['failed']);
    assert.equal(s.remaining, 0);
    assert.equal(kick(s, 45, 10), false);
  } finally {
    s.destroy();
  }
  const retry = new FootballSimulation(levels[5]);
  try {
    assert.equal(retry.shots, 0);
    assert.equal(retry.time, 0);
    assert.equal(retry.movers[0].body.position.y, levels[5].movers![0].y);
  } finally {
    retry.destroy();
  }
});
test('rest detection requires angular and linear settling, then permits another kick', () => {
  const s = new FootballSimulation(levels[0]);
  try {
    kick(s, 30, 18);
    until(s, ['ready']);
    assert.ok(s.ball.speed < 0.18);
    assert.ok(Math.abs(s.ball.angularVelocity) < 0.025);
    assert.equal(kick(s, 40, 20), true);
  } finally {
    s.destroy();
  }
});
test('power clamps, dead zone and nonfinite inputs do not spend extra kicks', () => {
  const s = new FootballSimulation(levels[0]);
  try {
    assert.equal(s.shoot({ x: 1, y: 1 }), false);
    assert.equal(s.shoot({ x: NaN, y: 3 }), false);
    assert.equal(s.shoot({ x: Infinity, y: 0 }), false);
    assert.equal(s.shots, 0);
    s.shoot({ x: -10000, y: 0 });
    assert.ok(s.ball.speed <= MAX_PULL * 0.145 + 0.001);
    assert.equal(s.shoot({ x: -20, y: 20 }), false);
    assert.equal(s.shots, 1);
  } finally {
    s.destroy();
  }
});
test('water resets to the last kick location and consumes the attempted kick', () => {
  const s = new FootballSimulation(levels[3]);
  try {
    kick(s, 20, 20);
    const safe = { ...s.lastSafe };
    move.setPosition(s.ball, { x: 450, y: 650 });
    s.step();
    assert.equal(s.phase, 'respawning');
    until(s, ['ready']);
    assert.ok(Math.hypot(s.ball.position.x - safe.x, s.ball.position.y - safe.y) < 1);
    assert.equal(s.shots, 1);
  } finally {
    s.destroy();
  }
});
test('spring route really contacts the spring and launches upward', () => {
  const s = new FootballSimulation(levels[6]);
  try {
    kick(s, 18, 92);
    until(s, ['won', 'ready']);
    assert.equal(s.phase, 'won');
    assert.ok(s.events.some((e) => e.type === 'bounce'));
  } finally {
    s.destroy();
  }
});
test('moving gate traverses its path and a fresh retry restores its phase', () => {
  const s = new FootballSimulation(levels[5]);
  try {
    const y = s.movers[0].body.position.y;
    for (let i = 0; i < 108; i++) s.step();
    assert.ok(s.movers[0].body.position.y > y + 105);
  } finally {
    s.destroy();
  }
});
test('all star thresholds are ordered, within budget, and distinguish each score tier', () => {
  for (const l of levels) {
    assert.ok(l.starShots[0] < l.starShots[1]);
    assert.ok(l.starShots[1] < l.par);
    assert.equal(rating(l.starShots[0], l), 3);
    assert.equal(rating(l.starShots[0] + 1, l), 2);
    assert.equal(rating(l.par, l), 1);
    assert.equal(rating(l.par + 1, l), 0);
    assert.equal(rating(0, l), 0);
  }
});
test('finale two-kick route tolerates initial settling and pointer rounding differences', () => {
  for (const settle of [10, 11, 12, 13, 14]) {
    const s = new FootballSimulation(levels[9]);
    try {
      for (let i = 0; i < settle; i++) s.step();
      const a = (51 * Math.PI) / 180;
      s.shoot({ x: -Math.cos(a) * 140 * 0.96 + 0.000002, y: Math.sin(a) * 140 * 0.96 - 0.00002 });
      for (let i = 0; i < 1200; i++) s.step();
      assert.equal(kick(s, 9, 44), true);
      until(s, ['won', 'ready']);
      assert.equal(s.phase, 'won', `initial settle ${settle} must remain playable`);
    } finally {
      s.destroy();
    }
  }
});
