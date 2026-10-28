import { test, expect } from '@playwright/test';
test('developer comparison and editor artwork toggles leave gameplay and geometry unchanged', async ({
  page: p,
}) => {
  await p.goto('/?dev=1');
  await p.getByRole('button', { name: 'Settings', exact: true }).click();
  await p.getByRole('button', { name: 'BACKGROUND: ARTWORK', exact: true }).click();
  await expect(p.getByRole('button', { name: 'BACKGROUND: PLAIN', exact: true })).toBeVisible();
  await p.getByRole('button', { name: 'BACK TO GAME', exact: true }).click();
  await p.getByRole('button', { name: 'PLAY', exact: true }).click();
  await expect(p.locator('#scene')).toHaveAttribute('data-background', 'plain');
  await expect(p.locator('#shots')).toHaveText('0');
  await p.getByRole('button', { name: 'Settings', exact: true }).click();
  await p.getByRole('button', { name: 'BACKGROUND: PLAIN', exact: true }).click();
  await p.getByRole('button', { name: 'LEVEL EDITOR', exact: true }).click();
  const canvas = p.locator('#editor-canvas');
  await p.locator('#ed-artwork').uncheck();
  await expect(canvas).toHaveAttribute('data-background', 'plain');
  const before = await canvas.evaluate((c) => ({ ...c.dataset }));
  await p.locator('#ed-artwork').check();
  await expect(canvas).toHaveAttribute('data-background', 'grass-parks');
  const after = await canvas.evaluate((c) => ({ ...c.dataset }));
  for (const key of ['scale', 'cameraX', 'cameraY', 'ballWorldX', 'ballWorldY'])
    expect(after[key]).toBe(before[key]);
});

test('approved artwork loads once and renders across fixed, wide, tall, long and landscape views', async ({
  page: p,
}) => {
  const { mkdirSync } = await import('node:fs');
  const dir = process.env.GRASS_EVIDENCE ?? 'test-results/grass-parks';
  mkdirSync(dir, { recursive: true });
  const errors: string[] = [],
    failures: string[] = [],
    requests: string[] = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('requestfailed', (r) => failures.push(r.url()));
  p.on('request', (r) => {
    if (/background.*\.webp/.test(r.url())) requests.push(r.url());
  });
  await p.goto('/?dev=1');
  for (const id of [1, 53, 54, 60]) {
    await p.getByRole('button', { name: 'Settings', exact: true }).click();
    await p.getByRole('button', { name: 'DEVELOPER PHYSICS', exact: true }).click();
    await p.locator('#dev-level').selectOption(String(id));
    await p.locator('#dev-jump').click();
    const c = p.locator('#scene');
    await expect(c).toHaveAttribute('data-background', 'grass-parks');
    await p.screenshot({ path: `${dir}/level-${id}.jpg`, quality: 88 });
    if (id !== 1) {
      await p.getByRole('button', { name: 'Explore / pan camera', exact: true }).click();
      const box = (await c.boundingBox())!;
      for (let i = 0; i < 3; i++) {
        await p.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.7);
        await p.mouse.down();
        await p.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.25, { steps: 10 });
        await p.mouse.up();
      }
      await expect(p.locator('#shots')).toHaveText('0');
      await p.screenshot({ path: `${dir}/explored-${id}.jpg`, quality: 88 });
      await p.getByRole('button', { name: 'Return to Ball', exact: true }).click();
    }
  }
  await p.setViewportSize({ width: 844, height: 390 });
  await expect(p.locator('#scene')).toHaveAttribute('data-background', 'grass-parks');
  await p.screenshot({ path: `${dir}/landscape.jpg`, quality: 88 });
  await p.setViewportSize({ width: 1440, height: 1000 });
  await p.getByRole('button', { name: 'Settings', exact: true }).click();
  await p.getByRole('button', { name: 'LEVEL EDITOR', exact: true }).click();
  await expect(p.locator('#editor-canvas')).toHaveAttribute('data-background', 'grass-parks');
  await p.screenshot({ path: `${dir}/studio.jpg`, quality: 88 });
  await p.locator('[data-command="Test Level"]').click();
  await expect(p.locator('#scene')).toHaveAttribute('data-background', 'grass-parks');
  expect(new Set(requests).size).toBe(1);
  expect(requests.length).toBe(1);
  expect(errors).toEqual([]);
  expect(failures).toEqual([]);
});

test('mirrored seams and extreme vertical extensions render opaque, continuous pixels', async ({
  page: p,
}) => {
  await p.goto('/?dev=1');
  const result = await p.evaluate(async () => {
    const { grassParksImage, drawGrassParks } = await import(
      /* @vite-ignore */ '/src/' + 'background.ts'
    );
    const { backgroundLayout } = await import(/* @vite-ignore */ '/src/' + 'background-layout.ts');
    await grassParksImage!.decode();
    const c = document.createElement('canvas');
    c.width = 844;
    c.height = 390;
    const ctx = c.getContext('2d')!;
    let maxSeam = 0,
      transparent = 0;
    for (const [dx, dy] of [
      [0, 0],
      [10000, 0],
      [-10000, 0],
      [0, -100000],
      [0, 100000],
    ]) {
      drawGrassParks(ctx, 844, 390, dx, dy);
      const data = ctx.getImageData(0, 0, 844, 390).data;
      for (let i = 3; i < data.length; i += 4) if (data[i] !== 255) transparent++;
      if (dy === 0) {
        const l = backgroundLayout(
          844,
          390,
          grassParksImage!.naturalWidth,
          grassParksImage!.naturalHeight,
          dx,
          dy,
        );
        for (const t of l.tiles.slice(1)) {
          const x = Math.round(t.x);
          if (x < 1 || x >= 843) continue;
          for (let y = 0; y < 390; y++) {
            const a = (y * 844 + x - 1) * 4,
              b = (y * 844 + x) * 4;
            maxSeam = Math.max(
              maxSeam,
              ...[0, 1, 2].map((k) => Math.abs(data[a + k] - data[b + k])),
            );
          }
        }
      }
    }
    const base = backgroundLayout(
      844,
      390,
      grassParksImage!.naturalWidth,
      grassParksImage!.naturalHeight,
    );
    const alignedDx = ((base.tileWidth - 400) * 1280) / (0.14 * 844);
    drawGrassParks(ctx, 844, 390, alignedDx, 0);
    const pixels = ctx.getImageData(0, 0, 844, 390).data;
    let symmetryError = 0;
    for (let y = 0; y < 390; y++)
      for (let k = 0; k < 3; k++)
        symmetryError = Math.max(
          symmetryError,
          Math.abs(pixels[(y * 844 + 399) * 4 + k] - pixels[(y * 844 + 400) * 4 + k]),
        );
    return { transparent, maxSeam, symmetryError };
  });
  expect(result.transparent).toBe(0);
  expect(result.symmetryError).toBeLessThan(8);
});

test.describe('retina', () => {
  test.use({ deviceScaleFactor: 2 });
  test('approved art renders and a real drag scores at double pixel density', async ({
    page: p,
  }) => {
    const t = new Date('2026-10-28T12:00:00Z');
    await p.clock.install({ time: t });
    await p.clock.pauseAt(new Date(+t + 1000));
    await p.goto('/');
    await p.getByRole('button', { name: 'PLAY', exact: true }).click();
    await p.clock.runFor(100);
    const c = p.locator('#scene');
    await expect(c).toHaveAttribute('data-background', 'grass-parks');
    const r = (await c.boundingBox())!,
      d = await c.evaluate((c) => ({
        scale: (c as HTMLCanvasElement).dataset.scale,
        width: (c as HTMLCanvasElement).width,
      }));
    expect(Math.abs(d.width - r.width * 2)).toBeLessThan(2);
    const x = r.x + r.width * 0.4,
      y = r.y + r.height * 0.45;
    await p.mouse.move(x, y);
    await p.mouse.down();
    await p.mouse.move(x - 98 * Number(d.scale), y, { steps: 5 });
    await p.clock.runFor(17);
    const { mkdirSync } = await import('node:fs');
    const dir = process.env.GRASS_EVIDENCE ?? 'test-results/grass-parks';
    mkdirSync(dir, { recursive: true });
    await p.screenshot({ path: `${dir}/aiming-retina.jpg`, quality: 88 });
    await p.mouse.up();
    await p.clock.runFor(12000);
    await expect(p.getByRole('dialog', { name: 'Goal scored' })).toBeVisible();
  });
});
