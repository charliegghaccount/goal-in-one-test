# Goal In One - Codex implementation handoff for Levels 41-60

## Files provided

- `Goal_In_One_Levels_41-60_Illustrated_Designs.pdf` - 33-page visual concept pack (20 maps, plus 8 scrolling detail sheets, code audit, visual legend, implementation/validation notes).
- `Goal_In_One_Levels_41-60.json` - complete authored coordinates, native Level fields, mechanics, camera extensions and rationale.

## Important qualifications

- The 20 new designs passed structural consistency checks, **not** Matter.js kick-based playtests. Their green route diagrams are intended strategies, not tested ball trajectories.
- The user's existing 40 levels and saved progress must remain unchanged.
- All goals integrate into the outer right boundary. Continue to allow midair kicks and unlimited attempts.
- **Do not** directly render the JSON's `design` metadata as a physics object. It is documentation; `camera` requires implementation.

## Baseline source audit

Read from GitHub repository `charliegghaccount/goal-in-one-test` on `main`, latest observed commit `f1aa612f` dated October 26, 2026.

Relevant source files:

- `src/levels.ts`: native `Level`, `Point`, `Polygon`, `Mover`, `Surface`, `Goal`; `segments` and `arenaPolygon`.
- `src/mechanics.ts`: six mechanic families already present, including gate switches, breakables, springs, fans, rotors and ice.
- `src/simulation.ts`: Matter.js, ball radius 16, wall width 10.4; 120 Hz physics, goal passage crossing on right.
- `src/render.ts`: currently fixed `viewBounds` x=25/w=1250; `cameraX` exists but does not implement true tracking or world-transform pan.
- `src/main.ts`: canvas input and level UI, requiring camera-aware coordinate conversion.
- `src/audio.ts`: synthesized win jingle; no spoken one-kick voiceover.

## Paste this into Codex alongside both attachments

Implement the attached authored design pack as experimental Levels 41-60 in my existing Goal In One repository. Treat the JSON as the coordinate source and the PDF as visual and logical reference. Preserve the current 40 levels, physics settings, progression, artwork, and unlimited midair-kick controls.

**Phase 1 - Engine readiness**

1. Add backward-compatible camera config support on Level: fixed, follow-x, follow-xy, world view rectangle, smoothing and clamps. Treat `camera` field as extension, not something the existing engine already understands.
2. Add the same camera transforms to render, mouse/touch aiming and trajectory guides. Screen/world conversion must be exact at any camera offset or zoom.
3. Make 41-60 experimental and accessible for review without disturbing normal saved progress or locked 1-40 levels.
4. Test with simulated landscape iPhone browser viewports. Keep the ball visibly aimable (prefer >=20 px diameter) and UI controls touch-sized.
5. Add separate `GOAL IN ONE!` speech/audio on precisely 1 shot, and ordinary goal sound on 2+ shots. Prefer a properly licensed/generated original audio asset, not ripped Flash game audio; provide volume/mute support.

**Phase 2 - Import the designs** 6. Parse `Goal_In_One_Levels_41-60.json` and generate typed Level objects. Use exact coordinates, goal properties, obstacles, surfaces, movers and mechanic arrays, retaining each ID/name/description. Keep `camera` and `design` metadata separately where needed. Do not redraw approximate levels from PDF. 7. For Levels 41-52, preserve each compact layout's silhouette and obstacle logic, not a common triangle roof. 8. For Levels 53-60, implement scrolling at runtime rather than shrinking the entire map to the screen. Vertical maps 54 and 58 require follow-xy; other scrolling maps use follow-x. 9. Every gate designated `required-gate` must be a real solid separation from ceiling to floor, with the gate physically closing the only passage. At the open state, provide a ball-sized passage with robust clearance. Validate no bypass by midair kicks, wall penetration, or camera scroll clipping. 10. Gate motion in current Matter.js code may need correction to retract entirely into a solid upper pocket without catching or phasing through the ball. Correct it globally only where necessary.

**Phase 3 - Physical test and improve** 11. Run the existing test suite and add collision-geometry/topology tests. Verify physics world enclosure at seams, net entrance, invalid polygon intersections, breakable thresholds, switch-to-gate linkage and responsive boosts. 12. For every new level, generate a real playable solution through the normal kick API. Do **not** fake completion by moving the ball directly into the goal. Collect reproducible shot directions, power inputs and frame/shot counts. Optimize the designed route or edit geometry only when necessary for actual playability. 13. Review potential exploits: if a door can be bypassed while closed, redesign the physical partition until the switch matters. Unlimited kicks and midair shots must remain allowed. 14. Test scrolling UX with the player moving rapidly, reversing, aiming while camera moves, and colliding near world edges. 15. Capture screenshots of all 20 levels and camera-region contact sheets; compare against PDF. State any changed coordinates and why.

**Phase 4 - Deliver** 16. Keep changes in a commit/PR. Provide: implementation summary, tested one-shot/multi-shot routes, any engine changes, playability matrix for Levels 41-60, video/screenshots where possible, unresolved issues, and a single simple browser launch/review instruction. 17. Do not assert that a level is playtested merely because TypeScript compiles or geometry passes. If time is constrained, implement fewer polished levels rather than twenty unverified levels, and explicitly report what remains.

## Level index

|  ID | Level                 | Format        | Distinctive idea                                                                                       |
| --: | --------------------- | ------------- | ------------------------------------------------------------------------------------------------------ |
|  41 | Roof Ricochet         | Single-screen | A deliberate bank shot off a level ceiling and angled backboard.                                       |
|  42 | Window of Opportunity | Single-screen | Shoot through a mid-height gap between two solid dividers.                                             |
|  43 | Unlock the Passage    | Single-screen | Hit the switch to open a compulsory gate through an otherwise sealed divider.                          |
|  44 | Springboard           | Single-screen | Use a spring to clear a wall, with a forgiving landing basin.                                          |
|  45 | Above or Below        | Single-screen | Two distinct routes: a high platform shortcut or a narrow lower passage.                               |
|  46 | Crosswind Slot        | Single-screen | Ride an updraft through a safe opening, then correct the descent.                                      |
|  47 | Break or Bypass       | Single-screen | Smash the breakable shortcut, or take an elevated detour.                                              |
|  48 | Clockwork Gap         | Single-screen | Wait for a slow rotor to offer an opening, or use it to redirect the ball.                             |
|  49 | Ice Corridor          | Single-screen | Preserve sliding speed across ice then handle a sharp rise.                                            |
|  50 | The Timed Door        | Single-screen | Activate a switch, then reach a compulsory lower gate before it closes.                                |
|  51 | High Switch           | Single-screen | Trigger an elevated switch to unblock the low ground route.                                            |
|  52 | The Z-Corridor        | Single-screen | Use staggered upper and lower blocks to thread a non-linear path.                                      |
|  53 | Longshot Relay        | Scrolling     | A rolling course with separated spring and rotor stages.                                               |
|  54 | Updraft Shaft         | Scrolling     | Climb vertically through an upper doorway, then descend into the goal chamber.                         |
|  55 | Three Chambers        | Scrolling     | Cross two sealed room dividers by activating a switch in each preceding chamber.                       |
|  56 | Hazard Overpass       | Scrolling     | Reach an elevated safe route above a long series of red resets.                                        |
|  57 | Wind and Workshop     | Scrolling     | A wind-assisted passage ending at a mandatory switch-operated door.                                    |
|  58 | Skybridge Return      | Scrolling     | Rise to the upper bridge; use a narrow midheight doorway to cross.                                     |
|  59 | Switchback Factory    | Scrolling     | Two meaningful gated partitions and a slippery transition between them.                                |
|  60 | The Grand Route       | Scrolling     | Five concise puzzle beats: spring, airflow, a breakable shortcut, compulsory gate and finishing rotor. |
