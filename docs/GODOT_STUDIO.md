# Test your Studio level in Godot

Open https://charliegghaccount.github.io/goal-in-one-test/ in Chrome. Choose **Settings → LEVEL EDITOR**. Use the same Studio you already know; the original **Test Level** button still runs Matter.js.

1. Create/open a draft and make your edits. You do not need to save or publish it first.
2. Click **Test in Godot** next to Test Level.
3. Wait for “Godot physics” in the preview header. The first load downloads the engine; later tests use browser-cached assets. Drag backwards anywhere outside the game HUD, then release to kick.
4. Click **Return to Editor** above the preview, or **Return** in the Godot HUD. Continue editing the same live session. Selection, pan/zoom and undo history remain in memory.
5. Change something and test again. No manual JSON export, file copying or Godot restart is required.

The preview runs the Godot repository's actual WebAssembly/WebGL2 build and shared GDScript gameplay. It never publishes the draft or records official campaign scores. Closing/reloading the whole browser still follows the Studio's ordinary save/recovery behaviour; this bridge is not a replacement for Save Draft or backups.

## Supported in this proof of concept

- Existing versioned `goal-in-one-level` v1 draft JSON, including metadata.
- Freeform wooden polygons (already-rotated vertices are used exactly), attached/open or free right-facing goals, complete editable boundaries and legacy outlines, spawn, level name, par and star thresholds.
- Forward/backward boost strips, red reset strips, springs, rectangular pressure switches and linked gates. Spring angles and normalized Matter velocity/acceleration units convert to Godot units.
- Fixed, horizontal-follow and two-axis-follow camera modes, level extents/bounds and approximate native follow framing/smoothing. The camera is native Godot rather than a second copy of the TypeScript camera renderer.

Unsupported moving blocks, rotors/swings, breakable wood, ice, wind/fan regions, legacy circular pressure switches, left-facing goals, camera view windows/regions, custom dead zones and custom initial camera positions are reported before play. Nothing in those categories is silently dropped. The full editor library remains available for the old Test Level workflow. Native Godot fans still exist in Godot scenes; importing Studio wind rectangles is deliberately not approximated by differently shaped fans.

Godot collision solving/game feel remains subject to the differences documented in the Godot repository. Its dotted trajectory guide does not predict mechanic forces or future gate positions. Global custom Matter.js physics preferences are not exported by the Studio draft format; previews use native Godot's established tuning.

## Try the three examples

Use Studio **Import** to open `docs/godot-examples/basic.json`, `mechanics.json`, or `wide.json` from a downloaded copy of this repository. These are ordinary original-format drafts, not a second level format. Basic demonstrates an editable ramp; mechanics combines boost and spring; wide demonstrates follow/exploration. Import makes a new draft copy using the Studio's existing flow.

## Deployment and development

The Studio and Godot remain separate repositories/sites. Default preview URL is `https://charliegghaccount.github.io/godot-test-goal-in-one/`. Both Pages sites share an origin but have separate paths. No server/backend, CORS service or cross-origin isolation headers are needed; Godot remains single-threaded.

Deploy the Godot repository first using its existing Actions workflow, then publish this Studio using the existing `npm run deploy:pages` script. The latter builds the correct base path and updates gh-pages without checking out or replacing source branches. Create the ignored `.cache` directory first if absent.

For local work, serve the Godot export on port 8064 and run this repository's Vite server on port 5174. Open `http://127.0.0.1:5174/?dev=1&godotPreview=http://127.0.0.1:8064/`. The override accepts HTTPS or local HTTP only. Preview messages check exact source window, origin, per-preview token and message type. Importing JSON never executes code or resolves data-supplied resource paths. Limits protect against oversized documents.

Regression commands: `npm test`, `npm run build`, `npx playwright test tests/browser/editor.spec.ts tests/browser/studio-v2.spec.ts`. With both local servers running, `node tests/godot-integration.cjs` performs real editing, shooting, return, retest and Undo/Redo checks across all three examples. It also compares exported data, selection/camera datasets and progression before/after previews.
