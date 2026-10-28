# Grass Parks V1 integration — source asset pending

The supplied text brief was read in full. Its inline image is visible in chat, but no PNG/WebP attachment, downloadable image ID or image file was provided to this execution workspace. The new approved image has **not** been installed or replaced with generated/substitute art. Public deployment remains unchanged.

Prepared implementation:

- `src/background-layout.ts`: shared scale, horizontal/vertical parallax, placement, sky colour and maximum landscape rise. Pure layout math preserves source aspect ratio, wraps mirrored tile pairs for arbitrarily positive/negative horizontal offsets, and never tiles landscape vertically.
- `src/background.ts`: a single shared image load, illustrated/plain preference, mirrored horizontal drawing, source-edge sky/ground extensions and capped landscape rise so looking down does not push all sky out of view. `approvedGrassParksUrl` deliberately remains null until the approved source file is available.
- `src/render.ts`: background rendered before world objects, using only camera-centre displacement from a stable initial reference. No modifications to the physics camera, geometry, mechanisms, scoring or campaign data. Original scenery remains the explicit temporary fallback while the source is missing.
- Developer Settings has **BACKGROUND: ARTWORK / PLAIN**. Studio has an **Artwork** checkbox; its stationary canvas redraws when the shared asset loads. These controls currently compare the existing fallback with plain colour, not the missing approved image.

Build passed. All **608 runtime tests** passed, including 21 aspect-ratio, horizontal coverage, mirrored adjacency and vertical-layout checks. Two Chromium cases passed for developer/editor toggles and stable roof-edit framing. These checks do **not** establish approved-image fidelity, seamless appearance, mobile readability or image loading for the missing source.

To finish: obtain the original approved PNG/WebP, preserve its original bytes under an organised Grass Parks source directory, create an optimised derivative, set its static Vite asset URL in `background.ts`, then visually verify fixed, wide, tall, multi-section, Studio/Test and resized/mobile canvases before committing the finished asset integration and deploying it. Mirrored edge continuity is implemented mathematically; recognisable mirrored scenery/seam appearance still needs inspection with the exact artwork. A future layered version could separate sky/clouds, distant trees and foreground hills for independent parallax.
