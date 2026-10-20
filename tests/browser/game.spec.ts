import { test, expect, type Page } from '@playwright/test';
async function openFirst(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Let’s play' }).click();
}
test('home, ten courses, instructions, and sound controls', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'A little swing. A big adventure.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'How to play', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'How to play' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Mute sound' }).click();
  await expect(page.getByRole('button', { name: 'Enable sound' })).toBeVisible();
  await page.getByRole('button', { name: 'Explore the courses' }).click();
  await expect(page.locator('.level-card')).toHaveCount(10);
  for (let id = 1; id <= 10; id++) {
    await page.locator(`.level-card[data-id="${id}"]`).click();
    await expect(page.locator('#scene')).toBeVisible();
    await expect(page.locator('#shots')).toHaveText('0');
    await page.getByRole('button', { name: 'Back to courses' }).click();
  }
  expect(errors).toEqual([]);
});
test('drag shot, counter, no second shot in flight, and restart', async ({ page }) => {
  await openFirst(page);
  const canvas = page.locator('#scene');
  const box = (await canvas.boundingBox())!;
  const scale = Math.min(box.width / 1280, box.height / 720),
    ox = (box.width - 1280 * scale) / 2,
    oy = (box.height - 720 * scale) / 2;
  const x = box.x + ox + 170 * scale,
    y = box.y + oy + 541 * scale;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 85 * scale, y + 45 * scale, { steps: 12 });
  await expect(page.locator('#power-label')).toContainText('POWER');
  await page.mouse.up();
  await expect(page.locator('#shots')).toHaveText('1');
  await expect(page.locator('#status')).toHaveText('A little patience. Let it roll.');
  await page.getByRole('button', { name: 'Precise aim' }).click();
  await expect(page.getByRole('button', { name: 'Take the shot' })).toBeDisabled();
  await page.getByRole('button', { name: 'Restart level (R)' }).click();
  await expect(page.locator('#shots')).toHaveText('0');
});
test('a real shot drops into the cup, earns stars, persists, and advances', async ({ page }) => {
  await openFirst(page);
  await page.getByRole('button', { name: 'Precise aim' }).click();
  await page.locator('#angle').fill('15');
  await page.locator('#power').fill('80');
  await page.getByRole('button', { name: 'Take the shot' }).click();
  const dialog = page.getByRole('dialog', { name: 'Level complete' });
  await expect(dialog).toBeVisible({ timeout: 20_000 });
  await expect(dialog.getByRole('heading', { name: 'A hole in one!' })).toBeVisible();
  await expect(dialog.getByLabel('3 out of 3 stars')).toBeVisible();
  await page.getByRole('button', { name: 'Next little adventure' }).click();
  await expect(page.locator('.course-title h1')).toHaveText('A little elevation');
  await page.reload();
  await page.getByRole('button', { name: 'Explore the courses' }).click();
  await expect(page.locator('.level-card').first()).toContainText('BEST 1');
  await expect(page.locator('.progress-card')).toContainText('3');
});
test('keyboard shooting and modal focus work', async ({ page }) => {
  await openFirst(page);
  await page.locator('#scene').focus();
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#angle-value')).toHaveText('47°');
  await page.keyboard.press('Space');
  await expect(page.locator('#shots')).toHaveText('1');
  await page.getByRole('button', { name: 'Show controls' }).click();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Got it. Let’s golf.' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Close instructions' })).toBeFocused();
});
test('phone layout supports touch and precise aiming without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFirst(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Precise aim' }).click();
  await page.locator('#power').fill('55');
  await page.getByRole('button', { name: 'Take the shot' }).click();
  await expect(page.locator('#shots')).toHaveText('1');
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
});
test('all ten courses complete through the actual browser UI', async ({ page }) => {
  test.setTimeout(90_000);
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Let’s play' }).click();
  const routes = [
    [15, 80],
    [15, 100],
    [21, 92],
    [42, 94],
    [15, 90],
    [15, 80],
    [42, 100],
    [42, 100],
    [33, 90],
    [18, 90],
  ];
  for (const [index, [angle, power]] of routes.entries()) {
    await page.getByRole('button', { name: 'Precise aim' }).click();
    await page.locator('#angle').fill(String(angle));
    await page.locator('#power').fill(String(power));
    await page.getByRole('button', { name: 'Take the shot' }).click();
    await page.clock.runFor(9000);
    await expect(page.getByRole('dialog', { name: 'Level complete' })).toBeVisible();
    await expect(page.locator('.completion-stats').first()).toContainText('1');
    if (index < 9) await page.getByRole('button', { name: 'Next little adventure' }).click();
  }
  await expect(page.getByRole('heading', { name: 'What a little adventure.' })).toBeVisible();
  await page.getByRole('button', { name: 'Explore the courses' }).click();
  await expect(page.locator('.completed-mark')).toHaveCount(10);
  await expect(page.locator('.progress-card')).toContainText('30');
});
test('touch drag takes a shot and cancelled pointer does not', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFirst(page);
  const canvas = page.locator('#scene'),
    box = (await canvas.boundingBox())!;
  const scale = Math.min(box.width / 1280, box.height / 720),
    ox = (box.width - 1280 * scale) / 2,
    oy = (box.height - 720 * scale) / 2;
  const x = box.x + ox + 170 * scale,
    y = box.y + oy + 541 * scale;
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: x - 75 * scale, y: y + 60 * scale }],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(page.locator('#shots')).toHaveText('0');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: x - 75 * scale, y: y + 60 * scale }],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('#shots')).toHaveText('1');
});
test('blocked local storage does not prevent playing or completing a course', async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Storage disabled', 'SecurityError');
      },
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Mute sound' }).click();
  await page.getByRole('button', { name: 'Let’s play' }).click();
  await expect(page.locator('.save-note')).toContainText('Session-only progress');
  await page.getByRole('button', { name: 'Precise aim' }).click();
  await page.locator('#angle').fill('15');
  await page.locator('#power').fill('80');
  await page.getByRole('button', { name: 'Take the shot' }).click();
  await expect(page.getByRole('dialog', { name: 'Level complete' })).toBeVisible({
    timeout: 20_000,
  });
  await expect(
    page.getByText('Progress could not be saved. Browser storage may be disabled.'),
  ).toBeVisible();
});
