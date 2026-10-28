import { cameraClick } from './ui-helpers';
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { vnextRoutes } from '../vnext-routes';
import { levels } from '../../src/levels';
const evidence = process.env.VNEXT_EVIDENCE ?? 'test-results/vnext-evidence';
mkdirSync(evidence, { recursive: true });
async function frozen(page: Page) {
  const time = new Date('2026-10-26T12:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(new Date(+time + 1000));
  await page.goto('/');
}
async function select(page: Page, id: number) {
  const result = page.getByRole('dialog', { name: 'Goal scored' });
  const back = page.getByRole('button', { name: 'Back to levels', exact: true });
  if (await result.isVisible())
    await result.getByRole('button', { name: 'BACK TO LEVELS', exact: true }).click();
  else if (await back.isVisible()) await back.click();
  else await page.getByRole('button', { name: 'LEVELS', exact: true }).click();
  const targetPage = Math.floor((id - 1) / 25);
  let currentPage = Math.floor(
    (Number(await page.locator('.level-card').first().getAttribute('data-id')) - 1) / 25,
  );
  while (currentPage < targetPage) {
    await page.getByRole('button', { name: 'Next chapter', exact: true }).click();
    currentPage++;
  }
  while (currentPage > targetPage) {
    await page.getByRole('button', { name: 'Previous chapter', exact: true }).click();
    currentPage--;
  }
  await page.locator(`.level-card[data-id="${id}"]`).click();
  await page.clock.runFor(100);
}
async function drag(page: Page, angle: number, power: number) {
  const c = page.locator('#scene'),
    r = (await c.boundingBox())!,
    scale = Number(await c.getAttribute('data-scale'));
  const x = r.x + r.width * 0.45,
    y = r.y + r.height * 0.5,
    a = (angle * Math.PI) / 180;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(
    x - ((Math.cos(a) * 140 * power) / 100) * scale,
    y + ((Math.sin(a) * 140 * power) / 100) * scale,
    { steps: 5 },
  );
  await page.mouse.up();
}
async function snapshot(page: Page, filename: string) {
  await page.locator('#scene').screenshot({ quality: 88, path: `${evidence}/${filename}.jpg` });
}
async function assertBallVisible(page: Page) {
  const c = page.locator('#scene'),
    r = (await c.boundingBox())!;
  const d = await c.evaluate((el) => ({ ...el.dataset }));
  expect(+d.ballScreenX!).toBeGreaterThanOrEqual(0);
  expect(+d.ballScreenX!).toBeLessThanOrEqual(r.width);
  expect(+d.ballScreenY!).toBeGreaterThanOrEqual(0);
  expect(+d.ballScreenY!).toBeLessThanOrEqual(r.height);
  expect(+d.ballDiameter!).toBeGreaterThanOrEqual(19.99);
}

test('all twenty authored levels complete through real browser drags with puzzle and camera evidence', async ({
  page,
}) => {
  test.setTimeout(600000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await frozen(page);
  // Existing progression must survive the expansion in the same browser.
  await page.evaluate(() =>
    localStorage.setItem(
      'goal-in-one:grass:v5',
      JSON.stringify({ best: { 1: 2, 20: 4, 40: 3 }, sound: false }),
    ),
  );
  await page.reload();
  const results: object[] = [];
  for (const [key, route] of Object.entries(vnextRoutes)) {
    const id = Number(key),
      l = levels[id - 1];
    await select(page, id);
    await expect(page.locator('#shots')).toHaveText('0');
    await snapshot(page, `start-${id}`);
    await page.screenshot({ quality: 88, path: `${evidence}/level-${id}.jpg`, fullPage: true });
    if (l.camera!.mode !== 'fixed') {
      await cameraClick(page, 'Arena overview (pauses play)');
      await page.clock.runFor(17);
      await snapshot(page, `overview-${id}`);
      await cameraClick(page, 'Return to play');
      await page.clock.runFor(17);
    } else await snapshot(page, `overview-${id}`);
    let maxCameraX = 0,
      minCameraY = 1e6,
      maxCameraY = -1e6,
      section = 0,
      goalArea = false;
    for (const k of route) {
      await drag(page, k.angle, k.power);
      let remaining = (k.flight ?? 12) * 1000;
      while (remaining > 0) {
        const dt = Math.min(250, remaining);
        await page.clock.runFor(dt);
        remaining -= dt;
        const c = page.locator('#scene'),
          d = await c.evaluate((el) => ({ ...el.dataset }));
        maxCameraX = Math.max(maxCameraX, +d.cameraX!);
        minCameraY = Math.min(minCameraY, +d.cameraY!);
        maxCameraY = Math.max(maxCameraY, +d.cameraY!);
        await assertBallVisible(page);
        if (l.camera!.mode !== 'fixed' && +d.cameraX! > 200 + section * 450 && section < 5) {
          await snapshot(page, `section-${id}-${++section}`);
        }
        if (!goalArea && d.phase === 'scoring') {
          await snapshot(page, `goal-area-${id}`);
          goalArea = true;
        }
        if (d.phase === 'won') break;
      }
    }
    const dialog = page.getByRole('dialog', { name: 'Goal scored' });
    await expect(dialog).toBeVisible();
    await expect(page.locator('#shots')).toHaveText(String(route.length));
    await expect(dialog.getByLabel('3 out of 3 stars')).toBeVisible();
    const d = await page.locator('#scene').evaluate((el) => ({ ...el.dataset }));
    expect(+d.resets!).toBe(0);
    for (const g of l.mechanics?.gates ?? []) expect(d.switches).toContain(g.id);
    if ([44, 53, 56, 58, 60].includes(id)) expect(+d.springs!).toBeGreaterThan(0);
    if ([47, 60].includes(id)) expect(+d.broken!).toBeGreaterThan(0);
    if (l.camera!.mode !== 'fixed') expect(maxCameraX).toBeGreaterThan(500);
    if (l.camera!.mode === 'follow-xy') expect(maxCameraY - minCameraY).toBeGreaterThan(100);
    await page.screenshot({ quality: 85, path: `${evidence}/completed-${id}.jpg`, fullPage: true });
    results.push({
      id,
      name: l.name,
      shots: route.length,
      stars: 3,
      completed: true,
      input: 'mouse press/drag/release',
      maxCameraX,
      minCameraY,
      maxCameraY,
      gates: d.switches,
      springs: d.springs,
      broken: d.broken,
      resets: d.resets,
      goalAreaCaptured: goalArea,
    });
    console.log(`Browser goal ${id}: ${l.name}, ${route.length} kicks`);
    await dialog.getByRole('button', { name: 'REPLAY', exact: true }).click();
    await page.clock.runFor(17);
    await expect(page.locator('#shots')).toHaveText('0');
    await expect(page.locator('#scene')).toHaveAttribute('data-switches', '');
    await expect(page.locator('#scene')).toHaveAttribute('data-broken', '0');
    await expect(page.locator('#scene')).toHaveAttribute('data-springs', '0');
    await page.getByRole('button', { name: 'Retry level (R)' }).click();
    await page.clock.runFor(17);
    await expect(page.locator('#shots')).toHaveText('0');
  }
  await page.reload();
  await page.getByRole('button', { name: 'LEVELS', exact: true }).click();
  for (let n = 0; n < 2; n++)
    await page.getByRole('button', { name: 'Next chapter', exact: true }).click();
  await expect(page.locator('.completed-mark')).toHaveCount(10);
  const best = await page.evaluate(
    () => JSON.parse(localStorage.getItem('goal-in-one:grass:v5')!).best,
  );
  expect(best[1]).toBe(2);
  expect(best[20]).toBe(4);
  expect(best[40]).toBe(3);
  expect(Object.keys(best).length).toBe(23);
  expect(errors).toEqual([]);
  writeFileSync(`${evidence}/browser-results.json`, JSON.stringify(results, null, 2) + '\n');
});

test('landscape phones keep fixed and scrolling arenas aimable, unclipped and touch-sized', async ({
  page,
}) => {
  test.setTimeout(120000);
  await frozen(page);
  for (const [w, h] of [
    [932, 430],
    [844, 390],
    [740, 360],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    for (const id of [42, 51, 53, 54, 58, 60]) {
      await select(page, id);
      await assertBallVisible(page);
      const r = (await page.locator('#scene').boundingBox())!;
      expect(r.y + r.height).toBeLessThanOrEqual(h);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const buttons = await page
        .locator('.round-stats button:visible,.back-button')
        .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()));
      for (let i = 0; i < buttons.length; i++) {
        expect(buttons[i].width).toBeGreaterThanOrEqual(44);
        expect(buttons[i].height).toBeGreaterThanOrEqual(44);
      }
      await page.screenshot({
        quality: 88,
        path: `${evidence}/mobile-${w}-${id}.jpg`,
        fullPage: true,
      });
    }
  }
});

test('a held moving-camera drag keeps its power, and map overview pauses instantly', async ({
  page,
}) => {
  await frozen(page);
  await page.setViewportSize({ width: 844, height: 390 });
  await select(page, 55);
  await drag(page, 0, 90);
  await page.clock.runFor(1200);
  const c = page.locator('#scene'),
    r = (await c.boundingBox())!,
    scale = +(await c.getAttribute('data-scale'))!;
  await page.mouse.move(r.x + r.width * 0.5, r.y + r.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width * 0.5 - 28 * scale, r.y + r.height * 0.5);
  await page.clock.runFor(17);
  const label = await page.locator('#power-label').textContent(),
    cx = +(await c.getAttribute('data-camera-x'))!;
  await page.clock.runFor(400);
  expect(await page.locator('#power-label').textContent()).toBe(label);
  expect(+(await c.getAttribute('data-camera-x'))!).toBeGreaterThan(cx + 20);
  await page.mouse.up();
  await page.clock.runFor(17);
  await expect(page.locator('#shots')).toHaveText('2');
  await cameraClick(page, 'Arena overview (pauses play)');
  await page.clock.runFor(17);
  const time = await c.getAttribute('data-sim-time');
  await drag(page, 0, 100);
  await page.clock.runFor(1000);
  expect(await c.getAttribute('data-sim-time')).toBe(time);
  await expect(page.locator('#shots')).toHaveText('2');
  await cameraClick(page, 'Return to play');
  await page.clock.runFor(100);
  expect(await c.getAttribute('data-sim-time')).not.toBe(time);
  await assertBallVisible(page);
  await page.getByRole('button', { name: 'Retry level (R)' }).click();
  await page.clock.runFor(17);
  await expect(page.locator('#shots')).toHaveText('0');
  await expect(c).toHaveAttribute('data-camera-x', '16');
});

test('scrolling touch input scores a two-switch level in real time and respects one-shot celebration', async ({
  browser,
}) => {
  test.setTimeout(30000);
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto('/');
  await page.getByRole('button', { name: 'LEVELS', exact: true }).click();
  for (let n = 0; n < 2; n++)
    await page.getByRole('button', { name: 'Next chapter', exact: true }).click();
  await page.locator('.level-card[data-id="55"]').click();
  await page.waitForTimeout(150);
  const c = page.locator('#scene'),
    r = (await c.boundingBox())!,
    scale = +(await c.getAttribute('data-scale'))!;
  const client = await context.newCDPSession(page),
    x = r.x + r.width * 0.5,
    y = r.y + r.height * 0.5;
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: x - 126 * scale, y }],
  });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.getByRole('dialog', { name: 'Goal scored' })).toBeVisible({ timeout: 18000 });
  await expect(page.getByRole('heading', { name: 'GOAL IN ONE!', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'GOAL IN ONE!', exact: true })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'NEXT LEVEL', exact: true })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'REPLAY', exact: true })).toBeInViewport();
  await expect(page.locator('#app')).toHaveAttribute('data-celebration', 'one-shot');
  await page.screenshot({ quality: 88, path: `${evidence}/touch-scroll-goal.jpg`, fullPage: true });
  await context.close();
});

test('spring/rotor relay and alternate high-window routes work through browser controls', async ({
  page,
}) => {
  test.setTimeout(90000);
  await frozen(page);
  for (const [id, route] of [
    [
      53,
      [
        { angle: 0, power: 60, flight: 0.7 },
        { angle: 10, power: 100, flight: 15 },
      ],
    ],
    [
      54,
      [
        { angle: 50, power: 90, flight: 12 },
        { angle: 0, power: 60, flight: 12 },
      ],
    ],
    [
      58,
      [
        { angle: 50, power: 100, flight: 12 },
        { angle: 0, power: 60, flight: 12 },
      ],
    ],
    [
      60,
      [
        { angle: 15, power: 90, flight: 5.2 },
        { angle: 60, power: 80, flight: 15 },
        { angle: 0, power: 80, flight: 12 },
      ],
    ],
  ] as const) {
    await select(page, id);
    for (const k of route) {
      await drag(page, k.angle, k.power);
      await page.clock.runFor(k.flight * 1000);
      if (await page.getByRole('dialog', { name: 'Goal scored' }).isVisible()) break;
    }
    await expect(page.getByRole('dialog', { name: 'Goal scored' })).toBeVisible();
    await expect(page.locator('#app')).toHaveAttribute('data-celebration', 'standard');
    await page.screenshot({ quality: 85, path: `${evidence}/alternate-${id}.jpg`, fullPage: true });
  }
});
