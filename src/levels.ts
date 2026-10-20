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
export type Goal = { x: number; y: number; w: number; h: number };
export type Level = {
  id: number;
  name: string;
  subtitle: string;
  tip: string;
  par: number;
  starShots: [number, number];
  start: Point;
  goal: Goal;
  terrain: Terrain[];
  width: number;
  theme: 'day' | 'sunset' | 'coast';
  water?: { x: number; w: number; y: number }[];
  pads?: { x: number; y: number; w: number; boost?: number }[];
  movers?: Mover[];
};
export const ground = (x: number, y: number, w: number): Terrain => ({ x, y, w, h: 760 - y });
export const block = (x: number, y: number, w: number, h: number): Terrain => ({
  x,
  y,
  w,
  h,
  kind: 'stone',
});
export const levels: Level[] = [
  {
    id: 1,
    name: 'First touch',
    subtitle: 'A ball. A net. A little imagination.',
    tip: 'Pull back from the football, then release. Enter the open left side of the net.',
    par: 3,
    starShots: [1, 2],
    width: 1280,
    theme: 'day',
    start: { x: 170, y: 558 },
    goal: { x: 1040, y: 450, w: 125, h: 130 },
    terrain: [
      ground(0, 570, 430),
      ground(430, 540, 260),
      ground(690, 500, 210),
      ground(900, 450, 380),
    ],
  },
  {
    id: 2,
    name: 'Up for it',
    subtitle: 'The goal is up there. Your next move is yours.',
    tip: 'Lift the ball onto the high terrace. The goal mouth is on the left.',
    par: 4,
    starShots: [2, 3],
    width: 1280,
    theme: 'day',
    start: { x: 150, y: 588 },
    goal: { x: 1030, y: 365, w: 130, h: 130 },
    terrain: [
      ground(0, 600, 400),
      ground(400, 540, 220),
      ground(620, 465, 205),
      ground(825, 365, 455),
    ],
  },
  {
    id: 3,
    name: 'Wall play',
    subtitle: 'Some problems are best solved from above.',
    tip: 'Clear the wall, or land on the stepping ledge before your next kick.',
    par: 4,
    starShots: [1, 2],
    width: 1280,
    theme: 'day',
    start: { x: 145, y: 558 },
    goal: { x: 1050, y: 570, w: 130, h: 130 },
    terrain: [ground(0, 570, 1280), block(585, 345, 38, 225), { x: 350, y: 445, w: 125, h: 22 }],
  },
  {
    id: 4,
    name: 'Mind the gap',
    subtitle: 'One small island. A world of possibilities.',
    tip: 'The middle island is safe. Each splash uses your attempted kick.',
    par: 4,
    starShots: [2, 3],
    width: 1280,
    theme: 'coast',
    start: { x: 150, y: 528 },
    goal: { x: 1090, y: 480, w: 125, h: 125 },
    terrain: [ground(0, 540, 390), ground(550, 500, 155), ground(945, 480, 335)],
    water: [
      { x: 390, w: 160, y: 630 },
      { x: 705, w: 240, y: 630 },
    ],
  },
  {
    id: 5,
    name: 'On the rise',
    subtitle: 'Find a new angle on the way to the top.',
    tip: 'Use the incline to redirect a low kick, or loft a shot onto the goal platform.',
    par: 4,
    starShots: [1, 2],
    width: 1280,
    theme: 'day',
    start: { x: 160, y: 578 },
    goal: { x: 1040, y: 460, w: 130, h: 130 },
    terrain: [
      ground(0, 590, 340),
      ground(340, 645, 510),
      { x: 355, y: 560, w: 355, h: 30, angle: -0.3 },
      ground(850, 460, 430),
    ],
  },
  {
    id: 6,
    name: 'The right moment',
    subtitle: 'Timing is part of the beautiful game.',
    tip: 'Watch the striped gate. It moves while you line up your kick.',
    par: 4,
    starShots: [1, 2],
    width: 1280,
    theme: 'sunset',
    start: { x: 150, y: 558 },
    goal: { x: 1050, y: 500, w: 130, h: 125 },
    terrain: [ground(0, 570, 850), ground(850, 500, 430), block(545, 195, 180, 20)],
    movers: [{ x: 635, y: 370, w: 30, h: 170, axis: 'y', travel: 110, period: 3.6 }],
  },
  {
    id: 7,
    name: 'Spring loaded',
    subtitle: 'A little bounce. A spectacular finish.',
    tip: 'Hit the orange spring from above to launch toward the high net.',
    par: 4,
    starShots: [1, 2],
    width: 1280,
    theme: 'sunset',
    start: { x: 150, y: 588 },
    goal: { x: 1050, y: 295, w: 130, h: 125 },
    terrain: [ground(0, 600, 480), ground(500, 570, 300), ground(960, 295, 320)],
    pads: [{ x: 650, y: 564, w: 130, boost: 18.6 }],
    water: [
      { x: 480, w: 20, y: 645 },
      { x: 800, w: 160, y: 645 },
    ],
  },
  {
    id: 8,
    name: 'The long game',
    subtitle: 'Think beyond the edge of the screen.',
    tip: 'Pan or use full-level view to plan. The camera follows each kick across the islands.',
    par: 5,
    starShots: [2, 3],
    width: 2200,
    theme: 'coast',
    start: { x: 150, y: 558 },
    goal: { x: 2020, y: 400, w: 130, h: 140 },
    terrain: [
      ground(0, 570, 520),
      ground(650, 510, 400),
      ground(1180, 550, 400),
      ground(1840, 400, 360),
      { x: 900, y: 355, w: 220, h: 22 },
      { x: 1250, y: 490, w: 280, h: 24, angle: -0.23 },
    ],
    water: [
      { x: 520, w: 130, y: 650 },
      { x: 1050, w: 130, y: 650 },
      { x: 1580, w: 260, y: 650 },
    ],
  },
  {
    id: 9,
    name: 'Thread the net',
    subtitle: 'Big ambition. A very small opening.',
    tip: 'The goal is lower than usual. Keep your final approach below its solid crossbar.',
    par: 4,
    starShots: [1, 2],
    width: 1280,
    theme: 'sunset',
    start: { x: 150, y: 568 },
    goal: { x: 1060, y: 430, w: 135, h: 74 },
    terrain: [
      ground(0, 580, 440),
      ground(440, 540, 260),
      ground(820, 430, 460),
      block(610, 420, 30, 120),
      { x: 710, y: 270, w: 200, h: 22 },
    ],
    water: [{ x: 700, w: 120, y: 640 }],
  },
  {
    id: 10,
    name: 'Top corner',
    subtitle: 'One last combination. Make it count.',
    tip: 'Clear the wall, use the spring island, then time the final crossing.',
    par: 5,
    starShots: [2, 3],
    width: 1650,
    theme: 'sunset',
    start: { x: 150, y: 588 },
    goal: { x: 1450, y: 340, w: 130, h: 110 },
    terrain: [
      ground(0, 600, 365),
      ground(500, 520, 360),
      ground(1260, 340, 390),
      block(370, 410, 35, 190),
      { x: 930, y: 230, w: 140, h: 24 },
    ],
    pads: [{ x: 730, y: 514, w: 120, boost: 17 }],
    movers: [{ x: 1080, y: 320, w: 30, h: 130, axis: 'y', travel: 100, period: 4.4 }],
    water: [
      { x: 365, w: 135, y: 650 },
      { x: 860, w: 400, y: 650 },
    ],
  },
];
