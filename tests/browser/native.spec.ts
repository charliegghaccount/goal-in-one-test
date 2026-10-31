import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';
test('announcer option defaults off and persists separately from effects', async ({ page: p }) => {
  await p.goto('/');
  await p.getByRole('button', { name: 'Settings', exact: true }).click();
  const toggle = p.getByRole('button', { name: 'ANNOUNCER: OFF', exact: true });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(p.getByRole('button', { name: 'ANNOUNCER: ON', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(
    await p.evaluate(() => JSON.parse(localStorage.getItem('goal-in-one:grass:v5')!).sound),
  ).toBe(true);
  await p.reload();
  await p.getByRole('button', { name: 'Settings', exact: true }).click();
  await p.getByRole('button', { name: 'ANNOUNCER: ON', exact: true }).click();
  await p.reload();
  await p.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(p.getByRole('button', { name: 'ANNOUNCER: OFF', exact: true })).toBeVisible();
});
test('mock native bridge restores saves before startup and pauses without catch-up on resume', async ({
  page: p,
}) => {
  await p.addInitScript(() => {
    const w = window as any;
    w.__callbacks = {};
    w.CapacitorCustomPlatform = { name: 'ios' };
    w.__backup = JSON.stringify({
      'goal-in-one:grass:v5': JSON.stringify({ best: { 1: 1 }, sound: true }),
    });
    w.Capacitor = {
      getPlatform: () => 'ios',
      isNativePlatform: () => true,
      PluginHeaders: [
        {
          name: 'Preferences',
          methods: [
            { name: 'get', rtype: 'promise' },
            { name: 'set', rtype: 'promise' },
          ],
        },
        {
          name: 'App',
          methods: [
            { name: 'getState', rtype: 'promise' },
            { name: 'addListener', rtype: 'callback' },
            { name: 'removeListener', rtype: 'promise' },
          ],
        },
      ],
      nativePromise: async (plugin: string, method: string, options: any) => {
        if (plugin === 'Preferences') {
          if (method === 'get') return { value: w.__backup };
          w.__backup = options.value;
          return {};
        }
        return { isActive: true };
      },
      nativeCallback: (_p: string, _m: string, options: any, callback: any) => {
        w.__callbacks[options.eventName] = callback;
        return 'listener';
      },
    };
  });
  const t = new Date('2026-10-31T12:00:00Z');
  await p.clock.install({ time: t });
  await p.clock.pauseAt(new Date(+t + 1000));
  await p.goto('/');
  await expect(p.getByRole('button', { name: 'PLAY', exact: true })).toHaveAttribute(
    'data-id',
    '2',
  );
  await p.getByRole('button', { name: 'PLAY', exact: true }).click();
  await p.clock.runFor(100);
  await expect
    .poll(() => p.evaluate(() => !!(window as any).__callbacks.appStateChange))
    .toBe(true);
  await p.evaluate(() => (window as any).__callbacks.appStateChange({ isActive: false }));
  const time = await p.locator('#scene').getAttribute('data-sim-time');
  await p.clock.runFor(5000);
  expect(await p.locator('#scene').getAttribute('data-sim-time')).toBe(time);
  await expect(p.getByRole('dialog', { name: 'Game paused' })).toBeVisible();
  await p.evaluate(() => (window as any).__callbacks.appStateChange({ isActive: true }));
  await p.clock.runFor(5000);
  expect(await p.locator('#scene').getAttribute('data-sim-time')).toBe(time);
  await p.getByRole('button', { name: 'RESUME', exact: true }).click();
  await p.clock.runFor(34);
  expect(
    Number(await p.locator('#scene').getAttribute('data-sim-time')) - Number(time),
  ).toBeLessThan(0.1);
  await p.getByRole('button', { name: 'Settings', exact: true }).click();
  await p.getByRole('button', { name: 'ANNOUNCER: OFF', exact: true }).click();
  await expect
    .poll(() =>
      p.evaluate(
        () => JSON.parse(JSON.parse((window as any).__backup)['goal-in-one:grass:v5']).announcer,
      ),
    )
    .toBe(true);
});
test('native build cold-starts from bundled files offline and completes a real drag', async ({
  browser,
}) => {
  const context = await browser.newContext({ viewport: { width: 932, height: 430 } });
  await context.setOffline(true);
  const requests: string[] = [];
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    requests.push(url.href);
    if (url.hostname !== 'native.local') return route.abort();
    const root = resolve('dist-native'),
      path = resolve(
        root,
        '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname),
      );
    if (!path.startsWith(root + '/')) return route.abort();
    try {
      const contentType =
        (
          {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.svg': 'image/svg+xml',
            '.webp': 'image/webp',
            '.mp3': 'audio/mpeg',
          } as Record<string, string>
        )[extname(path)] ?? 'application/octet-stream';
      await route.fulfill({ body: readFileSync(path), contentType });
    } catch {
      await route.abort();
    }
  });
  const p = await context.newPage(),
    errors: string[] = [];
  p.on('pageerror', (e) => errors.push(e.message));
  const t = new Date('2026-10-31T12:00:00Z');
  await p.clock.install({ time: t });
  await p.clock.pauseAt(new Date(+t + 1000));
  await p.goto('https://native.local/');
  await p.getByRole('button', { name: 'LEVEL SELECT', exact: true }).click();
  await p.locator('.level-card[data-id="2"]').click();
  await p.clock.runFor(100);
  const c = p.locator('#scene'),
    r = (await c.boundingBox())!,
    s = Number(await c.getAttribute('data-scale')),
    x = r.x + r.width * 0.4,
    y = r.y + r.height * 0.45;
  await p.mouse.move(x, y);
  await p.mouse.down();
  await p.mouse.move(x - 112 * s, y, { steps: 5 });
  await p.mouse.up();
  await p.clock.runFor(12000);
  await expect(p.getByRole('dialog', { name: 'Goal scored' })).toBeVisible();
  expect(requests.every((u) => new URL(u).hostname === 'native.local')).toBe(true);
  expect(requests.filter((u) => u.includes('.mp3'))).toHaveLength(0);
  await p.reload();
  await p.getByRole('button', { name: 'LEVEL SELECT', exact: true }).click();
  await expect(p.locator('.level-card[data-id="2"]')).toHaveClass(/level-done/);
  expect(errors).toEqual([]);
  await context.close();
});

test('native-sized viewports retain scaled edge touch kicks and responsive orientation', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
    hasTouch: true,
  });
  const p = await context.newPage();
  const t = new Date('2026-10-31T12:00:00Z');
  await p.clock.install({ time: t });
  await p.clock.pauseAt(new Date(+t + 1000));
  await p.goto('/');
  await p.getByRole('button', { name: 'LEVEL SELECT', exact: true }).click();
  await p.locator('.level-card[data-id="2"]').click();
  const cdp = await context.newCDPSession(p);
  for (const [width, height] of [
    [1280, 720],
    [932, 430],
    [844, 390],
    [740, 360],
  ]) {
    await p.setViewportSize({ width, height });
    await p.clock.runFor(50);
    const c = p.locator('#scene'),
      r = (await c.boundingBox())!,
      scale = Number(await c.getAttribute('data-scale'));
    expect(r.y + r.height).toBeLessThanOrEqual(height);
    expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const x = r.x + 12,
      y = r.y + r.height * 0.45;
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y, id: 0 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + 28 * scale, y, id: 0 }],
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.clock.runFor(17);
    await expect(p.locator('#shots')).toHaveText('1');
    await p.getByRole('button', { name: 'Retry level (R)' }).click();
    await p.clock.runFor(17);
  }
  await context.close();
});
