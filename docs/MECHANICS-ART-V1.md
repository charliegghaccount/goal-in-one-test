# Gameplay Mechanics Artwork V1

The supplied **Goal In One Movement Reference Photos.png** is a style reference, not a sprite sheet. The updated objects are reusable Canvas paths, gradients and the existing timber material; no cropped reference art, new runtime image downloads or dependencies were added.

## Artwork

- Forward/backward pads: thin green/orange strips, repeated white directional arrows, dark metal edging, highlights and end bolts.
- Deletion pad: matching red strip with diagonal hazard bands and a small warning triangle.
- Spring: silver coil, red compression plate and charcoal base. Existing contact timestamps drive a brief compression and return animation. The direction arrow retains the actual configured launch direction; changing launch angle does not rotate the horizontal contact sensor.
- Fan: a side-view blower with an upward outlet, feet, an animated impeller behind a grille and charcoal metal casing. The housing rotates to the configured airflow angle and sits at the upstream edge of the existing wind zone. Existing wind arrows and zone markings remain. A newly placed **Fan** now defaults to 90° (up); existing fans, Wind zone defaults, force settings and saved definitions are untouched.
- Switch: a low pressure plate, blue when raised and green/compressed while physically pressed. Its state follows contact, including when a toggle gate stays open after release.
- Gate: the existing timber texture, plank seams and charcoal metal rails/bolts, clipped inside the existing gate footprint and rendered at its actual body position/angle.

Both Studio and gameplay use the same renderer. Studio remains still when paused; Play preview animates the fan without running football physics. Reduced-motion rendering stops fan spin and holds springs ready. No level files, simulation code, collision definitions, save formats, timber asset, grass, background, ball or goal were changed.

## Evidence and verification

See [materials](mechanic-art-evidence/materials.png), [Studio](mechanic-art-evidence/studio.jpg) and [playable Test mode](mechanic-art-evidence/gameplay.jpg). The material sheet shows both activation states, upward/angled fans and narrow/rotated gates; these are rendering examples, not new levels.

The browser artwork checks compare activation/animation frames, reduced-motion spring rendering, Canvas transform restoration and unchanged input definitions. They also place all seven object types through Studio controls, check the upward default, enter actual Test mode and verify the exported design is identical after returning. Existing gameplay and editor tests run separately as regressions.

## Build and runtime results

- `npm run build:pages`: passed TypeScript and the production build at `/goal-in-one-test/`.
- `npm test`: all 608 runtime tests passed, including existing mechanics and level geometry checks.
- All 44 distinct Chromium browser checks verified, including actual drag completions of levels 1–60, emulated landscape touch, mechanics, camera and Studio/campaign regressions. The primary run passed 43 checks; its forty-level route test was interrupted by a late source edit causing Vite to reload to the home menu. With source held stable, that exact route test and both final artwork checks passed in a sequential rerun. No gameplay fix was required.
- `npm run format:check` and `git diff --check`: passed.
- Production Chromium smoke: HTTP 200, draft save/publish at position 9, refresh persistence and a goal from an actual mouse drag. No page errors or failed requests; existing timber texture returned 200 initially and 304 on reload.

## Remaining refinement

These are intentionally compact side-view interpretations of the perspective reference. Fine fittings and coil detail become small when zoomed out or at phone size. The flattened switch artwork retains the original taller sensor footprint; Studio's Collisions overlay still shows the actual sensor. Fans are visual representations of existing rectangular force zones, not new solid colliders; their feet align with the force-zone edge, which may be in midair in existing designs. Spring graphics compress within a short decorative range; the original instantaneous launch remains unchanged. Physical iPhone/Android devices and Safari are not verified by the Chromium checks.
