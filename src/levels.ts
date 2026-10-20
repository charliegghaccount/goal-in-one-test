export type Point = { x: number; y: number };
export type Terrain = {
  x: number;
  y: number;
  w: number;
  h: number;
  angle?: number;
  kind?: 'stone' | 'grass';
};
export type Mover = {
  x: number;
  y: number;
  w: number;
  h: number;
  axis: 'x' | 'y';
  travel: number;
  period: number;
};
export type Level = {
  id: number;
  name: string;
  subtitle: string;
  tip: string;
  par: number;
  start: Point;
  cup: Point;
  terrain: Terrain[];
  water?: { x: number; w: number; y: number }[];
  pads?: { x: number; y: number; w: number }[];
  movers?: Mover[];
  theme: 'meadow' | 'sunset' | 'alpine';
};
const ground = (x: number, y: number, w: number): Terrain => ({ x, y, w, h: 720 - y });
const block = (x: number, y: number, w: number, h: number): Terrain => ({
  x,
  y,
  w,
  h,
  kind: 'stone',
});
export const levels: Level[] = [
  {
    id: 1,
    name: 'The first swing',
    subtitle: 'Every adventure starts with a little nudge.',
    tip: 'Drag back from the ball. Release to let it fly.',
    par: 2,
    theme: 'meadow',
    start: { x: 170, y: 541 },
    cup: { x: 1090, y: 550 },
    terrain: [ground(0, 550, 1280)],
  },
  {
    id: 2,
    name: 'A little elevation',
    subtitle: 'Onwards. And a little upwards.',
    tip: 'A higher arc will get you onto the raised green.',
    par: 3,
    theme: 'meadow',
    start: { x: 155, y: 551 },
    cup: { x: 1090, y: 430 },
    terrain: [
      ground(0, 560, 550),
      ground(780, 430, 500),
      { x: 510, y: 512, w: 300, h: 35, angle: -0.42 },
    ],
  },
  {
    id: 3,
    name: 'Mind the gap',
    subtitle: 'A small leap of faith.',
    tip: 'Clear the pond. A splash returns you to your last safe shot.',
    par: 2,
    theme: 'meadow',
    start: { x: 190, y: 521 },
    cup: { x: 1070, y: 520 },
    terrain: [ground(0, 530, 450), ground(740, 520, 540)],
    water: [{ x: 450, w: 290, y: 610 }],
  },
  {
    id: 4,
    name: 'Over & under',
    subtitle: 'There is more than one way to the flag.',
    tip: 'Go high over the wall, or use the stepping platform.',
    par: 3,
    theme: 'meadow',
    start: { x: 145, y: 551 },
    cup: { x: 1105, y: 560 },
    terrain: [ground(0, 560, 1280), block(595, 360, 35, 200), { x: 350, y: 435, w: 135, h: 20 }],
  },
  {
    id: 5,
    name: 'Spring in your step',
    subtitle: 'A little extra bounce goes a long way.',
    tip: 'The coral spring pad gives your ball an upward boost.',
    par: 3,
    theme: 'sunset',
    start: { x: 150, y: 551 },
    cup: { x: 1090, y: 340 },
    terrain: [ground(0, 560, 600), ground(855, 340, 425)],
    pads: [{ x: 480, y: 554, w: 105 }],
    water: [{ x: 600, w: 255, y: 620 }],
  },
  {
    id: 6,
    name: 'Perfect timing',
    subtitle: 'Good things come to those who wait.',
    tip: 'Watch the moving gate, then pick your moment.',
    par: 3,
    theme: 'sunset',
    start: { x: 150, y: 541 },
    cup: { x: 1100, y: 550 },
    terrain: [ground(0, 550, 1280)],
    movers: [{ x: 625, y: 340, w: 32, h: 150, axis: 'y', travel: 125, period: 4 }],
  },
  {
    id: 7,
    name: 'Island hopping',
    subtitle: 'Find your feet between the fairways.',
    tip: 'The little island is a safe place to take a second shot.',
    par: 4,
    theme: 'sunset',
    start: { x: 140, y: 521 },
    cup: { x: 1110, y: 460 },
    terrain: [ground(0, 530, 345), ground(515, 480, 185), ground(910, 460, 370)],
    water: [
      { x: 345, w: 170, y: 610 },
      { x: 700, w: 210, y: 610 },
    ],
  },
  {
    id: 8,
    name: 'The scenic route',
    subtitle: 'Take the high road. Or make your own.',
    tip: 'Bank off a slope, or loft a shot across the upper shelf.',
    par: 4,
    theme: 'alpine',
    start: { x: 145, y: 571 },
    cup: { x: 1100, y: 420 },
    terrain: [
      ground(0, 580, 710),
      ground(950, 420, 330),
      { x: 320, y: 515, w: 250, h: 30, angle: -0.4 },
      { x: 620, y: 365, w: 180, h: 24 },
      block(845, 490, 35, 90),
    ],
    water: [{ x: 710, w: 240, y: 635 }],
  },
  {
    id: 9,
    name: 'Between a rock…',
    subtitle: 'A soft touch, a bold finish.',
    tip: 'Keep below the ceiling, then bounce up to the final green.',
    par: 4,
    theme: 'alpine',
    start: { x: 135, y: 551 },
    cup: { x: 1125, y: 400 },
    terrain: [
      ground(0, 560, 830),
      ground(990, 400, 290),
      block(370, 230, 430, 35),
      block(540, 440, 30, 120),
    ],
    pads: [{ x: 720, y: 554, w: 100 }],
    water: [{ x: 830, w: 160, y: 630 }],
  },
  {
    id: 10,
    name: 'The grand finale',
    subtitle: 'One last flag. Make it a good one.',
    tip: 'Use the middle island and spring pad. Time the last crossing.',
    par: 5,
    theme: 'alpine',
    start: { x: 135, y: 531 },
    cup: { x: 1150, y: 390 },
    terrain: [
      ground(0, 540, 310),
      ground(465, 500, 300),
      ground(1010, 390, 270),
      { x: 580, y: 360, w: 110, h: 22 },
    ],
    pads: [{ x: 665, y: 494, w: 90 }],
    water: [
      { x: 310, w: 155, y: 615 },
      { x: 765, w: 245, y: 615 },
    ],
    movers: [{ x: 875, y: 290, w: 30, h: 115, axis: 'y', travel: 90, period: 3.5 }],
  },
];
