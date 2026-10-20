import { test, expect, type Page } from '@playwright/test';
import { solutions } from '../solutions';
import { levels } from '../../src/levels';
import { mkdirSync } from 'node:fs';
const evidence = 'docs/evidence';
mkdirSync(evidence, { recursive: true });
async function frozen(page: Page) {
  const time = new Date('2026-10-20T12:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(new Date(time.getTime() + 1000));
  await page.goto('/');
}
async function select(page: Page, id: number) {
  await page.getByRole('button', { name: 'LEVELS', exact: true }).click();
  await page.locator(`.level-card[data-id="${id}"]`).click();
  await page.clock.runFor(100);
}
async function aimDrag(page: Page, angle: number, power: number) {
  const c = page.locator('#scene');
  await expect(c).toHaveAttribute('data-phase', 'ready');
  const r = (await c.boundingBox())!,
    d = await c.evaluate((e) => ({ ...e.dataset }));
  const x = r.x + Number(d.ballScreenX),
    y = r.y + Number(d.ballScreenY),
    s = Number(d.scale),
    a = (angle * Math.PI) / 180;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(
    x - ((Math.cos(a) * 140 * power) / 100) * s,
    y + ((Math.sin(a) * 140 * power) / 100) * s,
    { steps: 12 },
  );
}
async function dragKick(page: Page, angle: number, power: number) {
  await aimDrag(page, angle, power);
  await page.mouse.up();
}

test('football identity, ten levels, help focus, sound, and saved progress', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'ONE BALL. TEN GOALS. MAKE IT COUNT.' }),
  ).toBeVisible();
  expect(await page.locator('body').innerText()).not.toMatch(/golf|putt|fairway|hole in one/i);
  await page.getByRole('button', { name: 'How to play', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'How to play' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'LET’S KICK IT' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Close instructions' })).toBeFocused();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Mute sound' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Enable sound' })).toBeVisible();
  await page.getByRole('button', { name: 'LEVELS', exact: true }).click();
  await expect(page.locator('.level-card')).toHaveCount(10);
});

test('all TEN levels score through actual mouse drag input, with screenshots', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await frozen(page);
  await page.clock.runFor(100);
  await page.screenshot({ path: `${evidence}/menu.png`, fullPage: true });
  for (const [index, route] of solutions.entries()) {
    await select(page, index + 1);
    for (const [j, k] of route.entries()) {
      await dragKick(page, k.angle, k.power);
      await page.clock.runFor(10000);
      if (j < route.length - 1)
        await expect(page.locator('#scene')).toHaveAttribute('data-phase', 'ready');
    }
    const dialog = page.getByRole('dialog', { name: 'Goal scored' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('3 out of 3 stars')).toBeVisible();
    await page.screenshot({
      path: `${evidence}/level-${String(index + 1).padStart(2, '0')}-goal.png`,
      fullPage: true,
    });
    if (index === 7) {
      const camera = Number(await page.locator('#scene').getAttribute('data-camera-x'));
      expect(camera).toBeGreaterThan(800);
    }
    await dialog.getByRole('button', { name: 'BACK TO LEVELS', exact: true }).click();
  }
  await expect(page.locator('.completed-mark')).toHaveCount(10);
  await expect(page.locator('.progress-card')).toContainText('30');
  await page.screenshot({ path: `${evidence}/levels-complete.png`, fullPage: true });
  await page.reload();
  await page.getByRole('button', { name: 'LEVELS', exact: true }).click();
  await expect(page.locator('.completed-mark')).toHaveCount(10);
  expect(errors).toEqual([]);
});

test('baseline and elevated-goal aiming screenshots show actual drag guides', async ({ page }) => {
  await frozen(page);
  await select(page, 1);
  await aimDrag(page, 42, 100);
  await page.clock.runFor(16);
  await expect(page.locator('#power-label')).toContainText('KICK POWER');
  await page.screenshot({ path: `${evidence}/level-01-aim.png`, fullPage: true });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator('#shots')).toHaveText('0');
  await page.getByRole('button', { name: 'Back to levels' }).click();
  await select(page, 2);
  await aimDrag(page, 54, 100);
  await page.clock.runFor(16);
  await page.screenshot({ path: `${evidence}/level-02-elevated-aim.png`, fullPage: true });
  await page.mouse.up();
  await page.clock.runFor(1200);
  await page.screenshot({ path: `${evidence}/level-02-flight.png`, fullPage: true });
  await page.clock.runFor(8800);
  await dragKick(page, 54, 72);
  for (
    let i = 0;
    i < 160 && (await page.locator('#scene').getAttribute('data-phase')) !== 'scoring';
    i++
  )
    await page.clock.runFor(50);
  await expect(page.locator('#scene')).toHaveAttribute('data-phase', 'scoring');
  await page.screenshot({ path: `${evidence}/level-02-net-entry.png`, fullPage: true });
});

test('last kick resolves before failure, retry resets, pause freezes motion and gates', async ({
  page,
}) => {
  await frozen(page);
  await select(page, 6);
  await dragKick(page, 40, 65);
  await page.clock.runFor(500);
  await page.getByRole('button', { name: 'Pause game (P)' }).click();
  const before = await page.locator('#scene').getAttribute('data-ball-screen-x');
  await page.clock.runFor(4000);
  expect(await page.locator('#scene').getAttribute('data-ball-screen-x')).toBe(before);
  await page.getByRole('button', { name: 'RESUME' }).click();
  await page.clock.runFor(500);
  expect(await page.locator('#scene').getAttribute('data-ball-screen-x')).not.toBe(before);
  await page.getByRole('button', { name: 'Back to levels' }).click();
  await select(page, 1);
  for (let i = 0; i < 3; i++) {
    await dragKick(page, 60, 8);
    await page.clock.runFor(20);
    await expect(page.locator('#shots')).toHaveText(String(i + 1));
    await expect(page.getByRole('dialog', { name: 'Out of shots' })).toHaveCount(0);
    await page.clock.runFor(10000);
  }
  await expect(page.getByRole('dialog', { name: 'Out of shots' })).toBeVisible();
  await page.screenshot({ path: `${evidence}/out-of-shots.png`, fullPage: true });
  await page.getByRole('button', { name: 'RETRY LEVEL', exact: true }).click();
  await page.clock.runFor(100);
  await expect(page.locator('#shots')).toHaveText('0');
  await expect(page.locator('#remaining')).toHaveText('3');
});

test('wide camera overview and pan preserve drag coordinates and follow the ball', async ({
  page,
}) => {
  await frozen(page);
  await select(page, 8);
  await page.getByRole('button', { name: 'Toggle full level view' }).click();
  await page.clock.runFor(100);
  await page.screenshot({ path: `${evidence}/level-08-overview.png`, fullPage: true });
  const overviewScale = Number(await page.locator('#scene').getAttribute('data-scale'));
  await page.getByRole('button', { name: 'Follow ball', exact: true }).click();
  await page.clock.runFor(100);
  expect(Number(await page.locator('#scene').getAttribute('data-scale'))).toBeGreaterThan(
    overviewScale,
  );
  await page.getByRole('button', { name: 'Pan camera right (D)' }).click();
  await page.clock.runFor(1000);
  expect(Number(await page.locator('#scene').getAttribute('data-camera-x'))).toBeGreaterThan(200);
  await page.getByRole('button', { name: 'Follow ball', exact: true }).click();
  await page.clock.runFor(1200);
  await dragKick(page, 30, 100);
  await page.clock.runFor(10000);
  await expect(page.locator('#shots')).toHaveText('1');
  expect(Number(await page.locator('#scene').getAttribute('data-camera-x'))).toBeGreaterThan(600);
});

test('real-time browser drag scores without a mocked clock and rejects mid-flight kicks', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'KICK OFF', exact: true }).click();
  await expect(page.locator('#scene')).toHaveAttribute('data-phase', 'ready');
  await dragKick(page, 42, 100);
  await expect(page.locator('#shots')).toHaveText('1');
  await page.getByRole('button', { name: 'PRECISE AIM' }).click();
  await expect(page.getByRole('button', { name: 'KICK', exact: true })).toBeDisabled();
  await expect(page.getByRole('dialog', { name: 'Goal scored' })).toBeVisible({ timeout: 15000 });
});

test('touch drag cancels safely, then scores on a portrait phone', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'KICK OFF', exact: true }).click();
  await expect(page.locator('#scene')).toHaveAttribute('data-phase', 'ready');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const c = page.locator('#scene'),
    r = (await c.boundingBox())!,
    d = await c.evaluate((e) => ({ ...e.dataset })),
    x = r.x + Number(d.ballScreenX),
    y = r.y + Number(d.ballScreenY),
    s = Number(d.scale),
    a = (42 * Math.PI) / 180,
    cdp = await context.newCDPSession(page);
  const start = () =>
      cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }),
    move = () =>
      cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x - Math.cos(a) * 140 * s, y: y + Math.sin(a) * 140 * s }],
      });
  await start();
  await move();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(page.locator('#shots')).toHaveText('0');
  await start();
  await move();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('#shots')).toHaveText('1');
  await expect(page.getByRole('dialog', { name: 'Goal scored' })).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: `${evidence}/phone-goal.png`, fullPage: true });
});

test('keyboard, dead-zone cancellation, and blocked storage do not break play', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Storage disabled', 'SecurityError');
      },
    }),
  );
  await frozen(page);
  await page.getByRole('button', { name: 'Mute sound' }).click();
  await select(page, 1);
  await aimDrag(page, 30, 1);
  await page.mouse.up();
  await expect(page.locator('#shots')).toHaveText('0');
  await page.locator('#scene').focus();
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#angle-value')).toHaveText('37°');
  await page.keyboard.press('Space');
  await page.clock.runFor(20);
  await expect(page.locator('#shots')).toHaveText('1');
  await page.getByRole('button', { name: 'Retry level (R)' }).click();
  await page.clock.runFor(100);
  await dragKick(page, 42, 100);
  await page.clock.runFor(10000);
  await expect(page.getByRole('dialog', { name: 'Goal scored' })).toBeVisible();
  await expect(
    page.getByText('Browser storage is unavailable. Progress lasts for this visit.'),
  ).toBeVisible();
});
test('landscape phone keeps the ball visible and supports a complete drag kick', async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await frozen(page);
  await select(page, 1);
  const rect = (await page.locator('#scene').boundingBox())!;
  expect(rect.y + rect.height).toBeLessThanOrEqual(390);
  await page.screenshot({ path: `${evidence}/phone-landscape-level.png`, fullPage: true });
  await dragKick(page, 42, 100);
  await page.clock.runFor(10000);
  await expect(page.getByRole('dialog', { name: 'Goal scored' })).toBeVisible();
});
