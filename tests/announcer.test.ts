import { test } from 'node:test';
import assert from 'node:assert/strict';
import { announcementFor, completionTitle } from '../src/celebration';
import { Audio } from '../src/audio';
import { rating } from '../src/simulation';
const level = { par: 4, starShots: [2, 4] as [number, number] };
for (const [shots, line] of [
  [1, 'one-shot'],
  [2, null],
  [3, 'goal'],
  [4, 'goal'],
  [5, 'solid-effort'],
  [6, 'disappointed'],
  [100, 'disappointed'],
] as const)
  test(`announcer for ${shots} shots uses actual thresholds and par`, () =>
    assert.equal(announcementFor(shots, level), line));
test('one shot overrides a custom one-star rating, and disappointment requires one star', () => {
  assert.equal(rating(1, { starShots: [0, 0] }), 1);
  assert.equal(announcementFor(1, { par: 0, starShots: [0, 0] }), 'one-shot');
  assert.equal(announcementFor(6, { par: 2, starShots: [6, 8] }), null);
  assert.equal(announcementFor(7, { par: 2, starShots: [6, 8] }), 'goal');
  assert.equal(completionTitle(5, level), 'A Solid Effort');
  assert.equal(completionTitle(6, level), 'Should Have Done Better There');
});
function harness() {
  const a = new Audio(),
    started: string[] = [],
    stopped: string[] = [],
    played: string[] = [];
  a.announcerEnabled = true;
  a.context = {
    currentTime: 1,
    destination: {},
    createGain: () => ({ gain: { value: 0 }, connect: () => {} }),
    createBufferSource: () => {
      const source = {
        buffer: null as unknown as AudioBuffer,
        onended: null,
        start: () => started.push((source.buffer as unknown as { name: string }).name),
        stop: () => stopped.push((source.buffer as unknown as { name: string }).name),
        connect: () => {},
      };
      return source;
    },
  } as unknown as AudioContext;
  const inner = a as unknown as {
    voices: Map<string, AudioBuffer>;
    loadVoice: (key: string) => Promise<AudioBuffer | null>;
  };
  const buffer = (name: string) => ({ name, duration: 2 }) as unknown as AudioBuffer;
  for (const key of ['one-shot', 'goal', 'solid-effort', 'disappointed'])
    inner.voices.set(key, buffer(key));
  a.play = (t) => played.push(t);
  return { a, inner, started, stopped, played, buffer };
}
test('all four recordings route once, cancel preceding sources and respect mute', () => {
  const h = harness();
  for (const [i, shots] of [1, 3, 5, 6].entries()) {
    h.a.celebrate(shots, i, level);
    h.a.celebrate(shots, i, level);
  }
  assert.deepEqual(h.started, ['one-shot', 'goal', 'solid-effort', 'disappointed']);
  assert.deepEqual(h.stopped, ['one-shot', 'goal', 'solid-effort']);
  h.a.enabled = false;
  assert.equal(h.stopped.length, 4);
  h.a.celebrate(1, 10, level);
  h.a.enabled = true;
  h.a.celebrate(1, 10, level);
  assert.equal(h.started.length, 4);
  h.a.celebrate(2, 11, level);
  assert.equal(h.started.length, 4);
  assert.equal(h.played.length, 5);
});
test('late decode cannot speak after restart/mute or overlap a newer round', async () => {
  const h = harness();
  h.inner.voices.clear();
  let ready!: (b: AudioBuffer) => void;
  h.inner.loadVoice = () =>
    new Promise((r) => {
      ready = r;
    });
  h.a.celebrate(1, 1, level);
  h.a.stopVoice();
  ready(h.buffer('stale'));
  await Promise.resolve();
  assert.deepEqual(h.started, []);
  h.a.celebrate(1, 2, level);
  h.a.enabled = false;
  ready(h.buffer('muted'));
  await Promise.resolve();
  assert.deepEqual(h.started, []);
  h.a.enabled = true;
  h.a.celebrate(1, 3, level);
  const stale = ready;
  h.a.celebrate(3, 4, level);
  stale(h.buffer('old'));
  ready(h.buffer('new'));
  await Promise.resolve();
  assert.deepEqual(h.started, ['new']);
  h.a.stopVoice();
  assert.deepEqual(h.stopped, ['new']);
});
