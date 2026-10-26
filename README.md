# Goal In One ⚽ — Park & Treeline

A browser-based football physics puzzler using TypeScript, Canvas, Matter.js and Vite. Forty enclosed park arenas: the existing twenty layouts plus twenty experimental puzzles introducing six mechanics. Rebound off solid walls, ceilings, ramps and obstacles, then enter the football goal through its opening.

The current expansion improves rolling, spin, consecutive kicks and continuous boosts, then adds springs, wind, breakable wood, switches/doors, rotating obstacles and slippery surfaces. See [physics, mechanics, tuning and QA](docs/EXPANSION.md) and the [new-level contact sheet](docs/expansion-evidence/levels-21-40.jpg). Park & Treeline artwork is retained.

**Play:** https://charliegghaccount.github.io/goal-in-one-test/

**Current rules:** unlimited kicks, including mid-flight. Kicks retain controlled momentum and meaningfully redirect the ball, even against its previous movement. Par affects stars only; it never ends a level or disables another kick. These rules supersede the original Flash game's shot limit and the previous remake's rest requirement.

See [design and reference notes](docs/DESIGN.md), [validation evidence](docs/VALIDATION.md), and [current arena screenshots](docs/grass-evidence/). The older `docs/evidence/` directory records the superseded October 20 build.

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
- Keep kicking while rolling, bouncing, falling, or travelling quickly. Kicks retain a configurable share of velocity, apply directional authority and bound/damp spin. A six-unit dead zone, Escape, touch cancellation, or loss of pointer capture cancels the drag.
- Arrow and trajectory dots use the current velocity plus the pending kick. Collision surfaces can change the predicted flight.
- Enter the open mouth of the goal on the right-hand arena boundary. The whole ball must cross the goal plane inside the mouth; post/backside contact alone does not score.
- **There is no maximum shot count and no over-par failure.** Par is the three-star target; the level data also specifies the two-star threshold. Complete with more shots for one star, even after 20 or 100 kicks.
- The green surfaces accelerates/throws right; the orange surfaces throws left. Arrow marks show the direction. These automatic contacts do not count as extra player kicks.
- Red strips in Level 10 and later challenges instantly restores the original ball start and zeroes its motion. It preserves every kick already taken and adds no free or penalty shot.
- Retry resets the level, moving-block phase, position, count and effects. Pause/help freeze physics.
- The complete arena remains visible in a **fixed, uniformly scaled view**. Resizing never changes physics coordinates. There is no scrolling camera or accidental panning while aiming.

**Precise aim** offers sliders and a kick button usable while moving. Keyboard when the canvas is focused: ↑/↓ angle, ←/→ power, Space kick, R retry, P pause, L levels, Escape cancel. Every essential action also has a mouse/touch control. Landscape and portrait layouts are supported; physical iPhones are unverified.

Best scores and mute preference save locally. The redesigned arenas use the `goal-in-one:grass:v5` namespace, so scores from old geometry are not presented as new-arena records. Old save keys remain intact and their sound preference is reused. If storage is blocked, play continues with session-only scores.

## Levels and content

Levels 1–10 restore the latest attached original sketches: enclosed chamfered/peaked arenas, solid ramps, supported platform, directional strips, opposing triangles, moving block and red reset. Goals form the right boundary and extend into a physical net.

Levels 11–20 add Stair Play, Twin Peaks, Under and Over, Green Runway, Against the Grain, Safe Crossing, The Low Window, Moving Lane, Return Pass and One More Goal. `src/extra-layouts.ts` is the authored expansion content; `src/levels.ts` is the current registry and original trace. Save validation and browsing use this registry, with no ten-level limit.

Levels 21–40 introduce six reusable mechanics in learning groups, ending with Workshop and Grand Finale. Their authored content is in `src/expansion.ts`. Open `?dev=1`, then Settings → Developer Physics, to tune ten safe parameters, save/restore/import/export JSON, or jump directly to any level. Saved tuning affects later play; Reset Defaults and Save restore the shipped settings.

Stars use configurable per-level budgets; all later completions still earn one star. Original-layout scores are migrated from arenas:v3; replaced designer scores stay archived. Current evidence is in `docs/expansion-evidence/` and `docs/EXPANSION.md`.

## Publish

Source is on `main`; static hosting uses `gh-pages`.

```sh
npm ci
npm run deploy:pages
```

The deployment script builds with `/goal-in-one-test/` asset paths and fast-forward-pushes only `dist/`, preserving the source checkout. GitHub Pages is already configured. For a fresh repository choose **Settings → Pages → Deploy from a branch → gh-pages → / (root)**. No credentials belong in the static build.

Matter.js is © Liam Brummitt, MIT licensed. Artwork is Canvas/SVG and sound is synthesized after user interaction. Capacitor packaging is possible later; no native engine or platform-specific input dependency is introduced.
