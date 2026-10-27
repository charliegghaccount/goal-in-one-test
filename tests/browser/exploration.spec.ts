import { test, expect, type Page } from '@playwright/test';
async function frozen(p: Page, id: number) {
  const t = new Date('2026-10-27T12:00:00Z');
  await p.clock.install({ time: t });
  await p.clock.pauseAt(new Date(+t + 1000));
  await p.goto('/');
  await p.getByRole('button', { name: 'LEVELS', exact: true }).click();
  for (let i = 0; i < Math.floor((id - 1) / 20); i++)
    await p.getByRole('button', { name: 'MORE ARENAS', exact: true }).click();
  await p.locator(`.level-card[data-id="${id}"]`).click();
  await p.clock.runFor(300);
}
async function pan(p: Page, dx: number, dy: number) {
  const r = (await p.locator('#scene').boundingBox())!;
  const x = r.x + r.width * 0.55,
    y = r.y + r.height * 0.5;
  await p.mouse.move(x, y);
  await p.mouse.down();
  await p.mouse.move(x + dx, y + dy, { steps: 8 });
  await p.mouse.up();
  await p.clock.runFor(34);
}
async function data(p: Page) {
  return p.locator('#scene').evaluate((c) => ({ ...c.dataset }));
}

test('explore pans both axes with no kicks, overview restores it, and Return to Ball is smooth', async ({
  page: p,
}) => {
  await frozen(p, 54);
  const initial = await data(p);
  await p.getByRole('button', { name: 'Explore / pan camera', exact: true }).click();
  await pan(p, -400, 130);
  const free = await data(p);
  expect(+free.cameraX!).toBeGreaterThan(+initial.cameraX! + 100);
  expect(+free.cameraY!).not.toBe(+initial.cameraY!);
  await expect(p.locator('#shots')).toHaveText('0');
  await p.clock.runFor(1000);
  const held = await data(p);
  expect(held.cameraX).toBe(free.cameraX);
  expect(held.cameraY).toBe(free.cameraY);
  await p.getByRole('button', { name: 'Arena overview (pauses play)', exact: true }).click();
  await p.clock.runFor(34);
  await expect(p.locator('#scene')).toHaveAttribute('data-overview', 'true');
  await p.getByRole('button', { name: 'Return to play', exact: true }).click();
  await p.clock.runFor(34);
  expect((await data(p)).cameraX).toBe(free.cameraX);
  await p.screenshot({
    path: 'test-results/exploring-shaft.jpg',
    quality: 88,
    fullPage: true,
  });
  await p.getByRole('button', { name: 'Return to Ball', exact: true }).click();
  await p.clock.runFor(17);
  const mid = await data(p);
  expect(+mid.cameraX!).toBeLessThan(+free.cameraX!);
  expect(+mid.cameraX!).toBeGreaterThan(+initial.cameraX!);
  await p.clock.runFor(2000);
  await expect(p.locator('#scene')).toHaveAttribute('data-camera-manual', 'false');
  await expect(p.locator('#shots')).toHaveText('0');
});
test('equal pixel drags kick accurately after exploration and at different zooms', async ({
  page: p,
}) => {
  await frozen(p, 55);
  const c = p.locator('#scene');
  async function kick() {
    const r = (await c.boundingBox())!,
      x = r.x + r.width * 0.45,
      y = r.y + r.height * 0.5;
    await p.mouse.move(x, y);
    await p.mouse.down();
    await p.mouse.move(x - 90, y, { steps: 5 });
    await p.mouse.up();
    await p.clock.runFor(17);
    return +(await data(p)).velocityX!;
  }
  const normal = await kick();
  await p.getByRole('button', { name: 'Retry level (R)' }).click();
  await p.clock.runFor(300);
  await p.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await p.clock.runFor(34);
  const zoomed = await kick();
  expect(Math.abs(normal - zoomed)).toBeLessThan(0.1);
  await expect(p.locator('#shots')).toHaveText('1');
  await p.getByRole('button', { name: 'Explore / pan camera', exact: true }).click();
  await pan(p, -200, 0);
  await p.getByRole('button', { name: 'Explore / pan camera', exact: true }).click();
  await kick();
  await expect(p.locator('#shots')).toHaveText('2');
});
test('touch panning and two-finger pinch never turn into kicks on a landscape phone', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });
  const p = await context.newPage();
  await frozen(p, 54);
  const r = (await p.locator('#scene').boundingBox())!,
    x = r.x + r.width * 0.6,
    y = r.y + r.height * 0.55,
    cdp = await context.newCDPSession(p);
  await p.getByRole('button', { name: 'Explore / pan camera', exact: true }).click();
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y, id: 1 }],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: x - 180, y: y + 60, id: 1 }],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.clock.runFor(34);
  await expect(p.locator('#shots')).toHaveText('0');
  await p.getByRole('button', { name: 'Return to Ball', exact: true }).click();
  await p.clock.runFor(2000);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: x - 50, y, id: 1 }],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: x - 50, y, id: 1 },
      { x: x + 50, y, id: 2 },
    ],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { x: x - 90, y, id: 1 },
      { x: x + 90, y, id: 2 },
    ],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.clock.runFor(34);
  await expect(p.locator('#shots')).toHaveText('0');
  expect(+(await data(p)).zoom!).toBeGreaterThan(1.5);
  await p.screenshot({
    path: 'test-results/mobile-pinch.jpg',
    quality: 88,
    fullPage: true,
  });
  await context.close();
});

test('compact legacy arenas still fit by default and show goal guidance when zoomed and explored', async ({
  page: p,
}) => {
  await frozen(p, 1);
  const c = p.locator('#scene'),
    before = await data(p);
  expect(before.cameraX).toBe('0');
  await p.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await p.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await p.clock.runFor(34);
  await expect(c).toHaveAttribute('data-goal-offscreen', 'true');
  await p.getByRole('button', { name: 'Explore / pan camera', exact: true }).click();
  await pan(p, -150, 0);
  await expect(p.locator('#shots')).toHaveText('0');
  await p.getByRole('button', { name: 'Return to Ball', exact: true }).click();
  await p.clock.runFor(2000);
  await expect(c).toHaveAttribute('data-camera-manual', 'false');
  const r = (await c.boundingBox())!,
    d = await data(p),
    s = +d.scale! / +d.zoom!,
    x = r.x + r.width * 0.4,
    y = r.y + r.height * 0.4;
  await p.mouse.move(x, y);
  await p.mouse.down();
  await p.mouse.move(x - 112 * s, y, { steps: 5 });
  await p.mouse.up();
  await p.clock.runFor(12000);
  await expect(p.getByRole('dialog', { name: 'Goal scored' })).toBeVisible();
});
