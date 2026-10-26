import type { Level, Point } from './levels';
import type { Mechanics } from './mechanics';
export function buildExpansion(base: Level[], p: (x: number, y: number) => Point): Level[] {
  const rect = (id: string, x: number, y: number, w: number, h: number) => ({
    id,
    points: [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ].map(([x, y]) => p(x, y)),
  });
  const poly = (id: string, points: number[][]) => ({
    id,
    points: points.map(([x, y]) => p(x, y)),
  });
  const spring = (x: number, angle: number, strength = 16) => ({
    ...p(x, 419.0852),
    w: 110,
    angle,
    strength,
  });
  const wind = (x: number, y: number, w: number, h: number, angle: number, strength: number) => ({
    ...p(x, y),
    w: w * 1.6,
    h: h * 1.6,
    angle,
    strength,
  });
  const barrier = (id: string, x: number, h = 100, threshold = 6) => ({
    id,
    ...p(x, 419.0852 - h / 2),
    w: 26 * 1.6,
    h: h * 1.6,
    threshold,
  });
  const gate = (id: string, x: number) => {
    const h = x >= 580 ? 80 : 120;
    const roof = (xx: number) =>
      xx <= 419.63
        ? 215.3793 + ((xx - 120) * (84.61 - 215.3793)) / (419.63 - 120)
        : 84.61 + ((xx - 419.63) * (351.8 - 84.61)) / (700.2021 - 419.63);
    const available = (419.0852 - h - Math.max(roof(x - 12), roof(x + 12))) * 1.6 - 14;
    return {
      id,
      ...p(x, 419.0852 - h / 2),
      w: 32,
      h: h * 1.6,
      offset: { x: 0, y: -Math.min(220, available) },
    };
  };
  const sw = (
    id: string,
    x: number,
    gateId: string,
    mode: 'toggle' | 'timed' = 'toggle',
    y = 400,
  ) => ({ id, ...p(x, y), gateId, mode, duration: 8 });
  const rotor = (x: number, y: number, speed = 0.35) => ({ ...p(x, y), w: 210, h: 25, speed });
  const ice = (x: number, end: number) => ({
    ...p(x, 419.0852),
    w: (end - x) * 1.6,
    friction: 0.00015,
  });
  const rows: {
    name: string;
    tip: string;
    shape: number;
    par: number;
    obstacles?: Level['obstacles'];
    m: Mechanics;
  }[] = [
    {
      name: 'First Bounce',
      tip: 'Roll onto the upward spring to clear the low wall; a mid-air kick can carry you farther.',
      shape: 0,
      par: 2,
      obstacles: [rect('low-wall', 335, 365, 18, 54)],
      m: { springs: [spring(250, 90)] },
    },
    {
      name: 'Angled Launch',
      tip: 'The diagonal spring sends the ball across the arena. Bank off the roof or correct the approach.',
      shape: 1,
      par: 2,
      obstacles: [
        poly('ramp', [
          [400, 419.0852],
          [490, 360],
          [490, 419.0852],
        ]),
      ],
      m: { springs: [spring(210, 50, 15)] },
    },
    {
      name: 'Double Bounce',
      tip: 'Chain the rising spring and the forward launcher, or steer between them in flight.',
      shape: 0,
      par: 2,
      m: { springs: [spring(200, 60, 15), spring(500, 20, 15)] },
    },
    {
      name: 'Tailwind',
      tip: 'Enter the blue airflow low down and feel its steady push toward the net.',
      shape: 0,
      par: 1,
      m: { winds: [wind(230, 255, 310, 164, 0, 0.25)] },
    },
    {
      name: 'Updraft',
      tip: 'The upward fan can carry a slow approach over the wall; exit the airflow toward the goal.',
      shape: 1,
      par: 2,
      obstacles: [rect('wall', 450, 320, 22, 99.0852)],
      m: { winds: [wind(280, 175, 170, 244, 90, 0.6)] },
    },
    {
      name: 'Against the Wind',
      tip: 'Two air currents offer a low assisted route and a headwind to fight or clear.',
      shape: 3,
      par: 2,
      m: { winds: [wind(180, 300, 180, 119, 0, 0.25), wind(430, 290, 190, 129, 180, 0.22)] },
    },
    {
      name: 'Breakthrough',
      tip: 'A firm impact breaks the cracked timber barrier. A lofted shot is another option.',
      shape: 0,
      par: 2,
      m: { breakables: [barrier('b1', 370, 100, 6)] },
    },
    {
      name: 'Two Routes',
      tip: 'Break the low shortcut barrier or take the open high route above the shelf.',
      shape: 1,
      par: 2,
      obstacles: [rect('shelf', 410, 305, 160, 18)],
      m: { breakables: [barrier('shortcut', 340, 95, 7)] },
    },
    {
      name: 'Chain Reaction',
      tip: 'Break a sequence of three barriers, keeping control between impacts.',
      shape: 8,
      par: 3,
      m: {
        breakables: [barrier('a', 270, 75, 5), barrier('b', 420, 90, 6), barrier('c', 560, 65, 6)],
      },
    },
    {
      name: 'Open Sesame',
      tip: 'Touch the blue floor switch to raise the matching gate. Its connector shows the target.',
      shape: 1,
      par: 2,
      m: { switches: [sw('s1', 230, 'g1')], gates: [gate('g1', 470)] },
    },
    {
      name: 'Timing Window',
      tip: 'Touch the airborne switch to open an eight-second gate, then keep your momentum.',
      shape: 1,
      par: 2,
      m: { switches: [sw('s1', 260, 'g1', 'timed', 300)], gates: [gate('g1', 480)] },
    },
    {
      name: 'Two-Step Puzzle',
      tip: 'The first floor switch opens the near gate; the second opens the exit gate.',
      shape: 1,
      par: 3,
      m: {
        switches: [sw('s1', 200, 'g1'), sw('s2', 455, 'g2')],
        gates: [gate('g1', 350), gate('g2', 600)],
      },
    },
    {
      name: 'Moving Paddle',
      tip: 'Observe the slow paddle, then pass beneath it or use a deliberate rebound.',
      shape: 1,
      par: 2,
      m: { rotors: [rotor(400, 305)] },
    },
    {
      name: 'The Swing',
      tip: 'The hanging timber swings over a low ramp. Use the opening or bank around it.',
      shape: 1,
      par: 2,
      obstacles: [
        poly('ramp', [
          [320, 419.0852],
          [400, 365],
          [480, 419.0852],
        ]),
      ],
      m: {
        rotors: [
          {
            ...p(400, 280),
            w: 30,
            h: 224,
            speed: 0,
            amplitude: 0.55,
            period: 6,
            pivot: p(400, 210),
          },
        ],
      },
    },
    {
      name: 'Pinball',
      tip: 'Two slow paddles turn in opposite directions. Pick your bank or recover mid-flight.',
      shape: 1,
      par: 2,
      m: {
        rotors: [
          { ...rotor(285, 325, 0.35), w: 160 },
          { ...rotor(515, 300, -0.3), w: 170 },
        ],
      },
    },
    {
      name: 'Slippery Start',
      tip: 'The pale blue strip carries rolling momentum farther. Shorter kicks may be enough.',
      shape: 0,
      par: 1,
      m: { ice: [ice(200, 590)] },
    },
    {
      name: 'Ice Run',
      tip: 'Slide into the approach, then loft the low wall or use a corrective kick.',
      shape: 8,
      par: 2,
      obstacles: [rect('wall', 470, 360, 20, 59.0852)],
      m: { ice: [ice(140, 625)] },
    },
    {
      name: 'Slopes and Slides',
      tip: 'Land on the polished downhill ramp and use gravity to carry the ball toward the net.',
      shape: 1,
      par: 2,
      obstacles: [
        poly('slope', [
          [180, 419.0852],
          [180, 340],
          [430, 419.0852],
        ]),
      ],
      m: {
        ice: [
          {
            ...p(180, 340),
            w: Math.hypot(250, 79.0852) * 1.6,
            angle: Math.atan2(79.0852, 250),
            friction: 0.0001,
          },
          ice(440, 610),
        ],
      },
    },
    {
      name: 'The Workshop',
      tip: 'Use the spring to clear the barrier, or break through it and activate the gate switch.',
      shape: 1,
      par: 3,
      m: {
        springs: [spring(200, 65, 15)],
        breakables: [barrier('shortcut', 410, 95, 6)],
        switches: [sw('switch', 490, 'exit')],
        gates: [gate('exit', 590)],
      },
    },
    {
      name: 'Grand Finale',
      tip: 'Use spring and airflow above the shortcut barrier, or break through and open the timed exit. Recover any time.',
      shape: 1,
      par: 3,
      m: {
        springs: [spring(180, 55, 14)],
        winds: [wind(315, 260, 145, 159, 25, 0.24)],
        breakables: [barrier('shortcut', 480, 100, 6)],
        switches: [sw('switch', 520, 'exit', 'timed', 310)],
        gates: [gate('exit', 620)],
        rotors: [{ ...rotor(555, 265, 0.3), w: 120 }],
        ice: [ice(280, 430)],
      },
    },
  ];
  return rows.map((r, i) => ({
    id: 21 + i,
    name: r.name,
    tip: r.tip,
    par: r.par,
    starShots: [r.par, r.par + 2],
    width: 1280,
    start: { ...base[0].start },
    goal: { ...base[0].goal },
    outline: base[r.shape].outline.map((p) => ({ ...p })),
    obstacles: r.obstacles ?? [],
    surfaces: [],
    movers: [],
    mechanics: r.m,
    experimental: true,
  }));
}
