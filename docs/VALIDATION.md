# Football remake — validation evidence

Validated in Linux Chromium on 20 October 2026. This is the corrected football/net/platform game described in the user's nine-page PDF. Reference provenance and the first-level baseline are recorded in [DESIGN.md](DESIGN.md).

## What was actually exercised

- **25 headless simulation/storage tests passed** using the runtime Matter.js simulation.
- **8 full-suite Chromium browser tests passed**; after adding short-landscape layout and initial storage detection, the three affected/new checks (identity/persistence, blocked storage/keyboard, landscape drag goal) also passed. That is **9 distinct browser checks**, with no remaining failed check.
- **All ten levels scored through actual browser mouse press → drag → release input**, within budget, earning three stars. Browser input never sets ball position, velocity, scores, or success state.
- Full ten-level runs used a controlled animation clock to reproduce moving-gate timing. Separate **real-time mouse** and **real-time portrait touch** runs scored level 1 without a mocked clock.
- Portrait touch cancellation spent no kick; the subsequent real touch drag scored. Landscape layout kept the full game surface visible and scored through drag input.
- The wide-level check used overview, pan, and follow controls, then kicked normally; after the long first flight the camera had moved more than 600 world units. Level 8 completed after two browser drags.
- Failure was exercised by using all three kicks without scoring. The last kick was allowed to finish, failure appeared, and retry reset shots and remaining budget.
- Pause froze a moving ball and gate simulation. Resume continued movement. Mid-flight kick controls were disabled.
- Saved scores survived reload, all ten completion marks persisted, and the browser displayed 30 stars. Old level scores are not migrated; the previous sound preference is.
- Goal counterexamples exercise roof/post and backside hits, nearby balls, starting inside the net, and invalid discontinuous crossings. None counts as a goal. A valid whole-ball mouth crossing scores even on the final legal kick.
- The finale route is checked across five initial settling durations and tiny pointer-coordinate variations. This was added after a headless route proved sensitive in browser input; the corrected route was then browser-drag verified.

## Confirmed browser-drag completions

These counts came from actual Chromium input and the visible goal-completion UI, not direct state assignment. Each screenshot is from that run.

| Level | Name             | Actual kicks | Maximum | Stars | Evidence                                                                                    |
| ----- | ---------------- | ------------ | ------- | ----- | ------------------------------------------------------------------------------------------- |
| 01    | First touch      | 1            | 3       | 3     | [Scored](evidence/level-01-goal.png)                                                        |
| 02    | Up for it        | 2            | 4       | 3     | [Scored](evidence/level-02-goal.png) / [ball entering net](evidence/level-02-net-entry.png) |
| 03    | Wall play        | 1            | 4       | 3     | [Scored](evidence/level-03-goal.png)                                                        |
| 04    | Mind the gap     | 2            | 4       | 3     | [Scored](evidence/level-04-goal.png)                                                        |
| 05    | On the rise      | 1            | 4       | 3     | [Scored](evidence/level-05-goal.png)                                                        |
| 06    | The right moment | 1            | 4       | 3     | [Scored](evidence/level-06-goal.png)                                                        |
| 07    | Spring loaded    | 1            | 4       | 3     | [Scored](evidence/level-07-goal.png)                                                        |
| 08    | The long game    | 2            | 5       | 3     | [Scored](evidence/level-08-goal.png) / [wide overview](evidence/level-08-overview.png)      |
| 09    | Thread the net   | 1            | 4       | 3     | [Scored](evidence/level-09-goal.png)                                                        |
| 10    | Top corner       | 2            | 5       | 3     | [Scored](evidence/level-10-goal.png)                                                        |

## Visual review

The first-level screenshot was shown before designing the remaining nine. The following actual browser images were opened and visually inspected against the PDF's annotated concept diagram:

- [First visual baseline](evidence/baseline-level-01.png): small black-and-white football, launch arrow, solid stepped terrain, raised visible net and kick budget.
- [Menu](evidence/menu.png): football branding and a net/platform illustration.
- [Simple-level aiming](evidence/level-01-aim.png).
- [Elevated-goal aiming](evidence/level-02-elevated-aim.png): the net sits significantly above the start; this is the brief's primary visual sign-off example.
- [Elevated goal entry](evidence/level-02-net-entry.png): the football is visibly inside the open mouth, with goal feedback before the overlay.
- [Wide-level overview](evidence/level-08-overview.png): separate platforms, water gaps, ramp, high shelf and far goal.
- [Finale completion](evidence/level-10-goal.png), [portrait touch completion](evidence/phone-goal.png), and [landscape layout](evidence/phone-landscape-level.png).
- [All levels and 30 stars](evidence/levels-complete.png), [out-of-shots overlay](evidence/out-of-shots.png).

The art matches the football/platform/net identity of the PDF. There are no putting cups, flags, clubs, or dimpled-ball assets in the game. The original external screenshots could **not** be inspected: all six reference requests returned HTTP 403. The concept diagrams were used as labelled, not presented as genuine original screenshots.

## Builds and production-path check

- `npm run build`: passed TypeScript and Vite production build.
- `npm run build:pages`: passed with the `/goal-in-one-test/` asset base.
- `npm run format:check`: passed.
- `git diff --check`: passed.
- The Pages build was served under its real subpath in Chromium: HTTP 200, all scripts/styles loaded, football title present, and a real mouse drag entered the net and completed level 1 without page errors or failed asset requests.

## Limits

No human player session is claimed; the confirmed playthroughs are browser-input driven. This does not establish subjective difficulty or audio quality. Safari, Firefox, physical iPhones/Android devices, and long-term player balancing remain unverified. Phone evidence is Chromium viewport/touch emulation. All original reference URLs were blocked. Public-site checks depend on the environment's network policy; GitHub deployment status is reported separately from local browser validation.
