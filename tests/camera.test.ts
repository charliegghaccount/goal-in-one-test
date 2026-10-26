import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Camera, viewBounds } from '../src/camera';
import { levels, type Point } from '../src/levels';
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
for (const size of [
  { w: 1440, h: 700 },
  { w: 912, h: 374 },
  { w: 824, h: 334 },
  { w: 720, h: 304 },
])
  for (const l of levels.slice(40)) {
    test(`camera ${l.id}: ${size.w}x${size.h} scale, reversible coordinates, bounds and visible football`, () => {
      const c = new Camera();
      c.resize(l, size.w, size.h);
      assert.ok(c.scale * 32 >= 20 - 1e-8);
      for (const p of [l.start, { x: l.goal.x, y: l.goal.y - 24 }, { x: l.width / 2, y: 200 }]) {
        for (let n = 0; n < 120; n++) c.update(p, { x: 15, y: -10 }, 1 / 60);
        const s = c.worldToScreen(p),
          world = c.screenToWorld(s);
        near(world.x, p.x);
        near(world.y, p.y);
        if (l.camera!.mode !== 'fixed') {
          assert.ok(
            c.view.x >= c.bounds.x - 1e-7 && c.view.x + c.view.w <= c.bounds.x + c.bounds.w + 1e-7,
          );
          assert.ok(
            c.view.y >= c.bounds.y - 1e-7 && c.view.y + c.view.h <= c.bounds.y + c.bounds.h + 1e-7,
          );
        }
      }
    });
  }
test('legacy fixed camera rectangles and transforms are unchanged across forty levels', () => {
  for (const l of levels.slice(0, 40)) {
    const y = Math.min(...l.outline.map((p) => p.y)) - 65;
    assert.deepEqual(viewBounds(l), {
      x: 25,
      y,
      w: 1250,
      h: Math.max(...l.outline.map((p) => p.y)) - y + 55,
    });
    const c = new Camera();
    c.resize(l, 1200, 600);
    const initial = { ...c.view };
    c.update({ x: 900, y: 300 }, { x: 10, y: -5 }, 2);
    assert.deepEqual(c.view, initial);
  }
});
test('horizontal/vertical following is smooth, stable at rest, and clamps fast reversals', () => {
  for (const id of [53, 54, 58, 60]) {
    const c = new Camera(),
      l = levels[id - 1];
    c.resize(l, 824, 334);
    let p = { ...l.start },
      prev = { ...c.view };
    for (let n = 0; n < 600; n++) {
      p = {
        x: Math.min(l.goal.x, l.start.x + n * 4),
        y: Math.min(l.goal.y - 22, Math.max(c.bounds.y + 50, l.start.y - 200 * Math.sin(n / 140))),
      };
      c.update(p, { x: n > 300 ? -20 : 20, y: 0 }, 1 / 120);
      assert.ok(Math.abs(c.view.x - prev.x) < 25, `x jump ${id}`);
      assert.ok(Math.abs(c.view.y - prev.y) < 25, `y jump ${id}`);
      const s = c.worldToScreen(p);
      assert.ok(s.x >= 0 && s.x <= 824 && s.y >= 0 && s.y <= 334);
      prev = { ...c.view };
    }
    for (let n = 0; n < 600; n++) c.update(p, { x: 0, y: 0 }, 1 / 120);
    const rest = { ...c.view };
    for (let n = 0; n < 120; n++) c.update(p, { x: 0, y: 0 }, 1 / 120);
    near(c.view.x, rest.x);
    near(c.view.y, rest.y);
  }
});
test('goal indicator tracks view changes; overview is explicit and preserves transform inversion', () => {
  const l = levels[59],
    c = new Camera();
  c.resize(l, 824, 334);
  const g = { x: l.goal.x, y: l.goal.y - l.goal.h / 2 };
  assert.ok(c.goalIndicator(g));
  c.resetTo(g);
  assert.equal(c.goalIndicator(g), null);
  c.setOverview(true);
  c.resize(l, 824, 334);
  assert.equal(c.goalIndicator(g), null);
  assert.deepEqual(c.view, viewBounds(l));
  const s = c.worldToScreen(l.start);
  const w = c.screenToWorld(s);
  near(w.x, l.start.x);
  near(w.y, l.start.y);
  c.setOverview(false);
  c.resize(l, 824, 334);
  c.resetTo(l.start);
  assert.ok(c.goalIndicator(g));
});

test('camera zoom and custom tracking bounds are configurable without changing physics coordinates', () => {
  const l = structuredClone(levels[52]);
  l.camera!.bounds = { x: 16, y: 117, w: 2215, h: 531 };
  const wide = new Camera();
  wide.resize(l, 1000, 560);
  l.camera!.zoom = 1.4;
  const close = new Camera();
  close.resize(l, 1000, 560);
  assert.ok(close.view.w < wide.view.w);
  for (const c of [wide, close]) {
    c.resetTo({ x: 1900, y: 450 });
    const p = c.screenToWorld(c.worldToScreen({ x: 1680, y: 375 }));
    near(p.x, 1680);
    near(p.y, 375);
    assert.ok(c.view.x + c.view.w <= 2231);
  }
});
