/** Supply an original recorded/generated 1–2 second phrase here when available.
 * No speech service is available in this workspace; never fall back to robotic TTS.
 * URL must be relative to the app base so GitHub Pages subpath hosting works.
 */
export const oneShotVoiceFile: string | null = null;

export class CompletionCelebration {
  private completed = new Set<number>();
  take(shots: number, round: number): 'one-shot' | 'standard' | null {
    if (this.completed.has(round)) return null;
    this.completed.add(round);
    // A bounded history avoids growth during long sessions. Round serials only increase.
    if (this.completed.size > 64) this.completed.delete(this.completed.values().next().value!);
    return shots === 1 ? 'one-shot' : 'standard';
  }
}
