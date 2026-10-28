import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backgroundLayout } from '../src/background-layout';
for (const [w, h] of [
  [1280, 720],
  [844, 390],
  [390, 844],
  [1920, 1080],
])
  for (const x of [-1000000, -20000, 0, 20000, 1000000])
    test(`background covers ${w}x${h} at horizontal offset ${x}`, () => {
      const l = backgroundLayout(w, h, 1672, 941, x);
      assert.ok(l.tiles[0].x <= 0);
      assert.ok(l.tiles.at(-1)!.x + l.tileWidth >= w);
      assert.ok(Math.abs(l.tileWidth / l.tileHeight - 1672 / 941) < 1e-9);
      for (let i = 1; i < l.tiles.length; i++) {
        assert.ok(Math.abs(l.tiles[i].x - l.tiles[i - 1].x - l.tileWidth) < 1e-7);
        assert.notEqual(l.tiles[i].mirrored, l.tiles[i - 1].mirrored);
      }
    });
test('vertical movement shifts the landscape without vertical repetition and is reversible', () => {
  const a = backgroundLayout(1280, 720, 1672, 941, 0, 0),
    up = backgroundLayout(1280, 720, 1672, 941, 0, -10000),
    down = backgroundLayout(1280, 720, 1672, 941, 0, 10000);
  assert.ok(up.top > a.top);
  assert.ok(down.top < a.top);
  assert.equal(up.tiles.length, a.tiles.length);
  assert.deepEqual(backgroundLayout(1280, 720, 1672, 941, 0, 0), a);
});
