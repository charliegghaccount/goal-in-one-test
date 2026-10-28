import type { Page } from '@playwright/test';
/** Open the actual compact camera drawer before operating one of its tools. */
export async function cameraClick(p: Page, name: string) {
  const drawer = p.locator('.camera-tools');
  if (!(await drawer.evaluate((e) => (e as HTMLDetailsElement).open)))
    await drawer.locator('summary').click();
  await p.getByRole('button', { name, exact: true }).click();
}
