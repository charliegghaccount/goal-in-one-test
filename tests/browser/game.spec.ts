import { test, expect, type Page } from '@playwright/test';
import { solutions } from '../solutions';
import { levels, arenaPolygon } from '../../src/levels';
import { viewBounds } from '../../src/render';
import { mkdirSync } from 'node:fs';
const evidence = 'docs/arena-evidence';
mkdirSync(evidence, { recursive: true });
async function frozen(page: Page) {
  const t = new Date('2026-10-21T12:00:00Z');
  await page.clock.install({ time: t });
  await page.clock.pauseAt(new Date(+t + 1000));
  await page.goto('/');
}
async function select(page: Page, id: number) {
  await page.getByRole('button', { name: 'LEVELS', exact: true }).click();
  await page.locator(`.level-card[data-id="${id}"]`).click();
  await page.clock.runFor(100);
}
async function drag(page: Page, angle: number, power: number) {
  const c = page.locator('#scene'),
    r = (await c.boundingBox())!,
    scale = Number(await c.getAttribute('data-scale'));
  const x = r.x + r.width * 0.4,
    y = r.y + r.height * 0.45,
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
function inside(p: { x: number; y: number }, poly: { x: number; y: number }[]) {
  let yes = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
      yes = !yes;
  }
  return yes;
}

test('all ten arena screenshots, menus, unlimited copy, and fixed view', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await frozen(page);
  await page.clock.runFor(100);
  await page.screenshot({ path: `${evidence}/menu.png`, fullPage: true });
  for (const l of levels) {
    await select(page, l.id);
    await page.screenshot({
      path: `${evidence}/level-${String(l.id).padStart(2, '0')}.png`,
      fullPage: true,
    });
    await page
      .locator('#scene')
      .screenshot({ path: `${evidence}/arena-${String(l.id).padStart(2, '0')}.png` });
    expect(await page.locator('body').innerText()).not.toMatch(
      /KICKS MAX|PAR LIMIT|REMAINING|WAIT FOR REST|golf|putt/i,
    );
    expect(await page.locator('#scene').getAttribute('data-camera-x')).toBe('0');
    const r = (await page.locator('#scene').boundingBox())!,
      s = Number(await page.locator('#scene').getAttribute('data-scale')),
      bounds = viewBounds(l);
    expect(bounds.w * s).toBeLessThanOrEqual(r.width + 1);
    expect(bounds.h * s).toBeLessThanOrEqual(r.height + 1);
  }
  await page.getByRole('button', { name: 'Back to levels', exact: true }).click();
  await expect(page.locator('.level-card')).toHaveCount(10);
  await page.screenshot({ path: `${evidence}/level-select.png`, fullPage: true });
  expect(errors).toEqual([]);
});
test('every PDF arena completes through real browser drag kicks', async ({ page }) => {
  test.setTimeout(180_000);
  await frozen(page);
  for (const [i, route] of solutions.entries()) {
    await select(page, i + 1);
    for (const k of route) {
      await drag(page, k.angle, k.power);
      await page.clock.runFor(12000);
    }
    const dialog = page.getByRole('dialog', { name: 'Goal scored' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('3 out of 3 stars')).toBeVisible();
    await page.screenshot({
      path: `${evidence}/goal-${String(i + 1).padStart(2, '0')}.png`,
      fullPage: true,
    });
    await dialog.getByRole('button', { name: 'BACK TO LEVELS', exact: true }).click();
  }
  await expect(page.locator('.completed-mark')).toHaveCount(10);
  await expect(page.locator('.progress-card')).toContainText('30');
  await page.reload();
  await page.getByRole('button', { name: 'LEVELS', exact: true }).click();
  await expect(page.locator('.completed-mark')).toHaveCount(10);
});
test('mid-flight dragging follows the ball and the next kick ADDS momentum', async ({ page }) => {
  await frozen(page);
  await select(page, 1);
  await drag(page, 55, 60);
  await page.clock.runFor(250);
  const c = page.locator('#scene'),
    r = (await c.boundingBox())!,
    s = Number(await c.getAttribute('data-scale')),
    x = r.x + r.width * 0.45,
    y = r.y + r.height * 0.45,
    before = await c.getAttribute('data-ball-screen-y');
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 56 * s, y, { steps: 5 });
  await page.clock.runFor(100);
  expect(await c.getAttribute('data-ball-screen-y')).not.toBe(before);
  await expect(page.locator('#power-label')).toContainText('KICK POWER');
  const vx = Number(await c.getAttribute('data-velocity-x'));
  await page.screenshot({ path: `${evidence}/mid-flight-aim.png`, fullPage: true });
  await page.mouse.up();
  await page.clock.runFor(16);
  await expect(page.locator('#shots')).toHaveText('2');
  expect(Number(await c.getAttribute('data-velocity-x'))).toBeGreaterThan(vx + 5);
  await page.getByRole('button', { name: 'PRECISE AIM' }).click();
  await expect(page.getByRole('button', { name: 'KICK', exact: true })).toBeEnabled();
});
test('twenty kicks are allowed, then an over-par goal still completes and saves one star', async ({
  page,
}) => {
  await frozen(page);
  await select(page, 1);
  for (let i = 0; i < 20; i++) await drag(page, 90, 6);
  await page.clock.runFor(12000);
  await expect(page.locator('#shots')).toHaveText('20');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await drag(page, 0, 70);
  await page.clock.runFor(12000);
  const modal = page.getByRole('dialog', { name: 'Goal scored' });
  await expect(modal).toBeVisible();
  await expect(modal.getByLabel('1 out of 3 stars')).toBeVisible();
  await expect(page.locator('#shots')).toHaveText('21');
  await page.screenshot({ path: `${evidence}/21-kicks-completed.png`, fullPage: true });
});
test('browser contacts trigger forward and backward boosts in their drawn directions', async ({
  page,
}) => {
  await frozen(page);
  for (const [id, power, dir] of [
    [5, 45, 1],
    [6, 75, -1],
  ]) {
    await select(page, id);
    await drag(page, 0, power);
    let boosted = false;
    for (let j = 0; j < 240; j++) {
      await page.clock.runFor(50);
      const v = Number(await page.locator('#scene').getAttribute('data-velocity-x'));
      if (v * dir > 11) {
        boosted = true;
        break;
      }
    }
    expect(boosted).toBe(true);
    await expect(page.locator('#shots')).toHaveText('1');
    await page.screenshot({ path: `${evidence}/boost-${id}.png`, fullPage: true });
    if (await page.getByRole('dialog').count())
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'BACK TO LEVELS', exact: true })
        .click();
  }
});
test('red pad resets position, retains kicks, and the player can immediately kick again', async ({
  page,
}) => {
  await frozen(page);
  await select(page, 10);
  const c = page.locator('#scene'),
    x = Number(await c.getAttribute('data-ball-screen-x'));
  await drag(page, 0, 70);
  await page.clock.runFor(4000);
  expect(Number(await c.getAttribute('data-resets'))).toBeGreaterThan(0);
  await expect(page.locator('#shots')).toHaveText('1');
  expect(Math.abs(Number(await c.getAttribute('data-ball-screen-x')) - x)).toBeLessThan(4);
  await page.screenshot({ path: `${evidence}/red-pad-reset.png`, fullPage: true });
  await drag(page, 10, 100);
  await page.clock.runFor(12000);
  await expect(page.getByRole('dialog', { name: 'Goal scored' })).toBeVisible();
  await expect(page.locator('#shots')).toHaveText('2');
});
test('real-time mouse and touch both kick a moving ball without waiting', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/');
  await page.getByRole('button', { name: 'KICK OFF', exact: true }).click();
  const c = page.locator('#scene');
  await expect(c).toHaveAttribute('data-scale', /.+/);
  let r = (await c.boundingBox())!;
  expect(r.y + r.height).toBeLessThanOrEqual(390);
  const s = Number(await c.getAttribute('data-scale')),
    x = r.x + r.width * 0.45,
    y = r.y + r.height * 0.4,
    cdp = await context.newCDPSession(page);
  await drag(page, 60, 30);
  await expect(page.locator('#shots')).toHaveText('1');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: x - 80 * s, y: y + 30 * s }],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(page.locator('#shots')).toHaveText('1');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: x - 80 * s, y: y + 30 * s }],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('#shots')).toHaveText('2');
  await page.screenshot({ path: `${evidence}/landscape-touch.png`, fullPage: true });
  await page.getByRole('button', { name: 'Retry level (R)' }).click();
  await drag(page, 0, 70);
  await expect(page.getByRole('dialog', { name: 'Goal scored' })).toBeVisible({ timeout: 20000 });
});
test('pause, keyboard, dead zone, sound, and disabled storage retain working menus', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    }),
  );
  await frozen(page);
  await page.getByRole('button', { name: 'Mute sound' }).click();
  await select(page, 9);
  await drag(page, 55, 30);
  await page.clock.runFor(200);
  await page.getByRole('button', { name: 'Pause game (P)' }).click();
  const y = await page.locator('#scene').getAttribute('data-ball-screen-y');
  await page.clock.runFor(3000);
  expect(await page.locator('#scene').getAttribute('data-ball-screen-y')).toBe(y);
  await page.getByRole('button', { name: 'RESUME' }).click();
  await page.getByRole('button', { name: 'Retry level (R)' }).click();
  await page.clock.runFor(100);
  await drag(page, 30, 1);
  await page.clock.runFor(20);
  await expect(page.locator('#shots')).toHaveText('0');
  await page.locator('#scene').focus();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');
  await page.clock.runFor(20);
  await expect(page.locator('#shots')).toHaveText('1');
  await page.getByRole('button', { name: 'How to play', exact: true }).click();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'LET’S KICK IT' })).toBeFocused();
  await page.keyboard.press('Escape');
});
test('fixed scaling shows the full arena in portrait and landscape without overflow', async ({
  page,
}) => {
  await frozen(page);
  for (const size of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    await select(page, 8);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const c = page.locator('#scene'),
      r = (await c.boundingBox())!,
      s = Number(await c.getAttribute('data-scale')),
      b = viewBounds(levels[7]);
    expect(b.w * s).toBeLessThanOrEqual(r.width + 1);
    expect(b.h * s).toBeLessThanOrEqual(r.height + 1);
    await page.screenshot({
      path: `${evidence}/${size.width === 390 ? 'portrait' : 'landscape'}-arena.png`,
      fullPage: true,
    });
    await drag(page, 0, 90);
    await page.clock.runFor(12000);
    await expect(page.getByRole('dialog', { name: 'Goal scored' })).toBeVisible();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'BACK TO LEVELS', exact: true })
      .click();
  }
});
test('browser bank shots remain within the PDF boundary polygons across all arenas', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await frozen(page);
  for (const l of levels) {
    await select(page, l.id);
    for (const a of [120, 60, -80, 185]) {
      if (await page.getByRole('dialog').count()) break;
      await drag(page, a, 100);
      for (let k = 0; k < 5; k++) {
        await page.clock.runFor(100);
        const c = page.locator('#scene'),
          r = (await c.boundingBox())!,
          d = await c.evaluate((e) => ({ ...e.dataset })),
          s = Number(d.scale),
          b = viewBounds(l),
          ox = (r.width - b.w * s) / 2 - b.x * s,
          oy = (r.height - b.h * s) / 2 - b.y * s,
          p = { x: (Number(d.ballScreenX) - ox) / s, y: (Number(d.ballScreenY) - oy) / s };
        expect(inside(p, arenaPolygon(l))).toBe(true);
      }
    }
    if (await page.getByRole('dialog').count())
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'BACK TO LEVELS', exact: true })
        .click();
  }
});
