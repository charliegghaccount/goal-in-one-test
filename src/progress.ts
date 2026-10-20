export type Progress = { best: Record<string, number>; sound: boolean };
const KEY = 'goal-in-one:v1';
export function readProgress(storage?: Pick<Storage, 'getItem'>): Progress {
  try {
    const raw = JSON.parse((storage ?? localStorage).getItem(KEY) || '{}');
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
