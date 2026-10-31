import type { Level } from './levels';
import { scoreKey } from './campaign';
import { levels } from './levels';
export type Progress = {
  best: Record<string, number>;
  sound: boolean;
  announcer?: boolean;
  records?: Record<string, number>;
};
const KEY = 'goal-in-one:grass:v5';
export function readProgress(storage?: Pick<Storage, 'getItem'>): Progress {
  try {
    const store = storage ?? localStorage;
    const saved = store.getItem(KEY);
    const raw = JSON.parse(saved || store.getItem('goal-in-one:arenas:v3') || '{}');
    // Old scores belong to different levels. Keep only the old sound preference.
    if (!saved) {
      const legacy = JSON.parse(
        store.getItem('goal-in-one:arenas:v3') ||
          store.getItem('goal-in-one:football:v2') ||
          store.getItem('goal-in-one:v1') ||
          '{}',
      );
      raw.sound =
        JSON.parse(store.getItem('goal-in-one:designer:v4') || 'null')?.sound ??
        legacy?.sound !== false;
    }
    const best: Record<string, number> = {};
    if (raw && typeof raw.best === 'object' && raw.best)
      for (const [k, v] of Object.entries(raw.best))
        if (levels.some((l) => String(l.id) === k) && Number.isInteger(v) && Number(v) > 0)
          best[k] = Number(v);
    const records: Record<string, number> = {};
    if (raw?.records && typeof raw.records === 'object')
      for (const [k, v] of Object.entries(raw.records))
        if (k.length <= 160 && /^.+@[1-9][0-9]*$/.test(k) && Number.isInteger(v) && Number(v) > 0)
          records[k] = Number(v);
    return {
      best,
      sound: raw?.sound !== false,
      ...(raw?.announcer === true ? { announcer: true } : {}),
      ...(Object.keys(records).length ? { records } : {}),
    };
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

export function bestFor(progress: Progress, l: Level): number | undefined {
  const keyed = progress.records?.[scoreKey(l)];
  if (keyed) return keyed;
  const original = /^builtin-(\d+)$/.exec(l.campaignId ?? `builtin-${l.id}`);
  return (l.revision ?? 1) === 1 && original ? progress.best[original[1]] : undefined;
}
export function recordLevelBest(progress: Progress, l: Level, shots: number) {
  if (!Number.isInteger(shots) || shots < 1) return;
  const key = scoreKey(l);
  progress.records ??= {};
  progress.records[key] = Math.min(bestFor(progress, l) ?? Infinity, shots);
  const original = /^builtin-(\d+)$/.exec(l.campaignId ?? `builtin-${l.id}`);
  if ((l.revision ?? 1) === 1 && original) recordBest(progress, +original[1], shots);
}
