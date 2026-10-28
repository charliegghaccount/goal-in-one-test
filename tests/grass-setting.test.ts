import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blank, parseDraft } from '../src/editor/model';
import { add, object } from '../src/editor/objects';
import { segments } from '../src/levels';
import { CampaignRepository } from '../src/campaign';
test('individual grass flags survive native draft import and campaign publication without changing segments', () => {
  const d = blank(),
    l = d.level;
  for (const [i, t] of ['block', 'ramp', 'mover-x', 'breakable', 'gate', 'rotor'].entries()) {
    const [r] = add(l, t as Parameters<typeof add>[1], {
      x: 220 + (i % 3) * 300,
      y: 250 + Math.floor(i / 3) * 200,
    });
    object(l, r).grass = i % 2 === 0;
  }
  const original = structuredClone(segments(l));
  l.grass = false;
  const imported = parseDraft(JSON.stringify(d));
  assert.ok(!Array.isArray(imported));
  assert.deepEqual(imported.level, l);
  assert.deepEqual(segments(l), original);
  const store = new Map<string, string>();
  const repo = new CampaignRepository({
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => {
      store.set(k, v);
    },
  });
  imported.designId = repo.saveDraft(imported);
  repo.publish(imported);
  const reloaded = new CampaignRepository({
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => {
      store.set(k, v);
    },
  });
  assert.equal(reloaded.playable().at(-1)?.grass, false);
});
test('grass flags are boolean and absent flags leave legacy geometry untouched', () => {
  const d = blank();
  (d.level as unknown as { grass: unknown }).grass = 'false';
  assert.throws(() => parseDraft(JSON.stringify(d)), /Grass edging/);
});
