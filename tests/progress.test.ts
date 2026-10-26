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
  assert.deepEqual(p, { best: { '1': 2, '11': 4 }, sound: false });
  assert.equal(
    saveProgress(p, {
      setItem: () => {
        throw Error('unavailable');
      },
    }),
    false,
  );
});
test('football progression is separate from obsolete level scores but keeps the sound preference', () => {
  const legacy = '{"best":{"1":1,"2":1},"sound":false}';
  const p = readProgress({ getItem: (key) => (key === 'goal-in-one:v1' ? legacy : null) });
  assert.deepEqual(p, { best: {}, sound: false });
});

test('restored original-layout records migrate, replaced designer records stay archived', () => {
  const p = readProgress({
    getItem: (key) =>
      key === 'goal-in-one:arenas:v3'
        ? '{"best":{"1":1,"10":2},"sound":true}'
        : key === 'goal-in-one:designer:v4'
          ? '{"best":{"2":1},"sound":false}'
          : null,
  });
  assert.deepEqual(p, { best: { '1': 1, '10': 2 }, sound: false });
  const modern = readProgress({
    getItem: (key) =>
      key === 'goal-in-one:grass:v5' ? '{"best":{"20":4,"41":1,"61":1},"sound":true}' : null,
  });
  assert.deepEqual(modern.best, { '20': 4, '41': 1 });
});
