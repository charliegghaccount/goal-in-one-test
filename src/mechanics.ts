import Matter from 'matter-js';
import type { PhysicsConfig } from './physics';
import type { Point } from './levels';
const { Bodies, Body, Composite, Query } = Matter;
export type Spring = { x: number; y: number; w: number; angle: number; strength: number };
export type Wind = { x: number; y: number; w: number; h: number; angle: number; strength: number };
export type Breakable = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  threshold: number;
};
export type Gate = { id: string; x: number; y: number; w: number; h: number; offset: Point };
export type Switch = {
  id: string;
  x: number;
  y: number;
  gateId: string;
  mode: 'toggle' | 'timed';
  duration?: number;
};
export type Rotor = {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  phase?: number;
  amplitude?: number;
  period?: number;
  pivot?: Point;
};
export type Ice = { x: number; y: number; w: number; angle?: number; friction: number };
export type Mechanics = {
  springs?: Spring[];
  winds?: Wind[];
  breakables?: Breakable[];
  gates?: Gate[];
  switches?: Switch[];
  rotors?: Rotor[];
  ice?: Ice[];
};
export class MechanicRuntime {
  springs: { body: Matter.Body; def: Spring; last: number }[] = [];
  breakables: { body: Matter.Body; def: Breakable; broken: boolean; damage: number }[] = [];
  gates: { body: Matter.Body; def: Gate; target: boolean; progress: number; until: number }[] = [];
  switches: { body: Matter.Body; def: Switch; active: boolean }[] = [];
  rotors: { body: Matter.Body; def: Rotor }[] = [];
  ice: { body: Matter.Body; def: Ice }[] = [];
  private touching = new Set<number>();
  private pending = new Set<number>();
  private incoming = { x: 0, y: 0 };
  time = 0;
  constructor(
    public engine: Matter.Engine,
    public defs: Mechanics,
    public emit: (type: 'spring' | 'break' | 'switch', p: Point) => void,
  ) {
    const add = (b: Matter.Body) => {
      Composite.add(engine.world, b);
      return b;
    };
    for (const def of defs.springs ?? [])
      this.springs.push({
        def,
        last: -10,
        body: add(
          Bodies.rectangle(def.x + def.w / 2, def.y - 6, def.w, 10, {
            isStatic: true,
            isSensor: true,
            label: 'spring',
          }),
        ),
      });
    for (const def of defs.breakables ?? [])
      this.breakables.push({
        def,
        broken: false,
        damage: 0,
        body: add(
          Bodies.rectangle(def.x, def.y, def.w, def.h, {
            isStatic: true,
            label: 'breakable',
            restitution: 0.4,
            friction: 0.003,
          }),
        ),
      });
    for (const def of defs.gates ?? [])
      this.gates.push({
        def,
        target: false,
        progress: 0,
        until: -1,
        body: add(
          Bodies.rectangle(def.x, def.y, def.w, def.h, {
            isStatic: true,
            label: 'gate',
            friction: 0.003,
            restitution: 0.6,
          }),
        ),
      });
    for (const def of defs.switches ?? [])
      this.switches.push({
        def,
        active: false,
        body: add(
          Bodies.circle(def.x, def.y, 18, { isStatic: true, isSensor: true, label: 'switch' }),
        ),
      });
    for (const def of defs.rotors ?? [])
      this.rotors.push({
        def,
        body: add(
          Bodies.rectangle(def.x, def.y, def.w, def.h, {
            isStatic: true,
            angle: def.phase ?? 0,
            label: 'rotor',
            friction: 0.003,
            restitution: 0.8,
          }),
        ),
      });
    for (const def of defs.ice ?? []) {
      const a = def.angle ?? 0;
      this.ice.push({
        def,
        body: add(
          Bodies.rectangle(
            def.x + (Math.cos(a) * def.w) / 2 + Math.sin(a) * 6,
            def.y + (Math.sin(a) * def.w) / 2 - Math.cos(a) * 6,
            def.w,
            10,
            { isStatic: true, isSensor: true, angle: a, label: 'ice' },
          ),
        ),
      });
    }
  }
  collision(other: Matter.Body, normal: Point) {
    const b = this.breakables.find((b) => b.body === other && !b.broken);
    if (b) {
      const speed = Math.abs(this.incoming.x * normal.x + this.incoming.y * normal.y);
      b.damage = Math.max(b.damage, Math.min(1, speed / b.def.threshold));
      if (speed >= b.def.threshold) this.pending.add(other.id);
    }
  }
  before(ball: Matter.Body, dt: number, time: number, c: PhysicsConfig) {
    this.time = time;
    this.incoming = { ...ball.velocity };
    const now = new Set<number>();
    const contact = (body: Matter.Body) => {
      const yes = Query.collides(ball, [body]).length > 0;
      if (yes) now.add(body.id);
      return yes;
    };
    for (const s of this.springs)
      if (contact(s.body) && !this.touching.has(s.body.id)) {
        const a = (s.def.angle * Math.PI) / 180,
          power = Math.min(24, s.def.strength * c.springStrength);
        Body.setVelocity(ball, {
          x: ball.velocity.x * 0.2 + Math.cos(a) * power,
          y: ball.velocity.y * 0.2 - Math.sin(a) * power,
        });
        s.last = time;
        this.emit('spring', ball.position);
      }
    for (const w of this.defs.winds ?? [])
      if (
        ball.position.x >= w.x &&
        ball.position.x <= w.x + w.w &&
        ball.position.y >= w.y &&
        ball.position.y <= w.y + w.h
      ) {
        const a = (w.angle * Math.PI) / 180,
          dir = { x: Math.cos(a), y: -Math.sin(a) },
          v = ball.velocity.x * dir.x + ball.velocity.y * dir.y,
          fade = Math.max(0, 1 - Math.max(0, v) / 24);
        Body.applyForce(ball, ball.position, {
          x: ((dir.x * ball.mass * w.strength * c.windStrength) / (1000 / 60) ** 2) * fade,
          y: ((dir.y * ball.mass * w.strength * c.windStrength) / (1000 / 60) ** 2) * fade,
        });
      }
    for (const s of this.switches) {
      s.active = contact(s.body);
      if (s.active && !this.touching.has(s.body.id)) {
        const g = this.gates.find((g) => g.def.id === s.def.gateId);
        if (g) {
          g.target = s.def.mode === 'toggle' ? !g.target : true;
          g.until = s.def.mode === 'timed' ? time + (s.def.duration ?? 6) : -1;
          this.emit('switch', s.body.position);
        }
      }
    }
    for (const g of this.gates) {
      if (g.until > 0 && time >= g.until) {
        g.target = false;
        g.until = -1;
      }
      const next = Math.max(0, Math.min(1, g.progress + ((g.target ? 1 : -1) * dt) / 700));
      const p = { x: g.def.x + g.def.offset.x * next, y: g.def.y + g.def.offset.y * next };
      const dist = (p: Point) =>
        Math.hypot(
          Math.max(0, Math.abs(ball.position.x - p.x) - g.def.w / 2),
          Math.max(0, Math.abs(ball.position.y - p.y) - g.def.h / 2),
        );
      if (dist(p) < 19 && dist(p) < dist(g.body.position) - 0.01) {
        Body.setVelocity(g.body, { x: 0, y: 0 });
        continue;
      }
      const old = { ...g.body.position };
      Body.setPosition(g.body, p);
      Body.setVelocity(g.body, {
        x: ((p.x - old.x) * (1000 / 60)) / dt,
        y: ((p.y - old.y) * (1000 / 60)) / dt,
      });
      g.progress = next;
    }
    for (const r of this.rotors) {
      const desired =
        r.def.amplitude !== undefined
          ? Math.sin((time * 2 * Math.PI) / (r.def.period ?? 5)) * r.def.amplitude +
            (r.def.phase ?? 0)
          : (r.def.phase ?? 0) + time * r.def.speed;
      const oldAngle = r.body.angle,
        oldPos = { ...r.body.position };
      const delta = Math.max(-dt / 1000, Math.min(dt / 1000, desired - oldAngle)),
        angle = oldAngle + delta;
      if (r.def.pivot)
        Body.setPosition(r.body, {
          x: r.def.pivot.x - (Math.sin(angle) * r.def.h) / 2,
          y: r.def.pivot.y + (Math.cos(angle) * r.def.h) / 2,
        });
      Body.setAngle(r.body, angle);
      const supported = this.engine.pairs.list.some(
        (p: Matter.Pair) =>
          p.isActive &&
          !p.bodyA.isSensor &&
          !p.bodyB.isSensor &&
          (p.bodyA === ball || p.bodyB === ball) &&
          p.bodyA !== r.body &&
          p.bodyB !== r.body,
      );
      if (supported && Query.collides(ball, [r.body]).length) {
        Body.setAngle(r.body, oldAngle);
        Body.setPosition(r.body, oldPos);
        Body.setVelocity(r.body, { x: 0, y: 0 });
        Body.setAngularVelocity(r.body, 0);
        continue;
      }
      Body.setVelocity(r.body, {
        x: ((r.body.position.x - oldPos.x) * (1000 / 60)) / dt,
        y: ((r.body.position.y - oldPos.y) * (1000 / 60)) / dt,
      });
      Body.setAngularVelocity(r.body, (delta * (1000 / 60)) / dt);
    }
    for (const s of this.ice)
      if (contact(s.body)) {
        ball.friction = Math.min(ball.friction, s.def.friction);
        ball.frictionStatic = 0.001;
      }
    this.touching = now;
  }
  after(ball?: Matter.Body) {
    for (const b of this.breakables)
      if (this.pending.has(b.body.id) && !b.broken) {
        b.broken = true;
        Composite.remove(this.engine.world, b.body);
        this.emit('break', b.body.position);
      }
    if (ball && this.pending.size)
      Body.setVelocity(ball, { x: this.incoming.x * 0.7, y: this.incoming.y * 0.7 });
    this.pending.clear();
  }
}
