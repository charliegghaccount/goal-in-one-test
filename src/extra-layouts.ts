// Authored in the same source coordinates as the first ten sketches.
// Each entry is a self-contained puzzle, not a random obstacle generator.
export const extraLayouts = [
  {
    name: 'Stair play',
    tip: 'Climb the two steps, then use the open roof to reach the net.',
    polygons: [
      [
        [210, 419],
        [210, 375],
        [290, 375],
        [290, 419],
      ],
      [
        [370, 419],
        [370, 338],
        [440, 338],
        [440, 419],
      ],
    ],
  },
  {
    name: 'Twin peaks',
    tip: 'Carry momentum over two ramps. The valley gives you room to correct.',
    polygons: [
      [
        [170, 419],
        [300, 345],
        [340, 419],
      ],
      [
        [420, 419],
        [500, 360],
        [580, 419],
      ],
    ],
  },
  {
    name: 'Under and over',
    tip: 'A ceiling baffle leaves a generous low route; bank shots can work too.',
    polygons: [
      [
        [320, 124],
        [380, 98],
        [380, 240],
        [320, 240],
      ],
      [
        [440, 419],
        [530, 367],
        [530, 419],
      ],
    ],
  },
  {
    name: 'Green runway',
    tip: 'Use the green runway before the ramp, or clear both with an arc.',
    polygons: [
      [
        [370, 419],
        [490, 345],
        [490, 419],
      ],
    ],
    pads: [[180, 295, 'forward']],
  },
  {
    name: 'Against the grain',
    tip: 'The orange strip reverses rolling balls. Stay above it or use a bank.',
    polygons: [
      [
        [190, 419],
        [290, 365],
        [330, 419],
      ],
    ],
    pads: [[410, 560, 'backward']],
  },
  {
    name: 'Safe crossing',
    tip: 'Land on the shelf or loft the red strip. Every reset keeps your kicks.',
    polygons: [
      [
        [285, 335],
        [435, 335],
        [435, 355],
        [285, 355],
      ],
    ],
    pads: [[310, 440, 'delete']],
  },
  {
    name: 'The low window',
    tip: 'The hanging baffle and low ramp leave a clear middle passage.',
    polygons: [
      [
        [300, 133],
        [390, 94],
        [390, 235],
        [300, 235],
      ],
      [
        [290, 419],
        [430, 340],
        [480, 419],
      ],
    ],
  },
  {
    name: 'Moving lane',
    tip: 'The travelling block opens a low lane. Time the boost or aim over it.',
    polygons: [],
    pads: [[180, 270, 'forward']],
    mover: { x: 430, y: 285, w: 32, h: 120, travel: 65, period: 6 },
  },
  {
    name: 'Return pass',
    tip: 'A ramp and reverse strip ask for control before the slow gate.',
    polygons: [
      [
        [170, 419],
        [270, 350],
        [300, 419],
      ],
    ],
    pads: [[330, 435, 'backward']],
    mover: { x: 520, y: 285, w: 28, h: 110, travel: 65, period: 7 },
  },
  {
    name: 'One more goal',
    tip: 'Choose the high route or use the shelf to cross the red strip and gate.',
    polygons: [
      [
        [250, 310],
        [400, 310],
        [400, 330],
        [250, 330],
      ],
      [
        [530, 419],
        [600, 365],
        [600, 419],
      ],
    ],
    pads: [
      [160, 235, 'forward'],
      [330, 440, 'delete'],
    ],
    mover: { x: 470, y: 245, w: 28, h: 100, travel: 55, period: 7 },
  },
] as const;
