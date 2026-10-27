# Level Studio V2 — campaign authoring

[Open Level Studio](https://charliegghaccount.github.io/goal-in-one-test/?dev=1&editor=1&v=studio2) on a desktop. Choose **Campaign** in its top toolbar to open the Campaign Manager. Alternatively launch the game with `?dev=1`, then **Settings → Level Editor → Campaign**.

This release generates no new official levels and keeps Park & Treeline artwork. The sixty original prototypes remain recoverable. Changes to the global boost physics are intentional.

## Edit, test, publish, play

1. Open **Campaign**. Find a design by its name, permanent ID or campaign position and choose **Open / Edit**. To edit the current ninth playable puzzle, open the card numbered **9**; its permanent identifier may differ after reordering.
2. Move objects, resize edges/corners or reshape the arena. Use **Save Draft** whenever useful. This does **not** alter the playable version.
3. **Test Level** opens the same simulation and controls used by the game. Unlimited mid-flight kicks, scoring targets, camera Explore/Return/zoom and audio remain available. Test results never write campaign scores. **Return to editor** preserves the design and workspace.
4. **Publish to Game → Save & Publish** validates geometry and mechanism settings, saves the draft and publishes a new revision. Choose a campaign position; existing designs keep their current position by default. A new revision starts a new best score so old records cannot score a different puzzle.
5. **Exit → Level Select** immediately plays the updated collection. Refreshing/reopening the same browser retains the campaign. No build is necessary for this local workflow.

**Local publishing changes only this browser and origin.** It does not update GitHub, a friend's browser or a phone. Keep exported backups, especially when changing hosting URL or clearing site data.

## Organise the campaign

Cards show a geometry thumbnail, name, current campaign position, difficulty, publication status, modification date, permanent design ID and published revision. Filter/search makes the whole collection accessible.

- **New** creates an editable draft. **Publish to Game** inserts it at a chosen position. There is no fixed sixty-level limit; the current import safety limit is 2,000 designs.
- Drag a published card onto another published card to move it to that position. Alternatively edit its **Campaign position** field and commit with Tab. Content and permanent IDs remain unchanged.
- **Duplicate** creates a new independent draft/identity. **Rename** edits the draft name; Publish commits it to gameplay.
- **Unpublish** removes the playable edition from the active order and keeps its draft and recent history. **Publish** makes it playable again.
- **Archive** reversibly removes a design from play and retains its draft, published edition and history. Filter **archived**, then **Restore** to recover it. Restore reinserts an archived published design at the end; change its position afterwards. An unpublished restored draft must still be published.
- **Version history** restores a selected previous publication as a fresh revision. Up to five previous publications are retained per design.
- **Restore original campaign** asks for confirmation and restores the original sixty playable templates/order. Edited built-ins and custom work are kept as archived recovery designs. Export a backup first to preserve the exact previous collection/order.

Level selection, home totals, pagination, in-game navigation, Next Level and completion use the active order. An empty campaign is valid: publish or restore a design to play again. Legacy numeric best scores are associated with `builtin-N`, revision 1; they never follow a new display number. New records use `permanent-id@revision`. Archived/replaced records remain stored but are excluded from active star totals.

## Resizing and boundaries

Select a resizable object to display eight handles. Side handles move only that side, holding the opposite edge fixed; corners hold the opposite corner. Rotated rectangles resize in local axes and keep their rotation. Drag the object interior to move it. Irregular polygons retain vertex editing.

- **Shift** while resizing preserves proportions.
- **Alt/Option** resizes around the centre.
- Grid snap is optional and applies to handle target positions; minimum size is eight world units. Thin spring/boost/ice strips retain their native thickness.
- **Escape** cancels the active manipulation. Undo/Redo treats a completed drag as one operation.
- Selection has clear resize cursors; rotation still uses the separate purple handle. Goal resizing remains constrained by a valid boundary opening.

**Arena vertices** shows round corner handles and square edge midpoints. Drag a midpoint to translate both connected endpoints, including floor, roof and side-wall segments. Drag a corner independently; add/remove vertices in Properties. The selected vertex's following edge offers exact **Edge length**, **Make horizontal** and **Make vertical** controls. Coordinates edit precisely. These edit the real closed collision loop, not decorative borders.

Nine starting templates are available: rectangle, wide, tall, stepped, sloping floor, sloping ceiling, multi-platform, long scrolling and multi-section exploration. All are editable starting frames. Moving the wall supporting the goal attempts to keep a valid snapped opening; an impossible net placement remains visible as a validation error instead of silently undoing the wall edit.

Simple concave filled polygons are supported; holes/curves are not. Goals can now stand anywhere in a clear space inside the arena, with a right-facing entrance, or attach to a vertical right-facing wall. Drag the net directly or choose goal in the Object dropdown; Properties supports exact entrance X/Y coordinates. Boundary edits repair an invalid wall attachment by finding a nearby valid net position. Free goals retain every perimeter collider and their own physical roof/back/floor; validation blocks nets outside the arena or overlapping solid obstacles. Collision and rendered geometry share the same definitions. Basic validation cannot prove route solvability or good scoring thresholds.

## Motion and mechanism controls

**Moving blocks:** select a block and drag purple **A · START / B · END** handles to define a straight two-point line. Horizontal, vertical and diagonal paths use the real runtime. Editing A also moves the authored initial position; editing B changes its destination. Moving the whole object translates both endpoints. Legacy axis/travel definitions still run unchanged and remain editable; dragging an endpoint converts them into a path.

Properties expose full out-and-back cycle time, one-way duration, mean speed in units/second, loop mode and initial phase. Motion uses smooth cosine easing; peak speed is π/2 times mean speed. Phase 0 starts at A, phase 0.5 at B. **Once** traverses A→B over half a cycle then holds; starting phase advances that initial trip. Peak path speed is limited to 400 units/second through validation to protect thin colliders. The runtime also bounds translation per physics step. Supported-ball anti-crush checks may pause a block rather than press the football through timber.

**Springs:** drag the pink direction arrow to aim; its angle and length communicate launch direction and strength. Up-left is approximately 135°. Numeric direction/strength and a strength slider are also available. The arrow uses the same positive-up angle convention as the actual football launch.

**Rotors and swings:** set degrees/second, clockwise/counterclockwise direction, centre angle/phase, swing range and period. Custom pivots expose coordinates and a draggable pivot marker. They use the existing top-centre hanging-timber attachment; moving the pivot moves that attachment. Initial phase is applied consistently in preview and gameplay. Numeric fields and sliders use designer units; runtime radians are converted internally. Validation limits angular speed to 3 rad/s, swing peak speed to that same bound, and tip speed to 400 units/second. Larger/faster objects must use an appropriate period for predictable collisions.

**Switches:** Width/Height or the eight handles resize the real rectangular collision sensor and artwork. Legacy unconfigured switches preserve their circular sensor. Choose a linked gate from its dropdown; link lines identify the target. Toggle and timed activation remain available, with a configurable timer.

**Gates:** resize the closed solid normally. Drag the teal **OPEN** endpoint/translucent ghost to define horizontal, vertical or diagonal travel. Properties set exact offsets and independent opening/closing durations. A timed switch's activation timer begins on contact, so allow time to open fully. Gates protect a supported ball from being crushed; this can delay movement during contact. Explicit new durations that demand more than 400 units/second are rejected. Legacy gates retain their 0.7-second timing.

**Play/Pause Preview** animates blocks, rotors, swings, gates and wind artwork without running football physics or scoring. Shared motion functions drive preview and gameplay. Gate preview cycles open, holds briefly, then closes using its actual offset/durations. Preview demonstrates motion, not switch triggering or collision outcomes. Select a moving preview body, choose an object or start editing to pause; bodies return to authored editable positions. Legacy axis/travel blocks rest at their authored motion centre while paused and use their original cosine trajectory when preview runs. Use Test for contacts, anti-crush behaviour and complete routes.

## Boost physics

The global default is now **2.0**, previously 0.32. Physics Lab allows 0.1–5.0. Loading old `physics:v1` tuning preserves other fields and deliberately establishes the 2.0 boost baseline. New saved `physics:v2` tuning can explicitly choose a different value.

Per-pad overrides remain supported. Pre-V2 imported/stored weak overrides ≤0.8 are multiplied by 6.25, capped at 5, and marked `boostVersion: 2` to migrate once. Newly authored/imported marked overrides retain their exact value, including intentionally weak pads. Existing sixty bundled levels have no explicit pad acceleration override, so all use the stronger global setting.

Boost force acts continuously during contact with a smooth velocity taper toward 18 units per Matter reference frame; it is not a repeating timed impulse. Initial contact integrates only the contact substep. Adaptive substeps keep fast kicks enclosed. Level 5 was checked through actual browser drag input with the new default, along with backward/other boost prototypes. Test evidence and remaining tuning notes are recorded below.

## Backup, interchange and deployed releases

- **Export** exports the current individual design as the compatible versioned level/draft envelope. **Import** accepts native levels, individual envelopes or older draft bundles, creating independent draft copies.
- **Campaign → Export entire campaign** exports ordered published editions, all editable drafts (including unpublished/archived designs), metadata and recent version histories as `goal-in-one-campaign`, version 1.
- **Backup All** first saves the open draft and exports that same complete campaign. **Campaign → Backup everything** exports the saved collection, including the current draft saved upon opening the manager.
- **Import entire campaign** accepts a file or pasted JSON, validates it and asks before replacing the active campaign. Use file import for large AI batches. Displaced or conflicting local designs remain archived as recovery copies; changed content reusing a local ID/revision receives a newer revision. Back up first for exact restoration, since import intentionally preserves displaced work.

Storage: `goal-in-one:campaign:v1`; old editor draft/recovery keys remain readable. Malformed campaign storage falls back to originals with a warning; the corrupt value is retained until an explicit save/restore. Quota failures do not pretend a publish succeeded. The draft remains open for downloading. Campaign format/version, IDs, order, structure, geometry and mechanic settings are checked. Individual limits: 5 MB, 500 objects, 128 vertices per polygon; campaign import: 20 MB/2,000 designs. Campaign backups exclude personal best scores, sound preferences and global Physics Lab tuning; export non-default Physics Lab settings separately. Per-pad overrides are included. Browser local storage commonly has a much lower quota than the import limit: use exported files and release bundling for larger collections.

To promote an approved exported campaign to the bundled build:

```sh
npm run campaign:bundle -- /absolute/path/to/goal-in-one-campaign.json
npm test
npm run build:pages
```

The command validates the complete export and writes `src/data/campaign-release.json` with **only the active published editions**, their stable IDs/order and metadata. Unpublished drafts/history stay in your backup. Review and commit that file, then use the repository's normal Pages deployment. There is no manual level transcription. A browser with no local campaign uses bundled release data; an existing local campaign continues to take precedence. Keep its backup, then use a fresh browser/profile to review a deployed release. The original source prototypes remain recoverable templates.

## Verification

The complete runtime suite passed **583 tests**. A full **33-case browser regression run** passed, including actual drag-input goals on **all sixty prototype levels**, mobile touch, camera controls and the existing editor. After final schema/pivot/metadata hardening, all **9 V2 acceptance cases** passed again (34 distinct browser cases now exist). These include draft isolation, Level 9 edit/test/publish/reload, campaign reordering and score identity, file interchange, new middle insertion, archive/unpublish/restore, anchored rotated resizing, irregular boundaries, diagonal paths, a visual up-left spring, a 12×20 switch opening a diagonal gate over 2 seconds and closing it over 1, metadata status and storage failures.

**Level 5:** a real 10° / 90% mouse drag completed the original geometry with the 2.0 baseline. Levels 6, 13 and 16 were checked explicitly as additional boost routes; real contact tests also measured smooth acceleration and opposing-momentum reversal. The sixty browser routes still score, so no prototype requires a geometry repair based on these checks. Human difficulty/optimal-par review remains future design work.

The Pages production build passed. At `/goal-in-one-test/`, an isolated browser saved/published a draft into position 9, refreshed, loaded that version through normal level selection and scored with real drag input; no page errors or failed requests occurred. The release-bundling command also compiled an exported collection; a fresh browser loaded its reordered published revision and scored it. The shipped release leaves the original sixty-level default order in place.

See [the review contact sheet](studio-v2-evidence/studio-overview.jpg), [full campaign](studio-v2-evidence/campaign-collection.jpg), [rotated resize handles](studio-v2-evidence/resizing-rotated.jpg), [actual spring launch](studio-v2-evidence/spring-arrow-runtime.jpg), [diagonal gate in play](studio-v2-evidence/diagonal-gate-open.jpg), [published Level 9 goal](studio-v2-evidence/published-nine-goal.jpg) and [production build goal](studio-v2-evidence/production-published-goal.jpg). Machine-readable details are in [validation.json](studio-v2-evidence/validation.json).

Screenshots are captured from the real browser editor/game, with actual pointer inputs and shared simulation. Automated route tests are not human playtesting. Physical phones, Safari/Firefox and sustained authoring at the 2,000-design limit remain unverified.

Optional conveniences not implemented: nearby-edge/vertex magnet snapping (grid snapping is supported), curved/multi-point motion paths, online publishing/accounts/sharing, authoring on a phone, polygon holes and other goal orientations. These were not added to the scope. No extra official levels were generated.

Goal-placement follow-up: **586 runtime tests and all 10 V2 browser cases passed**, including tilting the goal wall, freely dragging the net, scoring with real kick input, and rejecting an outside-arena placement. See [the free-standing goal screenshot](free-goal.jpg).
