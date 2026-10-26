import { scenery, wood, beam, joint, turf } from './art';
import {
  BALL_RADIUS,
  MAX_PULL,
  trajectory,
  type FootballSimulation,
  type GameEvent,
} from './simulation';
import { arenaPolygon, segments, WALL_WIDTH, type Point, type Level } from './levels';
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
};
export function viewBounds(l: Level) {
  const y = Math.min(...l.outline.map((p) => p.y)) - 65;
  return { x: 25, y, w: 1250, h: Math.max(...l.outline.map((p) => p.y)) - y + 55 };
}
export class Renderer {
  ctx: CanvasRenderingContext2D;
  scale = 1;
  offsetX = 0;
  offsetY = 0;
  cameraX = 0;
  viewWidth = 1280;
  width = 1280;
  height = 720;
  time = 0;
  particles: Particle[] = [];
  trail: Point[] = [];
  constructor(public canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }
  resize(l: Level) {
    const r = this.canvas.getBoundingClientRect(),
      dpr = Math.min(devicePixelRatio || 1, 2);
    if (
      this.canvas.width !== Math.round(r.width * dpr) ||
      this.canvas.height !== Math.round(r.height * dpr)
    ) {
      this.canvas.width = Math.round(r.width * dpr);
      this.canvas.height = Math.round(r.height * dpr);
    }
    this.width = r.width;
    this.height = r.height;
    const b = viewBounds(l);
    this.scale = Math.min(r.width / b.w, r.height / b.h);
    this.offsetX = (r.width - b.w * this.scale) / 2 - b.x * this.scale;
    this.offsetY = (r.height - b.h * this.scale) / 2 - b.y * this.scale;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  toWorld(clientX: number, clientY: number): Point {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - r.left - this.offsetX) / this.scale,
      y: (clientY - r.top - this.offsetY) / this.scale,
    };
  }
  effect(e: GameEvent) {
    if (e.type === 'reset') this.trail = [];
    const colors =
      e.type === 'win'
        ? ['#d9f688', '#fff', '#5bbf93', '#f6b269']
        : e.type === 'reset'
          ? ['#fb7369', '#ffb1aa']
          : e.type === 'boost'
            ? ['#adf177', '#f9c36a']
            : ['#c5a36b', '#a6d44b'];
    for (let i = 0, n = e.type === 'win' ? 65 : 12; i < n; i++)
      this.particles.push({
        x: e.x,
        y: e.y,
        vx: (Math.random() - 0.5) * (e.type === 'win' ? 330 : 100),
        vy: -Math.random() * (e.type === 'win' ? 300 : 100),
        life: e.type === 'win' ? 2 : 0.55,
        size: 2 + Math.random() * 3,
        color: colors[i % colors.length],
      });
  }
  private path(points: Point[]) {
    const c = this.ctx;
    c.beginPath();
    points.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    c.closePath();
  }
  render(
    sim: FootballSimulation,
    dt: number,
    pull: Point | null,
    menu = false,
    reduced = false,
    _locked = false,
  ) {
    this.resize(sim.level);
    this.time += reduced ? 0 : dt;
    const c = this.ctx,
      l = sim.level,
      g = l.goal;
    scenery(c, this.width, this.height);
    c.save();
    c.translate(this.offsetX, this.offsetY);
    c.scale(this.scale, this.scale);
    this.path(arenaPolygon(l));
    c.fillStyle = 'rgba(238,249,255,.14)';
    c.fill();
    for (const o of l.obstacles) wood(c, o.points);
    for (const { body, definition: m } of sim.movers) {
      c.save();
      c.setLineDash([5, 8]);
      c.strokeStyle = '#344d5e66';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(m.x, m.y - m.travel - m.h / 2);
      c.lineTo(m.x, m.y + m.travel + m.h / 2);
      c.stroke();
      c.restore();
      const { x, y } = body.position;
      wood(c, [
        { x: x - m.w / 2, y: y - m.h / 2 },
        { x: x + m.w / 2, y: y - m.h / 2 },
        { x: x + m.w / 2, y: y + m.h / 2 },
        { x: x - m.w / 2, y: y + m.h / 2 },
      ]);
    }
    this.net(sim, reduced);
    const walls = segments(l);
    for (const s of walls) beam(c, s, WALL_WIDTH);
    const joints = new Map<string, Point>();
    for (const s of walls.filter((s) => s.kind === 'wall'))
      for (const p of [s.a, s.b]) joints.set(`${p.x},${p.y}`, p);
    for (const p of joints.values()) joint(c, p, WALL_WIDTH);
    const floor = walls.find((s) => s.id === 'floor');
    if (floor) turf(c, floor.a, floor.b);
    for (const s of l.surfaces) {
      const color =
        s.kind === 'forward' ? '#83d44b' : s.kind === 'backward' ? '#ed9e35' : '#ed4b52';
      c.strokeStyle =
        s.kind === 'forward' ? '#1f702c' : s.kind === 'backward' ? '#8b4f15' : '#8f243b';
      c.lineWidth = 12;
      c.beginPath();
      c.moveTo(s.x, s.y - 6);
      c.lineTo(s.x + s.w, s.y - 6);
      c.stroke();
      c.strokeStyle = color;
      c.lineWidth = 8;
      c.beginPath();
      c.moveTo(s.x, s.y - 6);
      c.lineTo(s.x + s.w, s.y - 6);
      c.stroke();
      if (s.kind === 'delete') {
        c.strokeStyle = '#fff5';
        c.lineWidth = 2;
        for (let x = s.x + 9; x < s.x + s.w - 4; x += 18) {
          c.beginPath();
          c.moveTo(x, s.y - 10);
          c.lineTo(x + 5, s.y - 2);
          c.stroke();
        }
      } else {
        const dir = s.kind === 'forward' ? 1 : -1;
        c.strokeStyle = '#fffef0';
        c.lineWidth = 2.2;
        for (let x = s.x + 16; x < s.x + s.w - 10; x += 30) {
          c.beginPath();
          c.moveTo(x - dir * 4, s.y - 9);
          c.lineTo(x + dir * 1, s.y - 6);
          c.lineTo(x - dir * 4, s.y - 3);
          c.stroke();
        }
      }
    }
    if (!menu && sim.phase === 'moving') {
      this.trail.push({ ...sim.ball.position });
      if (this.trail.length > 13) this.trail.shift();
    } else this.trail = [];
    for (let i = 0; i < this.trail.length; i++) {
      c.globalAlpha = (i / this.trail.length) * 0.25;
      c.fillStyle = '#5c8279';
      c.beginPath();
      c.arc(this.trail[i].x, this.trail[i].y, 2, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
    const b = sim.ball;
    if (pull && !menu) this.aim(b.position, pull, b.velocity);
    if (sim.canKick && !pull && !menu) {
      c.strokeStyle = '#1d827e55';
      c.lineWidth = 1.8;
      c.beginPath();
      c.arc(b.position.x, b.position.y, 25, 0, Math.PI * 2);
      c.stroke();
    }
    this.football(b.position.x, b.position.y, b.angle, 1);
    if (menu) {
      c.strokeStyle = '#6e9f8a';
      c.lineWidth = 2;
      c.setLineDash([3, 9]);
      c.beginPath();
      c.moveTo(b.position.x + 30, b.position.y - 8);
      c.quadraticCurveTo(600, g.y - 260, g.x - 30, g.y - 35);
      c.stroke();
      c.setLineDash([]);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 250 * dt;
      c.globalAlpha = Math.min(1, p.life * 2);
      c.fillStyle = p.color;
      c.fillRect(p.x, p.y, p.size, p.size);
    }
    c.globalAlpha = 1;
    c.restore();
    this.canvas.dataset.cameraX = '0';
    this.canvas.dataset.scale = String(this.scale);
    this.canvas.dataset.ballScreenX = String(this.offsetX + b.position.x * this.scale);
    this.canvas.dataset.ballScreenY = String(this.offsetY + b.position.y * this.scale);
    this.canvas.dataset.phase = sim.phase;
    this.canvas.dataset.velocityX = String(b.velocity.x);
    this.canvas.dataset.velocityY = String(b.velocity.y);
    this.canvas.dataset.resets = String(sim.resetCount);
    this.canvas.dataset.simTime = String(sim.time);
  }
  private net(sim: FootballSimulation, reduced: boolean) {
    const c = this.ctx,
      g = sim.level.goal;
    const points = [
      { x: g.x, y: g.y - g.h },
      { x: g.x + g.roof, y: g.y - g.h },
      { x: g.x + g.w, y: g.y },
      { x: g.x, y: g.y },
    ];
    this.path(points);
    c.fillStyle = '#e8fff021';
    c.fill();
    c.save();
    c.clip();
    const t = sim.time - sim.goalTime,
      ripple = !reduced && t >= 0 && t < 1.4 ? Math.sin(t * 24) * Math.exp(-t * 3) * 4 : 0;
    c.strokeStyle = '#ffffffdf';
    c.lineWidth = 1.3;
    for (let x = Math.min(g.x, g.x + g.w); x < Math.max(g.x, g.x + g.w); x += 13) {
      c.beginPath();
      c.moveTo(x, g.y - g.h);
      c.quadraticCurveTo(x + ripple, g.y - g.h / 2, x, g.y);
      c.stroke();
    }
    for (let y = g.y - g.h; y < g.y; y += 13) {
      c.beginPath();
      c.moveTo(g.x, y);
      c.quadraticCurveTo(g.x + g.w / 2, y + ripple, g.x + g.w, y);
      c.stroke();
    }
    c.restore();
    c.strokeStyle = '#67c895';
    c.lineWidth = 2;
    c.setLineDash([5, 7]);
    c.beginPath();
    c.moveTo(g.x, g.y - g.h + 12);
    c.lineTo(g.x, g.y - 12);
    c.stroke();
    c.setLineDash([]);
  }
  private football(x: number, y: number, angle: number, size: number) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.rotate(angle);
    c.scale(size, size);
    c.shadowColor = '#15344944';
    c.shadowBlur = 4;
    c.shadowOffsetY = 2;
    const shine = c.createRadialGradient(-5, -6, 1, 0, 0, BALL_RADIUS);
    shine.addColorStop(0, '#fff');
    shine.addColorStop(0.7, '#f8fafb');
    shine.addColorStop(1, '#b7c7d2');
    c.fillStyle = shine;
    c.strokeStyle = '#173449';
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;
    c.shadowOffsetY = 0;
    const poly = (cx: number, cy: number, r: number, rotation: number) => {
      c.beginPath();
      for (let j = 0; j < 5; j++) {
        const a = (j / 5) * Math.PI * 2 + rotation;
        c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      c.closePath();
      c.fill();
    };
    c.save();
    c.beginPath();
    c.arc(0, 0, BALL_RADIUS - 0.5, 0, Math.PI * 2);
    c.clip();
    c.fillStyle = '#183247';
    poly(0, 0, 4.5, -Math.PI / 2);
    c.strokeStyle = '#9aa9b2';
    c.lineWidth = 0.65;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2,
        xx = Math.cos(a) * 12,
        yy = Math.sin(a) * 12;
      poly(xx, yy, 4.4, a);
      c.beginPath();
      c.moveTo(Math.cos(a) * 4, Math.sin(a) * 4);
      c.lineTo(xx, yy);
      c.stroke();
    }
    c.restore();
    c.fillStyle = '#ffffff8c';
    c.beginPath();
    c.arc(-4, -5, 2, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
  private aim(b: Point, p: Point, velocity: Point) {
    const c = this.ctx,
      n = Math.hypot(p.x, p.y),
      ratio = Math.min(1, MAX_PULL / Math.max(n, 1));
    const pts = trajectory(b, p, velocity);
    for (let i = 0; i < pts.length; i++) {
      c.globalAlpha = (1 - i / pts.length) * 0.95;
      c.fillStyle = '#fff';
      c.beginPath();
      c.arc(pts[i].x, pts[i].y, 3.7 - (i / pts.length) * 2, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
    c.strokeStyle = '#163b5b66';
    c.lineWidth = 2;
    c.setLineDash([5, 5]);
    c.beginPath();
    c.moveTo(b.x, b.y);
    c.lineTo(b.x + p.x * ratio, b.y + p.y * ratio);
    c.stroke();
    c.setLineDash([]);
    const a = Math.atan2(-p.y, -p.x),
      d = Math.min(90, n) * 0.7 + 20,
      ex = b.x + Math.cos(a) * d,
      ey = b.y + Math.sin(a) * d;
    c.lineWidth = 5;
    c.strokeStyle = '#edff74';
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(b.x + Math.cos(a) * 20, b.y + Math.sin(a) * 20);
    c.lineTo(ex, ey);
    c.moveTo(ex - 11 * Math.cos(a - 0.5), ey - 11 * Math.sin(a - 0.5));
    c.lineTo(ex, ey);
    c.lineTo(ex - 11 * Math.cos(a + 0.5), ey - 11 * Math.sin(a + 0.5));
    c.stroke();
    c.lineWidth = 3;
    c.beginPath();
    c.arc(b.x, b.y, 23, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, n / MAX_PULL));
    c.stroke();
    this.pill(
      b.x,
      b.y - 62,
      `${Math.round(Math.min(1, n / MAX_PULL) * 100)}% POWER`,
      '#17364c',
      '#edff74',
    );
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(b.x + p.x * ratio, b.y + p.y * ratio, 5, 0, Math.PI * 2);
    c.fill();
  }
  private pill(x: number, y: number, text: string, bg: string, fg: string) {
    const c = this.ctx;
    c.font = 'bold 10px sans-serif';
    const w = c.measureText(text).width + 24;
    c.fillStyle = bg;
    c.beginPath();
    c.roundRect(x - w / 2, y - 13, w, 26, 8);
    c.fill();
    c.fillStyle = fg;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, x, y);
    c.textBaseline = 'alphabetic';
  }
}
