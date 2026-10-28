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
  await expect(canvas).toHaveAttribute('data-background', 'legacy-awaiting-approved-source');
  const after = await canvas.evaluate((c) => ({ ...c.dataset }));
  for (const key of ['scale', 'cameraX', 'cameraY', 'ballWorldX', 'ballWorldY'])
    expect(after[key]).toBe(before[key]);
});
