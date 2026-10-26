import type { Level, Point } from './levels';

export type Rect = { x: number; y: number; w: number; h: number };
export type CameraSpec = {
  mode: 'fixed' | 'follow-x' | 'follow-xy';
  viewWidth: number;
  viewHeight: number;
  safeHudTopPx?: number;
  deadZone?: Point;
  smoothing?: number;
  zoom?: number;
  bounds?: Rect;
  minimumBallDiameterPx?: number;
  zoomMode?: string;
  windows?: { label: string; x: number; y: number }[];
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Overview / thumbnails. The legacy rectangle is deliberately unchanged. */
export function viewBounds(l: Level): Rect {
  if (!l.camera) {
    const y = Math.min(...l.outline.map((p) => p.y)) - 65;
    return { x: 25, y, w: 1250, h: Math.max(...l.outline.map((p) => p.y)) - y + 55 };
  }
  const points = [...l.outline, { x: l.goal.x + l.goal.w, y: l.goal.y }];
  const x = Math.min(...points.map((p) => p.x)) - 24;
  const y = Math.min(...points.map((p) => p.y)) - 28;
  return {
    x,
    y,
    w: Math.max(...points.map((p) => p.x)) - x + 24,
    h: Math.max(...points.map((p) => p.y)) - y + 28,
  };
}

/** All render and input coordinates share this CSS-pixel transform (DPR independent). */
export class Camera {
  view: Rect = { x: 0, y: 0, w: 1280, h: 720 };
  bounds: Rect = { ...this.view };
  scale = 1;
  offsetX = 0;
  offsetY = 0;
  overview = false;
  private level: Level | null = null;
  private width = 1280;
  private height = 720;
  private initialized = false;
  resize(l: Level, width: number, height: number) {
    if (this.level !== l) {
      this.level = l;
      this.initialized = false;
      this.overview = false;
    }
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.bounds = l.camera?.bounds ?? viewBounds(l);
    if (!l.camera || l.camera.mode === 'fixed' || this.overview) {
      this.view = { ...viewBounds(l) };
    } else {
      const zoom = clamp(l.camera.zoom ?? 1, 0.6, 2);
      const minScale = (l.camera.minimumBallDiameterPx ?? 20) / 32;
      // Crop the viewport on a small phone instead of shrinking the ball. Physics never scale.
      this.view.w = Math.min(l.camera.viewWidth / zoom, this.width / minScale, this.bounds.w);
      this.view.h = Math.min(
        l.camera.viewHeight / zoom,
        (this.view.w * this.height) / this.width,
        this.height / minScale,
        this.bounds.h,
      );
      if (!this.initialized) {
        this.view.x = l.start.x - this.view.w * 0.35;
        this.view.y = l.start.y - this.view.h * 0.7;
      }
      this.clamp();
    }
    this.initialized = true;
    this.transform();
  }
  resetTo(p: Point) {
    if (!this.level?.camera || this.level.camera.mode === 'fixed' || this.overview) return;
    this.view.x = p.x - this.view.w * 0.35;
    this.view.y = p.y - this.view.h * 0.7;
    this.clamp();
    this.transform();
  }
  update(p: Point, velocity: Point, dt: number) {
    const spec = this.level?.camera;
    if (!spec || spec.mode === 'fixed' || this.overview || dt <= 0) return;
    const v = this.view;
    const dz = spec.deadZone ?? { x: 0.25, y: 0.22 };
    const target = { x: v.x, y: v.y };
    const follow = (axis: 'x' | 'y', size: number, center: number, half: number) => {
      const look = p[axis] + clamp(velocity[axis] * 5, -size * 0.09, size * 0.09);
      const lo = v[axis] + size * (center - half);
      const hi = v[axis] + size * (center + half);
      if (look < lo) target[axis] += look - lo;
      if (look > hi) target[axis] += look - hi;
    };
    follow('x', v.w, 0.48, clamp(dz.x / 2, 0.04, 0.3));
    if (spec.mode === 'follow-xy') follow('y', v.h, 0.5, clamp(dz.y / 2, 0.04, 0.3));
    // Follow-X normally frames the whole height. Small phones still protect an airborne ball.
    const safe = Math.min(52 / this.scale, v.h * 0.17);
    if (p.y < v.y + safe) target.y = p.y - safe;
    if (p.y > v.y + v.h - safe) target.y = p.y - v.h + safe;
    const a = 1 - Math.pow(1 - clamp(spec.smoothing ?? 0.11, 0.01, 1), dt * 60);
    v.x += (target.x - v.x) * a;
    v.y += (target.y - v.y) * a;
    // A bounded safety correction handles fast reversals; ordinary following stays damped.
    v.x = clamp(v.x, p.x - v.w + safe, p.x - safe);
    v.y = clamp(v.y, p.y - v.h + safe, p.y - safe);
    this.clamp();
    this.transform();
  }
  setOverview(value: boolean) {
    this.overview = value;
    this.initialized = false;
  }
  private clamp() {
    this.view.x = clamp(this.view.x, this.bounds.x, this.bounds.x + this.bounds.w - this.view.w);
    this.view.y = clamp(this.view.y, this.bounds.y, this.bounds.y + this.bounds.h - this.view.h);
  }
  private transform() {
    const v = this.view;
    this.scale = Math.min(this.width / v.w, this.height / v.h);
    this.offsetX = (this.width - v.w * this.scale) / 2 - v.x * this.scale;
    this.offsetY = (this.height - v.h * this.scale) / 2 - v.y * this.scale;
  }
  worldToScreen(p: Point): Point {
    return { x: p.x * this.scale + this.offsetX, y: p.y * this.scale + this.offsetY };
  }
  screenToWorld(p: Point): Point {
    return { x: (p.x - this.offsetX) / this.scale, y: (p.y - this.offsetY) / this.scale };
  }
  goalIndicator(p: Point): (Point & { angle: number; distance: number }) | null {
    const s = this.worldToScreen(p);
    const topLeft = this.worldToScreen(this.view);
    const right = topLeft.x + this.view.w * this.scale;
    const bottom = topLeft.y + this.view.h * this.scale;
    if (s.x >= topLeft.x && s.x <= right && s.y >= topLeft.y && s.y <= bottom) return null;
    const margin = Math.min(40, (bottom - topLeft.y) / 5);
    const x = clamp(s.x, topLeft.x + margin, right - margin);
    const y = clamp(s.y, topLeft.y + margin, bottom - margin);
    return {
      x,
      y,
      angle: Math.atan2(s.y - y, s.x - x),
      distance: Math.hypot(s.x - x, s.y - y) / this.scale,
    };
  }
}
