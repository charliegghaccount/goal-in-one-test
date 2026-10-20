import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readProgress, recordBest, saveProgress } from '../src/progress';
test('best scores survive serialization and cannot be overwritten by a worse round', () => {
  const p = readProgress({ getItem: () => null });
  recordBest(p, 1, 4);
  recordBest(p, 1, 7);
  assert.equal(p.best[1], 4);
  recordBest(p, 1, 2);
  let data = '';
  assert.equal(
    saveProgress(p, {
      setItem: (_, v) => {
        data = v;
      },
    }),
    true,
  );
  assert.deepEqual(readProgress({ getItem: () => data }), { best: { '1': 2 }, sound: true });
});
test('malformed, corrupt, or unavailable browser storage does not break play', () => {
  assert.deepEqual(readProgress({ getItem: () => '{bad' }).best, {});
  assert.deepEqual(readProgress({ getItem: () => 'null' }).best, {});
  const p = readProgress({
    getItem: () => '{"best":{"1":2,"2":-1,"3":"oops","11":4},"sound":false}',
  });
  assert.deepEqual(p, { best: { '1': 2 }, sound: false });
  assert.equal(
    saveProgress(p, {
      setItem: () => {
        throw Error('unavailable');
      },
    }),
    false,
  );
});
