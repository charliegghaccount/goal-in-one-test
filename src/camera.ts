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
  initial?: Point;
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Overview / thumbnails. The legacy rectangle is deliberately unchanged. */
export function viewBounds(l: Level): Rect {
  if (!l.camera && !l.boundary) {
    const y = Math.min(...l.outline.map((p) => p.y)) - 65;
    return { x: 25, y, w: 1250, h: Math.max(...l.outline.map((p) => p.y)) - y + 55 };
  }
  const points = [...(l.boundary ?? l.outline), { x: l.goal.x + l.goal.w, y: l.goal.y }];
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
  manual = false;
  returning = false;
  userZoom = 1;
  editorWorkspace = false;
  /** Authoring frame stays fixed until an explicit Fit, rather than following edited bounds. */
  editorFrame: Rect | null = null;
  private previous: { view: Rect; zoom: number; manual: boolean } | null = null;
  private level: Level | null = null;
  private width = 1280;
  private height = 720;
  private initialized = false;
  resize(l: Level, width: number, height: number) {
    const changed = this.level !== l,
      resized = this.width !== width || this.height !== height;
    const center = { x: this.view.x + this.view.w / 2, y: this.view.y + this.view.h / 2 };
    if (changed) {
      this.level = l;
      this.editorFrame = null;
      this.initialized = false;
      this.overview = false;
      this.manual = this.editorWorkspace;
      this.returning = false;
      this.userZoom = 1;
      this.previous = null;
    }
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    const whole = this.editorWorkspace ? (this.editorFrame ??= viewBounds(l)) : viewBounds(l);
    this.bounds = l.camera?.bounds ?? whole;
    if (this.editorWorkspace)
      this.bounds = {
        x: whole.x - whole.w / 2,
        y: whole.y - whole.h / 2,
        w: whole.w * 2,
        h: whole.h * 2,
      };
    if (this.overview) {
      this.view = { ...whole };
      this.transform();
      return;
    }
    const fixed = !l.camera || l.camera.mode === 'fixed' || this.editorWorkspace;
    let w = whole.w,
      h = whole.h;
    if (!fixed) {
      const zoom = clamp(l.camera!.zoom ?? 1, 0.6, 2),
        minScale = (l.camera!.minimumBallDiameterPx ?? 20) / 32;
      w = Math.min(l.camera!.viewWidth / zoom, this.width / minScale, this.bounds.w);
      h = Math.min(
        l.camera!.viewHeight / zoom,
        (w * this.height) / this.width,
        this.height / minScale,
        this.bounds.h,
      );
    }
    this.view.w = Math.min(this.bounds.w, w / this.userZoom);
    this.view.h = Math.min(this.bounds.h, h / this.userZoom);
    if (!this.initialized) {
      const initial = l.camera?.initial ?? l.start;
      this.view.x = fixed ? whole.x : initial.x - this.view.w * 0.35;
      this.view.y = fixed ? whole.y : initial.y - this.view.h * 0.7;
    } else if (resized) {
      this.view.x = center.x - this.view.w / 2;
      this.view.y = center.y - this.view.h / 2;
    }
    if (fixed && !this.manual && !this.returning && this.userZoom === 1) this.view = { ...whole };
    else this.clamp();
    this.initialized = true;
    this.transform();
  }
  beginExplore() {
    this.manual = true;
    this.returning = false;
  }
  panBy(dx: number, dy: number) {
    if (this.overview) return;
    this.beginExplore();
    this.view.x -= dx / this.scale;
    this.view.y -= dy / this.scale;
    this.clamp();
    this.transform();
  }
  zoomBy(factor: number, anchor: Point = { x: this.width / 2, y: this.height / 2 }) {
    if (!this.level || this.overview || !Number.isFinite(factor) || factor <= 0) return;
    const before = this.screenToWorld(anchor);
    this.userZoom = clamp(
      this.userZoom * factor,
      this.editorWorkspace ? 0.15 : 1,
      this.editorWorkspace ? 8 : 2.8,
    );
    this.beginExplore();
    this.resize(this.level, this.width, this.height);
    const after = this.screenToWorld(anchor);
    this.view.x += before.x - after.x;
    this.view.y += before.y - after.y;
    this.clamp();
    this.transform();
  }
  returnToBall() {
    this.manual = false;
    this.returning = true;
  }
  fit() {
    if (!this.level) return;
    this.userZoom = 1;
    this.manual = this.editorWorkspace;
    this.returning = false;
    this.initialized = false;
    this.editorFrame = null;
    this.resize(this.level, this.width, this.height);
  }
  restoreWorkspace(view: Rect, zoom: number, frame?: Rect) {
    if (!this.level) return;
    if (this.editorWorkspace && frame) this.editorFrame = { ...frame };
    this.userZoom = clamp(zoom, 0.15, 8);
    this.manual = true;
    this.resize(this.level, this.width, this.height);
    this.view.x = view.x + view.w / 2 - this.view.w / 2;
    this.view.y = view.y + view.h / 2 - this.view.h / 2;
    this.clamp();
    this.transform();
  }
  resetTo(p: Point) {
    if (!this.level?.camera || this.level.camera.mode === 'fixed' || this.overview || this.manual)
      return;
    this.view.x = p.x - this.view.w * 0.35;
    this.view.y = p.y - this.view.h * 0.7;
    this.clamp();
    this.transform();
  }
  update(p: Point, velocity: Point, dt: number) {
    const spec = this.level?.camera;
    if (this.overview || this.editorWorkspace || this.manual || dt <= 0) return;
    if (this.returning) {
      const target = { x: p.x - this.view.w / 2, y: p.y - this.view.h / 2 },
        b = this.bounds;
      target.x = clamp(target.x, b.x, b.x + b.w - this.view.w);
      target.y = clamp(target.y, b.y, b.y + b.h - this.view.h);
      const a = 1 - Math.exp(-dt * 9);
      this.view.x += (target.x - this.view.x) * a;
      this.view.y += (target.y - this.view.y) * a;
      if (Math.hypot(this.view.x - target.x, this.view.y - target.y) < 0.5) this.returning = false;
      this.clamp();
      this.transform();
      return;
    }
    if ((!spec || spec.mode === 'fixed') && this.userZoom === 1) return;
    const v = this.view;
    const dz = spec?.deadZone ?? { x: 0.25, y: 0.22 };
    const target = { x: v.x, y: v.y };
    const follow = (axis: 'x' | 'y', size: number, center: number, half: number) => {
      const look = p[axis] + clamp(velocity[axis] * 5, -size * 0.09, size * 0.09);
      const lo = v[axis] + size * (center - half);
      const hi = v[axis] + size * (center + half);
      if (look < lo) target[axis] += look - lo;
      if (look > hi) target[axis] += look - hi;
    };
    follow('x', v.w, 0.48, clamp(dz.x / 2, 0.04, 0.3));
    if (spec?.mode === 'follow-xy' || this.userZoom > 1)
      follow('y', v.h, 0.5, clamp(dz.y / 2, 0.04, 0.3));
    // Follow-X normally frames the whole height. Small phones still protect an airborne ball.
    const safe = Math.min(52 / this.scale, v.h * 0.17);
    if (p.y < v.y + safe) target.y = p.y - safe;
    if (p.y > v.y + v.h - safe) target.y = p.y - v.h + safe;
    const a = 1 - Math.pow(1 - clamp(spec?.smoothing ?? 0.11, 0.01, 1), dt * 60);
    v.x += (target.x - v.x) * a;
    v.y += (target.y - v.y) * a;
    // A bounded safety correction handles fast reversals; ordinary following stays damped.
    v.x = clamp(v.x, p.x - v.w + safe, p.x - safe);
    v.y = clamp(v.y, p.y - v.h + safe, p.y - safe);
    this.clamp();
    this.transform();
  }
  setOverview(value: boolean) {
    if (value === this.overview) return;
    if (value) this.previous = { view: { ...this.view }, zoom: this.userZoom, manual: this.manual };
    else if (this.previous) {
      this.view = { ...this.previous.view };
      this.userZoom = this.previous.zoom;
      this.manual = this.previous.manual;
      this.previous = null;
    }
    this.overview = value;
    this.initialized = true;
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
