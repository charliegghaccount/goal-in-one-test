import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Camera } from '../src/camera';
import { blank, keepGoalPosition, syncBoundary } from '../src/editor/model';
test('roof edits leave the authoring camera and unrelated objects fixed until Fit', () => {
  const l = blank().level,
    c = new Camera();
  c.editorWorkspace = true;
  c.resize(l, 1000, 760);
  const before = { view: { ...c.view }, scale: c.scale, offsetX: c.offsetX, offsetY: c.offsetY },
    start = { ...l.start },
    goal = { ...l.goal };
  l.boundary![1].y = 400;
  l.boundary![2].y = 380;
  syncBoundary(l);
  keepGoalPosition(l);
  c.resize(l, 1000, 760);
  assert.deepEqual(
    { view: c.view, scale: c.scale, offsetX: c.offsetX, offsetY: c.offsetY },
    before,
  );
  assert.deepEqual(l.start, start);
  assert.deepEqual(l.goal, goal);
  const frame = c.editorFrame!,
    saved = { ...c.view };
  const restored = new Camera();
  restored.editorWorkspace = true;
  restored.resize(l, 1000, 760);
  restored.restoreWorkspace(saved, c.userZoom, frame);
  assert.deepEqual(restored.view, saved);
  c.fit();
  assert.notEqual(c.view.y, before.view.y);
});
