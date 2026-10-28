import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const evidence = process.env.MECHANIC_EVIDENCE ?? 'test-results/mechanic-art';
mkdirSync(evidence, { recursive: true });
test('scalable mechanics contact sheet: activation states, rotation, animation and immutable definitions', async ({
  page: p,
}) => {
  await p.goto('/');
  const result = await p.evaluate(async () => {
    const art = await import('/src/' + 'mechanic-materials.ts');
    const { woodImage } = await import('/src/' + 'wood-material.ts');
    await woodImage.decode();
    const canvas = document.createElement('canvas');
    canvas.id = 'material-gallery';
    canvas.width = 1200;
    canvas.height = 850;
    canvas.style.cssText = 'position:fixed;inset:0;width:1200px;height:850px;z-index:99999';
    document.body.append(canvas);
    const c = canvas.getContext('2d')!;
    c.fillStyle = '#c9e8e9';
    c.fillRect(0, 0, 1200, 850);
    const text = (s: string, x: number, y: number) => {
      c.fillStyle = '#223843';
      c.font = 'bold 19px sans-serif';
      c.fillText(s, x, y);
    };
    text('GAMEPLAY MECHANICS • scalable Canvas artwork', 35, 38);
    for (const [i, kind] of ['forward', 'backward', 'delete'].entries()) {
      text(kind.toUpperCase() + ' STRIP', 35, 90 + i * 80);
      c.save();
      c.translate(320, 100 + i * 80);
      c.scale(3, 3);
      art.drawBoostStrip(c, { x: 0, y: 0, w: 260, kind } as Parameters<
        typeof art.drawBoostStrip
      >[1]);
      c.restore();
    }
    const spring = { x: 0, y: 0, w: 85, angle: 90, strength: 17 };
    const wind = { x: 0, y: 0, w: 120, h: 100, angle: 90, strength: 1.3 };
    const sw = { id: 's', gateId: 'g', x: 0, y: 0, w: 80, h: 36, mode: 'toggle' as const };
    const gate = { id: 'g', x: 0, y: 0, w: 110, h: 120, offset: { x: 0, y: -100 } };
    const defs = JSON.stringify([spring, wind, sw, gate]);
    text('SPRING • READY / COMPRESSED', 35, 340);
    for (const [i, elapsed] of [10, 0].entries()) {
      c.save();
      c.translate(45 + i * 300, 460);
      c.scale(2.7, 2.7);
      art.drawSpringLauncher(c, spring, elapsed);
      c.restore();
    }
    text('PRESSURE PLATE • UP / PRESSED', 35, 525);
    for (let i = 0; i < 2; i++) {
      c.save();
      c.translate(155 + i * 300, 580);
      c.scale(2.7, 2.7);
      art.drawPressurePlate(c, sw, !!i);
      c.restore();
    }
    text('SIDE FAN • UP / ROTATED', 35, 635);
    for (let i = 0; i < 2; i++) {
      c.save();
      c.translate(25 + i * 300, 645);
      c.scale(1.9, 1.9);
      art.drawSideFan(c, { ...wind, angle: i ? 30 : 90 }, 0.16);
      c.restore();
    }
    text('TIMBER + CHARCOAL GATE', 720, 340);
    c.save();
    c.translate(885, 535);
    c.scale(2.4, 2.4);
    art.drawTimberGate(c, gate, 0, 0, 0);
    c.restore();
    text('NARROW / ROTATED', 750, 735);
    c.save();
    c.translate(830, 785);
    art.drawTimberGate(c, { ...gate, w: 22, h: 70 }, 0, 0, 0);
    art.drawTimberGate(c, { ...gate, w: 80, h: 25 }, 140, 0, -0.3);
    c.restore();
    // Actual pixels must change for both activation states and the animated fan.
    const frame = (draw: (ctx: CanvasRenderingContext2D) => void) => {
      const out = document.createElement('canvas');
      out.width = 250;
      out.height = 200;
      const ctx = out.getContext('2d')!;
      ctx.translate(70, 100);
      draw(ctx);
      return out.toDataURL();
    };
    const transform = c.getTransform();
    return {
      immutable: defs === JSON.stringify([spring, wind, sw, gate]),
      spring:
        frame((c) => art.drawSpringLauncher(c, spring, 10)) !==
        frame((c) => art.drawSpringLauncher(c, spring, 0)),
      reduced:
        frame((c) => art.drawSpringLauncher(c, spring, 0, true)) ===
        frame((c) => art.drawSpringLauncher(c, spring, 10, true)),
      switch:
        frame((c) => art.drawPressurePlate(c, sw, false)) !==
        frame((c) => art.drawPressurePlate(c, sw, true)),
      fan:
        frame((c) => art.drawSideFan(c, wind, 0)) !== frame((c) => art.drawSideFan(c, wind, 0.16)),
      rotation:
        frame((c) => art.drawSideFan(c, wind, 0)) !==
        frame((c) => art.drawSideFan(c, { ...wind, angle: 30 }, 0)),
      restored: transform.a === 1 && transform.d === 1 && transform.e === 0 && transform.f === 0,
    };
  });
  expect(result).toEqual({
    immutable: true,
    spring: true,
    reduced: true,
    switch: true,
    fan: true,
    rotation: true,
    restored: true,
  });
  await p.locator('#material-gallery').screenshot({ path: `${evidence}/materials.png` });
});

test('Studio and playable preview share mechanics artwork, with no design edits from rendering', async ({
  page: p,
}) => {
  const errors: string[] = [];
  p.on('pageerror', (e) => errors.push(e.message));
  const t = new Date('2026-10-28T17:00:00Z');
  await p.clock.install({ time: t });
  await p.clock.pauseAt(new Date(+t + 1000));
  await p.goto('/?dev=1&editor=1');
  await p.clock.runFor(100);
  const world = async (x: number, y: number) => {
    const c = p.locator('#editor-canvas'),
      r = (await c.boundingBox())!,
      d = await c.evaluate((c) => ({ ...c.dataset })),
      s = +d.scale!;
    return {
      x: r.x + (r.width - +d.viewWidth! * s) / 2 + (x - +d.cameraX!) * s,
      y: r.y + (r.height - +d.viewHeight! * s) / 2 + (y - +d.cameraY!) * s,
    };
  };
  for (const [name, x, y] of [
    ['Forward boost', 250, 640],
    ['Backward boost', 440, 640],
    ['Red reset', 650, 640],
    ['Spring', 850, 640],
    ['Fan', 350, 540],
    ['Toggle gate', 1000, 470],
    ['Switch', 780, 630],
  ] as [string, number, number][]) {
    await p.locator('.object-library').getByRole('button', { name, exact: true }).click();
    const q = await world(x, y);
    await p.mouse.click(q.x, q.y);
    await p.clock.runFor(34);
    if (name === 'Fan')
      await expect(
        p.getByRole('spinbutton', { name: 'Wind direction (degrees)', exact: true }),
      ).toHaveValue('90');
  }
  const exportLevel = async () => {
    await p.locator('[data-command="Export"]').click();
    const json = await p.locator('#ed-json').inputValue();
    await p.getByRole('button', { name: 'Close dialog', exact: true }).click();
    return json;
  };
  const before = await exportLevel();
  await p.screenshot({ path: `${evidence}/studio.jpg`, quality: 90 });
  await p.locator('[data-command="Test Level"]').click();
  await p.clock.runFor(500);
  await p.screenshot({ path: `${evidence}/gameplay.jpg`, quality: 90 });
  await expect(p.locator('#shots')).toHaveText('0');
  await p.getByRole('button', { name: 'Return to editor', exact: true }).first().click();
  await p.clock.runFor(34);
  expect(await exportLevel()).toBe(before);
  expect(errors).toEqual([]);
});
