import {
  BALL_RADIUS,
  MAX_PULL,
  trajectory,
  type FootballSimulation,
  type GameEvent,
} from './simulation';
import type { Goal, Point } from './levels';
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
};
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
  overview = false;
  manualPan: number | null = null;
  particles: Particle[] = [];
  trail: Point[] = [];
  constructor(public canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }
  resize(worldWidth: number) {
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
    this.viewWidth = this.overview ? worldWidth : r.width < 700 ? 900 : 1280;
    this.scale = Math.min(r.width / this.viewWidth, r.height / 720);
    this.offsetX = (r.width - this.viewWidth * this.scale) / 2;
    this.offsetY = (r.height - 720 * this.scale) / 2;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  toWorld(clientX: number, clientY: number): Point {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - r.left - this.offsetX) / this.scale + this.cameraX,
      y: (clientY - r.top - this.offsetY) / this.scale,
    };
  }
  pan(delta: number, worldWidth: number) {
    this.manualPan = Math.max(
      0,
      Math.min(worldWidth - this.viewWidth, (this.manualPan ?? this.cameraX) + delta),
    );
  }
  follow() {
    this.manualPan = null;
    this.overview = false;
  }
  effect(e: GameEvent) {
    const colors =
      e.type === 'win'
        ? ['#e5ff64', '#fff', '#ff9557', '#00c9a7']
        : e.type === 'water'
          ? ['#fff', '#5bc8f0', '#a6ecff']
          : e.type === 'bounce'
            ? ['#ffe56b', '#fc9252']
            : ['#fff8c9', '#7ecf8d'];
    for (let i = 0, n = e.type === 'win' ? 100 : e.type === 'shot' ? 12 : 14; i < n; i++)
      this.particles.push({
        x: e.x,
        y: e.y,
        vx: (Math.random() - 0.5) * (e.type === 'win' ? 480 : 150),
        vy: -Math.random() * (e.type === 'win' ? 470 : 160),
        life: e.type === 'win' ? 2 + Math.random() : 0.3 + Math.random() * 0.5,
        size: 2 + Math.random() * 4,
        color: colors[i % colors.length],
      });
  }
  render(
    sim: FootballSimulation,
    dt: number,
    pull: Point | null,
    menu = false,
    reduced = false,
    locked = false,
  ) {
    this.resize(sim.level.width);
    this.time += reduced ? 0 : dt;
    const target = this.overview
      ? 0
      : (this.manualPan ??
        Math.max(
          0,
          Math.min(sim.level.width - this.viewWidth, sim.ball.position.x - this.viewWidth * 0.34),
        ));
    if (!locked) this.cameraX += (target - this.cameraX) * (1 - Math.exp(-dt * 5));
    this.cameraX = Math.max(
      0,
      Math.min(Math.max(0, sim.level.width - this.viewWidth), this.cameraX),
    );
    const c = this.ctx,
      l = sim.level;
    const gradient = c.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(
      0,
      l.theme === 'sunset' ? '#ffd0a0' : l.theme === 'coast' ? '#78cfee' : '#86dcf3',
    );
    gradient.addColorStop(1, l.theme === 'sunset' ? '#ffe6b5' : '#d1f4ec');
    c.fillStyle = gradient;
    c.fillRect(0, 0, this.width, this.height);
    c.save();
    c.translate(this.offsetX, this.offsetY);
    c.scale(this.scale, this.scale);
    this.background(menu, l.theme === 'sunset');
    c.save();
    c.translate(-this.cameraX, 0);
    for (const w of l.water ?? []) this.water(w.x, w.y, w.w);
    for (const { body, definition: t } of sim.terrain)
      this.land(body.position.x, body.position.y, t.w, t.h, body.angle, t.kind === 'stone');
    for (const pad of l.pads ?? []) this.pad(pad.x, pad.y, pad.w);
    for (const { body, definition: m } of sim.movers)
      this.gate(body.position.x, body.position.y, m.w, m.h);
    this.net(l.goal, sim.time - sim.goalTime, reduced);
    if (!menu && sim.phase === 'moving') {
      this.trail.push({ ...sim.ball.position });
      if (this.trail.length > 18) this.trail.shift();
    } else if (!menu) this.trail = [];
    for (let i = 0; i < this.trail.length; i++) {
      const p = this.trail[i];
      c.globalAlpha = (i / this.trail.length) * 0.28;
      c.fillStyle = '#fff';
      c.beginPath();
      c.arc(p.x, p.y, 2 + (i / this.trail.length) * 2, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
    if (menu) {
      const b = { x: 200, y: 555 };
      const pts = trajectory(b, {
        x: -Math.cos((Math.PI * 42) / 180) * MAX_PULL,
        y: Math.sin((Math.PI * 42) / 180) * MAX_PULL,
      });
      c.fillStyle = '#fff';
      for (const p of pts) {
        c.beginPath();
        c.arc(p.x, p.y, 3, 0, Math.PI * 2);
        c.fill();
      }
      this.football(200, 555, -0.2, 1.2);
    } else {
      const b = sim.ball;
      const below = sim.terrain
        .filter(
          (t) =>
            !t.body.angle &&
            b.position.x > t.definition.x &&
            b.position.x < t.definition.x + t.definition.w &&
            t.definition.y >= b.position.y - 13,
        )
        .sort((a, b) => a.definition.y - b.definition.y)[0];
      if (below) {
        c.fillStyle = '#173d3c22';
        c.beginPath();
        c.ellipse(b.position.x, below.definition.y, 16, 4, 0, 0, Math.PI * 2);
        c.fill();
      }
      if (pull) this.aim(b.position, pull);
      if (sim.phase === 'ready' && !pull) {
        c.strokeStyle = '#fff';
        c.lineWidth = 2;
        c.globalAlpha = 0.65;
        c.beginPath();
        c.arc(b.position.x, b.position.y, 23 + Math.sin(this.time * 4) * 2, 0, Math.PI * 2);
        c.stroke();
        c.globalAlpha = 1;
      }
      if (sim.phase !== 'respawning') this.football(b.position.x, b.position.y, b.angle, 1);
      if (sim.shots === 0 && sim.phase === 'ready' && !pull)
        this.pill(b.position.x + 5, b.position.y - 56, 'DRAG TO KICK', '#16364a', '#fff');
      if (sim.phase === 'respawning')
        this.pill(
          Math.min(l.width - 150, Math.max(150, b.position.x)),
          280,
          'OUT OF PLAY',
          '#16364a',
          '#fff',
        );
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
      p.vy += 350 * dt;
      c.globalAlpha = Math.min(1, p.life * 2);
      c.fillStyle = p.color;
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.life * 4);
      c.fillRect(-p.size, -p.size / 2, p.size * 2, p.size);
      c.restore();
    }
    c.globalAlpha = 1;
    c.restore();
    c.restore();
    const b = sim.ball.position;
    // Read-only rendering diagnostics also make camera/input regression tests observable.
    this.canvas.dataset.cameraX = String(this.cameraX);
    this.canvas.dataset.scale = String(this.scale);
    this.canvas.dataset.ballScreenX = String(this.offsetX + (b.x - this.cameraX) * this.scale);
    this.canvas.dataset.ballScreenY = String(this.offsetY + b.y * this.scale);
    this.canvas.dataset.phase = sim.phase;
  }
  private background(menu: boolean, sunset: boolean) {
    const c = this.ctx,
      shift = this.cameraX * 0.15;
    c.fillStyle = sunset ? '#fff0a0' : '#fff8c6';
    c.beginPath();
    c.arc(1080 - shift * 0.3, 130, 49, 0, Math.PI * 2);
    c.fill();
    for (const [x, y, s] of [
      [160, 100, 1],
      [610, 160, 0.7],
      [1110, 250, 0.55],
      [1520, 90, 0.9],
    ])
      this.cloud(x - shift + Math.sin(this.time * 0.03 + x) * 12, y, s);
    c.fillStyle = sunset ? '#c8d9b4' : '#a4dfcd';
    c.beginPath();
    c.moveTo(-100, 720);
    c.lineTo(-100, 480);
    for (let i = -1; i < 6; i++)
      c.quadraticCurveTo(i * 320 + 120 - shift, 270 + (i % 2) * 50, i * 320 + 360 - shift, 480);
    c.lineTo(2300, 760);
    c.fill();
    c.fillStyle = sunset ? '#9ac7ad' : '#71c8b2';
    c.beginPath();
    c.moveTo(-100, 760);
    c.lineTo(-100, 570);
    for (let i = -1; i < 6; i++)
      c.quadraticCurveTo(
        i * 320 + 120 - shift * 1.5,
        390 + (i % 2) * 80,
        i * 320 + 360 - shift * 1.5,
        570,
      );
    c.lineTo(2300, 760);
    c.fill();
    for (let i = 0; i < 10; i++) {
      const x = i * 210 + 45 - shift * 1.5,
        y = 480 + Math.sin(i * 3) * 50;
      this.tree(x, y, 0.6 + (i % 3) * 0.13);
    }
    c.strokeStyle = '#327e8c88';
    c.lineWidth = 2;
    for (const [x, y] of [
      [500, 120],
      [525, 108],
      [553, 123],
    ]) {
      c.beginPath();
      c.moveTo(x - 6 - shift, y);
      c.quadraticCurveTo(x - 3 - shift, y - 5, x - shift, y);
      c.quadraticCurveTo(x + 3 - shift, y - 5, x + 6 - shift, y);
      c.stroke();
    }
    if (menu) {
      c.save();
      c.translate(0, 0);
      c.restore();
    }
  }
  private cloud(x: number, y: number, s: number) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    c.fillStyle = '#ffffffce';
    c.beginPath();
    c.roundRect(-60, 0, 140, 29, 15);
    c.fill();
    c.beginPath();
    c.arc(-18, -1, 28, Math.PI, 0);
    c.arc(25, -8, 36, Math.PI, 0);
    c.fill();
    c.restore();
  }
  private tree(x: number, y: number, s: number) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    c.fillStyle = '#4a9d91';
    c.fillRect(-4, -20, 8, 45);
    c.fillStyle = '#5db8a0';
    for (const [xx, yy, r] of [
      [-15, -37, 24],
      [18, -34, 23],
      [0, -65, 27],
    ]) {
      c.beginPath();
      c.arc(xx, yy, r, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }
  private land(x: number, y: number, w: number, h: number, a: number, stone: boolean) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.rotate(a);
    c.fillStyle = stone ? '#536e83' : '#a86d4f';
    c.strokeStyle = stone ? '#36546c' : '#704d40';
    c.lineWidth = 3;
    c.beginPath();
    c.roundRect(-w / 2, -h / 2, w, h, stone ? 5 : [3, 3, 0, 0]);
    c.fill();
    c.stroke();
    c.save();
    c.beginPath();
    c.rect(-w / 2, -h / 2, w, h);
    c.clip();
    c.fillStyle = stone ? '#6e8898' : '#bd8055';
    c.fillRect(-w / 2, -h / 2 + 15, w, 16);
    c.strokeStyle = stone ? '#a7bec332' : '#704a3828';
    c.lineWidth = 3;
    for (let i = 0; i < w; i += 46) {
      for (let j = 40; j < h; j += 60) {
        c.beginPath();
        c.moveTo(-w / 2 + i + (j % 120 === 40 ? 0 : 20), -h / 2 + j);
        c.lineTo(-w / 2 + i + 11, -h / 2 + j + 4);
        c.stroke();
      }
    }
    if (stone) {
      c.strokeStyle = '#9fb8bc55';
      c.lineWidth = 2;
      for (let j = 35; j < h; j += 36) {
        c.beginPath();
        c.moveTo(-w / 2, -h / 2 + j);
        c.lineTo(w / 2, -h / 2 + j);
        c.stroke();
      }
    } else {
      c.fillStyle = '#1d8158';
      c.fillRect(-w / 2, -h / 2, w, 16);
      c.fillStyle = '#43bd6a';
      c.fillRect(-w / 2, -h / 2 - 2, w, 10);
      c.fillStyle = '#97e46b';
      c.fillRect(-w / 2, -h / 2 - 3, w, 4);
      for (let i = 10; i < w; i += 22) {
        c.fillStyle = '#258e59';
        c.beginPath();
        c.moveTo(-w / 2 + i, -h / 2 + 11);
        c.lineTo(-w / 2 + i + 5, -h / 2 + 20);
        c.lineTo(-w / 2 + i + 11, -h / 2 + 11);
        c.fill();
      }
    }
    c.restore();
    if (!stone) {
      c.strokeStyle = '#288f5b';
      c.lineWidth = 2;
      for (let i = 32; i < w - 15; i += 75) {
        c.beginPath();
        c.moveTo(-w / 2 + i, -h / 2 - 3);
        c.lineTo(-w / 2 + i - 3, -h / 2 - 11);
        c.moveTo(-w / 2 + i + 2, -h / 2 - 3);
        c.lineTo(-w / 2 + i + 5, -h / 2 - 9);
        c.stroke();
      }
    }
    c.restore();
  }
  private net(g: Goal, since: number, reduced: boolean) {
    const c = this.ctx,
      { x, y, w, h } = g,
      ripple =
        !reduced && since >= 0 && since < 1.6 ? Math.sin(since * 22) * Math.exp(-since * 2) * 7 : 0;
    c.fillStyle = '#224d5c24';
    c.beginPath();
    c.ellipse(x + w * 0.6, y + 8, w * 0.7, 10, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#f3ffff38';
    c.fillRect(x, y - h, w, h);
    c.strokeStyle = '#ffffffb3';
    c.lineWidth = 1.3;
    for (let xx = 0; xx <= w; xx += 15) {
      c.beginPath();
      c.moveTo(x + xx, y - h);
      c.quadraticCurveTo(x + xx + ripple, y - h / 2, x + xx, y);
      c.stroke();
    }
    for (let yy = 0; yy <= h; yy += 15) {
      c.beginPath();
      c.moveTo(x, y - yy);
      c.quadraticCurveTo(x + w / 2, y - yy + ripple, x + w, y - yy);
      c.stroke();
    }
    c.lineJoin = 'round';
    c.lineWidth = 10;
    c.strokeStyle = '#19445135';
    c.beginPath();
    c.moveTo(x, y - h + 3);
    c.lineTo(x + w, y - h + 3);
    c.lineTo(x + w, y + 3);
    c.lineTo(x, y + 3);
    c.stroke();
    c.lineWidth = 7;
    c.strokeStyle = '#fff';
    c.beginPath();
    c.moveTo(x, y - h);
    c.lineTo(x + w, y - h);
    c.lineTo(x + w, y);
    c.lineTo(x, y);
    c.stroke();
    // Offset side struts give depth while leaving the left mouth visibly open.
    c.lineWidth = 2;
    c.strokeStyle = '#d0f6f5';
    c.beginPath();
    c.moveTo(x + w - 18, y - h + 7);
    c.lineTo(x + w - 2, y - h + 24);
    c.lineTo(x + w - 2, y - 2);
    c.moveTo(x + w - 18, y - h + 7);
    c.lineTo(x + 2, y - h + 7);
    c.stroke();
    c.fillStyle = '#fff';
    for (const yy of [y - h, y]) {
      c.beginPath();
      c.arc(x, yy, 5, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#173c54';
    c.beginPath();
    c.roundRect(x + w * 0.5 - 33, y - h - 31, 66, 21, 5);
    c.fill();
    c.font = 'bold 10px sans-serif';
    c.textAlign = 'center';
    c.fillStyle = '#e5ff69';
    c.fillText('GOAL', x + w * 0.5, y - h - 17);
    c.strokeStyle = '#ffffff88';
    c.setLineDash([3, 5]);
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x, y - h + 12);
    c.lineTo(x, y - 12);
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
    c.fillStyle = '#fff';
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
  private aim(b: Point, p: Point) {
    const c = this.ctx,
      n = Math.hypot(p.x, p.y),
      ratio = Math.min(1, MAX_PULL / Math.max(n, 1));
    const pts = trajectory(b, p);
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
  private pad(x: number, y: number, w: number) {
    const c = this.ctx;
    c.fillStyle = '#ac593f';
    c.beginPath();
    c.roundRect(x, y + 1, w, 12, 4);
    c.fill();
    c.strokeStyle = '#163f50';
    c.lineWidth = 3;
    c.beginPath();
    for (let i = 5; i < w - 3; i += 10) c.lineTo(x + i, y + 4 + (i % 20 ? 6 : 0));
    c.stroke();
    c.fillStyle = '#fbad46';
    c.beginPath();
    c.roundRect(x, y - 6, w, 11, 4);
    c.fill();
    c.fillStyle = '#fff3a7';
    for (let i = 18; i < w - 5; i += 25) {
      c.beginPath();
      c.moveTo(x + i - 5, y);
      c.lineTo(x + i, y - 4);
      c.lineTo(x + i + 5, y);
      c.fill();
    }
  }
  private gate(x: number, y: number, w: number, h: number) {
    const c = this.ctx;
    c.fillStyle = '#1b4e64';
    c.beginPath();
    c.roundRect(x - w / 2 - 3, y - h / 2 - 3, w + 6, h + 6, 6);
    c.fill();
    c.fillStyle = '#f5b84a';
    c.fillRect(x - w / 2, y - h / 2, w, h);
    c.save();
    c.beginPath();
    c.rect(x - w / 2, y - h / 2, w, h);
    c.clip();
    c.strokeStyle = '#e48f38';
    c.lineWidth = 9;
    for (let i = -h; i < h; i += 25) {
      c.beginPath();
      c.moveTo(x - w / 2, y + i);
      c.lineTo(x + w / 2, y + i + w);
      c.stroke();
    }
    c.restore();
    c.fillStyle = '#fff7c4';
    for (const yy of [y - h / 2 + 9, y + h / 2 - 9]) {
      c.beginPath();
      c.arc(x, yy, 3, 0, Math.PI * 2);
      c.fill();
    }
  }
  private water(x: number, y: number, w: number) {
    const c = this.ctx;
    c.fillStyle = '#31bce2';
    c.beginPath();
    c.moveTo(x, 760);
    c.lineTo(x, y);
    for (let i = 0; i <= w; i += 5) c.lineTo(x + i, y + Math.sin(i / 18 + this.time * 2) * 3);
    c.lineTo(x + w, 760);
    c.fill();
    c.strokeStyle = '#b9f7ff';
    c.lineWidth = 2;
    for (let i = 15; i < w - 25; i += 55) {
      c.beginPath();
      c.moveTo(x + i, y + 13);
      c.lineTo(x + i + 22, y + 13);
      c.stroke();
    }
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
