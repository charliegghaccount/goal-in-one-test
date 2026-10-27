import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blank, moveGoal, repairGoal, parseDraft } from '../src/editor/model';
import { validateLevel } from '../src/editor/validation';
import { segments, arenaPolygon } from '../src/levels';
import { FootballSimulation } from '../src/simulation';
import { boxPoints } from '../src/geometry';
test('tilting the goal wall repairs attachment and leaves a closed perimeter', () => {
  const l = blank().level;
  l.boundary![2] = { x: 1020, y: 180 };
  l.outline = structuredClone(l.boundary!);
  assert.ok(repairGoal(l, l.goal));
  assert.equal(l.goal.placement, 'free');
  assert.deepEqual(
    validateLevel(l).filter((i) => i.severity === 'error'),
    [],
  );
  assert.equal(segments(l).filter((s) => s.kind === 'wall').length, 4);
});
test('free placement preserves exact coordinates, rejects blocked/outside nets and roundtrips', () => {
  const d = blank(),
    l = d.level;
  moveGoal(l, { x: 700, y: 640 });
  assert.equal(l.goal.x, 700);
  assert.equal(l.goal.placement, 'free');
  assert.deepEqual(arenaPolygon(l), l.boundary);
  assert.deepEqual(
    validateLevel(l).filter((i) => i.severity === 'error'),
    [],
  );
  const copy = parseDraft(JSON.stringify(d));
  assert.ok(!Array.isArray(copy));
  if (!Array.isArray(copy)) assert.deepEqual(copy.level.goal, l.goal);
  l.obstacles.push({ id: 'blocked-net', points: boxPoints(760, 600, 40, 40) });
  assert.ok(validateLevel(l).some((i) => i.severity === 'error' && i.message.includes('Goal/net')));
  l.obstacles = [];
  moveGoal(l, { x: 1300, y: 640 });
  assert.ok(validateLevel(l).some((i) => i.severity === 'error'));
});
test('a free-standing goal scores through actual simulated kick motion', () => {
  const l = blank().level;
  moveGoal(l, { x: 700, y: 640 });
  const s = new FootballSimulation(l);
  s.shoot({ x: -112, y: 0 });
  for (let i = 0; i < 1800 && s.phase !== 'won'; i++) s.step();
  assert.equal(s.phase, 'won');
  assert.equal(s.shots, 1);
  s.destroy();
});
