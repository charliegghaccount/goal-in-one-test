import { GolfSimulation, MAX_PULL } from '../src/simulation';
import { levels, type Point } from '../src/levels';
function shot(
  id: number,
  angle: number,
  power: number,
  prior: { angle: number; power: number }[] = [],
) {
  const sim = new GolfSimulation(levels[id - 1]);
  for (const s of [...prior, { angle, power }]) {
    const a = (s.angle * Math.PI) / 180;
    sim.shoot({
      x: (-Math.cos(a) * MAX_PULL * s.power) / 100,
      y: (Math.sin(a) * MAX_PULL * s.power) / 100,
    });
    let i = 0;
    while (sim.phase !== 'ready' && sim.phase !== 'won' && i++ < 3500) sim.step();
  }
  const x = sim.ball.position.x,
    y = sim.ball.position.y;
  const result = {
    win: sim.phase === 'won',
    x,
    y,
    score: Math.hypot(x - sim.level.cup.x, (y - (sim.level.cup.y - 9)) * 1.8),
    phase: sim.phase,
  };
  sim.destroy();
  return result;
}
for (const id of process.argv.slice(2).map(Number).length
  ? process.argv.slice(2).map(Number)
  : levels.map((l) => l.id)) {
  let best = { score: Infinity, angle: 0, power: 0, x: 0, y: 0 };
  let won = false;
  outer: for (let angle = 15; angle <= 75; angle += 3)
    for (let power = 40; power <= 100; power += 2) {
      const s = shot(id, angle, power);
      if (s.score < best.score) best = { ...s, angle, power };
      if (s.win) {
        console.log(JSON.stringify({ id, route: [{ angle, power }], result: s }));
        won = true;
        break outer;
      }
    }
  if (!won) console.log(JSON.stringify({ id, best }));
}
