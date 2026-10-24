// Input-only route search: the same additive kick and collision simulation as play.
import { FootballSimulation, MAX_PULL } from '../src/simulation';
import { levels } from '../src/levels';
export type Kick = { angle: number; power: number; after?: number; flight?: number };
export function playRoute(id: number, route: Kick[], settle = 12) {
  const s = new FootballSimulation(levels[id - 1]);
  for (let i = 0; i < settle; i++) s.step();
  for (const k of route) {
    for (let i = 0; i < (k.after ?? 0) * 120; i++) s.step();
    const a = (k.angle * Math.PI) / 180;
    s.shoot({
      x: (-Math.cos(a) * MAX_PULL * k.power) / 100,
      y: (Math.sin(a) * MAX_PULL * k.power) / 100,
    });
    for (let i = 0; i < (k.flight ?? 12) * 120 && s.phase !== 'won'; i++) s.step();
    if (s.phase === 'won') break;
  }
  return s;
}
if (process.argv[1]?.endsWith('solve.ts')) {
  for (const id of process.argv.slice(2).length
    ? process.argv.slice(2).map(Number)
    : levels.map((l) => l.id)) {
    const l = levels[id - 1];
    let beam: { route: Kick[]; score: number; x: number }[] = [
        { route: [], score: 1e6, x: l.start.x },
      ],
      found: Kick[] | null = null;
    for (let depth = 1; depth <= 3 && !found; depth++) {
      const next: typeof beam = [];
      outer: for (const base of beam)
        for (let angle = 0; angle <= 180; angle += 5)
          for (let power = 20; power <= 100; power += 5) {
            const route = [...base.route, { angle, power }],
              s = playRoute(id, route);
            if (s.phase === 'won') {
              found = route;
              s.destroy();
              break outer;
            }
            const { x, y } = s.ball.position;
            if (x > base.x + 20 && x < l.goal.x + 5)
              next.push({ route, x, score: Math.hypot(l.goal.x - x, (l.goal.y - 25 - y) * 1.5) });
            s.destroy();
          }
      next.sort((a, b) => a.score - b.score);
      const set = new Set<number>();
      beam = [];
      for (const state of next) {
        const key = Math.round(state.x / 70);
        if (!set.has(key)) {
          set.add(key);
          beam.push(state);
        }
        if (beam.length >= 6) break;
      }
      if (!found) console.log(JSON.stringify({ id, depth, best: beam.slice(0, 2) }));
    }
    console.log(JSON.stringify({ id, solution: found }));
  }
}
