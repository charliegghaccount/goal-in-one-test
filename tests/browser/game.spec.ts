import { test, expect, type Page } from '@playwright/test';
import { solutions } from '../solutions';
import { levels, arenaPolygon } from '../../src/levels';
import { viewBounds } from '../../src/render';
import { mkdirSync } from 'node:fs';
const evidence = process.env.GAME_EVIDENCE ?? 'test-results/regression-evidence';
mkdirSync(evidence, { recursive: true });
async function frozen(page: Page) {
  const t = new Date('2026-10-21T12:00:00Z');
  await page.clock.install({ time: t });
  await page.clock.pauseAt(new Date(+t + 1000));
  await page.goto('/');
}
async function select(page: Page, id: number) {
  await page.getByRole('button', { name: 'LEVELS', exact: true }).click();
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

test('all forty levels: screenshot, actual drag completion, stars, reload', async ({ page }) => {
  test.setTimeout(600000);
  await frozen(page);
  await page.clock.runFor(100);
  await page.screenshot({ quality: 88, path: `${evidence}/menu.jpg`, fullPage: true });
  await page.getByRole('button', { name: 'LEVELS', exact: true }).click();
  await page.screenshot({ quality: 88, path: `${evidence}/select.jpg`, fullPage: true });
  for (const [i, sourceRoute] of solutions.entries()) {
    // This shot is browser-verified at the new artwork/HUD canvas fit; runtime geometry is unchanged.
    const route = sourceRoute;
    await select(page, i + 1);
    await page.screenshot({ quality: 88, path: `${evidence}/level-${i + 1}.jpg`, fullPage: true });
    await page
      .locator('#scene')
      .screenshot({ quality: 88, path: `${evidence}/arena-${i + 1}.jpg` });
    for (const k of route) {
      await drag(page, k.angle, k.power);
      await page.clock.runFor((k.flight ?? 12) * 1000);
    }
    const dialog = page.getByRole('dialog', { name: 'Goal scored' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('3 out of 3 stars')).toBeVisible();
    await page.screenshot({ quality: 88, path: `${evidence}/goal-${i + 1}.jpg`, fullPage: true });
    await dialog.getByRole('button', { name: 'BACK TO LEVELS', exact: true }).click();
  }
  await page.reload();
  await page.getByRole('button', { name: 'LEVELS', exact: true }).click();
  await expect(page.locator('.completed-mark')).toHaveCount(25);
  await page.getByRole('button', { name: 'Next chapter', exact: true }).click();
  await expect(page.locator('.completed-mark')).toHaveCount(15);
});
test('moving-ball drag and more than ten kicks remain enabled', async ({ page }) => {
  await frozen(page);
  await select(page, 1);
  for (let i = 0; i < 20; i++) await drag(page, 90, 6);
  await page.clock.runFor(17);
  await expect(page.locator('#shots')).toHaveText('20');
  await page.clock.runFor(12000);
  await drag(page, 0, 80);
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
    touchPoints: [{ x: x - 112 * s, y }],
  });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.getByRole('dialog', { name: 'Goal scored' })).toBeVisible({ timeout: 15000 });
  await page.screenshot({ quality: 88, path: `${evidence}/touch-goal.jpg`, fullPage: true });
  await context.close();
});

test('settings, pause, keyboard and mobile arena fit', async ({ page }) => {
  await frozen(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  await page.getByRole('button', { name: 'BACK TO GAME', exact: true }).click();
  await select(page, 9);
  await drag(page, 60, 70);
  await page.clock.runFor(100);
  await page.getByRole('button', { name: 'Pause game (P)' }).click();
  const t = await page.locator('#scene').getAttribute('data-sim-time');
  await page.clock.runFor(1000);
  expect(await page.locator('#scene').getAttribute('data-sim-time')).toBe(t);
  await page.getByRole('button', { name: 'RESUME', exact: true }).click();
  await page.locator('#scene').focus();
  await page.keyboard.press('Space');
  await page.clock.runFor(17);
  await expect(page.locator('#shots')).toHaveText('2');
  for (const [w, h] of [
    [932, 430],
    [844, 390],
    [740, 360],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await page.clock.runFor(50);
    const c = await page.locator('#scene').boundingBox();
    expect(c!.y + c!.height).toBeLessThanOrEqual(h);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ quality: 88, path: `${evidence}/landscape-${w}.jpg`, fullPage: true });
  }
});

test('next-level and replay controls stay immediate', async ({ page }) => {
  await frozen(page);
  await select(page, 1);
  await drag(page, 0, 80);
  await page.clock.runFor(12000);
  await page.getByRole('button', { name: 'NEXT LEVEL', exact: true }).click();
  await page.clock.runFor(17);
  await expect(page.getByRole('heading', { name: 'Up the ramp', exact: true })).toBeVisible();
  await expect(page.locator('#shots')).toHaveText('0');
  await page.getByRole('button', { name: 'Retry level (R)' }).click();
  await page.clock.runFor(17);
  await expect(page.locator('#shots')).toHaveText('0');
});

test('expansion review captures all forty artwork layouts', async ({ page }) => {
  test.setTimeout(120000);
  await frozen(page);
  await page.clock.runFor(100);
  await page.screenshot({ quality: 88, path: `${evidence}/menu.jpg`, fullPage: true });
  await page.getByRole('button', { name: 'LEVELS', exact: true }).click();
  await page.screenshot({ quality: 88, path: `${evidence}/select.jpg`, fullPage: true });
  for (const l of levels.slice(0, 40)) {
    await select(page, l.id);
    await page.screenshot({ quality: 88, path: `${evidence}/level-${l.id}.jpg`, fullPage: true });
    await page.locator('#scene').screenshot({ quality: 88, path: `${evidence}/arena-${l.id}.jpg` });
  }
});

test('developer panel saves, restores, imports safe JSON and jumps to experimental levels', async ({
  page,
}) => {
  await page.goto('/?dev=1');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'DEVELOPER PHYSICS', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Developer physics' });
  await expect(dialog).toBeVisible();
  const kick = page.getByRole('slider', { name: 'Kick strength', exact: true });
  await kick.evaluate((el: HTMLInputElement) => {
    el.value = '0.14';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.getByRole('button', { name: 'SAVE LOCALLY', exact: true }).click();
  await expect(page.locator('#dev-status')).toContainText('Saved');
  await page.getByRole('button', { name: 'RESET DEFAULTS', exact: true }).click();
  await expect(kick).toHaveValue('0.125');
  await page.getByRole('button', { name: 'RESTORE SAVED', exact: true }).click();
  await expect(kick).toHaveValue('0.14');
  await page.getByRole('button', { name: 'COPY / EXPORT JSON', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Physics configuration JSON' })).toContainText('');
  const box = page.getByRole('textbox', { name: 'Physics configuration JSON' });
  expect(JSON.parse(await box.inputValue()).kickStrength).toBe(0.14);
  await box.fill('{"kickStrength":100,"windStrength":-9}');
  await page.getByRole('button', { name: 'IMPORT JSON', exact: true }).click();
  await expect(kick).toHaveValue('0.16');
  await page.getByRole('button', { name: 'RESET DEFAULTS', exact: true }).click();
  await page.getByRole('button', { name: 'SAVE LOCALLY', exact: true }).click();
  await page.locator('#dev-level').selectOption('40');
  await page.getByRole('button', { name: 'COPY / EXPORT JSON', exact: true }).click();
  await page.screenshot({ quality: 88, path: `${evidence}/developer-panel.jpg`, fullPage: true });
  await page.getByRole('button', { name: 'PLAY LEVEL', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Grand Finale', exact: true })).toBeVisible();
  await expect(page.locator('#shots')).toHaveText('0');
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'DEVELOPER PHYSICS', exact: true }).click();
  await expect(page.getByRole('slider', { name: 'Kick strength', exact: true })).toHaveValue(
    '0.125',
  );
});

test('Workshop and Finale also complete through alternate bank and break routes', async ({
  page,
}) => {
  await frozen(page);
  for (const [id, angle, power] of [
    [39, 25, 80],
    [40, 35, 100],
  ]) {
    await select(page, id);
    await drag(page, angle, power);
    await page.clock.runFor(12000);
    await expect(page.getByRole('dialog', { name: 'Goal scored' })).toBeVisible();
    await page.screenshot({ quality: 88, path: `${evidence}/alternate-${id}.jpg`, fullPage: true });
    await page.getByRole('button', { name: 'BACK TO LEVELS', exact: true }).click();
  }
});

test('spring chain and full barrier chain complete through actual kicks', async ({ page }) => {
  await frozen(page);
  await select(page, 23);
  await drag(page, 0, 50);
  await page.clock.runFor(12000);
  await expect(page.getByRole('dialog', { name: 'Goal scored' })).toBeVisible();
  await page.screenshot({ quality: 88, path: `${evidence}/spring-chain.jpg`, fullPage: true });
  await page.getByRole('button', { name: 'BACK TO LEVELS', exact: true }).click();
  await select(page, 29);
  await drag(page, 0, 100);
  await page.clock.runFor(12000);
  await drag(page, 0, 100);
  await page.clock.runFor(12000);
  await expect(page.getByRole('dialog', { name: 'Goal scored' })).toBeVisible();
  await page.screenshot({ quality: 88, path: `${evidence}/barrier-chain.jpg`, fullPage: true });
});
