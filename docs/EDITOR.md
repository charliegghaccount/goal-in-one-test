# Level Studio and camera exploration

This update adds an internal visual editor and player-controlled camera exploration. The repository still contains **60 official levels**. Their definitions, physics defaults, save key, stars and Park & Treeline artwork are preserved; an exact [pre-update snapshot](editor-evidence/baseline-levels-1-60.json) is checked by regression tests. No official levels or mechanics were added.

## Open the editor

[Open Level Studio](https://charliegghaccount.github.io/goal-in-one-test/?dev=1&editor=1&v=studio).

Alternatively, open the game with `?dev=1`, choose **Settings → Level Editor**. Ordinary game menus do not expose the editor. It is a desktop tool; a viewport around 1280 pixels wide or larger is recommended. **Exit** returns to the game menu.

For local development:

```sh
npm ci
npm run dev
```

Open `http://localhost:5173/?dev=1&editor=1`.

## Build a level quickly

1. Choose **New** and a rectangle, wide, tall or stepped template. Every template has a closed physical frame, spawn and functioning right-hand goal.
2. Drag a library item into the canvas. Alternatively, click its library button and then click the canvas. Existing wood, football, net and mechanism artwork is used.
3. Select an object, drag it to move, drag its lower-right size handle, or use the purple rotation handle where rotation is supported. Properties offer precise numeric editing. Grid and snap are independent toggles, with a configurable step.
4. Choose **Arena vertices** to edit the actual perimeter. Drag any ceiling/wall/floor vertex; add or remove vertices in Properties. **Level settings** can resize the frame without stretching placed obstacles. Use **Fit arena** after extending it.
5. Add mechanics and configure them in Properties. A switch's **Linked gate** dropdown lists real gate IDs. Renaming a gate updates its linked switches. Group duplication creates new gate IDs and preserves links within the group.
6. Choose **Test Level**. The draft opens in normal gameplay using the same Matter.js engine, physics configuration, input and renderer. Kick, retry, score, and choose **Return to editor** to continue. The entire design, history, workspace view and selection are retained. Test results never write official best scores, stars or unlocks.
7. **Save** retains a named draft on this browser. **Load** lists names and modification dates. **Export** produces downloadable/copyable JSON; **Backup All** includes all saved drafts and the current unsaved design. Keep downloaded backups outside browser storage.

The browser demonstration builds a spring/ramp puzzle from a blank arena, adds and rotates a wooden block, reshapes the roof, saves, completes a one-kick goal with real drag input, returns to editing unchanged, exports, imports, continues editing and reopens the saved draft. See [the example draft](editor-evidence/spring-route.json), [editor screenshot](editor-evidence/editor-spring-route.jpg), and [actual test goal](editor-evidence/draft-goal.jpg).

## Available objects and properties

| Family          | Library items                                                                                           | Editable runtime properties                                                                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Solid geometry  | Block, triangle ramp, platform, wall, angled barrier, slope, ceiling block, passage kit, custom polygon | Move, size, rotation baked into polygon vertices; vertex editing. Passage kit creates two ordinary solid blocks.                                                                                            |
| Surfaces        | Forward boost, backward boost, red reset, slippery ice, spring                                          | Length/position; boost direction and optional per-pad acceleration; ice angle/friction; spring direction/strength.                                                                                          |
| Moving geometry | Horizontal/vertical moving blocks, rotating paddles, swinging timber                                    | Dimensions, travel axis/distance/period, moving-block angle (X/Y is the motion centre; Test starts at the positive travel endpoint); rotor starting angle/speed; swing amplitude/period and optional pivot. |
| Interactions    | Switch, toggle gate, timed gate kit, breakable wood, fan, wind zone                                     | IDs and dropdown links, switch mode/timer, gate opening offsets, break threshold; wind direction/strength/area. Timed kit creates a real gate and linked timed switch.                                      |
| Level objects   | Football spawn, green training goal, camera region                                                      | Spawn coordinates; goal depth/height/roof and boundary-snapped position; labelled camera viewport guides and initial-view selection.                                                                        |

Fan and wind entries both use the existing wind-zone runtime and visible fan; they are not different invented mechanics. Gate starting state remains **closed**, matching the runtime. Unsupported gate/boost rotations are not exposed. Ice angles and moving-block rotations affect actual collision/sensor geometry. Purple spring arrows configure launch direction, not an invented tilted collider.

Select objects through the canvas or the **Object** dropdown, including camera regions. Shift-click selects multiple objects; move, duplicate or delete the group together. Required spawn/goal/perimeter objects cannot be deleted accidentally; reposition or reshape them instead.

## Polygons and perimeter geometry

**Draw polygon**: click vertices, then **Finish polygon** or Enter. Escape cancels an unfinished outline. Select a finished polygon and choose **Edit vertices**; drag its vertices, choose one from the vertex dropdown, or enter its coordinates. **Add vertex after** inserts an edge midpoint; **Remove vertex** preserves a minimum of three vertices. Switch back to **Move / resize shape** for whole-object handles.

Simple concave polygons are supported through ear-clipped convex triangles in the real physics engine. The rendered polygon and collision union preserve the empty notch; the runtime never silently substitutes a convex hull. Collision overlays draw the actual compound parts. Self-intersections, duplicate adjacent vertices and negligible-area shapes are rejected for Test/Export with useful messages.

Drafts use an optional native `Level.boundary` closed perimeter (the first vertex is not duplicated). This replaces the old implicit straight floor for that draft. Arbitrary slopes, steps, tall/wide chambers and multiple connected sections therefore use the same visible segment colliders as gameplay. No invisible rectangular box is added. `outline` mirrors the perimeter for legacy bounds consumers. Original official definitions keep their old representation unchanged.

The goal snaps onto a vertical **right-facing** perimeter segment, cuts only its mouth out of that edge and adds its actual roof, back and floor. The rest of the wall stays solid. Static wood cannot occupy the proposed opening, and a net that intersects another perimeter section is invalid. Moving/openable blockers are reported for route testing rather than automatically declaring the level impossible. Other goal orientations are intentionally unsupported for now.

Legacy official PDF contours include a tiny roof/mouth weld; copies retain their native collision positions. Net-union validation simplifies only zero-area collinear stitches, without changing the collision geometry. Custom moving blocks also retain the existing anti-crush approach on stepped/raised floors, pausing rather than pressing a supported football through the terrain.

## Level settings and camera guides

Level Settings includes name, draft level number, description, difficulty, tags, par, both star thresholds, arena width/height, camera mode, intended viewport dimensions and initial focus coordinates. Difficulty/tags are authoring metadata. Par is still only a scoring target; it cannot stop further kicks.

Fixed mode frames the full arena. Follow modes use the intended viewport size, with responsive cropping and a minimum useful ball size. Camera regions are labelled **guides**, not automatic scripted transitions. **Use as initial camera view** sets the supported initial focus; the normal follow camera still protects ball visibility.

Editing offers grid, snap, fit, zoom, pan, coordinates, real collision outlines, a goal-mouth/direction marker and camera-region guides. Editor panning has its own gesture ownership; selecting **Pan**, holding Space, or using the middle mouse button cannot move an object.

Keyboard shortcuts while the canvas is focused:

| Shortcut                                 | Action                           |
| ---------------------------------------- | -------------------------------- |
| V / H                                    | Select / Pan                     |
| Space + drag / middle drag               | Temporary pan                    |
| Mouse wheel                              | Zoom around the pointer          |
| F                                        | Fit arena                        |
| Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl/Cmd+Y | Undo / Redo                      |
| Ctrl/Cmd+D                               | Duplicate selection              |
| Delete / Backspace                       | Delete optional selected objects |
| Ctrl/Cmd+S                               | Save draft                       |
| Enter / Escape                           | Finish / cancel polygon          |

Undo/redo retains 100 whole editing operations. A drag is one operation, not one operation per pointer movement. Editing text or numbers does not accidentally trigger object shortcuts.

## Draft storage and interchange

Drafts use `goal-in-one:editor:drafts:v1`, with a separate recovery slot at `goal-in-one:editor:recovery:v1`. Official progress remains at `goal-in-one:grass:v5`. No draft replaces an official level automatically. Opening an official level creates an independent copy; importing creates a new draft ID. Local storage failures leave the current design open and report that it should be downloaded instead.

A single export is:

```json
{
  "format": "goal-in-one-level",
  "version": 1,
  "draftId": "unique-local-id",
  "modified": "ISO timestamp",
  "difficulty": 2,
  "tags": ["spring", "bank"],
  "level": { "...": "complete native Level object" }
}
```

The real `level` object contains all polygon/perimeter geometry, objects, spawn, goal, scores and camera settings. Import accepts this envelope or a native Level object. A backup uses `format: "goal-in-one-drafts"`, `version: 1`, and a `drafts` array; importing restores independent draft copies into the list. Single playable-level export requires valid geometry; **Backup All** can preserve unfinished work.

To deliberately incorporate a reviewed design into the official game, extract `exported.level`, give it the next contiguous ID (`levels.length + 1`), append it to the registry and run the regular route/physics tests. Merely importing, saving or testing never performs this publication step. Physics Lab tuning remains separate global configuration; export it separately if a level was designed with non-default tuning.

Imports are bounded to 5 MB, 500 objects per draft, 128 vertices per polygon and 100 drafts per backup. Malformed structures, non-finite settings, unsupported versions and unsafe object keys are rejected before runtime use. These are authoring limits, not a fixed limit on the number of official game levels.

## Explore the game camera

- **✥ Explore** switches mouse/touch dragging to panning. It never spends a kick. An active mode indicator distinguishes it from aiming. The ball and moving mechanisms continue their normal simulation; use Pause for a complete freeze.
- **◎ Return to Ball** smoothly recentres and restores automatic following. Manual exploration stays where you left it until requested; even an automatic red-pad reset does not steal an explored view.
- **+ / −** or the mouse wheel zoom within controlled limits. Two-finger pinch is supported on touch devices; starting a pinch cancels any pending kick. Game zoom is limited to 1×–2.8× relative to the normal view. The separate full-arena map remains available on scrolling levels.
- Overview pauses play and restores the **previous** view, zoom and exploration state when closed. It does not permanently shrink gameplay into a tiny map.
- Screen/world conversion comes from the shared camera transform. A fixed pixel drag has the same kick power across user zoom levels; dragging does not acquire power as the camera moves. Choosing Kick mode after panning allows aiming immediately, or use Return to Ball to follow again.
- Compact levels keep their previous fixed framing by default. Larger levels retain smooth tracking, dead zones, slight velocity anticipation, bounds clamping and off-screen goal indicators.

## Validation and test evidence

Validation checks perimeter/polygon validity, spawn clearance, full right-facing goal placement and net clearance, dimensions, supported mechanic fields, unique gate/switch IDs, switch links, timers, camera dimensions and score budgets. It blocks genuinely invalid Test/Export actions. It permits unfinished drafts to be saved and flags concavity, outside geometry or an unlinked closed gate for review. **Validation does not prove a level is physically completable.**

Automated checks include exact sixty-level preservation; all 60 independently editable official copies; exact concave collision notches; irregular floors and net seams; safe movable-block contacts; history and JSON/backup round trips; manual/automatic camera transitions; anchored zoom and resize; and the existing physics, progression and mechanic tests.

Browser checks use real UI interaction, not editor-function injection: HTML5 object drag/drop, handles, properties, roof vertices, concave polygons, multi-selection, pan isolation, all mechanic families, switch dropdown linking, draft scoring and edit-test-edit preservation, local reload, official copies, downloads, import and backups. Actual draft-mode tests exercise spring/break/switch goals, wind lift, moving/rotating bodies, directional boosts, ice and red resets. Exploration checks use mouse dragging and real touch/pinch events, including no-shot gestures and equal-power drags across zooms. The regular suite also replays the 60 official levels through browser kicks.

- [Combined editor/exploration screenshots](editor-evidence/editor-overview.jpg)
- [Editor with an authored spring route](editor-evidence/editor-spring-route.jpg)
- [All mechanic families and collision overlay](editor-evidence/mechanic-library.jpg)
- [Polygon editing](editor-evidence/polygon-colliders.jpg)
- [Actual draft goal](editor-evidence/draft-goal.jpg)
- [Live draft mechanisms](editor-evidence/live-draft-mechanics.jpg)
- [Exploration in the tall shaft](editor-evidence/exploring-shaft.jpg)
- [Landscape pinch exploration](editor-evidence/mobile-pinch.jpg)

The final runtime suite passed **530 tests**. The complete **24-test browser regression run** passed, including actual drag goals on all 60 official levels. A subsequent **10-test editor/exploration run** passed after the final storage hardening and legacy-zoom guidance check (25 distinct browser cases are now in the suite). The Pages production build passed; a browser smoke test at the production subpath opened the editor directly, saved a draft, scored a real drag-input goal and returned to editing with official progress unchanged and no failed assets or page errors. Public deployment status is reported in the delivery message.

## Remaining limitations

- The editor targets desktop; its own panels and handles are not designed for iPhone authoring. Gameplay exploration supports landscape touch.
- Goals currently require a vertical right-facing perimeter segment. Other orientations, curved walls and holes within a polygon are not authoring features. Simple concave filled shapes are supported.
- Rotation is exposed only where native data supports it. Floor boost/delete and spring strips stay horizontal; springs have a separate launch direction. Camera regions are guides rather than scripted camera paths.
- Basic validation cannot establish puzzle quality, physical solvability or optimal par. Use real kicks in Test mode, including alternative routes and moving-object timing.
- Browser storage is local to the browser/device and has quota limits. Download JSON/backup copies for permanent retention and sharing.
- Desktop Chromium and emulated landscape touch are tested. Physical phones, Safari/Firefox and sustained performance for very large drafts remain unverified.
- The previously missing spoken “GOAL IN ONE!” recording remains outside this update; no new audio or gameplay mechanic was introduced.
