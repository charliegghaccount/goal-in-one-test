# PDF arena redesign — validation evidence

Validated in Linux Chromium on **21 October 2026**. The current ten levels follow all ten pages of the user's **Goal In One Levels 1–10 Designs PDF.pdf**. These results supersede the historical open-platform/budget evidence in `docs/evidence/`.

## Executed checks

- **59 headless physics/storage tests passed** (`npm test`), using the actual runtime Matter.js simulation.
- **10 Chromium browser tests passed** (`npm run test:browser`). After removing a redundant in-arena hint and correcting static control/metadata copy, the screenshot check was rerun to refresh all ten arena captures. No physics changed after the complete suite.
- **All ten levels completed through actual browser mouse press → drag → release input**, earning three stars and persisting 30 stars after reload. The browser tests never assign ball position, velocity, shot count or success state.
- The reproducible all-ten playthrough uses Playwright's animation clock, including moving-obstacle timing. Separate real-time mouse and touch runs exercised kicks while moving, pointer cancellation and a landscape goal without a controlled clock.
- A second drag was started during flight; the ball continued moving while aiming, and releasing added horizontal velocity to the existing momentum. Precise controls stayed enabled. The simulation also checks the exact additive impulse.
- **20 browser kicks followed by a 21st-kick goal** completed normally with one star. The simulation accepts 100 consecutive kicks, checks enclosure at the resulting high speeds and confirms an over-par completion. There is no shot-limit failure state.
- Browser contact checks confirmed positive/rightward velocity from the green surface and negative/leftward velocity from orange. Boosts spend no shots.
- Browser red-pad contact returned the ball to its original start without changing the shot count, and the next kick completed Level 10. A headless regression checks the reset after 21 shots and accepts shot 22.
- Every reachable wall/ceiling/floor/goal-boundary segment, every exposed obstacle face and reachable welded boundary joint was hit in targeted simulation tests. Full-ball containment checks and bank-shot stress runs found no escape in all ten arenas. Solid obstacle interiors were checked. Browser-input bank-shot stress also covered all ten.
- Level 9's mover was tested for vertical travel, contacts and retry reset. Separate roof/floor crushing regressions verify that a trapped ball blocks the mover rather than being forced outside. The source rectangle and travel range are preserved.
- Goal counterexamples cover roof/post/backside impacts, proximity, a ball starting inside the net and invalid crossings. Only a valid whole-ball crossing through the open mouth triggers net capture and completion.
- Pause, resume, keyboard/precise controls, sound preference, blocked local storage, help focus, reload persistence and pointer cancellation passed. Portrait and short landscape viewports keep the complete fixed arena fitted without horizontal page overflow.

## Confirmed browser-drag completions and geometry comparison

All ten full-size arena screenshots and all ten side-by-side comparison panels were opened and visually inspected against the corresponding PDF page. The comparison sheets retain the PDF drawing alongside the rendered game, using a common source crop; they are review evidence, not runtime assets.

| Level | Layout confirmed against drawing                                  | Kicks | Stars | Arena / PDF comparison                      | Actual browser goal                  |
| ----- | ----------------------------------------------------------------- | ----- | ----- | ------------------------------------------- | ------------------------------------ |
| 01    | Enclosed rectangle, angled upper corners                          | 1     | 3     | [Compare](arena-evidence/comparison-01.png) | [Scored](arena-evidence/goal-01.png) |
| 02    | Tall peak and solid rising floor triangle                         | 1     | 3     | [Compare](arena-evidence/comparison-02.png) | [Scored](arena-evidence/goal-02.png) |
| 03    | Tall peak and reversed floor triangle                             | 1     | 3     | [Compare](arena-evidence/comparison-03.png) | [Scored](arena-evidence/goal-03.png) |
| 04    | Stepped/sloping roof and supported flat/downhill structure        | 1     | 3     | [Compare](arena-evidence/comparison-04.png) | [Scored](arena-evidence/goal-04.png) |
| 05    | Enclosed arena and green forward strip                            | 1     | 3     | [Compare](arena-evidence/comparison-05.png) | [Scored](arena-evidence/goal-05.png) |
| 06    | Enclosed arena and orange backward strip                          | 2     | 3     | [Compare](arena-evidence/comparison-06.png) | [Scored](arena-evidence/goal-06.png) |
| 07    | Low roof, opposing floor triangles with high ends inward          | 1     | 3     | [Compare](arena-evidence/comparison-07.png) | [Scored](arena-evidence/goal-07.png) |
| 08    | Plateau peak, substantial roof/floor triangles and narrow passage | 1     | 3     | [Compare](arena-evidence/comparison-08.png) | [Scored](arena-evidence/goal-08.png) |
| 09    | Rectangular enclosure and vertically moving rectangle             | 1     | 3     | [Compare](arena-evidence/comparison-09.png) | [Scored](arena-evidence/goal-09.png) |
| 10    | Enclosed arena and red reset strip                                | 1     | 3     | [Compare](arena-evidence/comparison-10.png) | [Scored](arena-evidence/goal-10.png) |

Combined visual reviews: [Levels 1–5](arena-evidence/comparisons-01-05.png) and [Levels 6–10](arena-evidence/comparisons-06-10.png). Full UI captures are `arena-evidence/level-01.png` through `level-10.png`; canvas-only captures are `arena-01.png` through `arena-10.png`.

The trace preserves the source contours, obstacle positions and proportions. Small overlapping/open stroke joins are welded, triangle bases meet the floor, and Level 4's closed supported structure is filled. The football is smaller than the diagrams' pasted illustration. These deliberate interpretations and shared rendering/collision geometry are described in [DESIGN.md](DESIGN.md).

Additional actual browser evidence: [mid-flight aim](arena-evidence/mid-flight-aim.png), [21-kick completion](arena-evidence/21-kicks-completed.png), [forward boost](arena-evidence/boost-5.png), [backward boost](arena-evidence/boost-6.png), [red-pad reset](arena-evidence/red-pad-reset.png), [landscape touch](arena-evidence/landscape-touch.png), [portrait fit](arena-evidence/portrait-arena.png) and [landscape fit](arena-evidence/landscape-arena.png).

## Build and publication checks

- `npm run build:pages`: passed TypeScript and Vite production build with the `/goal-in-one-test/` asset base.
- `npm run format:check` and `git diff --check`: passed formatting and whitespace checks.
- Production-path smoke: passed under the exact Pages subpath. HTTP 200, all assets loaded, and a real-time mouse drag completed Level 1 in one kick with three stars. No page errors or failed requests. [Production goal screenshot](arena-evidence/production-pages-goal.png). GitHub deployment status is reported separately in the final delivery.

## Remaining limits

Both requested original-game sites returned HTTP 403, so the original Flash presentation, controls and exact physics could not be directly inspected. Geometry was compared against the supplied PDF; no claim of an exact original-game physics match is made.

These are automated browser-input playthroughs, not human playtesting. Subjective feel/difficulty, audio quality, Safari, Firefox and physical iPhone/Android devices remain unverified. Touch evidence uses Chromium emulation. Finite collision stress tests cannot mathematically prove containment for arbitrary repeated impulses, although adaptive substeps and shared solid boundaries cover the tested fast shots without an invisible cage or position clamp. Public Pages access is restricted from this environment; GitHub deployment status and local production-path validation are reported separately.
