import { test, expect, type Page } from '@playwright/test';
import { solutions } from '../solutions';
import { levels, arenaPolygon } from '../../src/levels';
import { viewBounds } from '../../src/render';
import { mkdirSync } from 'node:fs';
const evidence = 'docs/designer-evidence';
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

test('all ten designer levels: screenshot, actual drag completion, stars, reload', async ({
  page,
}) => {
  test.setTimeout(240000);
  await frozen(page);
  for (const [i, route] of solutions.entries()) {
    await select(page, i + 1);
    await page.screenshot({ path: `${evidence}/level-${i + 1}.png`, fullPage: true });
    for (const k of route) {
      await drag(page, k.angle, k.power);
      await page.clock.runFor((k.flight ?? 12) * 1000);
    }
    const dialog = page.getByRole('dialog', { name: 'Goal scored' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('3 out of 3 stars')).toBeVisible();
    await page.screenshot({ path: `${evidence}/goal-${i + 1}.png`, fullPage: true });
    await dialog.getByRole('button', { name: 'BACK TO LEVELS', exact: true }).click();
  }
  await page.reload();
  await page.getByRole('button', { name: 'LEVELS', exact: true }).click();
  await expect(page.locator('.completed-mark')).toHaveCount(10);
});
test('moving-ball drag and more than ten kicks remain enabled', async ({ page }) => {
  await frozen(page);
  await select(page, 1);
  for (let i = 0; i < 20; i++) await drag(page, 90, 6);
  await page.clock.runFor(17);
  await expect(page.locator('#shots')).toHaveText('20');
  await page.clock.runFor(12000);
  await drag(page, 0, 70);
  await page.clock.runFor(12000);
  await expect(page.getByRole('dialog', { name: 'Goal scored' })).toBeVisible();
  await expect(page.getByLabel('1 out of 3 stars')).toBeVisible();
});
test('aim while moving, cancel and instantaneous restart', async ({ page }) => {
  await frozen(page);
  await select(page, 2);
  await drag(page, 60, 70);
  await page.clock.runFor(200);
  await drag(page, 40, 50);
  await page.clock.runFor(17);
  await expect(page.locator('#shots')).toHaveText('2');
  await page.getByRole('button', { name: 'Retry level (R)' }).click();
  await page.clock.runFor(17);
  await expect(page.locator('#shots')).toHaveText('0');
});
test('real-time landscape touchscreen completes first goal', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 932, height: 430 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto('/');
  await page.getByRole('button', { name: 'LEVELS', exact: true }).click();
  await page.locator('.level-card[data-id="1"]').click();
  await page.waitForTimeout(200);
  const c = page.locator('#scene'),
    r = (await c.boundingBox())!,
    s = Number(await c.getAttribute('data-scale'));
  const client = await context.newCDPSession(page),
    x = r.x + r.width * 0.5,
    y = r.y + r.height * 0.5;
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: x - 98 * s, y }],
  });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.getByRole('dialog', { name: 'Goal scored' })).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: `${evidence}/touch-goal.png`, fullPage: true });
  await context.close();
});
