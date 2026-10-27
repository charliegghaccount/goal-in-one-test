import { MechanicRuntime } from './mechanics';
import { convexParts, isConvex } from './geometry';
import { defaultPhysics, sanitizePhysics, type PhysicsConfig } from './physics';
import Matter from 'matter-js';
import { moverPosition } from './motion';
import { segments, WALL_WIDTH, type Level, type Point, type Segment } from './levels';
const { Engine, Bodies, Body, Composite, Events, Vertices, Query } = Matter;
export const BALL_RADIUS = 16,
  STEP = 1000 / 120,
  MAX_PULL = 140,
  SHOT_SCALE = 0.125;
export type Phase = 'ready' | 'moving' | 'scoring' | 'won';
export type GameEvent = {
  type: 'shot' | 'hit' | 'post' | 'boost' | 'reset' | 'net' | 'win' | 'spring' | 'break' | 'switch';
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
  private boostApplied = new Set<number>();
  private currentDt = STEP;
  config: PhysicsConfig;
  mechanics: MechanicRuntime;
  constructor(
    public level: Level,
    config: PhysicsConfig = defaultPhysics,
  ) {
    this.config = sanitizePhysics(config);
    this.engine = Engine.create({
      gravity: { x: 0, y: 1.1, scale: 0.001 },
      positionIterations: 10,
      velocityIterations: 10,
    });
    const material = {
      isStatic: true,
      friction: this.config.groundFriction,
      frictionStatic: 0.04,
      restitution: 0.76,
    };
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
      const body = isConvex(o.points)
        ? Bodies.fromVertices(
            centroid.x,
            centroid.y,
            [points],
            { ...material, label: o.id },
            false,
            0,
            0,
          )
        : Body.create({
            ...material,
            label: o.id,
            parts: convexParts(o.points).map((triangle) => {
              const center = Vertices.centre(triangle as Matter.Vertex[]);
              return Bodies.fromVertices(
                center.x,
                center.y,
                [triangle],
                { ...material, label: o.id },
                false,
                0,
                0,
              );
            }),
          });
      this.obstacles.push({ body, definition: o });
      Composite.add(this.engine.world, body);
    }
    for (const m of level.movers) {
      const body = Bodies.rectangle(moverPosition(m, 0).x, moverPosition(m, 0).y, m.w, m.h, {
        ...material,
        label: 'moving-block',
        angle: m.angle ?? 0,
      });
      this.movers.push({ body, definition: m });
      Composite.add(this.engine.world, body);
    }
    for (const s of level.surfaces) {
      const body = Bodies.rectangle(s.x + s.w / 2, s.y - 6, s.w, 8, {
        isStatic: true,
        isSensor: true,
        label: s.kind,
        plugin: { acceleration: s.acceleration },
      });
      this.surfaces.push(body);
      Composite.add(this.engine.world, body);
    }
    const g = level.goal;
    this.goalSensor = Bodies.rectangle(
      g.x + (g.direction ?? 1) * (BALL_RADIUS + 1),
      g.y - g.h / 2,
      2,
      g.h - 2 * BALL_RADIUS,
      { isStatic: true, isSensor: true, label: 'goal-sensor' },
    );
    Composite.add(this.engine.world, this.goalSensor);
    this.ball = Bodies.circle(level.start.x, level.start.y, BALL_RADIUS, {
      label: 'football',
      restitution: 0.76,
      friction: this.config.groundFriction,
      frictionStatic: 0.04,
      frictionAir: this.config.airResistance,
      density: 0.012,
    });
    Composite.add(this.engine.world, this.ball);
    this.mechanics = new MechanicRuntime(this.engine, level.mechanics ?? {}, (type, p) =>
      this.events.push({ type, ...p, strength: 1 }),
    );
    const contacts = (e: Matter.IEventCollision<Matter.Engine>) => {
      for (const pair of e.pairs) {
        if (pair.bodyA !== this.ball && pair.bodyB !== this.ball) continue;
        const other = pair.bodyA === this.ball ? pair.bodyB : pair.bodyA;
        if (other.label === 'delete' && this.canKick) this.pendingReset = true;
      }
    };
    Events.on(this.engine, 'collisionStart', (e) => {
      contacts(e);
      for (const p of e.pairs) {
        if (p.bodyA !== this.ball && p.bodyB !== this.ball) continue;
        const other = p.bodyA === this.ball ? p.bodyB : p.bodyA;
        this.mechanics.collision(other, p.collision.normal);
        if (other.label === 'forward' || other.label === 'backward') {
          // Integrate the initial contact portion immediately; subsequent contact uses force.
          if (this.canKick && !this.boostApplied.has(other.id)) {
            const dir = other.label === 'forward' ? 1 : -1,
              fade = Math.max(0, 1 - Math.max(0, dir * this.ball.velocity.x) / 18);
            Body.setVelocity(this.ball, {
              x:
                this.ball.velocity.x +
                (dir *
                  (other.plugin.acceleration ?? this.config.boostAcceleration) *
                  fade *
                  this.currentDt) /
                  (1000 / 60),
              y: this.ball.velocity.y,
            });
            this.boostApplied.add(other.id);
          }
          this.emit('boost', 1);
        }
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
    const power = Math.min(length, MAX_PULL) * this.config.kickStrength;
    const dir = { x: -pull.x / length, y: -pull.y / length };
    const retained = {
      x: v.x * this.config.momentumRetention,
      y: v.y * this.config.momentumRetention,
    };
    const projection = retained.x * dir.x + retained.y * dir.y;
    if (projection < -power * 0.25) {
      retained.x += dir.x * (-power * 0.25 - projection);
      retained.y += dir.y * (-power * 0.25 - projection);
    }
    Body.setVelocity(this.ball, { x: retained.x + dir.x * power, y: retained.y + dir.y * power });
    Body.setAngularVelocity(
      this.ball,
      Math.max(
        -this.config.maxAngularVelocity,
        Math.min(
          this.config.maxAngularVelocity,
          this.ball.angularVelocity * 0.2 - pull.x * r * 0.0005,
        ),
      ),
    );
    this.shots++;
    this.phase = 'moving';
    this.emit('shot', Math.min(1, length / MAX_PULL));
    return true;
  }
  updateConfig(config: PhysicsConfig) {
    this.config = sanitizePhysics(config);
    for (const b of Composite.allBodies(this.engine.world)) {
      if (!b.isSensor) {
        b.friction = this.config.groundFriction;
        b.restitution = this.config.restitution;
      }
    }
  }
  step() {
    if (this.phase === 'won') return;
    // Adaptive collision substeps keep fast additive kicks from tunnelling through
    // the visible 10.4-unit walls. No invisible box, teleport clamp, or speed reset.
    const substeps = Math.max(1, Math.ceil((this.ball.speed * 0.5 + 0.2) / 4));
    const dt = STEP / substeps;
    for (let n = 0; n < substeps; n++) {
      this.currentDt = dt;
      this.boostApplied.clear();
      this.time += dt / 1000;
      for (const { body, definition: m } of this.movers) {
        if (m.path) {
          const old = { ...body.position },
            desired = moverPosition(m, this.time);
          // Bound tip translation per physics substep, even for imported extreme settings.
          const distance = Math.hypot(desired.x - old.x, desired.y - old.y),
            ratio = Math.min(1, (400 * dt) / 1000 / Math.max(0.00001, distance));
          let p = {
            x: old.x + (desired.x - old.x) * ratio,
            y: old.y + (desired.y - old.y) * ratio,
          };
          const supported = this.engine.pairs.list.some(
            (q: Matter.Pair) =>
              q.isActive &&
              !q.bodyA.isSensor &&
              !q.bodyB.isSensor &&
              (q.bodyA === this.ball || q.bodyB === this.ball) &&
              q.bodyA !== body &&
              q.bodyB !== body,
          );
          if (supported) {
            const depth = () =>
                Query.collides(this.ball, [body]).reduce((n, c) => Math.max(n, c.depth), 0),
              before = depth();
            Body.setPosition(body, p);
            const after = depth();
            Body.setPosition(body, old);
            if (after > before + 0.005) p = old;
          }
          Body.setPosition(body, p);
          Body.setVelocity(body, {
            x: ((p.x - old.x) * (1000 / 60)) / dt,
            y: ((p.y - old.y) * (1000 / 60)) / dt,
          });
          continue;
        }
        const axis = m.axis ?? 'y';
        const old = body.position[axis];
        const desired = m[axis] + Math.cos((this.time * Math.PI * 2) / m.period) * m.travel;
        const limit = (((m.travel * Math.PI * 2) / m.period) * dt) / 1000;
        let next = old + Math.max(-limit, Math.min(limit, desired - old));
        if (axis === 'y') {
          const p = this.ball.position,
            floor = Math.max(...this.level.outline.map((p) => p.y)),
            roof = Math.min(...this.level.outline.map((p) => p.y));
          if (Math.abs(p.x - m.x) < m.w / 2 + BALL_RADIUS + 2) {
            if (
              next > old &&
              old + m.h / 2 <= p.y - BALL_RADIUS + 2 &&
              p.y + BALL_RADIUS >= floor - WALL_WIDTH / 2 - 3
            )
              next = Math.max(old, Math.min(next, p.y - BALL_RADIUS - m.h / 2 - 1));
            if (
              next < old &&
              old - m.h / 2 >= p.y + BALL_RADIUS - 2 &&
              p.y - BALL_RADIUS <= roof + WALL_WIDTH / 2 + 3
            )
              next = Math.min(old, Math.max(next, p.y + BALL_RADIUS + m.h / 2 + 1));
          }
        }
        if (this.level.boundary && next !== old) {
          // Editable floors can be stepped/sloped: protect contacts with any solid,
          // instead of assuming the deepest floor is the surface beneath the ball.
          const supported = this.engine.pairs.list.some(
            (p: Matter.Pair) =>
              p.isActive &&
              !p.bodyA.isSensor &&
              !p.bodyB.isSensor &&
              (p.bodyA === this.ball || p.bodyB === this.ball) &&
              p.bodyA !== body &&
              p.bodyB !== body,
          );
          if (supported) {
            const depth = () =>
              Query.collides(this.ball, [body]).reduce((n, c) => Math.max(n, c.depth), 0);
            const before = depth(),
              previousPosition = { ...body.position };
            Body.setPosition(body, { ...body.position, [axis]: next });
            const after = depth();
            Body.setPosition(body, previousPosition);
            if (after > before + 0.005) next = old;
          }
        }
        Body.setPosition(body, { ...body.position, [axis]: next });
        Body.setVelocity(body, {
          x: axis === 'x' ? ((next - old) * (1000 / 60)) / dt : 0,
          y: axis === 'y' ? ((next - old) * (1000 / 60)) / dt : 0,
        });
      }
      this.ball.friction = this.config.groundFriction;
      this.ball.frictionAir = this.config.airResistance;
      this.ball.restitution = this.config.restitution;
      for (const pad of this.surfaces) {
        if (
          (pad.label === 'forward' || pad.label === 'backward') &&
          this.canKick &&
          Query.collides(this.ball, [pad]).length
        ) {
          this.boostApplied.add(pad.id);
          const dir = pad.label === 'forward' ? 1 : -1;
          const fade = Math.max(0, 1 - Math.max(0, dir * this.ball.velocity.x) / 18);
          Body.applyForce(this.ball, this.ball.position, {
            x:
              ((dir * this.ball.mass * (pad.plugin.acceleration ?? this.config.boostAcceleration)) /
                (1000 / 60) ** 2) *
              fade,
            y: 0,
          });
        }
      }
      const spin =
        this.ball.angularVelocity * Math.pow(1 - this.config.spinDamping, dt / (1000 / 60));
      Body.setAngularVelocity(
        this.ball,
        Math.max(-this.config.maxAngularVelocity, Math.min(this.config.maxAngularVelocity, spin)),
      );
      this.ball.frictionStatic = 0.04;
      this.mechanics.before(this.ball, dt, this.time, this.config);
      for (const pair of this.engine.pairs.list) {
        if (pair.bodyA === this.ball || pair.bodyB === this.ball) {
          const other = pair.bodyA === this.ball ? pair.bodyB : pair.bodyA;
          pair.friction = Math.min(this.ball.friction, other.friction);
          pair.frictionStatic = this.ball.frictionStatic;
          pair.restitution = Math.max(this.ball.restitution, other.restitution);
        }
      }
      const previous = { ...this.ball.position };
      Engine.update(this.engine, dt);
      Body.setAngularVelocity(
        this.ball,
        Math.max(
          -this.config.maxAngularVelocity,
          Math.min(this.config.maxAngularVelocity, this.ball.angularVelocity),
        ),
      );
      this.mechanics.after(this.ball);
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
        const dir = g.direction ?? 1;
        const before = dir * (previous.x - g.x) - BALL_RADIUS,
          now = dir * (x - g.x) - BALL_RADIUS;
        if (before <= 0 && now > 0 && dir * (x - previous.x) > 0) {
          const t = (g.x + dir * BALL_RADIUS - previous.x) / (x - previous.x),
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
  config: PhysicsConfig = defaultPhysics,
): Point[] {
  const len = Math.hypot(pull.x, pull.y),
    r = Math.min(1, MAX_PULL / Math.max(1, len));
  let vx = velocity.x * config.momentumRetention - pull.x * r * config.kickStrength,
    vy = velocity.y * config.momentumRetention - pull.y * r * config.kickStrength,
    x = position.x,
    y = position.y;
  if (len >= 6) {
    const dx = -pull.x / len,
      dy = -pull.y / len,
      power = Math.min(len, MAX_PULL) * config.kickStrength,
      projection =
        velocity.x * config.momentumRetention * dx + velocity.y * config.momentumRetention * dy;
    if (projection < -power * 0.25) {
      vx += dx * (-power * 0.25 - projection);
      vy += dy * (-power * 0.25 - projection);
    }
  }
  const points: Point[] = [];
  for (let i = 0; i < 50; i++) {
    vx *= 1 - config.airResistance;
    vy = vy * (1 - config.airResistance) + 1.1 * (1000 / 60) ** 2 * 0.001;
    x += vx;
    y += vy;
    if (i % 3 === 0) points.push({ x, y });
  }
  return points;
}
