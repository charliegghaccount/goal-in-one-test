# Physics lab and experimental Levels 21–40

Historical report for the 40-level release. For the current 60-level build, see [VNext](VNEXT.md).

This release implements the user's physics/mechanics expansion brief. The Park & Treeline art remains. Existing Levels 1–20 are not redesigned: a serialized pre-change baseline is retained at `expansion-evidence/baseline-levels-1-20.json`, and a regression test compares every original contour, collider definition, start, pad, moving path, goal and scoring threshold. The existing `goal-in-one:grass:v5` save namespace is retained, so existing records and sound preferences survive. Browsing and save validation use the forty-level registry.

## Physics fixes

- Ground friction falls from .045 to **.003**, static friction from .18 to **.04**, and air resistance from .0035 to **.0015**. The causes of dragging are changed directly, without a floor speed multiplier. In the flat-floor regression a ball set to speed 6 travels approximately **313 world units in one second**, still moving at 3.15, then eventually settles. Slopes still use gravity and the runtime remains at 120 Hz with speed-adaptive substeps.
- A kick retains **55%** of prior velocity, limits its opposing projection to one quarter of the new kick, and adds the unchanged default kick strength (.125 per pull unit). This gives a valid kick at least 75% directional authority even against strong opposing travel. Existing spin is reduced on a kick, damped at an 8% rate per 60 Hz-equivalent step, and capped at **.35 radians per normalized step**, including after collisions. Shots remain unlimited; moving kicks have no cooldown or rest gate.
- Boost pads apply continuous acceleration throughout geometric contact. The initial contact fraction is integrated immediately when the collision is first detected; subsequent updates apply force at .32 velocity units per 60 Hz-equivalent step, fading toward a directional speed of 18. There is no timer, cooldown or periodic large impulse. The pad force stops after separation and does not cap stronger player-shot momentum. Collision effects fire on contact rather than every force update.

Changing friction on the ball alone does not update Matter's existing contact-pair material, so active pairs are refreshed too. This is necessary for both developer changes and seamless normal/ice transitions. Goal entry and the physical right-boundary net remain unchanged. The aiming preview uses the new kick retention/authority and air resistance, but remains a ballistic approximation: it does not simulate future collision, wind or launcher effects.

## Reusable mechanics

`src/mechanics.ts` defines configurable content components and their shared runtime:

| Mechanic        | Behavior and safety                                                                                                                                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Springs         | Configurable angle/strength; one launch per distinct contact; separation rearms; purple direction marks, brief compression and sound. Vertical, diagonal and horizontal cases are tested.                                                 |
| Wind            | Configurable rectangle, angle and force; continuous while the center lies in the visible field; smooth speed attenuation; stops on exit. Animated arrows and a fan mark its range.                                                        |
| Breakable wood  | A normal-impact speed threshold distinguishes weak damage from a break. Strong hits remove the collider after the step and retain 70% incoming motion through the opening. Wood particles/sound and restart restoration are included.     |
| Switches/gates  | Distinct-contact toggle or timed activation, visible connector and blue gate bracing. Gates move smoothly and stop when movement would squeeze the ball. Opening travel is fitted below the local sloping roof, not beyond the arena.     |
| Rotating wood   | Slow paddles and a pivoted swinging body; collider vertices rotate with their art. Angular travel is bounded per step, and rotation pauses when it would squeeze a supported ball. Movement resumes smoothly without an angular teleport. |
| Slippery strips | Configurable low-friction contact, including a sloped strip. Ball/contact-pair friction changes only while touching it; normal values return on exit. Air drag still prevents perpetual sliding.                                          |

Mechanics are independent data in `src/expansion.ts`; restart constructs fresh state. Gate and rotor swept containment, crushing protection, threshold hits, wind/spring interaction and slippery transitions have dedicated runtime tests.

## New levels and progression

| Levels | Names                                       | Intended challenge                                                                                   |
| ------ | ------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 21–23  | First Bounce, Angled Launch, Double Bounce  | Vertical launch over a wall, diagonal banks, and a two-spring chain with manual recovery.            |
| 24–26  | Tailwind, Updraft, Against the Wind         | Horizontal assistance, lift against gravity, and opposing currents.                                  |
| 27–29  | Breakthrough, Two Routes, Chain Reaction    | Break a barrier, choose a shortcut or a loft, then manage three barriers.                            |
| 30–32  | Open Sesame, Timing Window, Two-Step Puzzle | Ground switch, airborne eight-second switch, and sequential gates.                                   |
| 33–35  | Moving Paddle, The Swing, Pinball           | Slow deflection, a pendulum/ramp opening, and opposite-turning paddles with safe alternative routes. |
| 36–38  | Slippery Start, Ice Run, Slopes and Slides  | Longer carry, momentum control at a low wall, and a polished downhill ramp.                          |
| 39–40  | The Workshop, Grand Finale                  | Spring-assisted high routes or break/switch routes, combining familiar mechanics.                    |

Every new goal uses the existing external right-boundary net. Original/peaked/stepped/rectangular arena profiles give compact fixed-screen rooms. No random generation or long scrolling courses are introduced. Near-exit gates were shortened and their opening travel reduced after swept-geometry tests found roof interference. These adjustments affect only new experimental levels.

New three-star budgets are 1–3 kicks depending on the puzzle; two stars allow two more. More kicks always complete with one star. The default routes found by simulation fit all budgets, but the budgets intentionally allow recovery in harder combinations. Level 23 also has a demonstrated two-spring chain; Level 29 has a two-kick route breaking all three barriers. Levels 39/40 have spring routes and separate break-through routes. These levels remain experimental and should receive human difficulty feedback, especially the easy lower bypasses on 33/35 and the multi-mechanic finales.

## Developer access

Open the game with **`?dev=1`**, choose **Settings → Developer Physics**. Normal play has no developer panel. All forty levels remain open as before; the developer panel has an Unlock All/Level Select shortcut and a direct jump selector with puzzle descriptions.

Ten bounded sliders control ground friction, bounce, air resistance, spin damping, maximum spin, kick strength, momentum retention, boost acceleration, spring multiplier and wind multiplier. Values apply when play resumes; none requires a level restart. The panel pauses play while open. Save stores settings in `goal-in-one:physics:v1`; Restore Saved reloads them; Reset Defaults applies shipped values. Copy/Export writes JSON to the clipboard when permitted and always exposes it in the text box. Import validates/clamps supported numeric values. Defaults are a single object in `src/physics.ts`, ready to replace with a chosen configuration later. Saved tuning applies on subsequent visits, including normal play; use Reset Defaults and Save to return to the shipped feel.

## Evidence and validation

Before changing physics, the original **109 tests passed** and fresh screenshots were captured in `expansion-evidence/before/`. After the initial physics fixes, all original twenty levels completed using browser drag input before expansion development proceeded. Final test/build results are recorded in the delivery, not inferred from the existence of geometry.

**238 runtime tests pass**, covering all forty input-only solutions, original geometry equality, rolling distance and settling, spin/rapid/opposite kicks, continuous and opposing boost contacts, high-speed corners/enclosure, all six mechanics, gate/rotor swept bounds, reset behavior, storage and alternative routes. Browser tests use actual mouse/touch inputs; they never place the ball in the net or assign success. Full playthroughs use a controlled animation clock; a separate landscape touch goal runs in real time. Developer tests exercise safe JSON import, reset, local save/restore, export and a direct jump to Level 40.

- [Labelled 20-level contact sheet](expansion-evidence/levels-21-40.jpg)
- [Larger 21–30](expansion-evidence/levels-21-30.jpg) · [Larger 31–40](expansion-evidence/levels-31-40.jpg)
- [Physics tuning panel](expansion-evidence/developer-panel.jpg)
- Per-level gameplay/completion captures: `level-21.jpg`…`level-40.jpg`, `goal-21.jpg`…`goal-40.jpg` in `expansion-evidence/`.

The complete **10-test browser suite passed**, including all forty actual drag goals, reload persistence, real-time landscape touch, the developer panel, alternate finale routes, the two-spring chain and the three-barrier route. No human playtesting is claimed.

The Pages production build, formatting and whitespace checks passed. A browser smoke test at `/goal-in-one-test/` loaded all 40 level cards and artwork, completed Level 21 through a real drag, and opened all ten developer sliders with no page errors or failed requests. GitHub deployment status is reported in the final delivery.

The sheets were opened and visually reviewed for geometry, reachable switches, door paths, collider/art alignment and clear play space. Contact sheets can be regenerated with `python scripts/expansion-contact-sheet.py` (Pillow required).

## Limits

This is automated browser-input playtesting, not human balancing. Physical iPhone/Android performance, Safari and Firefox remain unverified. Finite stress tests are not a mathematical proof against every possible high-speed squeeze. Safety-paused moving objects can change their schedule when blocked, which is preferable to crushing a ball; kicks remain available to recover. The guide dots are approximate around the new force fields. Routes were validated at shipped defaults; custom tuning can change difficulty. New levels are deliberately open for experimental review; some permit bypassing their highlighted mechanic, and no claim is made that every alternate solution has been explored.
