# Grass arenas: restoration and expansion

The October 26 request, pasted major-update brief, and newly attached **Goal In One Levels 1–10 Designs PDF.pdf** are the current specification. All ten PDF pages were rendered and inspected. These replace the October 24 designer JSON layouts. The direct request to add Levels 11–20 explicitly overrides the pasted brief's instructions to stop at ten. No additional world or monetisation system is added.

## Levels 1–10

The original vector trace is restored with one uniform mapping (`fromPDF`) for every vertex. Level 1 has chamfered upper corners; 2/3 have opposite solid triangles and peaked roofs; 4 has the supported flat/downhill structure and stepped roof; 5/6 introduce forward/reverse strips; 7 has opposing low triangles; 8 has the narrow roof/floor passage; 9 has the slow vertical block; 10 has the red reset strip. Minor sketch gaps are welded. The closed inaccessible interior of Level 4 is filled. The football is smaller than the pasted sketch illustration. No obstacle or alternate route is substituted in these ten levels.

Every goal attaches to the right edge. The shared `segments` component connects the roof/wall junction to the exact goal-mouth top and extends the floor under the trapezoidal net. Roof, back and floor are solid; the mouth is open. The whole ball must cross from left to right within the mouth to score. Sensor proximity, a backside hit or a ball starting inside cannot score. Rendered strokes and rigid capsule boundaries consume identical coordinates; there is no invisible rectangular cage or out-of-bounds teleport.

## Levels 11–20

`src/extra-layouts.ts` contains authored content records, using the same coordinate system and reusable pads, convex polygons and moving block. They combine known mechanics in this order: stepped banks; twin ramps; baffle/ramp; green runway; ramp/reverse strip; safe shelf/red crossing; narrow baffle passage; boosted moving lane; ramp/reverse/gate; shelf/boost/red/gate finale. These are fixed authored layouts, not random generation. They all retain the right-boundary net and grass presentation.

The content registry exposes one grass world. Save validation reads valid IDs from the registry; level selection renders batches of 20, and the in-game navigation shows the current ten-level group. Adding later packs does not require rewriting a ten-level regex, total star count or completion logic. This prepares for additional content without creating new worlds now.

## Physics, controls and feedback

The proven Matter.js tuning is retained: 120 Hz fixed simulation, gravity 1.1, restitution .76, low rolling friction and mild air drag. Adaptive collision substeps scale with accumulated ball speed, preventing tested high-speed shots from tunnelling. Moving blocks have bounded smooth motion; a trapped ball stops a vertical block near the roof/floor instead of being crushed through the boundary. The roof handling missing from the later designer version is restored.

Every valid kick adds velocity and spin to existing momentum. No shot-count gate, rest lock or kick cooldown exists. Drag anywhere works on mouse and touch; aiming follows the moving ball, and physics continues while aiming. Per-impulse power is capped, accumulated momentum is not. The trajectory is an approximate ballistic guide rather than an exact collision/boost preview.

Pads use one contact system with signed directions. Arrows, coloured strips, activation particles and synthesised sound communicate boosts. Red contact emits red particles at the contact and immediately restores the original start with zero motion while keeping shots. Net capture, particles, the ball trail and celebration remain short and responsive.

Three stars now require one kick in every level. Two stars allow up to three, and all later completions receive one. Thresholds remain level data, not completion restrictions. Every level has a recorded one-kick simulation route; browser confirmation is recorded separately in VALIDATION.md.

## Presentation and mobile

A uniform camera fits the complete contour and outward net. The grass palette, solid green terrain, edge highlights, clear black colliders, mover travel guide, rotational football and net mesh share one visual treatment. The original Flash listing was requested again but blocked by the environment; no direct original-game style or physics match is claimed.

Landscape uses almost the full viewport for the arena, safe-area padding, a compact header and 44 CSS-pixel retry/pause/sound/settings targets. Extra score/navigation copy is hidden on short screens; menu and pause remain accessible. Resizing changes Canvas scale only. The settings dialog exposes persistent sound preferences without adding a new game system. Pointer input remains web-native and suitable for later packaging; there is no native-engine migration.

Original-layout records from `arenas:v3` migrate into the new `grass:v5` namespace. The replaced designer-layout scores remain archived under their old key rather than falsely awarding progress on different geometry. Sound preference carries forward from the newest prior version. Storage failure still allows session-only play.

## Current artwork

The Park & Treeline artwork-only release supersedes the previous rendering palette. Geometry and mechanics above remain unchanged. See [PARK_ART.md](PARK_ART.md) for the selected A3/B2/C1 components, asset provenance and current visual QA.
