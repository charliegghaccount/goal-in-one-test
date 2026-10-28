import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chapterSlots, chapterStars, chapterCount, continueLevel } from '../src/ui-campaign';
import { levels } from '../src/levels';
import { recordLevelBest } from '../src/progress';
test('four 25-slot chapters preserve all sixty playable levels and reserve only unpublished slots', () => {
  assert.equal(chapterCount(levels), 4);
  const slots = Array.from({ length: 4 }, (_, i) => chapterSlots(levels, i)).flat();
  assert.equal(slots.length, 100);
  assert.deepEqual(
    slots.filter((s) => s.level).map((s) => s.level!.id),
    levels.map((l) => l.id),
  );
  assert.deepEqual(
    slots.filter((s) => !s.level).map((s) => s.number),
    Array.from({ length: 40 }, (_, i) => i + 61),
  );
  assert.deepEqual(
    slots.filter((s) => s.longHole).map((s) => s.number),
    [25, 50, 75, 100],
  );
});
test('chapter totals and PLAY retain legacy progress and configured star thresholds without mutation', () => {
  const p = { best: { 1: 1, 25: 2, 26: 1, 60: 100 }, sound: false },
    before = JSON.stringify(p);
  const earned = (n: number, s: number) =>
    s <= levels[n - 1].starShots[0] ? 3 : s <= levels[n - 1].starShots[1] ? 2 : 1;
  assert.equal(chapterStars(levels, p, 0), 3 + earned(25, 2));
  assert.equal(chapterStars(levels, p, 1), 3);
  assert.equal(chapterStars(levels, p, 2), 1);
  assert.equal(chapterStars(levels, p, 3), 0);
  assert.equal(continueLevel(levels, p), 2);
  assert.equal(JSON.stringify(p), before);
});
test('reordered campaign designs keep their earned stars with stable identity and revision', () => {
  const first = { ...levels[0], campaignId: 'custom-a', revision: 2 },
    second = { ...levels[1], campaignId: 'custom-b', revision: 1 };
  const p = { best: {}, sound: true };
  recordLevelBest(p, first, 1);
  assert.equal(chapterStars([second, first], p, 0), 3);
  assert.equal(continueLevel([first, second], p), second.id);
  assert.equal(chapterStars([{ ...first, revision: 3 }], p, 0), 0);
  assert.equal(continueLevel([], p), null);
});
