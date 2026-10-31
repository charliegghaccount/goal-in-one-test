import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
export const isNative = () => Capacitor.isNativePlatform();
const SNAPSHOT = 'goal-in-one:web-storage:v1';
export function gameSnapshot(storage: Storage): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith('goal-in-one:')) out[key] = storage.getItem(key)!;
  }
  return out;
}
export function restoreMissing(storage: Storage, snapshot: Record<string, string>) {
  for (const [key, value] of Object.entries(snapshot))
    if (
      key.startsWith('goal-in-one:') &&
      typeof value === 'string' &&
      storage.getItem(key) === null
    )
      storage.setItem(key, value);
}
let pending: string | null = null;
let writing: Promise<void> | null = null;
async function backup(value: string) {
  pending = value;
  if (writing) return writing;
  writing = (async () => {
    while (pending !== null) {
      const next = pending;
      pending = null;
      await Preferences.set({ key: SNAPSHOT, value: next });
    }
  })();
  try {
    await writing;
  } finally {
    writing = null;
  }
}
export async function prepareNativeStorage() {
  if (!isNative()) return;
  const saved = await Preferences.get({ key: SNAPSHOT });
  if (saved.value) restoreMissing(localStorage, JSON.parse(saved.value));
  const schedule = () => {
    const value = JSON.stringify(gameSnapshot(localStorage));
    return backup(value).catch((error) => {
      window.dispatchEvent(new Event('native-save-error'));
      throw error;
    });
  };
  for (const method of ['setItem', 'removeItem', 'clear'] as const) {
    const original = Storage.prototype[method];
    Object.defineProperty(Storage.prototype, method, {
      configurable: true,
      writable: true,
      value: function (this: Storage, ...args: any[]) {
        const result = Reflect.apply(original, this, args);
        if (
          this === localStorage &&
          (method === 'clear' || String(args[0]).startsWith('goal-in-one:'))
        )
          void schedule().catch(() => {});
        return result;
      },
    });
  }
  await schedule();
}
export class ActivityGate {
  native = true;
  visible = true;
  get active() {
    return this.native && this.visible;
  }
}
export async function installLifecycle(change: (active: boolean) => void) {
  const gate = new ActivityGate();
  gate.visible = !document.hidden;
  const notify = () => change(gate.active);
  document.addEventListener('visibilitychange', () => {
    gate.visible = !document.hidden;
    notify();
  });
  window.addEventListener('pagehide', () => {
    gate.visible = false;
    notify();
  });
  window.addEventListener('pageshow', () => {
    gate.visible = !document.hidden;
    notify();
  });
  if (isNative()) {
    await App.addListener('appStateChange', ({ isActive }) => {
      gate.native = isActive;
      notify();
    });
    gate.native = (await App.getState()).isActive;
    await App.addListener('pause', () => {
      gate.native = false;
      notify();
    });
    await App.addListener('resume', () => {
      gate.native = true;
      notify();
    });
  }
  notify();
}
