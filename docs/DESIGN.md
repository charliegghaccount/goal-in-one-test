# PDF arena trace and current rules

## Source priority

The user's October 21 request and **Goal In One Levels 1–10 Designs PDF.pdf** define this version. All ten pages were read and rendered for inspection. These specific designs replace the older open-platform courses. The user explicitly overrides the earlier brief's shot budgets and wait-for-rest rule: kicks are unlimited and can add momentum mid-flight.

The earlier remake brief still establishes the football identity, side-view goal and net-entry objective. Neither document is treated as an instruction to reproduce golf visuals or to invent substitute layouts.

## Reference access

Both current original-game URLs were requested on October 21, 2026:

- https://armorgames.com/goal-in-one-game/363 — HTTP 403, not viewable.
- https://funkypotato.com/goal-in-one/ — HTTP 403, not viewable.

The previous brief's original screenshot/listing URLs were also unavailable in the earlier task. The game is informed by the supplied drawings and explicit requirements; no claim is made to have played or visually verified the original Flash game in this environment. Physics tuning is a remake implementation decision, not a claim of exact original parameters.

## Geometry trace

The new PDF is vector-based. Its black polylines and filled polygons were inspected directly with PyMuPDF, along with all ten rendered pages. `fromPDF(x,y)` applies the same translation and uniform 1.6× scale to every layout. There is no per-level stretch or generated geometry.

- The floor, left wall, roof contours, right wall and goal mouth share common source coordinates. Upper-corner and sloped-roof joins use connected endpoints rather than leaving the small overlaps/undershoots in the sketches.
- Solid triangular obstacles use the traced source vertices. Their bases meet the actual floor; the small source gaps hidden by the floor stroke are welded.
- Level 4's supported flat/downhill structure is a filled trapezoid. Its closed outline and the floor enclose the same inaccessible interior as the drawing.
- Level 8's two substantial triangles and narrow opening are retained, including the hanging triangle sharing the roof plateau.
- Level 9 preserves the rectangular arena and the source rectangle's width/height and horizontal position. Its eight-second vertical cycle uses the illustrated travel range. A trapped football physically blocks the mover near a roof/floor, and it resumes smoothly once clear; this prevents crushing through a boundary without adding invisible walls or reducing the designed range.
- Level 5 and 6 arrow strips become directional contact sensors over the solid floor. Level 10's red strip uses the traced horizontal span.
- The goal is the drawn trapezoidal extension on the right, with a horizontal roof, sloping back, extended floor, green frame and visible mesh. Its vertical mouth is an opening, not a solid upright blocking entry.
- Ball starts remain bottom-left, with the more rightward start from the Level 9 drawing. The football is a small readable 16-unit-radius sprite placed above the floor; the diagram's pasted ball image is not used as an asset.

## Matching drawing and collision

`segments(level)` supplies every rendered wall and corresponding rigid collider. A black line is a solid 10.4-unit-wide capsule: a rotated rectangle and round endpoint caps. Adjacent caps overlap at corners. Goal roof/back boundaries use the same construction and green visible strokes. The single continuous floor extends under the goal.

Obstacle rendering and convex Matter.js bodies share the same vertices. No offscreen rectangular cage, position clamp or silent out-of-bounds reset makes an open scene appear enclosed. The adaptive physics substeps limit travel per collision step for very fast accumulated kicks. The only intentional positional reset is the red surface.

## Kicking and presentation

Drag anywhere to make fast balls easy to target on mouse and touch. The pointer delta is relative to its press location; indicators follow the moving ball and include its current velocity. Physics continues during aiming. A kick is a capped additional velocity/angular impulse, never a replacement for existing momentum. There is no wait, cooldown, par check or maximum-shot gate.

The full arena is always fitted with uniform scaling and no tracking/pan. Landscape and portrait use the same physics. Boundary art is dark and solid; a faint clipped grid stays clearly decorative. Menus, mute, pause, keyboard/precise controls and best-score persistence remain.

Par and stars reward efficiency only. Every eventual goal completes; over-threshold attempts earn one star. Red contact resets to the original start with zero velocity but preserves the count exactly. Automatic boost contacts never increment it.

## Current evidence

Use [arena-evidence](arena-evidence/) and the [validation report](VALIDATION.md) for the actual screenshots, PDF comparison sheets and input-tested completions. The earlier `evidence/` directory is historical and does not describe the current levels.
