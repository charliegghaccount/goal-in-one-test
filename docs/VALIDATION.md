# Designer levels — October 24 validation

This report supersedes the October 21 rough-layout report. Source: the newly supplied eleven-page PDF and structured JSON. See [DESIGN.md](DESIGN.md) for interpretation and every geometry adjustment. The previous `arena-evidence/` and `evidence/` folders describe older versions.

## Actual checks

- `npm test`: **50 runtime physics/storage checks passed**. These execute Matter.js, not static geometry inspection. All ten recorded input-only routes reach a goal within the current par. Tests also exercise 100 additive mid-flight kicks, over-par completion, both boost directions, every red surface retaining 21 shots, both goal directions, mover travel/contact, targeted arena-edge and exposed shelf-top impacts, all-level bank-shot containment stress, and local-storage behavior.
- `npm run test:browser`: **4 tests passed**, covering browser press/drag/release playthroughs, saved stars after reload, 21-shot completion, moving-ball second kick, instant restart, and a separate real-time landscape touch goal. All ten levels completed with three stars and all ten records survived reload. All-ten playthroughs use a controlled animation clock; touch uses real time. Browser tests do not set ball position, velocity or completion state.
- The first code-only routes failed browser testing in Levels 3, 7 and 9. They were replaced with actual input-tested routes; Level 7's gate clearance and Level 9's red strip were tuned. A simulation solution alone was not accepted as browser evidence.
- Forgiveness sampling (`npx tsx tests/forgiveness.ts`): Level 1 completed 9/12 sampled nearby kicks, Level 2 completed 7/15 after lowering the wall (previously 2/15), and Level 5 completed 12/12 sampled leftward kicks. This is a limited sample, not proof of human difficulty.

## Recorded routes

Angles are degrees above right; 180° kicks left. Unless a delay is given, allow up to 12 seconds of flight before the next kick. Routes are ordinary additive kicks from `tests/solutions.ts`. The same inputs are exercised through browser drags.

| Level                    | Route (angle / power %) | Follow-up delay | Par |
| ------------------------ | ----------------------- | --------------- | --- |
| 1 First Touch            | 0/70                    | —               | 1   |
| 2 The Loft               | 45/100                  | —               | 1   |
| 3 High Ground            | 65/100, 45/100          | 1 second        | 2   |
| 4 Fast Lane              | 0/40                    | —               | 2   |
| 5 Counterflow            | 180/50                  | —               | 2   |
| 6 Red Alert              | 35/100                  | —               | 2   |
| 7 The Window             | 55/80                   | —               | 2   |
| 8 Boost and Brake        | 65/100, 35/100          | 1 second        | 3   |
| 9 Red Light, Green Light | 150/85, 30/55           | 12 seconds      | 3   |
| 10 The Final Trick       | 65/100, 75/70           | 0.7 seconds     | 3   |

Par values retain allowance for recovery in later combinations; they are not hard limits. Level 10's route also passed simulation with ±40 ms follow-up variation and 10/12/14 initial settling steps. There are no cooldowns, stop requirements or maximum shots.

## Screenshots and visual review

Current evidence is in [designer-evidence](designer-evidence/): `level-1.png` through `level-10.png` show arena geometry; `goal-1.png` through `goal-10.png` show actual browser completions. `touch-goal.png` records the real-time landscape touchscreen run. All ten layout captures and ten browser completions were captured and confirmed. The side-by-side [Levels 1–5](designer-evidence/comparison-1-5.png) and [Levels 6–10](designer-evidence/comparison-6-10.png) sheets were opened and visually compared with the PDF drawings.

The source PDF is preserved at [levels-v2.pdf](specifications/levels-v2.pdf); the game imports the original structured specification from `src/blueprints.json`. Uniform mapping preserves rectangular boundaries and specified platform positions. Goals are physical directional nets rather than the PDF's labelled yellow markers. Documented differences: retained border thickness, smaller football, lower Level 2 wall, shorter Level 7 travel, narrower Level 9 red strip, and Level 10 goal resting on its deck.

`npm run build`, `npm run format:check` and `git diff --check` passed.

## Limits

No human playtesting, physical iPhone, Safari or Firefox testing is claimed. These are automated browser-input playthroughs. Subjective difficulty, long-term balance and all alternative solutions remain unverified; Levels 8–10 warrant human tuning, especially the final mid-flight approach. Original Flash references were previously inaccessible (HTTP 403); this revision follows the supplied PDF/JSON rather than claiming an exact original physics match. Finite stress tests cannot prove containment for every possible repeated impulse.

This revision was initially committed locally, then published to the existing GitHub Pages site at the user’s request. Play at https://charliegghaccount.github.io/goal-in-one-test/. For local development use `npm ci` then `npm run dev`, or build and run `npm run preview`.
