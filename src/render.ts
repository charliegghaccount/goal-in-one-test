import { BALL_RADIUS, GolfSimulation, MAX_PULL, trajectory, type GameEvent } from './simulation';
import type { Point, Level } from './levels';
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  square: boolean;
};
const palettes = {
  meadow: {
    sky: '#dceee3',
    horizon: '#edf4dc',
    far: '#c2d9bb',
    near: '#aacba8',
    hill: '#82b99a',
    water: '#77c9cc',
  },
  sunset: {
    sky: '#f5decb',
    horizon: '#fff0ce',
    far: '#dfc8ac',
    near: '#bdc9a4',
    hill: '#92b39b',
    water: '#8abfc2',
  },
  alpine: {
    sky: '#dde9ee',
    horizon: '#eaf2e3',
    far: '#c2d1d4',
    near: '#adc7bf',
    hill: '#85aca5',
    water: '#83bac9',
  },
};
export class Renderer {
  ctx: CanvasRenderingContext2D;
  width = 1280;
  height = 720;
  scale = 1;
  offsetX = 0;
  offsetY = 0;
  particles: Particle[] = [];
  time = 0;
  constructor(public canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(rect.width * dpr),
      h = Math.round(rect.height * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.width = rect.width;
    this.height = rect.height;
    this.scale = Math.min(this.width / 1280, this.height / 720);
    this.offsetX = (this.width - 1280 * this.scale) / 2;
    this.offsetY = (this.height - 720 * this.scale) / 2;
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
    const colors =
      e.type === 'win'
        ? ['#f6bf5b', '#f18b5c', '#fff6db', '#4d9475', '#91c4b5']
        : e.type === 'water'
          ? ['#e2ffff', '#71c7d0', '#a5e0dd']
          : e.type === 'bounce'
            ? ['#ffb276', '#f1845e', '#ffe5b6']
            : ['#fff4d3', '#bdcda2', '#edbe78'];
    for (let i = 0, n = e.type === 'win' ? 90 : Math.round(8 + e.strength * 12); i < n; i++) {
      const max = e.type === 'win' ? 2.5 + Math.random() : 0.4 + Math.random() * 0.5;
      this.particles.push({
        x: e.x,
        y: e.y - 4,
        vx: (Math.random() - 0.5) * (e.type === 'win' ? 470 : 160),
        vy: -Math.random() * (e.type === 'win' ? 520 : 170),
        life: max,
        max,
        size: 2 + Math.random() * 4,
        color: colors[i % colors.length],
        square: e.type === 'win',
      });
    }
  }
  render(sim: GolfSimulation, dt: number, pull: Point | null, menu = false, reducedMotion = false) {
    this.resize();
    this.time += reducedMotion ? 0 : dt;
    const c = this.ctx,
      l = sim.level,
      p = palettes[l.theme];
    const gradient = c.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, p.sky);
    gradient.addColorStop(1, p.horizon);
    c.fillStyle = gradient;
    c.fillRect(0, 0, this.width, this.height);
    c.save();
    c.translate(this.offsetX, this.offsetY);
    c.scale(this.scale, this.scale);
    this.background(p, menu);
    for (const w of l.water ?? []) this.water(w.x, w.y, w.w, p.water);
    // Draw the cup interior before the surrounding terrain and the ball.
    c.fillStyle = '#244d42';
    c.beginPath();
    c.roundRect(l.cup.x - 19, l.cup.y - 1, 38, 47, [2, 2, 12, 12]);
    c.fill();
    c.fillStyle = '#132e2c';
    c.fillRect(l.cup.x - 13, l.cup.y + 4, 26, 30);
    for (const { body, definition: t } of sim.terrain)
      this.land(body.position.x, body.position.y, t.w, t.h, body.angle, t.kind === 'stone', l, t.x);
    for (const pad of l.pads ?? []) this.pad(pad.x, pad.y, pad.w);
    for (const { body, definition: m } of sim.movers)
      this.gate(body.position.x, body.position.y, m.w, m.h);
    this.flag(l.cup.x, l.cup.y, menu ? 1 : l.id);
    if (menu) {
      c.save();
      c.setLineDash([1, 18]);
      c.lineCap = 'round';
      c.lineWidth = 5;
      c.strokeStyle = 'rgba(255,255,245,.85)';
      c.beginPath();
      c.moveTo(210, 458);
      c.bezierCurveTo(410, 120, 760, 110, 946, 445);
      c.stroke();
      c.restore();
      this.ball(210, 458, -0.2, 1.35);
      this.decorations(110, 470, 230, true);
      this.decorations(880, 450, 330, true);
    } else {
      const b = sim.ball;
      // Soft ground shadow follows the nearest platform below the ball.
      const beneath = sim.terrain
        .filter(
          (t) =>
            !t.body.angle &&
            b.position.x > t.definition.x &&
            b.position.x < t.definition.x + t.definition.w &&
            t.definition.y >= b.position.y - 10,
        )
        .sort((a, b) => a.definition.y - b.definition.y)[0];
      if (beneath) {
        const dist = beneath.definition.y - b.position.y;
        c.fillStyle = `rgba(35,65,47,${Math.max(0.02, 0.17 - dist / 1500)})`;
        c.beginPath();
        c.ellipse(
          b.position.x,
          beneath.definition.y - 1,
          Math.max(4, 13 - dist / 80),
          3,
          0,
          0,
          Math.PI * 2,
        );
        c.fill();
      }
      if (pull) this.aim(b.position, pull);
      if (sim.phase === 'ready' && !pull) {
        c.strokeStyle = '#fffdf0';
        c.lineWidth = 2;
        c.globalAlpha = 0.45 + Math.sin(this.time * 3) * 0.15;
        c.beginPath();
        c.arc(b.position.x, b.position.y, 19 + Math.sin(this.time * 3) * 2, 0, Math.PI * 2);
        c.stroke();
        c.globalAlpha = 1;
      }
      if (sim.phase !== 'won' && sim.phase !== 'respawning')
        this.ball(b.position.x, b.position.y, b.angle, 1);
      if (sim.phase === 'sinking' || sim.phase === 'won') {
        // Foreground rim occludes the ball as it drops into the pocket.
        c.fillStyle = '#67a668';
        c.fillRect(l.cup.x - 20, l.cup.y + 30, 40, 8);
        c.fillStyle = '#d5b880';
        c.fillRect(l.cup.x - 20, l.cup.y + 38, 40, 8);
      }
      if (sim.shots === 0 && sim.phase === 'ready' && !pull) {
        this.pill(b.position.x + 5, b.position.y - 58, 'DRAG TO AIM', true);
        c.strokeStyle = '#466b58';
        c.lineWidth = 1.4;
        c.beginPath();
        c.moveTo(b.position.x + 4, b.position.y - 35);
        c.lineTo(b.position.x + 4, b.position.y - 26);
        c.stroke();
      }
      if (sim.phase === 'respawning')
        this.pill(
          Math.min(1120, Math.max(160, b.position.x)),
          280,
          'A SPLASH! TRY THAT AGAIN.',
          false,
        );
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const a = this.particles[i];
      a.life -= dt;
      if (a.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.vy += 340 * dt;
      c.globalAlpha = Math.min(1, a.life * 2);
      c.fillStyle = a.color;
      c.save();
      c.translate(a.x, a.y);
      c.rotate(a.life * 5);
      if (a.square) c.fillRect(-a.size, -a.size / 2, a.size * 2, a.size);
      else {
        c.beginPath();
        c.arc(0, 0, a.size, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    }
    c.globalAlpha = 1;
    c.restore();
  }
  private background(p: typeof palettes.meadow, menu: boolean) {
    const c = this.ctx;
    c.fillStyle = '#fff5ce';
    c.beginPath();
    c.arc(1035, 130, 54, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(255,248,216,.4)';
    c.lineWidth = 15;
    c.beginPath();
    c.arc(1035, 130, 72, 0, Math.PI * 2);
    c.stroke();
    for (const [x, y, s] of [
      [135, 130, 1],
      [495, 83, 0.75],
      [850, 218, 0.65],
      [1170, 275, 0.45],
    ])
      this.cloud(x + Math.sin(this.time * 0.04 + x) * 14, y, s);
    const hill = (color: string, y: number, peaks: number[]) => {
      c.fillStyle = color;
      c.beginPath();
      c.moveTo(-100, 720);
      c.lineTo(-100, y);
      for (let i = 0; i < peaks.length; i++)
        c.quadraticCurveTo(i * 340 + 70, y - peaks[i], i * 340 + 340, y + 8);
      c.lineTo(1500, 800);
      c.closePath();
      c.fill();
    };
    hill(p.far, menu ? 425 : 400, [200, 160, 220, 180]);
    hill(p.near, menu ? 510 : 475, [130, 170, 100, 140]);
    // Distant conifers and a tiny clubhouse lend the course a sense of place.
    for (const [x, y, s] of [
      [58, 430, 0.8],
      [870, 420, 0.7],
      [935, 427, 0.55],
      [1218, 403, 0.9],
      [1180, 420, 0.65],
    ])
      this.tree(x, y, s, p.hill);
    c.fillStyle = '#e9e3c8';
    c.fillRect(770, 407, 40, 27);
    c.fillStyle = '#658f79';
    c.beginPath();
    c.moveTo(760, 408);
    c.lineTo(790, 388);
    c.lineTo(820, 408);
    c.fill();
    c.fillStyle = '#89a18b';
    c.fillRect(784, 418, 10, 16);
    hill(p.hill + '66', 680, [95, 70, 100, 70]);
    // Birds.
    c.strokeStyle = '#74998a';
    c.lineWidth = 2;
    c.lineCap = 'round';
    for (const [x, y] of [
      [628, 150],
      [656, 137],
      [682, 153],
    ]) {
      c.beginPath();
      c.moveTo(x - 6, y);
      c.quadraticCurveTo(x - 3, y - 4, x, y);
      c.quadraticCurveTo(x + 3, y - 4, x + 6, y);
      c.stroke();
    }
  }
  private cloud(x: number, y: number, s: number) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    c.fillStyle = 'rgba(255,255,246,.72)';
    c.beginPath();
    c.roundRect(-65, 0, 145, 28, 20);
    c.fill();
    c.beginPath();
    c.arc(-22, 0, 29, Math.PI, 0);
    c.arc(22, -8, 39, Math.PI, 0);
    c.fill();
    c.restore();
  }
  private tree(x: number, y: number, s: number, color: string) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    c.fillStyle = color;
    c.fillRect(-3, -30, 6, 40);
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(0, -95 + i * 22);
      c.lineTo(-27 + i * 3, -40 + i * 15);
      c.lineTo(27 - i * 3, -40 + i * 15);
      c.closePath();
      c.fill();
    }
    c.restore();
  }
  private land(
    x: number,
    y: number,
    w: number,
    h: number,
    angle: number,
    stone: boolean,
    level: Level,
    seed: number,
  ) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.rotate(angle);
    const grad = c.createLinearGradient(0, -h / 2, 0, h / 2);
    grad.addColorStop(0, stone ? '#9aa99e' : '#dabc88');
    grad.addColorStop(1, stone ? '#7c9286' : '#c3a274');
    c.fillStyle = grad;
    c.beginPath();
    c.roundRect(-w / 2, -h / 2, w, h, stone ? 5 : [1, 1, 5, 5]);
    c.fill();
    c.save();
    c.beginPath();
    c.rect(-w / 2, -h / 2, w, h);
    c.clip();
    c.strokeStyle = stone ? '#6b857965' : '#a88b5f35';
    c.lineWidth = 2;
    for (let i = 0; i < Math.floor(w / 40); i++) {
      const xx = -w / 2 + 15 + i * 43 + Math.sin(i * 5 + seed) * 9;
      const yy = -h / 2 + 25 + ((i * 29 + seed) % Math.max(30, h - 20));
      c.beginPath();
      c.moveTo(xx, yy);
      c.lineTo(xx + 9, yy + (i % 2 ? 4 : -3));
      c.stroke();
    }
    if (stone) {
      c.fillStyle = '#bac4b1';
      c.fillRect(-w / 2, -h / 2, w, 5);
      c.strokeStyle = '#718b7f';
      for (let j = 38; j < h; j += 40) {
        c.beginPath();
        c.moveTo(-w / 2, -h / 2 + j);
        c.lineTo(w / 2, -h / 2 + j);
        c.stroke();
      }
    } else {
      c.fillStyle = '#558d5b';
      c.fillRect(-w / 2, -h / 2 + 3, w, 9);
      c.fillStyle = '#81b66d';
      c.fillRect(-w / 2, -h / 2 - 1, w, 7);
      c.fillStyle = '#a5cf80';
      c.fillRect(-w / 2, -h / 2 - 2, w, 3);
      for (let i = 8; i < w; i += 19) {
        c.fillStyle = '#659e60';
        c.beginPath();
        c.moveTo(-w / 2 + i, -h / 2 + 7);
        c.lineTo(-w / 2 + i + 4, -h / 2 + 14 + Math.sin(i) * 3);
        c.lineTo(-w / 2 + i + 9, -h / 2 + 7);
        c.fill();
      }
    }
    c.restore();
    c.restore();
    if (!stone && !angle && h > 50 && w > 130)
      this.decorations(x - w / 2, y - h / 2, w, level.id === 0);
  }
  private decorations(x: number, y: number, w: number, lush = false) {
    const c = this.ctx;
    for (let i = 45; i < w - 20; i += lush ? 65 : 107) {
      const xx = x + i;
      if (Math.abs(xx - 1090) < 55) continue;
      const size = 5 + Math.abs(Math.sin(xx)) * 6;
      c.strokeStyle = '#568857';
      c.lineWidth = 1.7;
      c.beginPath();
      c.moveTo(xx, y);
      c.quadraticCurveTo(xx - 5, y - size, xx - 3, y - size - 2);
      c.moveTo(xx + 2, y);
      c.quadraticCurveTo(xx + 3, y - 6, xx + 7, y - 8);
      c.stroke();
      if (Math.sin(xx * 7) > -0.15) {
        c.fillStyle = Math.sin(xx) > 0 ? '#fff6d6' : '#f2af77';
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          c.beginPath();
          c.arc(xx - 3 + Math.cos(a) * 3, y - size - 3 + Math.sin(a) * 3, 2.2, 0, Math.PI * 2);
          c.fill();
        }
        c.fillStyle = '#e5bc53';
        c.beginPath();
        c.arc(xx - 3, y - size - 3, 1.8, 0, Math.PI * 2);
        c.fill();
      }
    }
  }
  private water(x: number, y: number, w: number, color: string) {
    const c = this.ctx;
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(x, 740);
    c.lineTo(x, y);
    for (let i = 0; i <= w; i += 8) c.lineTo(x + i, y + Math.sin(i / 22 + this.time * 2) * 3);
    c.lineTo(x + w, 740);
    c.fill();
    c.strokeStyle = '#e3f9e8';
    c.lineWidth = 2;
    for (let i = 16; i < w - 18; i += 56) {
      c.beginPath();
      c.moveTo(x + i + Math.sin(this.time + i) * 3, y + 13);
      c.lineTo(x + i + 23, y + 13);
      c.stroke();
    }
  }
  private pad(x: number, y: number, w: number) {
    const c = this.ctx;
    c.fillStyle = '#af6556';
    c.beginPath();
    c.roundRect(x, y - 1, w, 11, 4);
    c.fill();
    c.fillStyle = '#f0916b';
    c.beginPath();
    c.roundRect(x, y - 6, w, 10, 4);
    c.fill();
    c.strokeStyle = '#ffe2aa';
    c.lineWidth = 2.5;
    for (let xx = x + 14; xx < x + w - 7; xx += 22) {
      c.beginPath();
      c.moveTo(xx - 4, y + 1);
      c.lineTo(xx, y - 3);
      c.lineTo(xx + 4, y + 1);
      c.stroke();
    }
  }
  private gate(x: number, y: number, w: number, h: number) {
    const c = this.ctx;
    c.fillStyle = '#577d70';
    c.beginPath();
    c.roundRect(x - w / 2 - 3, y - h / 2 - 3, w + 6, h + 6, 7);
    c.fill();
    c.fillStyle = '#e3bb7c';
    c.beginPath();
    c.roundRect(x - w / 2, y - h / 2, w, h, 4);
    c.fill();
    c.save();
    c.beginPath();
    c.rect(x - w / 2, y - h / 2, w, h);
    c.clip();
    c.strokeStyle = '#bb8f5d';
    c.lineWidth = 10;
    for (let j = -h; j < h; j += 28) {
      c.beginPath();
      c.moveTo(x - w / 2, y + j);
      c.lineTo(x + w / 2, y + j + w);
      c.stroke();
    }
    c.restore();
    for (const yy of [y - h / 2 + 9, y + h / 2 - 9]) {
      c.fillStyle = '#fcdfaa';
      c.beginPath();
      c.arc(x, yy, 3, 0, Math.PI * 2);
      c.fill();
    }
  }
  private flag(x: number, y: number, id: number) {
    const c = this.ctx;
    c.fillStyle = '#193d32';
    c.beginPath();
    c.ellipse(x, y + 1, 18, 4, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#fef8db';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(x + 12, y);
    c.lineTo(x + 12, y - 115);
    c.stroke();
    c.strokeStyle = '#466c57';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x + 15, y);
    c.lineTo(x + 15, y - 114);
    c.stroke();
    const wave = Math.sin(this.time * 3) * 3;
    c.fillStyle = '#e78658';
    c.beginPath();
    c.moveTo(x + 14, y - 115);
    c.quadraticCurveTo(x + 40, y - 113 + wave, x + 62, y - 97 + wave);
    c.lineTo(x + 14, y - 80);
    c.fill();
    c.fillStyle = '#fff4d7';
    c.font = 'bold 15px sans-serif';
    c.textAlign = 'center';
    c.fillText(String(id).padStart(2, '0'), x + 30, y - 94);
  }
  private ball(x: number, y: number, angle: number, size: number) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.scale(size, size);
    c.rotate(angle);
    const g = c.createRadialGradient(-3, -4, 1, 0, 0, BALL_RADIUS + 1);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.65, '#fffdf1');
    g.addColorStop(1, '#c7d5c9');
    c.shadowColor = '#2d564c40';
    c.shadowBlur = 3;
    c.shadowOffsetY = 2;
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;
    c.shadowOffsetY = 0;
    c.fillStyle = '#a9bbb15a';
    for (const [xx, yy] of [
      [-3, -3],
      [2, -4],
      [5, 0],
      [-5, 2],
      [0, 1],
      [2, 5],
      [-2, 5],
    ]) {
      c.beginPath();
      c.arc(xx, yy, 0.85, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }
  private aim(ball: Point, pull: Point) {
    const c = this.ctx;
    const n = Math.hypot(pull.x, pull.y),
      ratio = Math.min(1, MAX_PULL / Math.max(1, n));
    const points = trajectory(ball, pull);
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      c.globalAlpha = (1 - i / points.length) * 0.9;
      c.fillStyle = '#fffdf0';
      c.beginPath();
      c.arc(p.x, p.y, 3.5 - (i / points.length) * 1.7, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
    c.strokeStyle = '#42644d70';
    c.lineWidth = 2;
    c.setLineDash([4, 5]);
    c.beginPath();
    c.moveTo(ball.x, ball.y);
    c.lineTo(ball.x + pull.x * ratio, ball.y + pull.y * ratio);
    c.stroke();
    c.setLineDash([]);
    c.strokeStyle = '#f1a76b';
    c.lineWidth = 4;
    c.beginPath();
    c.arc(ball.x, ball.y, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, n / MAX_PULL));
    c.stroke();
    c.fillStyle = '#fff7e5';
    c.beginPath();
    c.arc(ball.x + pull.x * ratio, ball.y + pull.y * ratio, 5, 0, Math.PI * 2);
    c.fill();
  }
  private pill(x: number, y: number, text: string, small: boolean) {
    const c = this.ctx;
    c.font = `bold ${small ? 11 : 13}px sans-serif`;
    const w = c.measureText(text).width + 24;
    c.fillStyle = '#fffbeddf';
    c.beginPath();
    c.roundRect(x - w / 2, y - 14, w, 28, 14);
    c.fill();
    c.fillStyle = '#3b6551';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, x, y);
    c.textBaseline = 'alphabetic';
  }
}
