import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const evidence = process.env.WOOD_EVIDENCE ?? 'test-results/wood';
mkdirSync(evidence, { recursive: true });
async function ready(p: Page) {
  await p.evaluate(async () => {
    const m = await import('/src/' + 'wood-material.ts');
    await m.woodImage.decode();
  });
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
test('wood repeats at fixed density, preserves concave cutouts and matches thin boundary beams', async ({
  page: p,
}) => {
  await p.goto('/');
  await ready(p);
  const result = await p.evaluate(async () => {
    const { wood, beam } = await import('/src/' + 'art.ts');
    const canvas = () => {
      const c = document.createElement('canvas');
      c.width = 600;
      c.height = 260;
      return c.getContext('2d')!;
    };
    const a = canvas(),
      b = canvas();
    wood(
      a,
      [
        { x: 10, y: 10 },
        { x: 138, y: 10 },
        { x: 138, y: 138 },
        { x: 10, y: 138 },
      ],
      false,
    );
    wood(
      b,
      [
        { x: 10, y: 10 },
        { x: 522, y: 10 },
        { x: 522, y: 138 },
        { x: 10, y: 138 },
      ],
      false,
    );
    const ap = a.getImageData(25, 25, 90, 90).data,
      bp = b.getImageData(25, 25, 90, 90).data;
    let diff = 0,
      rangeMin = 255,
      rangeMax = 0;
    for (let i = 0; i < ap.length; i++) {
      if (ap[i] !== bp[i]) diff++;
      if (i % 4 === 0) {
        rangeMin = Math.min(rangeMin, ap[i]);
        rangeMax = Math.max(rangeMax, ap[i]);
      }
    }
    const concave = canvas();
    wood(
      concave,
      [
        { x: 20, y: 20 },
        { x: 220, y: 20 },
        { x: 220, y: 70 },
        { x: 70, y: 70 },
        { x: 70, y: 220 },
        { x: 20, y: 220 },
      ],
      false,
    );
    const alpha = (x: number, y: number) => concave.getImageData(x, y, 1, 1).data[3];
    const ba = canvas(),
      bb = canvas();
    beam(ba, { a: { x: 20, y: 64 }, b: { x: 148, y: 64 }, kind: 'wall', id: 'a' }, 10.4);
    beam(bb, { a: { x: 20, y: 64 }, b: { x: 532, y: 64 }, kind: 'wall', id: 'b' }, 10.4);
    const x = ba.getImageData(30, 64, 90, 1).data,
      y = bb.getImageData(30, 64, 90, 1).data;
    let beamDiff = 0;
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) beamDiff++;
    return {
      diff,
      range: rangeMax - rangeMin,
      notch: alpha(120, 120),
      outside: alpha(15, 50),
      inside: alpha(45, 45),
      beamDiff,
    };
  });
  expect(result.diff).toBe(0);
  expect(result.range).toBeGreaterThan(40);
  expect(result.notch).toBe(0);
  expect(result.outside).toBe(0);
  expect(result.inside).toBe(255);
  expect(result.beamDiff).toBe(0);
});
test('supplied wood appears in gameplay and Studio with rotated, irregular and mechanical shapes', async ({
  page: p,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [],
    failed: string[] = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('requestfailed', (r) => failed.push(r.url()));
  const t = new Date('2026-10-28T15:00:00Z');
  await p.clock.install({ time: t });
  await p.clock.pauseAt(new Date(+t + 1000));
  await p.goto('/?dev=1');
  await ready(p);
  await p.getByRole('button', { name: 'Settings', exact: true }).click();
  await p.getByRole('button', { name: 'DEVELOPER PHYSICS', exact: true }).click();
  await p.locator('#dev-level').selectOption('2');
  await p.locator('#dev-jump').click();
  await p.clock.runFor(100);
  await p.screenshot({ path: `${evidence}/gameplay-ramp.jpg`, quality: 88 });
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
  await expect(p.getByRole('dialog', { name: 'Goal scored' })).toBeVisible();
  await p.getByRole('button', { name: 'BACK TO LEVELS', exact: true }).click();
  await p.getByRole('button', { name: 'Settings', exact: true }).click();
  await p.getByRole('button', { name: 'LEVEL EDITOR', exact: true }).click();
  await p.clock.runFor(34);
  await place(p, 'Block', 300, 350);
  await p.getByRole('spinbutton', { name: 'Rotation (degrees)', exact: true }).fill('30');
  await p.getByRole('spinbutton', { name: 'Rotation (degrees)', exact: true }).press('Tab');
  await place(p, 'Triangle ramp', 500, 580);
  await place(p, 'Moving block ↔', 750, 330);
  await place(p, 'Rotating paddle', 850, 500);
  await place(p, 'Breakable wood', 600, 350);
  await place(p, 'Toggle gate', 1000, 480);
  await p.getByRole('button', { name: 'Draw polygon', exact: true }).click();
  for (const [x, y] of [
    [400, 180],
    [600, 180],
    [600, 220],
    [440, 220],
    [440, 290],
    [400, 290],
  ]) {
    const q = await world(p, x, y);
    await p.mouse.click(q.x, q.y);
  }
  await p.locator('[data-command="Finish polygon"]').click();
  await p.clock.runFor(34);
  await p.screenshot({ path: `${evidence}/studio-shapes.jpg`, quality: 88 });
  await p.locator('[data-command="Test Level"]').click();
  await p.clock.runFor(800);
  await p.screenshot({ path: `${evidence}/live-mechanisms.jpg`, quality: 88 });
  await expect(p.locator('#shots')).toHaveText('0');
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});
