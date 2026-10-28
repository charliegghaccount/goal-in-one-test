import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const evidence = process.env.UI_EVIDENCE ?? 'test-results/ui-v1';
mkdirSync(evidence, { recursive: true });
const key = 'goal-in-one:grass:v5';
async function frozen(p: Page) {
  const t = new Date('2026-10-28T14:00:00Z');
  await p.clock.install({ time: t });
  await p.clock.pauseAt(new Date(+t + 1000));
  await p.goto('/?dev=1');
  await p.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))));
  await p.clock.runFor(60);
}
async function kick(p: Page) {
  const c = p.locator('#scene'),
    r = (await c.boundingBox())!,
    s = +(await c.getAttribute('data-scale'))!,
    x = r.x + r.width * 0.4,
    y = r.y + r.height * 0.45;
  await p.mouse.move(x, y);
  await p.mouse.down();
  await p.mouse.move(x - 112 * s, y, { steps: 5 });
  await p.mouse.up();
  await p.clock.runFor(12000);
}
async function capture(p: Page, name: string) {
  await p.screenshot({ path: `${evidence}/${name}.jpg`, quality: 90, fullPage: true });
}
test('four chapters retain legacy progress, 25 tiles, long holes and all sixty accessible levels', async ({
  page: p,
}) => {
  const saved = { best: { 1: 1, 25: 999, 26: 1, 50: 999, 51: 1, 60: 999 }, sound: false };
  await p.addInitScript(
    ({ key, saved }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(saved));
    },
    { key, saved },
  );
  await frozen(p);
  await expect(p.getByRole('button', { name: 'PLAY', exact: true })).toHaveAttribute(
    'data-id',
    '2',
  );
  await capture(p, 'home-progress');
  await p.getByRole('button', { name: 'LEVEL SELECT', exact: true }).click();
  const results = [];
  for (let chapter = 0; chapter < 4; chapter++) {
    await expect(p.locator('.level-card')).toHaveCount(25);
    await expect(p.locator('.level-grid .mini-course')).toHaveCount(0);
    await expect(p.locator('.chapter-sign')).toContainText(`CHAPTER ${chapter + 1}`);
    await expect(p.getByLabel('Chapter stars')).toContainText(chapter < 3 ? '4' : '0');
    const available = await p.locator('.level-card:not(:disabled)').count(),
      locked = await p.locator('.level-card:disabled').count();
    expect(available).toBe([25, 25, 10, 0][chapter]);
    expect(locked).toBe([0, 0, 15, 25][chapter]);
    await expect(p.locator('.long-hole .level-number')).toHaveText(String((chapter + 1) * 25));
    await expect(p.locator('.long-hole-label')).toHaveText('LONG HOLE');
    await capture(p, `chapter-${chapter + 1}`);
    results.push({ chapter: chapter + 1, available, locked });
    if (chapter < 3) await p.getByRole('button', { name: 'Next chapter', exact: true }).click();
  }
  await expect(p.getByRole('button', { name: 'Next chapter', exact: true })).toBeDisabled();
  await p.getByRole('button', { name: 'Previous chapter', exact: true }).click();
  await p.locator('.level-card[data-id="60"]').click();
  await p.clock.runFor(100);
  await expect(p.locator('.hud-level')).toHaveText('LEVEL 60');
  await p.getByRole('button', { name: 'LEVELS', exact: true }).click();
  await expect(p.locator('.chapter-sign')).toContainText('CHAPTER 3');
  expect(await p.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key)).toEqual(saved);
  writeFileSync(`${evidence}/chapters.json`, JSON.stringify(results, null, 2) + '\n');
});
for (const [width, height] of [
  [1440, 900],
  [960, 540],
  [932, 430],
  [844, 390],
  [740, 360],
] as const)
  test(`responsive live screens fit ${width}×${height}`, async ({ page: p }) => {
    test.setTimeout(90000);
    await p.setViewportSize({ width, height });
    await frozen(p);
    if (width === 932) {
      await p.addStyleTag({
        content: ':root{--safe-top:12px;--safe-left:44px;--safe-right:34px;--safe-bottom:20px;}',
      });
      await p.clock.runFor(30);
    }
    const check = async (selector: string) => {
      const boxes = await p.locator(selector).evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height };
        }),
      );
      for (const r of boxes) {
        expect(r.w).toBeGreaterThanOrEqual(43.9);
        expect(r.h).toBeGreaterThanOrEqual(43.9);
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.x + r.w).toBeLessThanOrEqual(width + 0.5);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.y + r.h).toBeLessThanOrEqual(height + 0.5);
      }
    };
    await check('.hero-actions button');
    await capture(p, `home-${width}`);
    await p.getByRole('button', { name: 'LEVEL SELECT', exact: true }).click();
    await check('.level-card');
    await capture(p, `select-${width}`);
    await p.locator('.level-card[data-id="2"]').click();
    await p.clock.runFor(100);
    await check('.hud-actions button:visible,.back-button,.camera-tools summary');
    const c = (await p.locator('#scene').boundingBox())!;
    expect(c.y + c.height).toBeLessThanOrEqual(height);
    expect(c.height).toBeGreaterThan(height * 0.64);
    expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await capture(p, `hud-${width}`);
    await p.getByRole('button', { name: 'Pause game (P)' }).click();
    const time = await p.locator('#scene').getAttribute('data-sim-time');
    await p.clock.runFor(500);
    expect(await p.locator('#scene').getAttribute('data-sim-time')).toBe(time);
    await p.getByRole('button', { name: 'RESUME', exact: true }).click();
    await kick(p);
    const result = p.getByRole('dialog', { name: 'Goal scored' });
    await expect(result).toBeVisible();
    await expect(result.getByRole('heading', { name: 'GOAL IN ONE!', exact: true })).toBeVisible();
    await expect(result.getByLabel('3 out of 3 stars')).toBeVisible();
    await check('.completion-actions button,.completion-back');
    await capture(p, `complete-${width}`);
    await result.getByRole('button', { name: 'REPLAY', exact: true }).click();
    await p.clock.runFor(34);
    await expect(p.locator('#shots')).toHaveText('0');
    await p.locator('.camera-tools summary').click();
    await p.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await p.clock.runFor(34);
    expect(+(await p.locator('#scene').getAttribute('data-zoom'))!).toBeGreaterThan(1);
  });
test('settings, Studio and PLAY remain reachable', async ({ page: p }) => {
  await frozen(p);
  await p.getByRole('button', { name: 'Settings', exact: true }).click();
  await p.getByRole('button', { name: 'LEVEL EDITOR', exact: true }).click();
  await p.clock.runFor(34);
  await expect(p.locator('#editor-canvas')).toBeVisible();
  await p.locator('[data-command="Exit"]').click();
  await p.clock.runFor(34);
  await p.getByRole('button', { name: 'PLAY', exact: true }).click();
  await p.clock.runFor(34);
  await expect(p.locator('#shots')).toHaveText('0');
});

test('an empty local campaign shows future slots and disables PLAY without inventing levels', async ({
  page: p,
}) => {
  await p.addInitScript(() =>
    localStorage.setItem(
      'goal-in-one:campaign:v1',
      JSON.stringify({ format: 'goal-in-one-campaign', version: 1, order: [], designs: [] }),
    ),
  );
  await frozen(p);
  await expect(p.getByRole('button', { name: 'PLAY', exact: true })).toBeDisabled();
  await p.getByRole('button', { name: 'LEVEL SELECT', exact: true }).click();
  await expect(p.locator('.level-card:disabled')).toHaveCount(25);
});
