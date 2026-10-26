import type { Kick } from './solve';

/** Reproducible player inputs at default physics; no body positions or velocities injected. */
export const vnextRoutes: Record<number, Kick[]> = {
  41: [{ angle: 66, power: 94 }],
  42: [{ angle: 40, power: 90 }],
  43: [{ angle: 0, power: 70 }],
  44: [{ angle: 0, power: 90 }],
  45: [{ angle: 60, power: 100 }],
  46: [{ angle: 25, power: 70 }],
  47: [{ angle: 5, power: 90 }],
  48: [{ angle: 50, power: 90 }],
  49: [{ angle: 0, power: 90 }],
  50: [{ angle: 0, power: 60 }],
  51: [{ angle: 60, power: 80 }],
  52: [
    { angle: 70, power: 100 },
    { angle: -20, power: 60 },
  ],
  53: [{ angle: 0, power: 80 }],
  54: [
    { angle: 50, power: 90 },
    { angle: 0, power: 60 },
  ],
  55: [{ angle: 0, power: 90 }],
  56: [{ angle: 0, power: 60 }],
  57: [{ angle: 0, power: 70 }],
  58: [
    { angle: 0, power: 60 },
    { angle: 15, power: 80 },
    { angle: 0, power: 80 },
  ],
  59: [{ angle: 0, power: 90 }],
  60: [{ angle: 15, power: 90 }],
};
