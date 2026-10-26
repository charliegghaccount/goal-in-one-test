# VNext: authored Levels 41–60 and scrolling worlds

The user's supplied ZIP is the design authority for this release. Its handoff, complete JSON and all 33 illustrated PDF pages were read/reviewed. The unchanged source specifications are retained in [specifications/vnext](specifications/vnext/). The canonical coordinates generate `src/data/vnext.ts`; the runtime appends them through `src/vnext.ts`. `design` routes are documentation, never rendered as colliders or assumed to be valid trajectories.

Levels 1–40 retain every level definition, starting position, goal, obstacle, pad, moving path, mechanic and star budget. A pre-change [serialized baseline](vnext-evidence/baseline-levels-1-40.json) and equality regression enforce this. The existing physics defaults, unlimited mid-flight kicks, local save key (`goal-in-one:grass:v5`), menus, precise aim, restart and developer tuning remain. No dependencies, worlds or monetization systems were added.

## Play

[Open the game](https://charliegghaccount.github.io/goal-in-one-test/?v=levels60), choose **Level Select**, then **More Arenas** twice for 41–60. Every level is open. Drag backwards anywhere and release; keep kicking during movement. Par only affects stars.

For a local build:

```sh
npm ci
npm run dev
# Open http://localhost:5173
```

`npm run build:pages` produces the GitHub Pages subpath build. `npm run test:browser` uses Chromium; `npm test` runs the simulation, camera and persistence regressions. Developer physics are still available at `?dev=1` through Settings; Reset Defaults and Save restore the settings used in these playtests.

## Camera and mobile

- Levels 41–52 keep a fixed view of the full arena. The legacy camera rectangles for 1–40 are unchanged.
- Levels 53, 55–57, 59 and 60 track horizontally. Levels 54/58 track both axes through their elevated doorways. All scrolling views also protect an airborne football near a vertical screen edge.
- One reusable camera owns bounds, configurable zoom, dead zones, exponential damping, velocity look-ahead and invertible world/screen transforms. Tracking clamps to the arena's full bounding rectangle, including the net. No physics coordinates change on resize.
- Landscape viewports crop scrolling world height to use screen width; they never shrink a long course into a tiny overview. The tested phone sizes keep a football diameter of at least 20 CSS pixels. The new-level HUD sits outside the canvas, with safe-area padding and 44-pixel touch buttons. The landscape completion panel uses a compact layout so its celebration heading, stats and replay/next buttons remain visible together.
- A green arrow marks an off-screen goal. The map button pauses the simulation and deliberately shows a complete overview; return to play restores the tracked view. Map drags spend no kicks.
- A held drag uses CSS-pixel displacement at the gesture's starting scale. Camera movement cannot change its power; the aim guide stays with the moving ball.

Camera windows in the PDF are example regions. They are preserved as metadata, not implemented as forced jumps between rooms. View height adapts to screen aspect ratio rather than leaving large side margins on landscape phones.

## Changes to the designs

Only these coordinates/fields differ from the supplied layouts:

| Level | Change                                          | Measured reason                                                                                                                                                              |
| ----- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 45    | High bridge's right edge: x=765 → 720           | The original 15-unit gap to the x=780 wall trapped a 32-unit ball on the upper route. The 60-unit gap allows a real high-route exit.                                         |
| 52    | Return wedge's top vertex: y=488 → 510          | Its original 28-unit gap beneath the y=460 ceiling sealed the only exit. Lowering the peak permits a physical bank/roll through the finishing corridor.                      |
| 57    | Wind height: 355 → 380, same x/y/width/strength | The field ended 25 units above the floor, missing a rolling ball's center and allowing a completely unaffected ground roll. It now reaches the floor and affects that route. |

No start, goal, outer silhouette, gate, switch, rotor, force, timing, par or star threshold was otherwise changed. Provisional budgets remain achievable: all measured routes below earn three stars. Several courses support one-shot solutions below the suggested par; that is retained as an efficiency reward rather than arbitrarily weakening the ball or adding shot restrictions.

Authored doors deliberately overlap partitions and seat into the floor by up to one timber thickness. They retract into the solid partition, with at least 70 units of floor passage when fully open. The existing anti-crush pause remains. Tests verify each mandatory door blocks passage with its switch disabled; opening a door has a real physical purpose.

## Per-level gameplay validation

These are reproducible kicks in the actual Matter.js runtime and browser mouse-drag playthroughs. **No completion uses a teleported ball, assigned velocity, forced switch state or injected win.** Collision-only fixtures separately position test balls near individual walls/closed doors; those fixtures are not counted as playthroughs.

Angles are degrees upwards from right; power is percent. For multi-kick primary routes, each preceding flight is allowed 12 seconds to settle before the next input. The game never requires waiting: further mid-air kicks remain possible. The recorded route is a completion proof, not a claim to optimal human play.

| Level                    | Puzzle demonstrated                                 | Verified route                | Shots / par |
| ------------------------ | --------------------------------------------------- | ----------------------------- | ----------- |
| 41 Roof Ricochet         | Ceiling bank, block and angled backboard            | 66° / 94%                     | 1 / 1       |
| 42 Window of Opportunity | Pass the only window in a roof/floor divider        | 40° / 90%                     | 1 / 1       |
| 43 Unlock the Passage    | Hit the switch before crossing the sealed gate      | 0° / 70%                      | 1 / 2       |
| 44 Springboard           | Spring launch, hurdle and landing basin             | 0° / 90%                      | 1 / 1       |
| 45 Above or Below        | Actual upper-bridge route and exit clearance        | 60° / 100%                    | 1 / 1       |
| 46 Crosswind Slot        | Updraft, pier and controlled descent                | 25° / 70%                     | 1 / 2       |
| 47 Break or Bypass       | Break the wood shortcut                             | 5° / 90%                      | 1 / 1       |
| 48 Clockwork Gap         | Rotor collision redirects the football              | 50° / 90%                     | 1 / 1       |
| 49 Ice Corridor          | Low-friction runway and finishing rise              | 0° / 90%                      | 1 / 1       |
| 50 The Timed Door        | Timed switch and compulsory lower gate              | 0° / 60%                      | 1 / 2       |
| 51 High Switch           | Elevated target opens the sole ground passage       | 60° / 80%                     | 1 / 2       |
| 52 The Z-Corridor        | Above/below baffles, finishing wedge                | 70° / 100%; −20° / 60%        | 2 / 2       |
| 53 Longshot Relay        | Spring over the first wall, ramp to the net         | 0° / 80%                      | 1 / 2       |
| 54 Updraft Shaft         | Wind-assisted ascent, elevated window, goal chamber | 50° / 90%; 0° / 60%           | 2 / 3       |
| 55 Three Chambers        | Both required switches/gates in sequence            | 0° / 90%                      | 1 / 3       |
| 56 Hazard Overpass       | Spring and both bridges, no red reset               | 0° / 60%                      | 1 / 2       |
| 57 Wind and Workshop     | Measurable wind exposure plus required gate         | 0° / 70%                      | 1 / 3       |
| 58 Skybridge Return      | Spring, upper bridge, elevated passage and descent  | 0° / 60%; 15° / 80%; 0° / 80% | 3 / 3       |
| 59 Switchback Factory    | Both required gates and ice transition              | 0° / 90%                      | 1 / 3       |
| 60 The Grand Route       | Spring, wind, broken shortcut and required door     | 15° / 90%                     | 1 / 4       |

Additional browser completions cover the spring/rotor route on 53 (0°/60%, then after 0.7 seconds 10°/100%), an alternate upper-window route on 58, and a finishing-rotor route on 60 (15°/90%, then after 5.2 seconds 60°/80%, followed by a ground 0°/80% finish if the rotor stops the ball). The latter also uses the spring, wind, breakable and gate. Level 54's multi-shot window route was repeated in the alternate-route check.

Shortcuts were investigated. Floor shots fail on the central barriers/baffles; the full-height window dividers and compulsory gates have no usable over/under bypass. Optional manual airborne routes remain legitimate, as the supplied designs intend. In 55/59 a sufficiently strong rolling kick can activate both floor switches and traverse their opening gates continuously. The switches still matter physically: disable either and the partition blocks progress. Springs, wind and rotors need not be compulsory on every possible unlimited-kick route. They supply useful alternate trajectories; tests demonstrate actual interactions rather than assuming usefulness from their presence.

## Evidence and visual comparison

- [All 20 layouts](vnext-evidence/levels-41-60.jpg)
- [Larger compact-level sheet](vnext-evidence/levels-41-52.jpg) · [Larger scrolling-level sheet](vnext-evidence/levels-53-60.jpg)
- [PDF comparison 41–50](vnext-evidence/pdf-comparison-41-50.jpg) · [PDF comparison 51–60](vnext-evidence/pdf-comparison-51-60.jpg).
- Individual start, overview, physical goal-entry and completion screenshots: `docs/vnext-evidence/`.
- Scrolling review sheets: `camera-53.jpg` through `camera-60.jpg`, including full overview and actual tracked start/intermediate/goal views.
- [Measured runtime routes and mechanic contacts](vnext-evidence/runtime-routes.json) · [Browser results by level](vnext-evidence/browser-results.json).

Contact sheets trim only letterboxed margins; raw captures are retained. Rotor poses naturally vary as they animate; their centres, sizes, speeds and phases use the supplied JSON.

The captured silhouettes, roof steps, obstacle counts/positions, start/goal placement and mechanism layout were compared with all twenty PDF diagrams. They follow the authored structures; the three adjustments above are intentional. The existing Park/Treeline scenery, wood, training nets, football and menu identity remain. Scrolling overviews are a paused review aid; active gameplay uses the larger football and moving camera.

## Checks and limitations

The baseline before changes was **238 passing runtime tests**. The updated suite has **448 passing runtime tests**, covering all existing routes plus the new routes, exact first-forty equality, authored-data fidelity, exposed obstacle faces, every reachable boundary and seam, repeated high-speed bank shots, closed-door bypass attempts, open clearances, mechanism usage, camera transforms/zoom/bounds/visibility, saves for sixty levels and celebration dispatch/mute/non-overlap. Long-world collision checks use the same simulation and adaptive substeps as normal play.

The complete **15-test browser suite passed** in the final run, including the forty existing drag completions, twenty new drag completions, alternate routes, a real-time touch completion of the two-switch scrolling course, held-drag power while scrolling, map pause, instant restart/replay, camera visibility, stars, reload persistence, legacy controls and the developer panel. Full reproducible playthroughs use a controlled animation clock; separate touch checks use real time. No human playtesting or physical iPhone testing is claimed.

The TypeScript build, Pages subpath production build, formatting and whitespace checks pass. The production build was tested at `/goal-in-one-test/`: 60 cards, a real one-kick Level 60 goal, a visible mobile celebration, 10 developer sliders and 60 jump options, with no page errors or failed requests. An intentional real-input Level 56 red-pad mistake reset the ball and scrolling camera to the start while keeping its shot count at one. Public deployment status is recorded in the delivery message.

Remaining limitations:

- **Spoken voice recording is missing.** No suitable speech-generation tool or original recorded asset was available. One-shot visual celebration and the complete recorded-audio hook are implemented and tested, but the normal goal chime remains audible until a real asset is supplied. No robotic browser voice or copied Flash audio is used.
- Human difficulty balancing remains useful, especially for the more exploratory high-window courses. Provisional pars are not certified optimal scores. Alternate routes and low-shot shortcuts are intentional where they preserve the puzzle concept.
- Desktop Chromium and emulated landscape touch sizes were tested. Physical iPhone/Android hardware, Safari, Firefox, audio quality on device speakers and sustained mobile performance remain unverified.
- The dotted guide approximates the immediate ballistic kick; it does not forecast subsequent collisions, winds, springs or moving bodies.
- Finite collision stress tests are evidence, not a mathematical guarantee under arbitrary external impulses. Closing doors/rotors can pause to avoid crushing an obstructing football, retaining the existing safety behavior.

## Supplying the voice asset later

Put a licensed/original, enthusiastic 1–2 second “GOAL IN ONE!” recording at `public/audio/goal-in-one.mp3` (or another browser-decodable format), then set `oneShotVoiceFile` in `src/celebration.ts` to `'audio/goal-in-one.mp3'`. The URL respects the Pages base path. `Audio.unlock()` loads/decodes it after interaction; `celebrate(shots, roundSerial)` chooses the phrase only for exactly one kick. It deduplicates completion events, stops a prior announcement on another completion/restart/navigation/mute, and has a bounded `voiceVolume` gain. Two-or-more-kick wins use the regular jingle. Unit tests use a fake decoded buffer solely to verify the hook; no fake asset is shipped.
