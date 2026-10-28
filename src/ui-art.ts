import { wood } from './art';
import { woodImage } from './wood-material';
import { drawGoalFrame, drawGoalNet } from './goal-art';
const football = new Image();
football.src = new URL('./assets/football.svg', import.meta.url).href;
/** Decorative scene built from the real game materials. No simulation or level data is involved. */
export function menuArtwork(canvas: HTMLCanvasElement) {
  canvas.width = 1600;
  canvas.height = 900;
  const paint = () => {
    if (!canvas.isConnected) return;
    const c = canvas.getContext('2d')!;
    c.clearRect(0, 0, 1600, 900);
    wood(
      c,
      [
        { x: -30, y: 510 },
        { x: 250, y: 510 },
        { x: 250, y: 595 },
        { x: -30, y: 595 },
      ],
      true,
      0,
      true,
    );
    wood(
      c,
      [
        { x: 240, y: 550 },
        { x: 430, y: 655 },
        { x: 412, y: 691 },
        { x: 222, y: 586 },
      ],
      true,
      Math.atan2(105, 190),
    );
    wood(
      c,
      [
        { x: -30, y: 690 },
        { x: 430, y: 690 },
        { x: 430, y: 785 },
        { x: -30, y: 785 },
      ],
      true,
      0,
      true,
    );
    wood(
      c,
      [
        { x: 1260, y: 700 },
        { x: 1630, y: 700 },
        { x: 1630, y: 800 },
        { x: 1260, y: 800 },
      ],
      true,
      0,
      true,
    );
    const goal = { x: 1320, y: 697, w: 220, h: 165, roof: 125 };
    drawGoalNet(c, goal, -1, true);
    drawGoalFrame(c, goal, 14);
    if (football.complete && football.naturalWidth) c.drawImage(football, 125, 435, 75, 75);
  };
  paint();
  void Promise.allSettled([woodImage?.decode(), football.decode()]).then(paint);
}
