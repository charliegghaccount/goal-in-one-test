export type Progress = { best: Record<string, number>; sound: boolean };
const KEY = 'goal-in-one:football:v2';
export function readProgress(storage?: Pick<Storage, 'getItem'>): Progress {
  try {
    const store = storage ?? localStorage;
    const saved = store.getItem(KEY);
    const raw = JSON.parse(saved || '{}');
    // Old scores belong to different levels. Keep only the old sound preference.
    if (!saved) {
      const legacy = JSON.parse(store.getItem('goal-in-one:v1') || '{}');
      raw.sound = legacy?.sound !== false;
    }
    const best: Record<string, number> = {};
    if (raw && typeof raw.best === 'object' && raw.best)
      for (const [k, v] of Object.entries(raw.best))
        if (/^(10|[1-9])$/.test(k) && Number.isInteger(v) && Number(v) > 0) best[k] = Number(v);
    return { best, sound: raw?.sound !== false };
  } catch {
    return { best: {}, sound: true };
  }
}
export function saveProgress(progress: Progress, storage?: Pick<Storage, 'setItem'>): boolean {
  try {
    (storage ?? localStorage).setItem(KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}
export function recordBest(progress: Progress, id: number, shots: number): void {
  progress.best[id] = Math.min(progress.best[id] ?? Infinity, shots);
}
