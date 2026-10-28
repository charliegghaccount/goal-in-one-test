import type { Level } from './levels';
import type { Progress } from './progress';
import { bestFor } from './progress';
import { rating } from './simulation';
export const CHAPTER_SIZE = 25;
/** Four design slots, with more pages only if a user actually publishes a larger campaign. */
export const chapterCount = (levels: Level[]) =>
  Math.max(4, Math.ceil(levels.length / CHAPTER_SIZE));
export function chapterSlots(levels: Level[], chapter: number) {
  return Array.from({ length: CHAPTER_SIZE }, (_, i) => {
    const number = chapter * CHAPTER_SIZE + i + 1;
    return { number, level: levels[number - 1] ?? null, longHole: number % CHAPTER_SIZE === 0 };
  });
}
export function chapterStars(levels: Level[], progress: Progress, chapter: number) {
  return chapterSlots(levels, chapter).reduce((n, { level }) => {
    const shots = level ? bestFor(progress, level) : undefined;
    return n + (level && shots ? rating(shots, level) : 0);
  }, 0);
}
export function continueLevel(levels: Level[], progress: Progress) {
  return levels.find((l) => !bestFor(progress, l))?.id ?? levels[0]?.id ?? null;
}
