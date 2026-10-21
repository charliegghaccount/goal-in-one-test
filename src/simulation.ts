import Matter from 'matter-js';
import { segments, WALL_WIDTH, type Level, type Point, type Segment } from './levels';
const { Engine, Bodies, Body, Composite, Events, Vertices } = Matter;
export const BALL_RADIUS = 16,
  STEP = 1000 / 120,
  MAX_PULL = 140,
  SHOT_SCALE = 0.125;
export type Phase = 'ready' | 'moving' | 'scoring' | 'won';
export type GameEvent = {
  type: 'shot' | 'hit' | 'post' | 'boost' | 'reset' | 'net' | 'win';
  x: number;
  y: number;
  strength: number;
};
export class FootballSimulation {
  engine: Matter.Engine;
  ball: Matter.Body;
  phase: Phase = 'ready';
  shots = 0;
  time = 0;
  timer = 0;
  goalTime = -100;
  events: GameEvent[] = [];
  resetCount = 0;
  walls: { body: Matter.Body; definition: Segment }[] = [];
  obstacles: { body: Matter.Body; definition: Level['obstacles'][number] }[] = [];
  movers: { body: Matter.Body; definition: Level['movers'][number] }[] = [];
  surfaces: Matter.Body[] = [];
  goalSensor: Matter.Body;
  private pendingReset = false;
  private lastBoost = -10;
  constructor(public level: Level) {
    this.engine = Engine.create({
      gravity: { x: 0, y: 1.1, scale: 0.001 },
      positionIterations: 10,
      velocityIterations: 10,
    });
    const material = { isStatic: true, friction: 0.045, frictionStatic: 0.18, restitution: 0.76 };
    for (const s of segments(level)) {
      const length = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y),
        angle = Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x);
      const body = Bodies.rectangle((s.a.x + s.b.x) / 2, (s.a.y + s.b.y) / 2, length, WALL_WIDTH, {
        ...material,
        angle,
        label: s.id,
      });
      this.walls.push({ body, definition: s });
      Composite.add(this.engine.world, body);
      // Round stroke caps are rendered at exactly the same radius. They weld every joint.
      for (const p of [s.a, s.b])
        Composite.add(
          this.engine.world,
          Bodies.circle(p.x, p.y, WALL_WIDTH / 2, { ...material, label: `joint:${s.id}` }),
        );
    }
    for (const o of level.obstacles) {
      const points = Vertices.clockwiseSort(o.points.map((p) => ({ ...p })) as Matter.Vector[]);
      const centroid = Vertices.centre(points as Matter.Vertex[]);
      const body = Bodies.fromVertices(
        centroid.x,
        centroid.y,
        [points],
        { ...material, label: o.id },
        false,
        0,
        0,
      );
      this.obstacles.push({ body, definition: o });
      Composite.add(this.engine.world, body);
    }
    for (const m of level.movers) {
      const body = Bodies.rectangle(m.x, m.y + m.travel, m.w, m.h, {
        ...material,
        label: 'moving-block',
      });
      this.movers.push({ body, definition: m });
      Composite.add(this.engine.world, body);
    }
    for (const s of level.surfaces) {
      const body = Bodies.rectangle(s.x + s.w / 2, s.y - 6, s.w, 8, {
        isStatic: true,
        isSensor: true,
        label: s.kind,
      });
      this.surfaces.push(body);
      Composite.add(this.engine.world, body);
    }
    const g = level.goal;
    this.goalSensor = Bodies.rectangle(
      g.x + BALL_RADIUS + 1,
      g.y - g.h / 2,
      2,
      g.h - 2 * BALL_RADIUS,
      { isStatic: true, isSensor: true, label: 'goal-sensor' },
    );
    Composite.add(this.engine.world, this.goalSensor);
    this.ball = Bodies.circle(level.start.x, level.start.y, BALL_RADIUS, {
      label: 'football',
      restitution: 0.76,
      friction: 0.045,
      frictionStatic: 0.18,
      frictionAir: 0.0035,
      density: 0.012,
    });
    Composite.add(this.engine.world, this.ball);
    const contacts = (e: Matter.IEventCollision<Matter.Engine>) => {
      for (const pair of e.pairs) {
        if (pair.bodyA !== this.ball && pair.bodyB !== this.ball) continue;
        const other = pair.bodyA === this.ball ? pair.bodyB : pair.bodyA;
        if (other.label === 'delete' && this.canKick) this.pendingReset = true;
        if (
          (other.label === 'forward' || other.label === 'backward') &&
          this.canKick &&
          this.time - this.lastBoost > 0.55
        ) {
          this.lastBoost = this.time;
          const dir = other.label === 'forward' ? 1 : -1,
            v = this.ball.velocity;
          Body.setVelocity(this.ball, { x: v.x + dir * Math.max(8, 12 - dir * v.x), y: v.y });
          this.phase = 'moving';
          this.emit('boost', 1);
        }
      }
    };
    Events.on(this.engine, 'collisionStart', (e) => {
      contacts(e);
      for (const p of e.pairs) {
        if (p.bodyA !== this.ball && p.bodyB !== this.ball) continue;
        const other = p.bodyA === this.ball ? p.bodyB : p.bodyA;
        if (!other.isSensor && this.ball.speed > 2)
          this.emit(
            other.label.startsWith('goal-') ? 'post' : 'hit',
            Math.min(1, this.ball.speed / 18),
          );
      }
    });
    Events.on(this.engine, 'collisionActive', contacts);
  }
  get canKick() {
    return this.phase === 'ready' || this.phase === 'moving';
  }
  private emit(type: GameEvent['type'], strength: number) {
    this.events.push({ type, ...this.ball.position, strength });
  }
  shoot(pull: Point): boolean {
    if (!this.canKick || !Number.isFinite(pull.x) || !Number.isFinite(pull.y)) return false;
    const length = Math.hypot(pull.x, pull.y);
    if (length < 6) return false;
    const r = Math.min(1, MAX_PULL / length),
      v = this.ball.velocity;
    // Add the kick to existing momentum, at rest OR mid-flight. No shot-count gate.
    Body.setVelocity(this.ball, {
      x: v.x - pull.x * r * SHOT_SCALE,
      y: v.y - pull.y * r * SHOT_SCALE,
    });
    Body.setAngularVelocity(this.ball, this.ball.angularVelocity - pull.x * r * 0.002);
    this.shots++;
    this.phase = 'moving';
    this.emit('shot', Math.min(1, length / MAX_PULL));
    return true;
  }
  step() {
    if (this.phase === 'won') return;
    // Adaptive collision substeps keep fast additive kicks from tunnelling through
    // the visible 10.4-unit walls. No invisible box, teleport clamp, or speed reset.
    const substeps = Math.max(1, Math.ceil((this.ball.speed * 0.5 + 0.2) / 4));
    const dt = STEP / substeps;
    for (let n = 0; n < substeps; n++) {
      this.time += dt / 1000;
      for (const { body, definition: m } of this.movers) {
        const oldY = body.position.y;
        const desired = m.y + Math.cos((this.time * Math.PI * 2) / m.period) * m.travel;
        const limit = (((m.travel * Math.PI * 2) / m.period) * dt) / 1000;
        let nextY = oldY + Math.max(-limit, Math.min(limit, desired - oldY));
        const ball = this.ball.position,
          roof = Math.min(...this.level.outline.map((p) => p.y));
        // A kinematic block must stop against a trapped football rather than
        // squeeze it through a physical wall. Resume smoothly when it clears.
        if (Math.abs(ball.x - m.x) < m.w / 2 + BALL_RADIUS + 2) {
          if (
            nextY > oldY &&
            oldY + m.h / 2 <= ball.y - BALL_RADIUS + 2 &&
            ball.y + BALL_RADIUS >= this.level.goal.y - WALL_WIDTH / 2 - 3
          )
            nextY = Math.max(oldY, Math.min(nextY, ball.y - BALL_RADIUS - m.h / 2 - 1));
          if (
            nextY < oldY &&
            oldY - m.h / 2 >= ball.y + BALL_RADIUS - 2 &&
            ball.y - BALL_RADIUS <= roof + WALL_WIDTH / 2 + 3
          )
            nextY = Math.min(oldY, Math.max(nextY, ball.y + BALL_RADIUS + m.h / 2 + 1));
        }
        Body.setPosition(body, { x: m.x, y: nextY });
        Body.setVelocity(body, { x: 0, y: ((nextY - oldY) * (1000 / 60)) / dt });
      }
      const previous = { ...this.ball.position };
      Engine.update(this.engine, dt);
      if (this.pendingReset) {
        this.pendingReset = false;
        this.emit('reset', 1);
        this.resetCount++;
        Body.setPosition(this.ball, this.level.start);
        Body.setVelocity(this.ball, { x: 0, y: 0 });
        Body.setAngularVelocity(this.ball, 0);
        this.phase = 'ready';
        continue;
      }
      const { x, y } = this.ball.position,
        g = this.level.goal;
      if (this.canKick) {
        const before = previous.x - BALL_RADIUS,
          now = x - BALL_RADIUS;
        if (before <= g.x && now > g.x && x > previous.x) {
          const t = (g.x + BALL_RADIUS - previous.x) / (x - previous.x),
            cy = previous.y + (y - previous.y) * t;
          if (
            cy - BALL_RADIUS > g.y - g.h + WALL_WIDTH / 2 &&
            cy + BALL_RADIUS < g.y - WALL_WIDTH / 2 + 1
          ) {
            this.phase = 'scoring';
            this.timer = 0;
            this.goalTime = this.time;
            this.emit('net', 1);
          }
        }
        if (this.goalTime !== this.time)
          this.phase =
            this.ball.speed < 0.14 && Math.abs(this.ball.angularVelocity) < 0.02
              ? 'ready'
              : 'moving';
      }
      if (this.phase === 'scoring') {
        this.timer += dt / 1000;
        Body.setVelocity(this.ball, {
          x: this.ball.velocity.x * Math.pow(0.95, 1 / substeps),
          y: this.ball.velocity.y * Math.pow(0.97, 1 / substeps),
        });
        if (this.timer > 0.65) {
          this.phase = 'won';
          this.emit('win', 1);
          break;
        }
      }
    }
  }
  destroy() {
    Events.off(this.engine, 'collisionStart');
    Events.off(this.engine, 'collisionActive');
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
  }
}
export function rating(shots: number, l: Pick<Level, 'starShots'>) {
  return shots <= 0 ? 0 : shots <= l.starShots[0] ? 3 : shots <= l.starShots[1] ? 2 : 1;
}
export function trajectory(
  position: Point,
  pull: Point,
  velocity: Point = { x: 0, y: 0 },
): Point[] {
  const len = Math.hypot(pull.x, pull.y),
    r = Math.min(1, MAX_PULL / Math.max(1, len));
  let vx = velocity.x - pull.x * r * SHOT_SCALE,
    vy = velocity.y - pull.y * r * SHOT_SCALE,
    x = position.x,
    y = position.y;
  const points: Point[] = [];
  for (let i = 0; i < 50; i++) {
    vx *= 0.9965;
    vy = vy * 0.9965 + 1.1 * (1000 / 60) ** 2 * 0.001;
    x += vx;
    y += vy;
    if (i % 3 === 0) points.push({ x, y });
  }
  return points;
}
