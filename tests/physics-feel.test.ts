import { test } from 'node:test';
import assert from 'node:assert/strict';
import Matter from 'matter-js';
import { FootballSimulation, STEP } from '../src/simulation';
import { levels } from '../src/levels';
import { defaultPhysics } from '../src/physics';
const { Body } = Matter;
test('flat rolling loses momentum gradually and travels a useful distance', () => {
  const s = new FootballSimulation(levels[0]);
  for (let i = 0; i < 100; i++) s.step();
  Body.setVelocity(s.ball, { x: 6, y: 0 });
  const x = s.ball.position.x;
  for (let i = 0; i < 120; i++) s.step();
  assert.ok(s.ball.position.x - x > 140);
  assert.ok(s.ball.velocity.x > 1);
  for (let i = 0; i < 6000; i++) s.step();
  assert.ok(s.ball.speed < 0.3);
  s.destroy();
});
test('opposite rapid kick has authority despite extreme incoming speed and spin', () => {
  const s = new FootballSimulation(levels[0]);
  Body.setVelocity(s.ball, { x: -30, y: 5 });
  Body.setAngularVelocity(s.ball, 3);
  s.shoot({ x: -100, y: 0 });
  assert.ok(s.ball.velocity.x > 8);
  assert.ok(Math.abs(s.ball.angularVelocity) <= defaultPhysics.maxAngularVelocity);
  s.shoot({ x: 100, y: 0 });
  assert.ok(s.ball.velocity.x < 0);
  assert.equal(s.shots, 2);
  s.destroy();
});
test('boost acceleration starts on first contact step and continues smoothly with no timer', () => {
  const s = new FootballSimulation(levels[4]),
    p = s.level.surfaces[0];
  Body.setPosition(s.ball, { x: p.x + 40, y: p.y - 20 });
  Body.setVelocity(s.ball, { x: 0, y: 0 });
  const changes = [];
  for (let i = 0; i < 24; i++) {
    const x = s.ball.velocity.x;
    s.step();
    changes.push(s.ball.velocity.x - x);
  }
  assert.ok(changes[0] > 0);
  assert.ok(changes.every((v) => v > 0 && v < 0.3));
  Body.setPosition(s.ball, { x: p.x - 70, y: p.y - 100 });
  Body.setVelocity(s.ball, { x: 0, y: 0 });
  s.step();
  assert.ok(Math.abs(s.ball.velocity.x) < 0.001);
  s.destroy();
});
test('continuous boost smoothly reverses opposing momentum', () => {
  const s = new FootballSimulation(levels[4]),
    p = s.level.surfaces[0];
  Body.setPosition(s.ball, { x: p.x + p.w * 0.75, y: p.y - 21 });
  Body.setVelocity(s.ball, { x: -4, y: 0 });
  let last = -4;
  for (let i = 0; i < 100; i++) {
    s.step();
    assert.ok(s.ball.velocity.x - last < 0.5);
    last = s.ball.velocity.x;
  }
  assert.ok(s.ball.velocity.x > 0);
  s.destroy();
});

test('collision response cannot exceed the configured angular velocity cap', () => {
  const s = new FootballSimulation(levels[0]);
  Body.setPosition(s.ball, { x: 100, y: levels[0].goal.y - 24 });
  Body.setVelocity(s.ball, { x: -35, y: 8 });
  Body.setAngularVelocity(s.ball, 4);
  for (let i = 0; i < 240; i++) {
    s.step();
    assert.ok(Math.abs(s.ball.angularVelocity) <= s.config.maxAngularVelocity + 0.000001);
  }
  s.destroy();
});
