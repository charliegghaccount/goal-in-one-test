# Goal In One ⚽ — enclosed arena edition

A browser-based football physics puzzler using TypeScript, Canvas, Matter.js and Vite. The ten arenas use the latest designer-authored **First Ten Level Blueprints JSON and Designs PDF**. Rebound off solid walls, ceilings, ramps and obstacles, then enter the football goal through its opening.

**This revision is local only.** The existing public Pages site still serves the previous version; this update has not been pushed or deployed.

**Current rules:** unlimited kicks, including mid-flight. A kick adds to the ball's existing momentum. Par affects stars only; it never ends a level or disables another kick. These rules supersede the original Flash game's shot limit and the previous remake's rest requirement.

See [design and reference notes](docs/DESIGN.md), [validation evidence](docs/VALIDATION.md), and [current arena screenshots](docs/designer-evidence/). The older `docs/evidence/` directory records the superseded October 20 build.

## Run and develop

Use Node.js 24 (`.nvmrc`; Node 22.12+ supported).

```sh
npm ci
npm run dev
```

Open the address Vite prints (port 5173). In the cloud checkout run from `/workspace/goal-in-one-test`. If an old running server reports “Outdated Optimize Dep” after installation, restart with `npm run dev -- --force`.

```sh
npm run build          # TypeScript + production build in dist/
npm run preview        # Serve production output on port 4173
npm test               # Physics, enclosure, all ten routes, surfaces, saves
npm run test:browser   # Actual mouse/touch kicks, layout evidence, all ten goals
npm run format:check
npm run solve -- 6     # Search input-only routes with unchanged runtime physics
```

Playwright uses `/usr/bin/chromium` when available; otherwise run `npx playwright install chromium` once (add `--with-deps` on supported Linux if needed). Playing/building requires no backend, secret, external graphics, font, or API.

## Controls and rules

- **Drag anywhere in the arena**, then release to kick. Longer pull adds a stronger impulse. You can begin a drag away from a fast-moving ball; the guide follows the ball while the drag vector stays anchored to your finger/mouse gesture.
- Keep kicking while rolling, bouncing, falling, or travelling quickly. Kicks add velocity and spin; they do not zero existing momentum. A six-unit dead zone, Escape, touch cancellation, or loss of pointer capture cancels the drag.
- Arrow and trajectory dots use the current velocity plus the pending kick. Collision surfaces can change the predicted flight.
- Enter the open mouth of the goal (from the right in reversed Level 5). The whole ball must cross the goal plane inside the mouth; post/backside contact alone does not score.
- **There is no maximum shot count and no over-par failure.** Par is the three-star target; the level data also specifies the two-star threshold. Complete with more shots for one star, even after 20 or 100 kicks.
- The green surfaces accelerates/throws right; the orange surfaces throws left. Arrow marks show the direction. These automatic contacts do not count as extra player kicks.
- The red strips in Levels 6, 9 and 10 instantly restores the original ball start and zeroes its motion. It preserves every kick already taken and adds no free or penalty shot.
- Retry resets the level, moving-block phase, position, count and effects. Pause/help freeze physics.
- The complete arena remains visible in a **fixed, uniformly scaled view**. Resizing never changes physics coordinates. There is no scrolling camera or accidental panning while aiming.

**Precise aim** offers sliders and a kick button usable while moving. Keyboard when the canvas is focused: ↑/↓ angle, ←/→ power, Space kick, R retry, P pause, L levels, Escape cancel. Every essential action also has a mouse/touch control. Landscape and portrait layouts are supported; physical iPhones are unverified.

Best scores and mute preference save locally. The redesigned arenas use the `goal-in-one:designer:v4` namespace, so scores from old geometry are not presented as new-arena records. Old save keys remain intact and their sound preference is reused. If storage is blocked, play continues with session-only scores.

## Current levels

First Touch; The Loft; High Ground; Fast Lane; Counterflow (leftward goal); Red Alert; The Window; Boost and Brake; Red Light, Green Light; The Final Trick.

The designer JSON lives in `src/blueprints.json`. The PDF, mapping, adjustments and gameplay evidence are documented in `docs/DESIGN.md` and `docs/VALIDATION.md`. Runtime geometry is produced by `src/levels.ts`. Rendering and collision use the same walls/polygons; the full enclosed arena stays visible, including raised goals.

## Publish

Source is on `main`; static hosting uses `gh-pages`.

```sh
npm ci
npm run deploy:pages
```

The deployment script builds with `/goal-in-one-test/` asset paths and fast-forward-pushes only `dist/`, preserving the source checkout. GitHub Pages is already configured. For a fresh repository choose **Settings → Pages → Deploy from a branch → gh-pages → / (root)**. No credentials belong in the static build.

Matter.js is © Liam Brummitt, MIT licensed. Artwork is Canvas/SVG and sound is synthesized after user interaction. Capacitor packaging is possible later; no native engine or platform-specific input dependency is introduced.
