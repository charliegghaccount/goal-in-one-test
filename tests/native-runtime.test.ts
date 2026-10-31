import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ActivityGate, restoreMissing, gameSnapshot, isNative } from '../src/native-runtime';
import { readProgress } from '../src/progress';
import { Audio } from '../src/audio';
test('web detection and activity gate require native and document foreground together', () => {
  assert.equal(isNative(), false);
  const g = new ActivityGate();
  assert.equal(g.active, true);
  g.native = false;
  assert.equal(g.active, false);
  g.visible = true;
  assert.equal(g.active, false);
  g.native = true;
  g.visible = false;
  assert.equal(g.active, false);
});
test('native restore preserves live saves and all game namespaces without importing unrelated data', () => {
  const m = new Map([['goal-in-one:grass:v5', 'current']]);
  const store = {
    get length() {
      return m.size;
    },
    key: (i: number) => [...m.keys()][i],
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => m.set(k, v),
  } as unknown as Storage;
  restoreMissing(store, {
    'goal-in-one:grass:v5': 'old',
    'goal-in-one:campaign:v1': 'drafts',
    other: 'private',
  });
  assert.equal(m.get('goal-in-one:grass:v5'), 'current');
  assert.equal(m.get('goal-in-one:campaign:v1'), 'drafts');
  assert.equal(m.has('other'), false);
  assert.equal(Object.keys(gameSnapshot(store)).length, 2);
});
test('announcer defaults off for new and legacy saves while effects stay enabled', () => {
  assert.equal(new Audio().announcerEnabled, false);
  for (const value of [null, JSON.stringify({ best: { 1: 1 }, sound: true })]) {
    const p = readProgress({ getItem: () => value });
    assert.notEqual(p.announcer, true);
    assert.equal(p.sound, true);
  }
  assert.equal(
    readProgress({ getItem: () => JSON.stringify({ announcer: true, sound: false }) }).announcer,
    true,
  );
});

test('WebKit interrupted audio can resume from the next user gesture', () => {
  const audio = new Audio();
  let resumes = 0;
  audio.context = {
    state: 'interrupted',
    destination: {},
    createGain: () => ({ connect: () => {} }),
    resume: async () => {
      resumes++;
    },
  } as unknown as AudioContext;
  audio.unlock();
  assert.equal(resumes, 1);
});
