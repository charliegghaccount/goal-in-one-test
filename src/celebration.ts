import { rating } from './simulation';
import type { Level } from './levels';
export type Announcement = 'one-shot' | 'goal' | 'solid-effort' | 'disappointed';
export type CompletionLevel = Pick<Level, 'par' | 'starShots'>;
export const announcementText: Record<Announcement, string> = {
  'one-shot': 'GOAL IN ONE!',
  goal: 'GOAL!',
  'solid-effort': 'A Solid Effort',
  disappointed: 'Should Have Done Better There',
};
export function announcementFor(shots: number, level: CompletionLevel): Announcement | null {
  if (shots === 1) return 'one-shot';
  const stars = rating(shots, level);
  if (stars === 2) return 'goal';
  if (stars === 1) return shots >= level.par + 2 ? 'disappointed' : 'solid-effort';
  return null;
}
export function completionTitle(shots: number, level: CompletionLevel) {
  const line = announcementFor(shots, level);
  return line ? announcementText[line] : 'BRILLIANT GOAL!';
}
export class CompletionCelebration {
  private completed = new Set<number>();
  take(shots: number, round: number): 'one-shot' | 'standard' | null {
    if (this.completed.has(round)) return null;
    this.completed.add(round);
    if (this.completed.size > 64) this.completed.delete(this.completed.values().next().value!);
    return shots === 1 ? 'one-shot' : 'standard';
  }
}
