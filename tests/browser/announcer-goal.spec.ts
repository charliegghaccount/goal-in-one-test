import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const evidence = process.env.ANNOUNCER_EVIDENCE ?? 'test-results/announcer-goal';
mkdirSync(evidence, { recursive: true });
async function frozen(p: Page) {
  const t = new Date('2026-10-28T10:00:00Z');
  await p.clock.install({ time: t });
  await p.clock.pauseAt(new Date(+t + 1000));
  await p.goto('/?dev=1&editor=1');
  await p.clock.runFor(60);
}
async function field(p: Page, name: string, v: string) {
  const f = p.getByRole('spinbutton', { name, exact: true });
  await f.fill(v);
  await f.press('Tab');
  await p.clock.runFor(17);
}
async function world(p: Page, x: number, y: number) {
  const c = p.locator('#editor-canvas'),
    r = (await c.boundingBox())!,
    d = await c.evaluate((c) => ({ ...c.dataset })),
    s = +d.scale!;
  return {
    x: r.x + (r.width - +d.viewWidth! * s) / 2 + (x - +d.cameraX!) * s,
    y: r.y + (r.height - +d.viewHeight! * s) / 2 + (y - +d.cameraY!) * s,
  };
}
async function place(p: Page, name: string, x: number, y: number) {
  await p.locator('.object-library').getByRole('button', { name, exact: true }).click();
  const q = await world(p, x, y);
  await p.mouse.click(q.x, q.y);
  await p.clock.runFor(34);
}
async function exported(p: Page) {
  await p.locator('[data-command="Export"]').click();
  const d = JSON.parse(await p.locator('#ed-json').inputValue());
  await p.getByRole('button', { name: 'Close dialog', exact: true }).click();
  return d;
}
async function kick(p: Page, pull: number) {
  const c = p.locator('#scene'),
    r = (await c.boundingBox())!,
    s = +(await c.getAttribute('data-scale'))!,
    x = r.x + r.width * 0.4,
    y = r.y + r.height * 0.45;
  await p.mouse.move(x, y);
  await p.mouse.down();
  await p.mouse.move(x - pull * s, y, { steps: 5 });
  await p.mouse.up();
}
async function audioProbe(p: Page) {
  await p.addInitScript(() => {
    const key = 'goal-in-one:grass:v5';
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    data.announcer = true;
    localStorage.setItem(key, JSON.stringify(data));
  });
  await p.addInitScript(() => {
    const w = window as any;
    w.__voiceEvents = [];
    w.__decoded = [];
    w.__activeVoices = 0;
    const proto = AudioContext.prototype as any,
      decode = proto.decodeAudioData;
    proto.decodeAudioData = function (...args: any[]) {
      return decode.apply(this, args).then((b: AudioBuffer) => {
        w.__decoded.push(b.duration);
        return b;
      });
    };
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function () {
      w.__voiceEvents.push({ type: 'start', duration: this.buffer?.duration });
      w.__activeVoices++;
      let ended = false;
      this.addEventListener('ended', () => {
        if (!ended) {
          w.__activeVoices--;
          ended = true;
        }
      });
      (this as any).__finish = () => {
        if (!ended) {
          w.__activeVoices--;
          ended = true;
        }
      };
      return Reflect.apply(start, this, arguments);
    };
    const stop = AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.stop = function () {
      w.__voiceEvents.push({ type: 'stop', duration: this.buffer?.duration });
      (this as any).__finish?.();
      return Reflect.apply(stop, this, arguments);
    };
  });
}
for (const spec of [
  { shots: 1, key: 'one-shot', title: 'GOAL IN ONE!', stars: 3, duration: 2.5 },
  { shots: 2, key: 'goal', title: 'GOAL!', stars: 2, duration: 1.22 },
  { shots: 3, key: 'solid-effort', title: 'A Solid Effort', stars: 1, duration: 1.64 },
  {
    shots: 4,
    key: 'disappointed',
    title: 'Should Have Done Better There',
    stars: 1,
    duration: 1.88,
  },
  { shots: 2, key: 'none', title: 'BRILLIANT GOAL!', stars: 3, duration: 0 },
])
  test(`actual ${spec.shots}-shot / ${spec.stars}-star goal routes ${spec.key} once`, async ({
    page: p,
  }) => {
    test.setTimeout(90000);
    const errors: string[] = [],
      requests: string[] = [];
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('request', (r) => {
      if (/\.mp3/.test(r.url())) requests.push(r.url());
    });
    await audioProbe(p);
    await frozen(p);
    await p.getByRole('button', { name: 'Level settings', exact: true }).first().click();
    await field(p, 'Par', '2');
    await field(p, 'Three-star shots', spec.key === 'none' ? '3' : '1');
    await field(p, 'Two-star shots', spec.key === 'none' ? '4' : '2');
    await p.locator('[data-command="Test Level"]').click();
    await p.clock.runFor(100);
    // One tiny leftward kick for every extra shot, keeping the final scoring shot reproducible.
    for (let i = 0; i < spec.shots - 1; i++) {
      await kick(p, -7);
      await p.clock.runFor(2000);
    }
    await kick(p, 112);
    await expect.poll(() => p.evaluate(() => (window as any).__decoded.length)).toBe(4);
    await p.clock.runFor(12000);
    const dialog = p.getByRole('dialog', { name: 'Draft goal scored' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: spec.title, exact: true })).toBeVisible();
    await expect(dialog.getByLabel(`${spec.stars} out of 3 stars`)).toBeVisible();
    await expect(p.locator('#app')).toHaveAttribute('data-announcement', spec.key);
    const events = await p.evaluate(() =>
      (window as any).__voiceEvents.filter((x: any) => x.type === 'start'),
    );
    expect(events).toHaveLength(spec.key === 'none' ? 0 : 1);
    if (spec.duration) expect(events[0].duration).toBeCloseTo(spec.duration, 0);
    await p.clock.runFor(1500);
    expect(
      await p.evaluate(
        () => (window as any).__voiceEvents.filter((x: any) => x.type === 'start').length,
      ),
    ).toBe(events.length);
    await p.screenshot({ path: `${evidence}/result-${spec.key}.jpg`, quality: 88 });
    await dialog.getByRole('button', { name: 'RETRY TEST', exact: true }).click();
    await p.clock.runFor(34);
    expect(await p.evaluate(() => (window as any).__activeVoices)).toBe(0);
    await expect(p.locator('#shots')).toHaveText('0');
    if (spec.key === 'one-shot') {
      await p.getByRole('button', { name: 'Mute sound', exact: true }).click();
      await kick(p, 112);
      await p.clock.runFor(12000);
      await expect(dialog).toBeVisible();
      expect(await p.evaluate(() => (window as any).__activeVoices)).toBe(0);
      expect(
        await p.evaluate(
          () => (window as any).__voiceEvents.filter((x: any) => x.type === 'start').length,
        ),
      ).toBe(1);
    }
    expect(requests).toHaveLength(4);
    expect(new Set(requests).size).toBe(4);
    expect(errors).toEqual([]);
    writeFileSync(
      `${evidence}/audio-${spec.key}.json`,
      JSON.stringify(
        {
          shots: spec.shots,
          stars: spec.stars,
          announcement: spec.key,
          events,
          requests,
          pageErrors: errors,
        },
        null,
        2,
      ),
    );
  });
test('white wedge frame and mesh keep both goal entrances completely open', async ({ page: p }) => {
  await p.goto('/');
  const r = await p.evaluate(async () => {
    const { drawGoalFrame, drawGoalNet } = await import('/src/' + 'goal-art.ts');
    const c = document.createElement('canvas');
    c.id = 'goal-art-proof';
    c.width = 1000;
    c.height = 440;
    c.style.cssText = 'position:fixed;left:0;top:0;width:1000px;height:440px;z-index:99999';
    document.body.append(c);
    const x = c.getContext('2d')!,
      g = { x: 80, y: 290, w: 310, h: 220, roof: 190 },
      left = { ...g, x: 900, w: -310, roof: -190 };
    const before = JSON.stringify([g, left]);
    for (const goal of [g, left]) {
      drawGoalNet(x, goal, -10, true);
      drawGoalFrame(x, goal, 12);
    }
    const alpha = (a: number, b: number) => x.getImageData(a, b, 1, 1).data[3];
    const open = [alpha(80, 180), alpha(81, 180), alpha(900, 180), alpha(899, 180)],
      top = Array.from(x.getImageData(180, 70, 1, 1).data);
    x.globalCompositeOperation = 'destination-over';
    x.fillStyle = '#c4e5eb';
    x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = 'source-over';
    x.fillStyle = '#2b4555';
    x.font = 'bold 20px sans-serif';
    x.fillText('Open left entrance', 80, 350);
    x.fillText('Mirrored goal · open right entrance', 540, 350);
    return { open, top, unchanged: before === JSON.stringify([g, left]) };
  });
  expect(r.open).toEqual([0, 0, 0, 0]);
  expect(r.top[0]).toBeGreaterThan(170);
  expect(r.top[1]).toBeGreaterThan(170);
  expect(r.top[2]).toBeGreaterThan(170);
  expect(r.unchanged).toBe(true);
  await p.locator('#goal-art-proof').screenshot({ path: `${evidence}/white-goals.png` });
});
test('individual grass controls, rotated shapes and resized white goal persist through publish/reload/play', async ({
  page: p,
}) => {
  test.setTimeout(90000);
  await frozen(p);
  for (const [name, x, y, on] of [
    ['Block', 300, 300, true],
    ['Block', 500, 300, false],
    ['Triangle ramp', 650, 450, true],
    ['Moving block ↔', 800, 300, true],
    ['Breakable wood', 1000, 300, true],
    ['Toggle gate', 1000, 500, true],
    ['Rotating paddle', 450, 450, true],
  ] as [string, number, number, boolean][]) {
    await place(p, name, x, y);
    const grass = p.getByRole('checkbox', { name: 'Grass edging', exact: true });
    await expect(grass).not.toBeChecked();
    if (on) await grass.check();
    if (name === 'Block' && on) await field(p, 'Rotation (degrees)', '25');
  }
  await p.getByRole('combobox', { name: 'Select object', exact: true }).selectOption('boundary:0');
  await expect(p.getByRole('checkbox', { name: 'Grass edging', exact: true })).toBeChecked();
  await p.getByRole('checkbox', { name: 'Grass edging', exact: true }).uncheck();
  await p.getByRole('combobox', { name: 'Select object', exact: true }).selectOption('goal:0');
  await field(p, 'Width', '150');
  const before = await exported(p);
  expect(before.level.grass).toBe(false);
  expect(before.level.obstacles.map((o: any) => o.grass)).toEqual([true, undefined, true]);
  expect(before.level.goal.w).toBe(150);
  await p.screenshot({ path: `${evidence}/studio-grass.jpg`, quality: 90 });
  await p.locator('[data-command="Save Draft"]').click();
  await p.locator('[data-command="Publish to Game"]').click();
  await p.getByRole('spinbutton', { name: 'Publish position' }).fill('9');
  await p.getByRole('button', { name: 'Save & Publish', exact: true }).click();
  await p.clock.runFor(34);
  await p.reload();
  await p.clock.runFor(34);
  expect((await exported(p)).level).toEqual(before.level);
  await p.locator('[data-command="Test Level"]').click();
  await p.clock.runFor(100);
  await p.screenshot({ path: `${evidence}/play-grass.jpg`, quality: 90 });
  await kick(p, 112);
  await p.clock.runFor(12000);
  await expect(p.getByRole('dialog', { name: 'Draft goal scored' })).toBeVisible();
});
