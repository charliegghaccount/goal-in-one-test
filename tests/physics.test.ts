import { test } from 'node:test';
import assert from 'node:assert/strict';
import Matter from 'matter-js';
import { levels, arenaPolygon, segments, WALL_WIDTH, type Point } from '../src/levels';
import { FootballSimulation, MAX_PULL, BALL_RADIUS, rating } from '../src/simulation';
import { playRoute } from './solve';
import { solutions } from './solutions';
const { Body, Events, Query } = Matter;
function inside(p: Point, poly: Point[]) {
  let yes = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
      yes = !yes;
  }
  return yes;
}
function close(a: number, b: number, tol = 0.00001) {
  assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);
}
for (const [i, route] of solutions.entries())
  test(`PDF level ${i + 1}: legal input route enters the goal and earns three stars`, () => {
    const s = playRoute(i + 1, route);
    try {
      assert.equal(s.phase, 'won');
      assert.equal(s.shots, route.length);
      assert.equal(rating(s.shots, s.level), 3);
      assert.equal(s.events.filter((e) => e.type === 'net').length, 1);
    } finally {
      s.destroy();
    }
  });
test('moving kicks add exact velocity and spin rather than replace momentum', () => {
  const s = new FootballSimulation(levels[0]);
  try {
    Body.setVelocity(s.ball, { x: 7, y: -4 });
    Body.setAngularVelocity(s.ball, 0.12);
    assert.equal(s.shoot({ x: -80, y: 40 }), true);
    close(s.ball.velocity.x, 17);
    close(s.ball.velocity.y, -9);
    close(s.ball.angularVelocity, 0.28);
    s.step();
    const v = { ...s.ball.velocity };
    assert.equal(s.shoot({ x: 40, y: -20 }), true);
    close(s.ball.velocity.x, v.x - 5);
    close(s.ball.velocity.y, v.y + 2.5);
    assert.equal(s.shots, 2);
  } finally {
    s.destroy();
  }
});
test('100 consecutive kicks are accepted; high accumulated velocity remains enclosed', () => {
  const s = new FootballSimulation(levels[0]);
  try {
    for (let i = 0; i < 100; i++) assert.equal(s.shoot({ x: 0, y: 140 }), true);
    assert.equal(s.shots, 100);
    assert.ok(s.ball.velocity.y < -1700);
    for (let i = 0; i < 700; i++) {
      s.step();
      assert.ok(
        inside(s.ball.position, arenaPolygon(s.level)),
        `escaped at step ${i}: ${JSON.stringify(s.ball.position)}`,
      );
    }
    assert.equal(rating(100, s.level), 1);
  } finally {
    s.destroy();
  }
});
test('completion is still possible after more than ten kicks and far above par', () => {
  const s = new FootballSimulation(levels[0]);
  try {
    for (let i = 0; i < 12; i++) {
      s.shoot({ x: 0, y: 8 });
      for (let j = 0; j < 240; j++) s.step();
    }
    assert.equal(s.shots, 12);
    s.shoot({ x: -98, y: 0 });
    for (let i = 0; i < 1800 && s.phase !== 'won'; i++) s.step();
    assert.equal(s.phase, 'won');
    assert.equal(s.shots, 13);
    assert.equal(rating(s.shots, s.level), 1);
  } finally {
    s.destroy();
  }
});
test('dead zone and nonfinite pulls cancel without spending shots; kick strength is capped per impulse', () => {
  const s = new FootballSimulation(levels[0]);
  try {
    assert.equal(s.shoot({ x: 2, y: 1 }), false);
    assert.equal(s.shoot({ x: NaN, y: 0 }), false);
    assert.equal(s.shoot({ x: Infinity, y: 0 }), false);
    assert.equal(s.shots, 0);
    s.shoot({ x: -10000, y: 0 });
    close(s.ball.velocity.x, MAX_PULL * 0.125);
  } finally {
    s.destroy();
  }
});
for (const [id, direction] of [
  [5, 1],
  [6, -1],
] as const)
  test(`level ${id} boost adds acceleration in the drawn arrow direction`, () => {
    const s = new FootballSimulation(levels[id - 1]);
    try {
      const p = s.level.surfaces[0];
      Body.setPosition(s.ball, { x: p.x + p.w / 2, y: p.y - 40 });
      Body.setVelocity(s.ball, { x: 0, y: 4 });
      for (let i = 0; i < 40 && !s.events.some((e) => e.type === 'boost'); i++) s.step();
      assert.ok(s.events.some((e) => e.type === 'boost'));
      assert.ok(s.ball.velocity.x * direction > 10);
      assert.equal(s.shots, 0);
    } finally {
      s.destroy();
    }
  });
test('red surface immediately returns to the ORIGINAL start and preserves all taken shots', () => {
  const s = new FootballSimulation(levels[9]);
  try {
    for (let i = 0; i < 21; i++) s.shoot({ x: 0, y: 8 });
    const p = s.level.surfaces[0];
    Body.setPosition(s.ball, { x: p.x + p.w / 2, y: p.y - 35 });
    Body.setVelocity(s.ball, { x: 0, y: 4 });
    for (let i = 0; i < 40 && s.resetCount === 0; i++) s.step();
    assert.equal(s.resetCount, 1);
    assert.equal(s.shots, 21);
    assert.ok(
      Math.hypot(s.ball.position.x - s.level.start.x, s.ball.position.y - s.level.start.y) < 2,
    );
    assert.ok(s.canKick);
    assert.equal(s.shoot({ x: -20, y: 20 }), true);
    assert.equal(s.shots, 22);
  } finally {
    s.destroy();
  }
});
test('goal outline, backside, proximity, and spawn-inside alone cannot score', () => {
  for (const side of ['inside', 'back', 'top']) {
    const s = new FootballSimulation(levels[0]);
    try {
      const g = s.level.goal;
      s.phase = 'moving';
      Body.setPosition(
        s.ball,
        side === 'inside'
          ? { x: g.x + 40, y: g.y - 35 }
          : side === 'back'
            ? { x: g.x + g.w - 10, y: g.y - 10 }
            : { x: g.x + g.roof / 2, y: g.y - g.h - 35 },
      );
      Body.setVelocity(s.ball, side === 'top' ? { x: 0, y: 3 } : { x: 0, y: 0 });
      for (let i = 0; i < 120; i++) s.step();
      assert.equal(
        s.events.some((e) => e.type === 'net'),
        false,
      );
    } finally {
      s.destroy();
    }
  }
});
test('moving block traverses its vertical path and actually collides with the ball', () => {
  const s = new FootballSimulation(levels[8]);
  try {
    const m = s.movers[0];
    const start = m.body.position.y;
    for (let i = 0; i < 240; i++) s.step();
    assert.ok(m.body.position.y < start - 50);
    Body.setPosition(s.ball, {
      x: m.body.position.x - m.definition.w / 2 - BALL_RADIUS - 3,
      y: m.body.position.y,
    });
    Body.setVelocity(s.ball, { x: 10, y: 0 });
    let touched = false;
    Events.on(s.engine, 'collisionStart', (e) => {
      for (const p of e.pairs)
        if (
          (p.bodyA === s.ball && p.bodyB === m.body) ||
          (p.bodyB === s.ball && p.bodyA === m.body)
        )
          touched = true;
    });
    for (let i = 0; i < 20; i++) s.step();
    assert.ok(touched);
    assert.ok(s.ball.velocity.x < 0);
  } finally {
    s.destroy();
  }
});
for (const l of levels)
  test(`level ${l.id}: every reachable boundary segment rebounds and remains inside the drawn polygon`, () => {
    let checked = 0;
    for (const segment of segments(l)) {
      const s = new FootballSimulation(l);
      try {
        const d = { x: segment.b.x - segment.a.x, y: segment.b.y - segment.a.y },
          len = Math.hypot(d.x, d.y),
          normal = { x: -d.y / len, y: d.x / len };
        let launch: Point | null = null,
          norm: Point | null = null;
        for (const f of [0.5, 0.15, 0.3, 0.7, 0.85])
          for (const sign of [1, -1]) {
            const n = { x: normal.x * sign, y: normal.y * sign },
              p = {
                x: segment.a.x + d.x * f + n.x * (BALL_RADIUS + WALL_WIDTH / 2 + 5),
                y: segment.a.y + d.y * f + n.y * (BALL_RADIUS + WALL_WIDTH / 2 + 5),
              };
            if (
              inside(p, arenaPolygon(l)) &&
              !l.obstacles.some((o) => inside(p, o.points)) &&
              Query.collides(s.ball, []).length === 0
            ) {
              const occupied = Query.point(
                [...s.obstacles.map((o) => o.body), ...s.movers.map((m) => m.body)],
                p,
              ).length;
              if (!occupied) {
                launch = p;
                norm = n;
                break;
              }
            }
          }
        if (!launch || !norm) continue;
        Body.setPosition(s.ball, launch);
        Body.setVelocity(s.ball, { x: -norm.x * 16, y: -norm.y * 16 });
        let touched = false;
        Events.on(s.engine, 'collisionStart', (e) => {
          for (const p of e.pairs) {
            const other = p.bodyA === s.ball ? p.bodyB : p.bodyB === s.ball ? p.bodyA : null;
            if (other && (other.label === segment.id || other.label === `joint:${segment.id}`))
              touched = true;
          }
        });
        for (let i = 0; i < 24; i++) {
          s.step();
          assert.ok(
            inside(s.ball.position, arenaPolygon(l)),
            `${segment.id} leaked: ${JSON.stringify(s.ball.position)}`,
          );
        }
        assert.ok(touched, `segment ${segment.id} did not receive a real contact`);
        checked++;
      } finally {
        s.destroy();
      }
    }
    assert.ok(
      checked >= segments(l).length - 1,
      `only ${checked} of ${segments(l).length} boundary faces exercised`,
    );
  });
for (const l of levels.filter((l) => l.obstacles.length))
  test(`level ${l.id}: solid obstacle interiors and every exposed slope collide`, () => {
    let faces = 0;
    for (const obstacle of l.obstacles) {
      const s = new FootballSimulation(l);
      try {
        const body = s.obstacles.find((o) => o.definition.id === obstacle.id)!.body;
        const center = obstacle.points.reduce(
          (a, p) => ({
            x: a.x + p.x / obstacle.points.length,
            y: a.y + p.y / obstacle.points.length,
          }),
          { x: 0, y: 0 },
        );
        assert.ok(
          Query.point([body], center).length > 0,
          'obstacle must be filled, not a hollow outline',
        );
      } finally {
        s.destroy();
      }
      for (let i = 0; i < obstacle.points.length; i++) {
        const a = obstacle.points[i],
          b = obstacle.points[(i + 1) % obstacle.points.length],
          dx = b.x - a.x,
          dy = b.y - a.y,
          len = Math.hypot(dx, dy);
        for (const sign of [1, -1]) {
          const n = { x: (-dy / len) * sign, y: (dx / len) * sign },
            p = {
              x: (a.x + b.x) / 2 + n.x * (BALL_RADIUS + 5),
              y: (a.y + b.y) / 2 + n.y * (BALL_RADIUS + 5),
            };
          if (!inside(p, arenaPolygon(l)) || l.obstacles.some((o) => inside(p, o.points))) continue;
          const sim = new FootballSimulation(l);
          try {
            Body.setPosition(sim.ball, p);
            Body.setVelocity(sim.ball, { x: -n.x * 12, y: -n.y * 12 });
            let touched = false;
            Events.on(sim.engine, 'collisionStart', (e) => {
              for (const q of e.pairs)
                if (
                  (q.bodyA === sim.ball && q.bodyB.label === obstacle.id) ||
                  (q.bodyB === sim.ball && q.bodyA.label === obstacle.id)
                )
                  touched = true;
            });
            for (let j = 0; j < 18; j++) sim.step();
            assert.ok(touched, `${obstacle.id} face ${i} failed to collide`);
            faces++;
          } finally {
            sim.destroy();
          }
          break;
        }
      }
    }
    assert.ok(faces >= 2 * l.obstacles.length, `only ${faces} exposed obstacle faces checked`);
  });
for (const l of levels)
  test(`level ${l.id}: repeated bank shots do not escape through walls or corners`, () => {
    const s = new FootballSimulation(l);
    let seed = l.id;
    try {
      const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
      for (let i = 0; i < 2000 && s.phase !== 'won'; i++) {
        if (i % 27 === 0) s.shoot({ x: (rnd() - 0.5) * 280, y: (rnd() - 0.5) * 280 });
        s.step();
        assert.ok(
          inside(s.ball.position, arenaPolygon(l)),
          `escape at step ${i}: ${JSON.stringify(s.ball.position)}`,
        );
      }
    } finally {
      s.destroy();
    }
  });
test('retry restores initial geometry, moving-block phase, position, count, and delete state', () => {
  const a = new FootballSimulation(levels[8]);
  a.shoot({ x: -60, y: 40 });
  for (let i = 0; i < 140; i++) a.step();
  a.destroy();
  const s = new FootballSimulation(levels[8]);
  try {
    assert.equal(s.shots, 0);
    assert.equal(s.time, 0);
    assert.equal(s.resetCount, 0);
    close(s.ball.position.x, s.level.start.x);
    close(s.movers[0].body.position.y, s.movers[0].definition.y + s.movers[0].definition.travel);
  } finally {
    s.destroy();
  }
});
test('moving-block endpoint clearances cannot crush a ball through the roof or floor', () => {
  for (const side of ['above', 'below']) {
    const s = new FootballSimulation(levels[8]);
    try {
      if (side === 'below') for (let i = 0; i < 480; i++) s.step();
      const roof = Math.min(...s.level.outline.map((p) => p.y));
      Body.setPosition(s.ball, {
        x: s.movers[0].body.position.x,
        y: side === 'above' ? roof + 25 : s.level.goal.y - 22,
      });
      Body.setVelocity(s.ball, { x: 0, y: 0 });
      for (let i = 0; i < 1100; i++) {
        s.step();
        for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5])
          assert.ok(
            inside(
              {
                x: s.ball.position.x + Math.cos(a) * BALL_RADIUS,
                y: s.ball.position.y + Math.sin(a) * BALL_RADIUS,
              },
              arenaPolygon(s.level),
            ),
            `${side} crush at tick ${i}`,
          );
      }
    } finally {
      s.destroy();
    }
  }
});
for (const l of levels)
  test(`level ${l.id}: reachable welded corner joints reject direct fast impacts`, () => {
    const endpoints = new Map<string, Point>();
    for (const s of segments(l))
      for (const p of [s.a, s.b]) endpoints.set(`${p.x.toFixed(2)},${p.y.toFixed(2)}`, p);
    let checked = 0;
    for (const corner of endpoints.values()) {
      const s = new FootballSimulation(l);
      try {
        let launch: Point | null = null;
        const distance = BALL_RADIUS + WALL_WIDTH / 2 + 8;
        for (let i = 0; i < 72; i++) {
          const a = (i / 72) * Math.PI * 2,
            p = { x: corner.x + Math.cos(a) * distance, y: corner.y + Math.sin(a) * distance };
          if (!inside(p, arenaPolygon(l))) continue;
          Body.setPosition(s.ball, p);
          if (
            Query.collides(
              s.ball,
              s.engine.world.bodies.filter((b) => b !== s.ball && !b.isSensor),
            ).length === 0
          ) {
            launch = p;
            break;
          }
        }
        if (!launch) continue;
        Body.setPosition(s.ball, launch);
        Body.setVelocity(s.ball, {
          x: ((corner.x - launch.x) / distance) * 28,
          y: ((corner.y - launch.y) / distance) * 28,
        });
        let touched = false;
        Events.on(s.engine, 'collisionStart', (e) => {
          for (const p of e.pairs) if (p.bodyA === s.ball || p.bodyB === s.ball) touched = true;
        });
        for (let i = 0; i < 18; i++) {
          s.step();
          assert.ok(
            inside(s.ball.position, arenaPolygon(l)),
            `corner leaked at ${JSON.stringify(corner)}`,
          );
        }
        assert.ok(touched, 'a direct corner impact must contact a real collider');
        checked++;
      } finally {
        s.destroy();
      }
    }
    assert.ok(checked >= 3, 'corner test must actually exercise reachable joins');
  });
