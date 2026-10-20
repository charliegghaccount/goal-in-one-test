import Matter from 'matter-js';
import type { Level, Point } from './levels';
const { Engine, Bodies, Body, Composite, Events } = Matter;
export const BALL_RADIUS = 9;
export const STEP = 1000 / 120;
export const MAX_PULL = 140;
export const SHOT_SCALE = 0.145;
export type GameEvent = {
  type: 'hit' | 'bounce' | 'water' | 'win' | 'shot';
  x: number;
  y: number;
  strength: number;
};
export type Phase = 'ready' | 'moving' | 'sinking' | 'won' | 'respawning';
export class GolfSimulation {
  engine: Matter.Engine;
  ball: Matter.Body;
  terrain: { body: Matter.Body; definition: Level['terrain'][number] }[] = [];
  movers: { body: Matter.Body; definition: NonNullable<Level['movers']>[number] }[] = [];
  pads: Matter.Body[] = [];
  phase: Phase = 'ready';
  shots = 0;
  time = 0;
  quiet = 0;
  timer = 0;
  lastSafe: Point;
  events: GameEvent[] = [];
  private lastPad = -10;
  constructor(public level: Level) {
    this.engine = Engine.create({
      gravity: { x: 0, y: 1.2, scale: 0.001 },
      positionIterations: 8,
      velocityIterations: 8,
    });
    this.lastSafe = { ...level.start };
    const material = { isStatic: true, friction: 0.12, frictionStatic: 0.5, restitution: 0.24 };
    for (const t of level.terrain) {
      // Cut an actual pocket into the green; the ball must fall below its rim.
      if (
        !t.angle &&
        t.kind !== 'stone' &&
        Math.abs(t.y - level.cup.y) < 1 &&
        level.cup.x > t.x &&
        level.cup.x < t.x + t.w
      ) {
        const leftW = level.cup.x - 19 - t.x;
        const rightX = level.cup.x + 19;
        for (const part of [
          { ...t, w: leftW },
          { ...t, x: rightX, w: t.x + t.w - rightX },
          { ...t, x: level.cup.x - 19, y: t.y + 43, w: 38, h: Math.max(20, t.h - 43) },
        ]) {
          if (part.w > 0) this.addTerrain(part, material);
        }
      } else this.addTerrain(t, material);
    }
    for (const p of level.pads ?? []) {
      const b = Bodies.rectangle(p.x + p.w / 2, p.y + 3, p.w, 10, {
        ...material,
        label: 'pad',
        restitution: 1,
      });
      this.pads.push(b);
      Composite.add(this.engine.world, b);
    }
    for (const m of level.movers ?? []) {
      const b = Bodies.rectangle(m.x, m.y, m.w, m.h, {
        ...material,
        label: 'mover',
        restitution: 0.65,
        chamfer: { radius: 5 },
      });
      this.movers.push({ body: b, definition: m });
      Composite.add(this.engine.world, b);
    }
    Composite.add(this.engine.world, [
      Bodies.rectangle(-30, 350, 50, 1400, material),
      Bodies.rectangle(1310, 350, 50, 1400, material),
    ]);
    this.ball = Bodies.circle(level.start.x, level.start.y, BALL_RADIUS, {
      label: 'ball',
      restitution: 0.48,
      friction: 0.085,
      frictionStatic: 0.35,
      frictionAir: 0.008,
      density: 0.01,
    });
    Composite.add(this.engine.world, this.ball);
    Events.on(this.engine, 'collisionStart', (e) => {
      for (const pair of e.pairs) {
        if (pair.bodyA !== this.ball && pair.bodyB !== this.ball) continue;
        const other = pair.bodyA === this.ball ? pair.bodyB : pair.bodyA;
        if (other.label === 'pad' && this.time - this.lastPad > 0.2 && this.phase === 'moving') {
          this.lastPad = this.time;
          Body.setVelocity(this.ball, { x: this.ball.velocity.x * 1.06, y: -14.8 });
          this.emit('bounce', 1);
        } else if (this.ball.speed > 2 && this.phase === 'moving')
          this.emit('hit', Math.min(1, this.ball.speed / 15));
      }
    });
  }
  private addTerrain(t: Level['terrain'][number], options: Matter.IChamferableBodyDefinition) {
    const body = Bodies.rectangle(t.x + t.w / 2, t.y + t.h / 2, t.w, t.h, {
      ...options,
      angle: t.angle ?? 0,
    });
    this.terrain.push({ body, definition: t });
    Composite.add(this.engine.world, body);
  }
  private emit(type: GameEvent['type'], strength: number) {
    this.events.push({ type, ...this.ball.position, strength });
  }
  shoot(pull: Point): boolean {
    if (this.phase !== 'ready') return false;
    const length = Math.hypot(pull.x, pull.y);
    if (length < 5) return false;
    const ratio = Math.min(1, MAX_PULL / length);
    this.lastSafe = { ...this.ball.position };
    Body.setVelocity(this.ball, {
      x: -pull.x * ratio * SHOT_SCALE,
      y: -pull.y * ratio * SHOT_SCALE,
    });
    Body.setAngularVelocity(this.ball, -pull.x * ratio * 0.004);
    this.phase = 'moving';
    this.shots++;
    this.quiet = 0;
    this.timer = 0;
    this.emit('shot', length / MAX_PULL);
    return true;
  }
  step() {
    this.time += STEP / 1000;
    for (const { body, definition: m } of this.movers) {
      const offset = Math.sin((this.time * Math.PI * 2) / m.period) * m.travel;
      // Matter 0.20 supports updateVelocity; the published types omit this argument.
      const setPosition = Body.setPosition as (
        body: Matter.Body,
        position: Point,
        updateVelocity: boolean,
      ) => void;
      setPosition(
        body,
        { x: m.x + (m.axis === 'x' ? offset : 0), y: m.y + (m.axis === 'y' ? offset : 0) },
        true,
      );
    }
    Engine.update(this.engine, STEP);
    // Moving scenery can disturb a resting ball; wait for it to settle again.
    if (this.phase === 'ready' && this.ball.speed > 0.6) {
      this.phase = 'moving';
      this.quiet = 0;
      this.timer = 0;
    }
    const { x, y } = this.ball.position;
    if (this.phase === 'moving' || this.phase === 'ready') {
      if (
        Math.abs(x - this.level.cup.x) < 13 &&
        y > this.level.cup.y + 16 &&
        y < this.level.cup.y + 60
      ) {
        this.phase = 'sinking';
        this.timer = 0;
        this.emit('win', 1);
      } else if (
        y > 785 ||
        y < -650 ||
        (this.level.water ?? []).some((w) => x > w.x && x < w.x + w.w && y > w.y)
      ) {
        this.phase = 'respawning';
        this.timer = 0;
        this.emit('water', 1);
      }
    }
    if (this.phase === 'moving') {
      this.timer += STEP / 1000;
      if (this.ball.speed < 0.18) this.quiet++;
      else this.quiet = 0;
      if (this.quiet > 38) {
        this.phase = 'ready';
        Body.setVelocity(this.ball, { x: 0, y: 0 });
        Body.setAngularVelocity(this.ball, 0);
      }
      // A ball wedged against moving geometry is returned instead of softlocking.
      if (this.timer > 22) {
        this.phase = 'respawning';
        this.timer = 0;
        this.emit('water', 1);
      }
    } else if (this.phase === 'respawning') {
      this.timer += STEP / 1000;
      if (this.timer > 0.8) {
        Body.setPosition(this.ball, this.lastSafe);
        Body.setVelocity(this.ball, { x: 0, y: 0 });
        Body.setAngularVelocity(this.ball, 0);
        this.phase = 'ready';
        this.quiet = 0;
      }
    } else if (this.phase === 'sinking') {
      this.timer += STEP / 1000;
      if (this.timer > 0.7) this.phase = 'won';
    }
  }
  destroy() {
    Events.off(this.engine, 'collisionStart');
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
  }
}
export function rating(shots: number, par: number) {
  return shots <= par ? 3 : shots <= par + 2 ? 2 : 1;
}
export function trajectory(position: Point, pull: Point): Point[] {
  const length = Math.hypot(pull.x, pull.y);
  const ratio = Math.min(1, MAX_PULL / Math.max(length, 1));
  let vx = -pull.x * ratio * SHOT_SCALE,
    vy = -pull.y * ratio * SHOT_SCALE;
  let x = position.x,
    y = position.y;
  const points: Point[] = [];
  for (let i = 0; i < 58; i++) {
    vx *= 0.992;
    vy = vy * 0.992 + 1.2 * (1000 / 60) ** 2 * 0.001;
    x += vx;
    y += vy;
    if (i % 3 === 0) points.push({ x, y });
  }
  return points;
}
