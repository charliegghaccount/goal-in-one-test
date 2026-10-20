# Goal In One ⚽

A complete **football physics puzzle game** inspired by Phantasmagor's 2006 Flash game, made with TypeScript, HTML5 Canvas, Matter.js, and Vite. Launch a small black-and-white football across stepped terrain, walls, gaps, springs, and moving gates. Score through the open mouth of a visible soccer net before your kick budget runs out.

**Play:** https://charliegghaccount.github.io/goal-in-one-test/

The visual and mechanical specification is the user-supplied corrective PDF. Read [the reference audit and design decisions](docs/DESIGN.md) for source provenance, blocked original screenshots, and the first-level visual baseline. These are newly designed levels, not a claim to reproduce the exact original level sequence.

## Run

Use **Node.js 24** (`.nvmrc`; Node 22.12+ supported).

```sh
npm ci
npm run dev
```

Open the address Vite prints. Default port: **5173**. In this cloud checkout, run from `/workspace/goal-in-one-test`. If a previously running Vite instance reports stale optimized dependencies after installation, restart it with `npm run dev -- --force`.

```sh
npm run build         # TypeScript check + production assets in dist/
npm run preview       # Serve the built game, port 4173
npm test              # Goal validity, all levels, budgets, physics, and saves
npm run test:browser  # Actual browser drag kicks, touch, camera, menus, failure, pause
npm run format:check  # Formatting
npm run solve -- 8    # Search legal kick routes using unchanged runtime physics
```

Browser tests use `/usr/bin/chromium` when available. Otherwise run `npx playwright install chromium` once (`--with-deps` on supported Linux systems if system libraries are missing). Browser tests start Vite automatically when needed. Play/build requires no browser download, backend, API key, external assets, or fonts.

## Play

1. Press the **football**, drag **backwards** to aim, then release to kick. Pull farther for power. The arrow and dots show your intended launch; collision/spring effects can change the flight.
2. Wait for movement **and spin** to settle before the next kick.
3. Enter the net through its **open left side**. The whole ball must cross the mouth within its frame. Touching the roof, backside, or a nearby area is insufficient.
4. **PAR is a hard kick limit.** The last legal kick can still score. If it stops without a goal, retry. Every attempt into water uses its kick; with kicks remaining, the ball returns to the previous kick's location.
5. Orange springs boost upward when hit from above. Striped gates move while you aim. All ten levels are open.

Each level displays maximum and remaining kicks plus its star targets. Best scores and mute preference save in this browser. Redesigned football levels use a separate save version; old scores from the previous implementation are not valid. If storage is disabled, play works but scores last only for the visit.

**Controls:** Mouse and touch drag share the same physics. **Precise aim** provides sliders and a kick button. With the canvas focused: **↑/↓** angle, **←/→** power, **Space** kick, **Escape** cancel, **A/D** pan, **P** pause, **R** retry, **L** levels. Direction 0° is right, 90° up, 180° left. Top-right pause freezes the ball and gates. Camera buttons pan, show the whole level, or resume following the ball. Aiming locks the camera.

## Ten levels

| #   | Level            | Kick limit | 3 stars / 2 stars | Challenge                                                  |
| --- | ---------------- | ---------- | ----------------- | ---------------------------------------------------------- |
| 1   | First touch      | 3          | ≤1 / ≤2           | Stepped approach to a raised net                           |
| 2   | Up for it        | 4          | ≤2 / ≤3           | A goal 235 units above the start platform                  |
| 3   | Wall play        | 4          | ≤1 / ≤2           | A tall wall and alternate stepping ledge                   |
| 4   | Mind the gap     | 4          | ≤2 / ≤3           | Water crossings and a safe island                          |
| 5   | On the rise      | 4          | ≤1 / ≤2           | A collision slope and raised finish                        |
| 6   | The right moment | 4          | ≤1 / ≤2           | A moving gate beneath a rail                               |
| 7   | Spring loaded    | 4          | ≤1 / ≤2           | A spring-assisted flight to a high net                     |
| 8   | The long game    | 5          | ≤2 / ≤3           | A 2,200-unit world, islands and camera scouting            |
| 9   | Thread the net   | 4          | ≤1 / ≤2           | A narrow 74-unit mouth with colliding frame                |
| 10  | Top corner       | 5          | ≤2 / ≤3           | Wall, spring, high shelf, moving gate, and elevated finish |

One star is earned by scoring within the remaining legal budget. Every three-star target has an input-only solution using the same simulation as the game; see `tests/solutions.ts`. The browser suite executes actual pointer drags for all ten. It uses a controlled animation clock for repeatable moving-gate phases, plus separate real-time mouse and portrait-touch goal checks. Test counts alone do not establish the intended visual identity; see the screenshot evidence and validation report.

## Architecture

- `src/levels.ts` — terrain, goal/frame coordinates, width, hazards, movers, and scoring thresholds.
- `src/simulation.ts` — Matter.js at 120 Hz; rest detection, kick budget, plane crossing, frame collisions, capture, and recovery.
- `src/render.ts` — football panels, mesh/frame, bright layered landscapes, particles, flight guides, responsive smooth camera, shared input transform.
- `src/main.ts` — menus, pointer/keyboard input, pause, success/failure, HUD, modal focus, and progression.
- `src/progress.ts` — versioned, validated, failure-tolerant storage and best scores.
- `src/audio.ts` — interaction-unlocked kick, collision, post, spring, net, success, and failure tones.
- `tests/` — goal counterexamples, legal route regressions, scoring/save tests, and Chromium input tests.
- `docs/evidence/` — actual browser screenshots, including the first visual baseline and each scored level.

No application physics or state setters are exposed to browser tests. The Canvas has read-only rendering diagnostics for verifying camera position and locating the rendered ball; tests still press, drag, and release through browser input.

## Publish / update GitHub Pages

Source is on **main**; static hosting uses **gh-pages**. To publish a tested update:

```sh
npm ci
npm run deploy:pages
```

This builds with `/goal-in-one-test/` asset paths and fast-forward-pushes only `dist/`, preserving the source checkout and user changes. It uses existing Git authentication. It does not upload credentials. `node scripts/publish-pages.mjs --dry-run` checks the push without publishing after `npm run build:pages`.

Pages is already configured for this repository. For a fresh repository, enable **Settings → Pages → Deploy from a branch → gh-pages → / (root) → Save**. GitHub Pages is free for public repositories. For other static hosts, upload `dist/` from the normal build (or use `npm run build -- --base=./` for relative paths).

Validated on Linux Chromium; Safari, Firefox, and physical phones are unverified. All artwork is original Canvas/SVG; synthesized audio needs no media files. Matter.js is © Liam Brummitt, MIT licensed (license included with the installed package).
