import { playRoute } from './solve';
for (const id of [1, 2, 5]) {
  let n = 0,
    w = 0;
  for (const angle of id === 1 ? [0, 5, 10] : id === 2 ? [40, 45, 50, 55, 60] : [160, 170, 180])
    for (const power of id === 2 ? [90, 95, 100] : [50, 60, 70, 80]) {
      const s = playRoute(id, [{ angle, power }]);
      n++;
      if (s.phase === 'won') w++;
      s.destroy();
    }
  console.log({ id, w, n });
}
