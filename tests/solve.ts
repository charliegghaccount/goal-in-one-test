// Searches legal drag vectors using exactly the runtime simulation; no body relocation.
import { FootballSimulation, MAX_PULL } from '../src/simulation';
import { levels } from '../src/levels';
export type Kick = { angle: number; power: number; wait?: number };
export function playRoute(id: number, route: Kick[]) {
  const sim = new FootballSimulation(levels[id - 1]);
  for (let i = 0; i < 12; i++) sim.step();
  for (const k of route) {
    for (let i = 0; i < (k.wait ?? 0) * 120; i++) sim.step();
    const a = (k.angle * Math.PI) / 180;
    if (
      !sim.shoot({
        x: (-Math.cos(a) * MAX_PULL * k.power) / 100,
        y: (Math.sin(a) * MAX_PULL * k.power) / 100,
      })
    )
      break;
    for (let i = 0; i < 1200 && sim.phase !== 'won' && sim.phase !== 'failed'; i++) sim.step();
    if (sim.phase === 'won' || sim.phase === 'failed') break;
  }
  return sim;
}
if (process.argv[1]?.endsWith('solve.ts')) {
  const ids = process.argv.slice(2).map(Number);
  const chosen = ids.length ? ids : levels.map((l) => l.id);
  for (const id of chosen) {
    const level = levels[id - 1];
    let beam: { route: Kick[]; score: number; x: number; y: number }[] = [
      { route: [], score: 1e6, x: level.start.x, y: level.start.y },
    ];
    let found: Kick[] | null = null;
    for (let depth = 1; depth <= Math.min(3, level.par) && !found; depth++) {
      const states: typeof beam = [];
      outer: for (const base of beam)
        for (let angle = 9; angle <= 78; angle += 3)
          for (let power = 28; power <= 100; power += 4) {
            const route = [...base.route, { angle, power }];
            const s = playRoute(id, route);
            if (s.phase === 'won') {
              found = route;
              s.destroy();
              break outer;
            }
            const { x, y } = s.ball.position;
            if (s.phase === 'ready' && x > base.x + 35 && x < level.goal.x + 5) {
              const score = Math.hypot(level.goal.x - x, (level.goal.y - 12 - y) * 1.5);
              states.push({ route, score, x, y });
            }
            s.destroy();
          }
      states.sort((a, b) => a.score - b.score);
      const used = new Set<string>();
      beam = [];
      for (const s of states) {
        const key = `${Math.round(s.x / 55)},${Math.round(s.y / 35)}`;
        if (!used.has(key)) {
          used.add(key);
          beam.push(s);
        }
        if (beam.length >= 10) break;
      }
      if (!found) console.log(JSON.stringify({ id, depth, best: beam.slice(0, 3) }));
    }
    console.log(JSON.stringify({ id, solution: found }));
  }
}
