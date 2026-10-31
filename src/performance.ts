/** Development-only, bounded measurements; no production HUD or telemetry. */
export class PerformanceSamples {
  samples: { gap: number; physics: number; work: number }[] = [];
  loads: number[] = [];
  levelLoaded(ms: number) {
    this.loads.push(ms);
    if (this.loads.length > 60) this.loads.shift();
  }
  frame(gap: number, physics: number, work: number) {
    this.samples.push({ gap, physics, work });
    if (this.samples.length > 600) this.samples.shift();
  }
  summary() {
    const n = this.samples.length || 1;
    return {
      samples: this.samples.length,
      averageFrameGapMs: this.samples.reduce((s, v) => s + v.gap, 0) / n,
      averagePhysicsMs: this.samples.reduce((s, v) => s + v.physics, 0) / n,
      averageFrameWorkMs: this.samples.reduce((s, v) => s + v.work, 0) / n,
      longFrames: this.samples.filter((v) => v.gap > 33.34).length,
      levelLoadsMs: [...this.loads],
      heapBytes: (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
        ?.usedJSHeapSize,
    };
  }
}
export const diagnostics =
  import.meta.env?.DEV &&
  typeof location !== 'undefined' &&
  new URLSearchParams(location.search).has('perf')
    ? new PerformanceSamples()
    : null;
if (diagnostics)
  (window as unknown as { __goalPerformance: PerformanceSamples }).__goalPerformance = diagnostics;
