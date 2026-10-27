import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const evidence = 'docs/editor-evidence';
mkdirSync(evidence, { recursive: true });
async function frozen(p: Page) {
  const t = new Date('2026-10-27T12:00:00Z');
  await p.clock.install({ time: t });
  await p.clock.pauseAt(new Date(+t + 1000));
  await p.goto('/?dev=1');
}
async function enter(p: Page) {
  await p.getByRole('button', { name: 'Settings', exact: true }).click();
  await p.getByRole('button', { name: 'LEVEL EDITOR', exact: true }).click();
  await p.clock.runFor(50);
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
async function field(p: Page, name: string, value: string) {
  const el = p.getByRole('spinbutton', { name, exact: true });
  await el.fill(value);
  await el.press('Tab');
  await p.clock.runFor(17);
}
async function exported(p: Page) {
  await p.getByRole('button', { name: 'Export', exact: true }).click();
  const box = p.getByRole('textbox', { name: 'Level JSON' });
  const d = JSON.parse(await box.inputValue());
  await p.getByRole('button', { name: 'Close dialog', exact: true }).click();
  return d;
}
async function drag(p: Page, angle: number, power: number) {
  const c = p.locator('#scene'),
    r = (await c.boundingBox())!,
    d = await c.evaluate((c) => ({ ...c.dataset })),
    s = +d.scale! / +d.zoom!,
    a = (angle * Math.PI) / 180,
    x = r.x + r.width * 0.45,
    y = r.y + r.height * 0.5;
  await p.mouse.move(x, y);
  await p.mouse.down();
  await p.mouse.move(
    x - ((Math.cos(a) * 140 * power) / 100) * s,
    y + ((Math.sin(a) * 140 * power) / 100) * s,
    { steps: 5 },
  );
  await p.mouse.up();
}

test('build a spring/ramp level visually, edit its perimeter, save, score, return, export and reopen', async ({
  page: p,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await frozen(p);
  await enter(p);
  await p.getByRole('button', { name: 'New', exact: true }).click();
  await p.getByRole('button', { name: 'rectangle', exact: true }).click();
  await p.clock.runFor(34);
  await p
    .getByRole('textbox', { name: 'Level name', exact: true })
    .fill('Five minute spring route');
  await p.getByRole('textbox', { name: 'Level name', exact: true }).press('Tab');
  // HTML5 drag-and-drop, not a direct editor function call.
  const q = await world(p, 700, 240);
  const r = (await p.locator('#editor-canvas').boundingBox())!;
  await p
    .locator('[data-tool="block"]')
    .dragTo(p.locator('#editor-canvas'), { targetPosition: { x: q.x - r.x, y: q.y - r.y } });
  await p.clock.runFor(34);
  await field(p, 'Width', '160');
  await field(p, 'Height', '32');
  await field(p, 'Rotation (degrees)', '15');
  await p.locator('#editor-canvas').focus();
  await p.keyboard.press('Control+d');
  await p.clock.runFor(17);
  await p.keyboard.press('Delete');
  await p.clock.runFor(17);
  await p.getByRole('button', { name: 'Undo', exact: true }).click();
  await p.getByRole('button', { name: 'Redo', exact: true }).click();
  await place(p, 'Triangle ramp', 500, 600);
  await field(p, 'Y', '590');
  await place(p, 'Spring', 260, 640);
  await field(p, 'Launch direction (degrees)', '70');
  await field(p, 'Launch strength', '17');
  await p.getByRole('button', { name: 'Arena vertices', exact: true }).click();
  const start = await world(p, 60, 120),
    end = await world(p, 60, 80);
  await p.mouse.move(start.x, start.y);
  await p.mouse.down();
  await p.mouse.move(end.x, end.y, { steps: 5 });
  await p.mouse.up();
  await p.clock.runFor(34);
  await p.getByRole('button', { name: 'Fit arena', exact: true }).click();
  await p.clock.runFor(34);
  await p.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(p.locator('#editor-status')).toContainText('Saved');
  const before = await exported(p);
  expect(before.level.boundary[1].y).toBe(80);
  expect(before.level.obstacles).toHaveLength(2);
  expect(before.level.mechanics.springs).toHaveLength(1);
  writeFileSync(`${evidence}/spring-route.json`, JSON.stringify(before, null, 2) + '\n');
  await p.screenshot({ path: `${evidence}/editor-spring-route.jpg`, quality: 88, fullPage: true });
  const progress = await p.evaluate(() => localStorage.getItem('goal-in-one:grass:v5'));
  await p.getByRole('button', { name: 'Test Level', exact: true }).click();
  await p.clock.runFor(100);
  await drag(p, 0, 100);
  await p.clock.runFor(15000);
  await expect(p.getByRole('dialog', { name: 'Draft goal scored' })).toBeVisible();
  await expect(p.locator('#shots')).toHaveText('1');
  await expect(p.locator('#scene')).toHaveAttribute('data-springs', '1');
  await p.screenshot({ path: `${evidence}/draft-goal.jpg`, quality: 88, fullPage: true });
  expect(await p.evaluate(() => localStorage.getItem('goal-in-one:grass:v5'))).toBe(progress);
  await p
    .getByRole('dialog')
    .getByRole('button', { name: 'RETURN TO EDITOR', exact: true })
    .click();
  await p.clock.runFor(34);
  expect((await exported(p)).level).toEqual(before.level);
  await p.getByRole('button', { name: 'Load', exact: true }).click();
  await p.locator('.saved-draft').filter({ hasText: 'Five minute spring route' }).click();
  await p.clock.runFor(34);
  expect((await exported(p)).level).toEqual(before.level);
  await p.getByRole('button', { name: 'Import', exact: true }).click();
  await p.getByRole('textbox', { name: 'Level JSON' }).fill(JSON.stringify(before));
  await p.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await p.clock.runFor(34);
  const imported = await exported(p);
  expect(imported.level).toEqual(before.level);
  expect(imported.draftId).not.toBe(before.draftId);
  await place(p, 'Platform', 850, 250);
  expect((await exported(p)).level.obstacles).toHaveLength(3);
  await p.getByRole('button', { name: 'Save', exact: true }).click();
  await p.getByRole('button', { name: 'Backup All', exact: true }).click();
  const backup = JSON.parse(await p.getByRole('textbox', { name: 'Level JSON' }).inputValue());
  expect(backup.drafts.length).toBeGreaterThanOrEqual(2);
  const download = p.waitForEvent('download');
  await p.getByRole('button', { name: 'Download JSON', exact: true }).click();
  expect((await download).suggestedFilename()).toContain('backup');
  await p.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await p.reload();
  await enter(p);
  expect((await exported(p)).level.obstacles).toHaveLength(3);
  expect(errors).toEqual([]);
});

test('polygon vertices, resize and rotation handles, multi-selection and pan ownership work through the canvas', async ({
  page: p,
}) => {
  await frozen(p);
  await enter(p);
  await p.getByRole('button', { name: 'New', exact: true }).click();
  await p.getByRole('button', { name: 'rectangle', exact: true }).click();
  await p.clock.runFor(34);
  await p.locator('#ed-snap').uncheck();
  await place(p, 'Block', 450, 350);
  let q = await world(p, 515, 400);
  await p.mouse.move(q.x, q.y);
  await p.mouse.down();
  q = await world(p, 560, 430);
  await p.mouse.move(q.x, q.y, { steps: 5 });
  await p.mouse.up();
  await p.clock.runFor(34);
  expect(
    +(await p.getByRole('spinbutton', { name: 'Width', exact: true }).inputValue()),
  ).toBeGreaterThan(190);
  const d = await exported(p),
    o = d.level.obstacles[0],
    xs = o.points.map((p: any) => p.x),
    ys = o.points.map((p: any) => p.y),
    cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const scale = +(await p.locator('#editor-canvas').getAttribute('data-scale'))!;
  q = await world(p, cx, Math.min(...ys) - 32 / scale);
  await p.mouse.move(q.x, q.y);
  await p.mouse.down();
  const e = await world(p, cx + 100, 350);
  await p.mouse.move(e.x, e.y, { steps: 5 });
  await p.mouse.up();
  await p.clock.runFor(34);
  expect(
    Math.abs(
      +(await p.getByRole('spinbutton', { name: 'Rotation (degrees)', exact: true }).inputValue()),
    ),
  ).toBeGreaterThan(15);
  await p.getByRole('button', { name: 'Draw polygon', exact: true }).click();
  for (const [x, y] of [
    [650, 250],
    [850, 250],
    [850, 290],
    [700, 290],
    [700, 430],
    [650, 430],
  ]) {
    q = await world(p, x, y);
    await p.mouse.click(q.x, q.y);
  }
  await p.getByRole('button', { name: 'Finish polygon', exact: true }).click();
  await p.clock.runFor(34);
  await expect(p.locator('#editor-validation')).toContainText('concave');
  await p.getByRole('combobox', { name: 'Selected vertex', exact: true }).selectOption('1');
  await p.getByRole('button', { name: 'Add vertex after', exact: true }).click();
  await expect(p.getByRole('combobox', { name: 'Selected vertex' }).locator('option')).toHaveCount(
    7,
  );
  await p.getByRole('button', { name: 'Remove vertex', exact: true }).click();
  await expect(p.getByRole('combobox', { name: 'Selected vertex' }).locator('option')).toHaveCount(
    6,
  );
  q = await world(p, 850, 250);
  await p.mouse.move(q.x, q.y);
  await p.mouse.down();
  const v = await world(p, 880, 230);
  await p.mouse.move(v.x, v.y, { steps: 5 });
  await p.mouse.up();
  await p.clock.runFor(34);
  await p.getByRole('button', { name: 'Select (V)', exact: true }).click();
  q = await world(p, 450, 350);
  await p.mouse.click(q.x, q.y);
  await p.keyboard.down('Shift');
  q = await world(p, 670, 350);
  await p.mouse.click(q.x, q.y);
  await p.keyboard.up('Shift');
  await p.clock.runFor(17);
  await expect(p.locator('#editor-canvas')).toHaveAttribute(
    'data-selection',
    'obstacle:0,obstacle:1',
  );
  const groupBefore = await exported(p);
  q = await world(p, 450, 350);
  await p.mouse.move(q.x, q.y);
  await p.mouse.down();
  const groupEnd = await world(p, 470, 370);
  await p.mouse.move(groupEnd.x, groupEnd.y, { steps: 5 });
  await p.mouse.up();
  await p.clock.runFor(17);
  const groupAfter = await exported(p);
  for (let i = 0; i < 2; i++) {
    expect(groupAfter.level.obstacles[i].points[0].x).toBeCloseTo(
      groupBefore.level.obstacles[i].points[0].x + 20,
      4,
    );
    expect(groupAfter.level.obstacles[i].points[0].y).toBeCloseTo(
      groupBefore.level.obstacles[i].points[0].y + 20,
      4,
    );
  }
  const before = await exported(p);
  await p.getByRole('button', { name: 'Pan (H)', exact: true }).click();
  const c = await p.locator('#editor-canvas').boundingBox();
  await p.mouse.move(c!.x + c!.width * 0.5, c!.y + c!.height * 0.5);
  await p.mouse.down();
  await p.mouse.move(c!.x + c!.width * 0.5 + 100, c!.y + c!.height * 0.5 + 70, { steps: 5 });
  await p.mouse.up();
  await p.clock.runFor(34);
  expect((await exported(p)).level).toEqual(before.level);
  await p.screenshot({ path: `${evidence}/polygon-colliders.jpg`, quality: 88, fullPage: true });
});

test('all mechanic families are editable, gate linking is a dropdown, and official copies stay isolated', async ({
  page: p,
}) => {
  test.setTimeout(90000);
  await frozen(p);
  await enter(p);
  await p.getByRole('button', { name: 'New', exact: true }).click();
  await p.getByRole('button', { name: 'wide', exact: true }).click();
  await p.clock.runFor(34);
  for (const [name, x, y] of [
    ['Forward boost', 300, 640],
    ['Backward boost', 500, 640],
    ['Red reset', 700, 640],
    ['Slippery ice', 900, 640],
    ['Spring', 1100, 640],
    ['Moving block ↔', 500, 300],
    ['Moving block ↕', 700, 300],
    ['Rotating paddle', 900, 300],
    ['Swinging timber', 1100, 300],
    ['Breakable wood', 1300, 350],
    ['Fan', 1500, 300],
    ['Toggle gate', 1800, 420],
    ['Switch', 1600, 580],
  ] as const) {
    await place(p, name, x, y);
  }
  await p.getByRole('combobox', { name: 'Linked gate', exact: true }).selectOption('gate-1');
  await p.getByRole('combobox', { name: 'Switch mode', exact: true }).selectOption('timed');
  await field(p, 'Timer (seconds)', '9');
  await p.getByRole('combobox', { name: 'Select object', exact: true }).selectOption('wind:0');
  await field(p, 'Wind direction (degrees)', '35');
  await field(p, 'Wind strength', '0.8');
  const doc = await exported(p);
  expect(doc.level.mechanics.switches[0].gateId).toBe('gate-1');
  expect(doc.level.mechanics.winds[0].angle).toBe(35);
  expect(doc.level.surfaces).toHaveLength(3);
  expect(doc.level.movers).toHaveLength(2);
  await p.locator('#ed-collisions').check();
  await p.clock.runFor(34);
  await p.screenshot({ path: `${evidence}/mechanic-library.jpg`, quality: 88, fullPage: true });
  await p.getByRole('button', { name: 'Test Level', exact: true }).click();
  await p.clock.runFor(1500);
  expect(JSON.parse((await p.locator('#scene').getAttribute('data-rotors'))!)).toHaveLength(2);
  expect(JSON.parse((await p.locator('#scene').getAttribute('data-movers'))!)).toHaveLength(2);
  await p.getByRole('button', { name: 'Return to editor', exact: true }).first().click();
  await p.clock.runFor(34);
  expect((await exported(p)).level).toEqual(doc.level);
  for (const [id, angle, power, attribute, value] of [
    [21, 0, 100, 'data-springs', '1'],
    [27, 0, 70, 'data-broken', '1'],
    [30, 0, 70, 'data-switches', 'gate-30'],
  ] as const) {
    await p.getByRole('button', { name: 'Load', exact: true }).click();
    await p.locator('#ed-official').selectOption(String(id));
    await p.getByRole('button', { name: 'Open editable copy', exact: true }).click();
    await p.clock.runFor(34);
    await p.getByRole('button', { name: 'Test Level', exact: true }).click();
    await p.clock.runFor(100);
    await drag(p, angle, power);
    await p.clock.runFor(12000);
    await expect(p.getByRole('dialog', { name: 'Draft goal scored' })).toBeVisible();
    if (attribute !== 'data-switches')
      await expect(p.locator('#scene')).toHaveAttribute(attribute, value);
    await p
      .getByRole('dialog')
      .getByRole('button', { name: 'RETURN TO EDITOR', exact: true })
      .click();
    await p.clock.runFor(34);
  }
});

test('invalid imports and self-intersecting polygons give useful feedback and cannot run', async ({
  page: p,
}) => {
  await frozen(p);
  await enter(p);
  await p.getByRole('button', { name: 'Import', exact: true }).click();
  await p.getByRole('textbox', { name: 'Level JSON' }).fill('{"bad":1}');
  await p.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await expect(p.locator('#ed-json-status')).toContainText('Expected');
  await p.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await p.getByRole('button', { name: 'Draw polygon', exact: true }).click();
  for (const [x, y] of [
    [400, 300],
    [600, 500],
    [400, 500],
    [600, 300],
  ]) {
    const q = await world(p, x, y);
    await p.mouse.click(q.x, q.y);
  }
  await p.getByRole('button', { name: 'Finish polygon', exact: true }).click();
  await expect(p.locator('#editor-status')).toContainText('self-intersecting');
  await p.locator('#editor-canvas').focus();
  await p.keyboard.press('Escape');
  await place(p, 'Switch', 600, 500);
  await expect(p.getByRole('button', { name: 'Test Level', exact: true })).toBeDisabled();
  await expect(p.locator('#editor-validation')).toContainText('existing gate');
});

test('fan forces and moving/rotating objects actually run in draft test mode without spending kicks', async ({
  page: p,
}) => {
  await frozen(p);
  await enter(p);
  await p.getByRole('button', { name: 'New', exact: true }).click();
  await p.getByRole('button', { name: 'rectangle', exact: true }).click();
  await p.clock.runFor(34);
  await place(p, 'Fan', 500, 350);
  await field(p, 'Wind direction (degrees)', '90');
  await field(p, 'Wind strength', '1.5');
  await place(p, 'Moving block ↔', 800, 350);
  await place(p, 'Rotating paddle', 950, 300);
  await p.getByRole('combobox', { name: 'Select object', exact: true }).selectOption('spawn:0');
  await field(p, 'X', '500');
  await field(p, 'Y', '350');
  const before = await exported(p);
  await p.getByRole('button', { name: 'Test Level', exact: true }).click();
  await p.clock.runFor(150);
  const first = await p.locator('#scene').evaluate((c) => ({ ...c.dataset }));
  expect(first.windContact).toBe('true');
  expect(+first.velocityY!).toBeLessThan(0);
  await expect(p.locator('#shots')).toHaveText('0');
  await p.clock.runFor(1000);
  const next = await p.locator('#scene').evaluate((c) => ({ ...c.dataset }));
  expect(next.movers).not.toBe(first.movers);
  expect(next.rotors).not.toBe(first.rotors);
  await p.screenshot({ path: `${evidence}/live-draft-mechanics.jpg`, quality: 88, fullPage: true });
  await p.getByRole('button', { name: 'Return to editor', exact: true }).first().click();
  await p.clock.runFor(34);
  expect((await exported(p)).level).toEqual(before.level);
});

test('forward/back pads, ice and red resets retain real behavior in official-copy test mode', async ({
  page: p,
}) => {
  test.setTimeout(90000);
  await frozen(p);
  await enter(p);
  for (const id of [5, 6, 36, 10]) {
    await p.getByRole('button', { name: 'Load', exact: true }).click();
    await p.locator('#ed-official').selectOption(String(id));
    await p.getByRole('button', { name: 'Open editable copy', exact: true }).click();
    await p.clock.runFor(34);
    const draft = await exported(p);
    if (id !== 10) {
      const pad = id === 36 ? draft.level.mechanics.ice[0] : draft.level.surfaces[0];
      await p.getByRole('combobox', { name: 'Select object', exact: true }).selectOption('spawn:0');
      await field(p, 'X', String(pad.x + pad.w / 2));
      await field(p, 'Y', String(pad.y - 22));
    }
    await p.getByRole('button', { name: 'Test Level', exact: true }).click();
    await p.clock.runFor(200);
    if (id === 10) {
      await drag(p, 0, 100);
      await p.clock.runFor(10000);
      const d = await p.locator('#scene').evaluate((c) => ({ ...c.dataset }));
      expect(+d.resets!).toBeGreaterThan(0);
      await expect(p.locator('#shots')).toHaveText('1');
    } else {
      const d = await p.locator('#scene').evaluate((c) => ({ ...c.dataset }));
      if (id === 5) expect(+d.velocityX!).toBeGreaterThan(0);
      if (id === 6) expect(+d.velocityX!).toBeLessThan(0);
      if (id === 36) expect(d.iceContact).toBe('true');
      await expect(p.locator('#shots')).toHaveText('0');
    }
    await p.getByRole('button', { name: 'Return to editor', exact: true }).first().click();
    await p.clock.runFor(34);
  }
});
