import type { Renderer } from './render';
import type { Point } from './levels';
/** Pointer ownership is decided at gesture start. Exploring/pinching never reaches kick handlers. */
export class ExplorationControls {
  explore = false;
  private pointers = new Map<number, Point>();
  private pan: number | null = null;
  private last: Point | null = null;
  private pinch: { center: Point; distance: number } | null = null;
  private abort = new AbortController();
  constructor(
    private renderer: Renderer,
    private cancelAim: () => void,
    private changed: () => void,
  ) {
    const canvas = renderer.canvas,
      opts = { capture: true, signal: this.abort.signal };
    canvas.addEventListener(
      'pointerdown',
      (e) => {
        if (e.button !== 0 && e.button !== 1) return;
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.pointers.size >= 2) {
          this.cancelAim();
          this.explore = true;
          this.pan = null;
          this.renderer.camera.beginExplore();
          this.pinch = this.measure();
          this.consume(e);
          this.changed();
          return;
        }
        if (this.explore || e.button === 1) {
          this.cancelAim();
          this.pan = e.pointerId;
          this.last = { x: e.clientX, y: e.clientY };
          this.renderer.camera.beginExplore();
          this.consume(e);
          canvas.setPointerCapture(e.pointerId);
          this.changed();
        }
      },
      opts,
    );
    canvas.addEventListener(
      'pointermove',
      (e) => {
        if (!this.pointers.has(e.pointerId)) return;
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.pointers.size >= 2) {
          const next = this.measure();
          if (this.pinch && next) {
            const r = canvas.getBoundingClientRect();
            this.renderer.camera.panBy(
              next.center.x - this.pinch.center.x,
              next.center.y - this.pinch.center.y,
            );
            this.renderer.camera.zoomBy(next.distance / Math.max(1, this.pinch.distance), {
              x: next.center.x - r.left,
              y: next.center.y - r.top,
            });
          }
          this.pinch = next;
          this.consume(e);
          this.changed();
          return;
        }
        if (this.pan === e.pointerId && this.last) {
          this.renderer.camera.panBy(e.clientX - this.last.x, e.clientY - this.last.y);
          this.last = { x: e.clientX, y: e.clientY };
          this.consume(e);
          this.changed();
        }
      },
      opts,
    );
    const finish = (e: PointerEvent) => {
      const owned = this.pan === e.pointerId || !!this.pinch || this.explore;
      this.pointers.delete(e.pointerId);
      if (owned) {
        this.consume(e);
        this.cancelAim();
      }
      if (this.pan === e.pointerId) this.pan = null;
      if (this.pointers.size < 2) this.pinch = null;
      this.last = null;
    };
    canvas.addEventListener('pointerup', finish, opts);
    canvas.addEventListener('pointercancel', finish, opts);
    canvas.addEventListener(
      'wheel',
      (e) => {
        if (renderer.camera.overview) return;
        e.preventDefault();
        this.cancelAim();
        const r = canvas.getBoundingClientRect();
        renderer.camera.zoomBy(Math.exp(-e.deltaY * 0.0015), {
          x: e.clientX - r.left,
          y: e.clientY - r.top,
        });
        this.changed();
      },
      { passive: false, signal: this.abort.signal },
    );
  }
  private consume(e: PointerEvent) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }
  private measure() {
    const p = [...this.pointers.values()];
    return p.length < 2
      ? null
      : {
          center: { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 },
          distance: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y),
        };
  }
  toggle() {
    this.cancelAim();
    this.explore = !this.explore;
    if (this.explore) this.renderer.camera.beginExplore();
    this.changed();
  }
  returnToBall() {
    this.cancelAim();
    this.explore = false;
    if (this.renderer.camera.overview) this.renderer.camera.setOverview(false);
    this.renderer.camera.returnToBall();
    this.changed();
  }
  zoom(factor: number) {
    this.cancelAim();
    this.renderer.camera.zoomBy(factor);
    this.changed();
  }
  destroy() {
    this.abort.abort();
    this.pointers.clear();
  }
}
