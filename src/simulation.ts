import Matter from 'matter-js';
import type { Level, Point } from './levels';
const { Engine, Bodies, Body, Composite, Events } = Matter;
export const BALL_RADIUS = 12;
export const STEP = 1000 / 120;
export const MAX_PULL = 140;
export const SHOT_SCALE = 0.145;
export type GameEvent = {
  type: 'hit' | 'post' | 'bounce' | 'water' | 'net' | 'win' | 'shot' | 'fail';
  x: number;
  y: number;
  strength: number;
};
export type Phase = 'ready' | 'moving' | 'scoring' | 'won' | 'respawning' | 'failed';
export class FootballSimulation {
  engine: Matter.Engine;
  ball: Matter.Body;
  terrain: { body: Matter.Body; definition: Level['terrain'][number] }[] = [];
  movers: { body: Matter.Body; definition: NonNullable<Level['movers']>[number] }[] = [];
  pads: Matter.Body[] = [];
  frame: Matter.Body[] = [];
  phase: Phase = 'ready';
  shots = 0;
  time = 0;
  quiet = 0;
  timer = 0;
  lastSafe: Point;
  events: GameEvent[] = [];
  goalTime = -100;
  private lastPad = -10;
  constructor(public level: Level) {
    this.engine = Engine.create({
      gravity: { x: 0, y: 1.2, scale: 0.001 },
      positionIterations: 8,
      velocityIterations: 8,
    });
    this.lastSafe = { ...level.start };
    const material = { isStatic: true, friction: 0.12, frictionStatic: 0.5, restitution: 0.22 };
    for (const t of level.terrain) {
      const body = Bodies.rectangle(t.x + t.w / 2, t.y + t.h / 2, t.w, t.h, {
        ...material,
        angle: t.angle ?? 0,
        label: 'terrain',
      });
      this.terrain.push({ body, definition: t });
      Composite.add(this.engine.world, body);
    }
    for (const p of level.pads ?? []) {
      const body = Bodies.rectangle(p.x + p.w / 2, p.y + 3, p.w, 10, { ...material, label: 'pad' });
      this.pads.push(body);
      Composite.add(this.engine.world, body);
    }
    for (const m of level.movers ?? []) {
      const body = Bodies.rectangle(m.x, m.y, m.w, m.h, {
        ...material,
        restitution: 0.65,
        label: 'mover',
        chamfer: { radius: 4 },
      });
      this.movers.push({ body, definition: m });
      Composite.add(this.engine.world, body);
    }
    const g = level.goal;
    // In side profile the mouth is the OPEN left plane, bounded by the crossbar
    // and bottom sill. The back post/net and roof are real collision geometry.
    this.frame = [
      Bodies.rectangle(g.x + g.w / 2, g.y - g.h, g.w + 8, 8, {
        ...material,
        restitution: 0.6,
        label: 'post',
      }),
      Bodies.rectangle(g.x + g.w, g.y - g.h / 2, 8, g.h, {
        ...material,
        restitution: 0.22,
        label: 'net-back',
      }),
      Bodies.circle(g.x, g.y - g.h, 5, { ...material, restitution: 0.65, label: 'post' }),
      Bodies.circle(g.x, g.y, 4, { ...material, label: 'post' }),
    ];
    Composite.add(this.engine.world, this.frame);
    // Visible world boundaries only: out-of-world recovery handles all other exits.
    Composite.add(
      this.engine.world,
      Bodies.rectangle(-25, 350, 40, 1600, { ...material, label: 'boundary' }),
    );
    this.ball = Bodies.circle(level.start.x, level.start.y, BALL_RADIUS, {
      label: 'football',
      restitution: 0.48,
      friction: 0.085,
      frictionStatic: 0.4,
      frictionAir: 0.008,
      density: 0.01,
    });
    Composite.add(this.engine.world, this.ball);
    Events.on(this.engine, 'collisionStart', (e) => {
      for (const pair of e.pairs) {
        if (pair.bodyA !== this.ball && pair.bodyB !== this.ball) continue;
        const other = pair.bodyA === this.ball ? pair.bodyB : pair.bodyA;
        if (
          other.label === 'pad' &&
          this.time - this.lastPad > 0.25 &&
          this.phase === 'moving' &&
          this.ball.position.y < other.position.y - 4
        ) {
          this.lastPad = this.time;
          const index = this.pads.indexOf(other);
          Body.setVelocity(this.ball, {
            x: this.ball.velocity.x * 1.04,
            y: -(level.pads?.[index].boost ?? 15.8),
          });
          this.emit('bounce', 1);
        } else if (this.phase === 'moving' && this.ball.speed > 1.8)
          this.emit(
            other.label === 'post' || other.label === 'net-back' ? 'post' : 'hit',
            Math.min(1, this.ball.speed / 15),
          );
      }
    });
    Events.on(this.engine, 'collisionActive', (e) => {
      if (this.ball.speed > 0.6) return;
      if (e.pairs.some((p) => p.bodyA === this.ball || p.bodyB === this.ball))
        Body.setAngularVelocity(this.ball, this.ball.angularVelocity * 0.88);
    });
  }
  get remaining() {
    return Math.max(0, this.level.par - this.shots);
  }
  private emit(type: GameEvent['type'], strength: number) {
    this.events.push({ type, ...this.ball.position, strength });
  }
  shoot(pull: Point): boolean {
    if (
      this.phase !== 'ready' ||
      this.remaining === 0 ||
      !Number.isFinite(pull.x) ||
      !Number.isFinite(pull.y)
    )
      return false;
    const length = Math.hypot(pull.x, pull.y);
    if (length < 6) return false;
    const ratio = Math.min(1, MAX_PULL / length);
    this.lastSafe = { ...this.ball.position };
    Body.setVelocity(this.ball, {
      x: -pull.x * ratio * SHOT_SCALE,
      y: -pull.y * ratio * SHOT_SCALE,
    });
    Body.setAngularVelocity(this.ball, -pull.x * ratio * 0.003);
    this.phase = 'moving';
    this.shots++;
    this.quiet = 0;
    this.timer = 0;
    this.emit('shot', Math.min(1, length / MAX_PULL));
    return true;
  }
  step() {
    if (this.phase === 'failed' || this.phase === 'won') return;
    this.time += STEP / 1000;
    for (const { body, definition: m } of this.movers) {
      const offset = Math.sin((this.time * Math.PI * 2) / m.period) * m.travel;
      const setPosition = Body.setPosition as (b: Matter.Body, p: Point, velocity: boolean) => void;
      setPosition(
        body,
        { x: m.x + (m.axis === 'x' ? offset : 0), y: m.y + (m.axis === 'y' ? offset : 0) },
        true,
      );
    }
    const previous = { ...this.ball.position };
    Engine.update(this.engine, STEP);
    const { x, y } = this.ball.position,
      g = this.level.goal;
    if (
      this.phase === 'ready' &&
      (this.ball.speed > 0.6 || Math.abs(this.ball.angularVelocity) > 0.15)
    ) {
      this.phase = 'moving';
      this.quiet = 0;
      this.timer = 0;
    }
    if (this.phase === 'moving') {
      // The WHOLE ball must cross from the open left side. A nearby ball,
      // roof/back impact, spawn inside the net, or teleport cannot score.
      const rearBefore = previous.x - BALL_RADIUS,
        rearNow = x - BALL_RADIUS;
      if (
        rearBefore <= g.x &&
        rearNow > g.x &&
        x > previous.x &&
        x - previous.x < 25 &&
        this.ball.velocity.x > 0.05 &&
        this.ball.speed < 30
      ) {
        const t = (g.x + BALL_RADIUS - previous.x) / (x - previous.x);
        const crossingY = previous.y + (y - previous.y) * t;
        if (
          crossingY - BALL_RADIUS > g.y - g.h + 4 &&
          crossingY + BALL_RADIUS <= g.y + 1 &&
          y + BALL_RADIUS <= g.y + 2
        ) {
          this.phase = 'scoring';
          this.timer = 0;
          this.goalTime = this.time;
          this.emit('net', 1);
        }
      }
    }
    if (this.phase === 'moving' || this.phase === 'ready') {
      if (
        y > 810 ||
        y < -750 ||
        x > this.level.width + 70 ||
        (this.level.water ?? []).some((w) => x > w.x && x < w.x + w.w && y > w.y)
      ) {
        this.phase = 'respawning';
        this.timer = 0;
        this.emit('water', 1);
      }
    }
    if (this.phase === 'moving') {
      this.timer += STEP / 1000;
      if (this.ball.speed < 0.18 && Math.abs(this.ball.angularVelocity) < 0.025) this.quiet++;
      else this.quiet = 0;
      if (this.quiet >= 42) {
        Body.setVelocity(this.ball, { x: 0, y: 0 });
        Body.setAngularVelocity(this.ball, 0);
        if (this.remaining === 0) this.fail();
        else this.phase = 'ready';
      }
      if (this.timer > 20) {
        this.phase = 'respawning';
        this.timer = 0;
        this.emit('water', 1);
      }
    } else if (this.phase === 'respawning') {
      this.timer += STEP / 1000;
      if (this.timer > 0.8) {
        if (this.remaining === 0) this.fail();
        else {
          Body.setPosition(this.ball, this.lastSafe);
          Body.setVelocity(this.ball, { x: 0, y: 0 });
          Body.setAngularVelocity(this.ball, 0);
          this.phase = 'ready';
          this.quiet = 0;
        }
      }
    } else if (this.phase === 'scoring') {
      this.timer += STEP / 1000;
      Body.setVelocity(this.ball, {
        x: this.ball.velocity.x * 0.97,
        y: this.ball.velocity.y * 0.98,
      });
      if (this.timer > 0.65) {
        this.phase = 'won';
        this.emit('win', 1);
      }
    }
  }
  private fail() {
    this.phase = 'failed';
    this.emit('fail', 1);
  }
  destroy() {
    Events.off(this.engine, 'collisionStart');
    Events.off(this.engine, 'collisionActive');
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
  }
}
export function rating(shots: number, level: Pick<Level, 'starShots' | 'par'>) {
  return shots <= 0 || shots > level.par
    ? 0
    : shots <= level.starShots[0]
      ? 3
      : shots <= level.starShots[1]
        ? 2
        : 1;
}
export function trajectory(position: Point, pull: Point): Point[] {
  const length = Math.hypot(pull.x, pull.y),
    ratio = Math.min(1, MAX_PULL / Math.max(length, 1));
  let vx = -pull.x * ratio * SHOT_SCALE,
    vy = -pull.y * ratio * SHOT_SCALE,
    x = position.x,
    y = position.y;
  const result: Point[] = [];
  for (let i = 0; i < 58; i++) {
    vx *= 0.992;
    vy = vy * 0.992 + 1.2 * (1000 / 60) ** 2 * 0.001;
    x += vx;
    y += vy;
    if (i % 3 === 0) result.push({ x, y });
  }
  return result;
}
