import authored from './data/vnext';
import type { Level } from './levels';

// Coordinates transcribed directly from the supplied machine-readable design pack.
// Keep the canonical package in docs/specifications/vnext for review and comparison.
export const vnextLevels: Level[] = structuredClone(authored);

// Measured clearance repairs; preserve the original data above for an exact review diff.
// 45: a 15-unit bridge/wall gap trapped a 32-unit ball on the intended high route.
const bridge = vnextLevels.find((l) => l.id === 45)!.obstacles.find((o) => o.id === 'high-bridge')!;
for (const p of bridge.points) if (p.x === 765) p.x = 720;
// 52: the final wedge left just 28 units beneath the ceiling, sealing the ONLY exit.
const wedge = vnextLevels.find((l) => l.id === 52)!.obstacles.find((o) => o.id === 'return-wedge')!;
wedge.points.find((p) => p.y === 488)!.y = 510;
// 57: wind stopped 25 units above the floor, allowing a completely unaffected ground roll.
vnextLevels.find((l) => l.id === 57)!.mechanics!.winds![0].h = 380;
