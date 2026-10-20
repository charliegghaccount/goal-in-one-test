# Goal In One ⛳

A complete, browser-based, side-view golf puzzle game. Ten handmade courses take you from open meadows to spring-pad jumps, island crossings, moving gates, and a highland finale. Built from scratch with TypeScript, HTML5 Canvas, Matter.js, and Vite. No external art, font, audio, API, or credential dependencies at runtime.

## Run

Use **Node.js 24** (see `.nvmrc`; Node 22.12+ is supported).

```sh
npm ci
npm run dev
```

Open the address Vite prints in your browser. The development server listens on all interfaces; its default port is **5173**. In the cloud checkout, run these commands from `/workspace/goal-in-one-test`.

```sh
npm run build       # TypeScript checks and production build → dist/
npm run preview     # Serve the production build, default port 4173
npm test            # Physics, course completion, hazards, and persistence tests
npm run test:browser # Chromium end-to-end tests
```

Browser tests use `/usr/bin/chromium` if present. Otherwise install Playwright's browser once with `npx playwright install chromium` (or `npx playwright install --with-deps chromium` on a supported Linux system). Browser tests start Vite automatically if it is not already running. Browser downloads are not needed to play or build the game.

For static hosting, upload the contents of `dist/` to any static web host. No backend is needed. Vite's default build targets the host root; use `npm run build -- --base=./` for a relative asset base when deploying under a subdirectory.

## Play

- Click or touch the **ball**, drag **backwards**, then release. Pull farther for more power. Dots show your initial flight path; obstacles and spring pads can change it.
- Wait for the ball to stop before shooting again. The cup has a real opening: the ball must fall into it.
- Water returns the ball to where you took your last shot. The attempted stroke still counts; there is no additional stroke penalty.
- Coral pads give an upward boost. Striped gates move continuously, so watch your timing.
- Complete at or below par for **3 stars**, within two over par for **2 stars**, or finish with **1 star**. All courses are open from the start.
- Your best score per course and sound preference are saved locally in this browser. Clearing site data resets them. Play remains available when storage is disabled, but progress will not persist.

**Precise aim** offers direction and power sliders with a shot button, useful on small screens or without dragging. Direction 0° is right, 90° is up, and 180° is left.

With the course canvas focused, **↑ / ↓** adjust angle, **← / →** adjust power, **Space** shoots, **R** restarts, **L** opens the courses, and **Escape** cancels aiming. Tab reaches all menu and control buttons. Sound begins only after a user interaction and can be muted in the header. Reduced-motion preferences disable decorative animation.

## Courses

| #   | Course              | Par | Main challenge                                       |
| --- | ------------------- | --- | ---------------------------------------------------- |
| 1   | The first swing     | 2   | Power and putting on an open green                   |
| 2   | A little elevation  | 3   | A slope and raised green                             |
| 3   | Mind the gap        | 2   | Clear the pond                                       |
| 4   | Over & under        | 3   | A wall and an alternate stepping platform            |
| 5   | Spring in your step | 3   | A spring pad and elevated finish                     |
| 6   | Perfect timing      | 3   | A moving gate                                        |
| 7   | Island hopping      | 4   | Two water crossings and a safe central island        |
| 8   | The scenic route    | 4   | Ramps, a high shelf, and a raised finish             |
| 9   | Between a rock…     | 4   | A low ceiling, barrier, and spring-assisted crossing |
| 10  | The grand finale    | 5   | Islands, a spring, a raised cup, and a moving gate   |

Every course has a checked legal route into the physical cup. A skilled shot can finish each in one; you can also take intermediate landing shots. The two moving-gate courses require timing. `npm run solve -- 5` searches coarse one-shot routes for a chosen course from its initial obstacle phase; `npm run solve` checks all ten. These routes are also retained in regression tests.

## Architecture

- `src/levels.ts` — declarative course geometry, par, hazards, platforms, and moving-obstacle paths.
- `src/simulation.ts` — headless Matter.js simulation, fixed 120 Hz stepping, shot rules, collision events, physical cup pockets, and recovery. Shared by the game and tests.
- `src/render.ts` — responsive, high-DPI Canvas rendering. Code-drawn landscapes, flags, dimples, terrain, flight dots, water, and particles; no downloaded assets.
- `src/main.ts` — menus, Pointer Events, keyboard and precise controls, frame loop, modal focus, progression, and UI.
- `src/audio.ts` — short synthesized Web Audio effects, activated by user gesture.
- `src/progress.ts` — versioned, validated, failure-tolerant local storage.
- `src/style.css` — responsive clubhouse-style interface and reduced-motion treatment.
- `tests/` — simulation/storage regressions, a course solver, and Playwright browser tests.

All courses fit a single desktop viewport, so a scrolling camera is unnecessary. Resizing preserves world coordinates and pointer accuracy. Live processes must be started again in a new cloud task; dependencies and the production build are retained on disk.

## Validation and limits

Automated checks cover all ten physical cup completions, shot capping, repeat shots, water recovery, springs, moving geometry, star ratings, and corrupted/unavailable storage. Browser tests cover navigation through all ten courses, pointer shooting, aiming controls, keyboard controls, help focus, sound preference, completion, persistence after reload, touch cancellation, and responsive layout. A full browser run also completes all ten courses with a controlled animation clock so gate timing is reproducible.

Validated in headless Chromium on Linux. Firefox, Safari, physical phones, subjective audio quality, and deployment to a public host have not been verified. There are no ads, analytics, multiplayer, accounts, or cloud saves.

Matter.js is © Liam Brummitt, MIT licensed; its license is distributed with the installed package. All game artwork is drawn with Canvas or inline SVG, and all effects are synthesized in-browser.
