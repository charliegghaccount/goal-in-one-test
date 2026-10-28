# Announcer, white training goal and per-object grass V1

## Announcer rules

The four supplied MP3s are copied byte-for-byte into `src/assets/announcer/`. Their original upload names, renamed asset paths and SHA-256 hashes are recorded in [assets.json](announcer-goal-evidence/assets.json). No speech synthesis, replacement voice or audio transcoding is used.

Selection happens once on the existing `win` event, in this order:

1. Exactly **one shot** → **GOAL IN ONE!**, overriding other conditions.
2. Actual **two-star** result → **GOAL!**, regardless of par.
3. Actual **one-star** result with shots **≥ par + 2** → **Should Have Done Better There**.
4. Other **one-star** result → **A Solid Effort**.
5. A **three-star** result requiring multiple shots → normal celebration sound, without a voice.

`announcementFor()` calls the existing `rating()` function, using each level's configured star thresholds. Completion titles use the same selection, while the stars and saved best scores retain their original calculation. Draft Test mode follows the same rules without saving official scores.

The existing AudioContext is unlocked/resumed on user interaction. All four clips (183,940 bytes in total, mono 44.1 kHz MP3) load and decode once per visit and remain cached. The default voice gain is 0.8, and celebration tones play at 22% of their usual level beneath a voice. A missing/undecodable clip falls back to the normal goal sound. There is no delayed voice/chime queue across rounds.

A round guard prevents duplicate announcements. A cancellation token stops late decoding from speaking after restart, navigation or mute; active voices and pending sound tones are also stopped on cleanup. A muted completion is consumed and does not replay after unmuting.

## White training goal

The reference supplies the white metal material and square net style. The explicit request for an open entrance takes precedence over the reference image's left post.

The shared Canvas renderer draws three shaded, outlined white metal tubes: top, sloping rear and bottom. There is **no vertical entrance post or dashed entrance line**. The net is clipped inside the existing wedge, with a clear inset at the entrance and a subtle scoring ripple. Goal geometry, body/sensor definitions, scoring tests, dimensions and resize/reposition controls are unchanged. Signed-width native goals also mirror correctly.

See [goal artwork](announcer-goal-evidence/white-goals.png), [Studio](announcer-goal-evidence/studio-grass.jpg) and [playable draft](announcer-goal-evidence/play-grass.jpg).

## Per-object grass edging

Select a wooden object in Studio and use **Properties → Grass edging**. This applies separately to blocks/platforms/ramps/custom polygons, moving blocks, breakable wood, gates and rotating/swinging timber. Edging follows the object's local upper edges, including slopes and rotations. New objects and old objects with no flag remain bare.

Selecting **Arena boundary** exposes the same checkbox for the existing floor edging; its legacy default stays enabled. It affects the arena's existing floor strips only. Switching one object's grass never changes any other object.

The optional boolean `grass` is stored directly on the level's wooden object (or level for the arena floor). It survives native save/load, undo/redo, duplicate, JSON export/import, campaign publishing and reload. Existing documents need no migration. No collision points or physics settings change.

## Verification and manual follow-up

- TypeScript and Vite GitHub Pages build pass, with four hashed MP3 asset URLs under the existing hosting base.
- All 620 runtime tests pass, including the original level/physics checks, announcer precedence, once-only routing, active-source cancellation, mute/late-decode races and grass import/publication persistence.
- All 36 selected Chromium browser checks pass, including existing editor, campaign, camera, touch, background and material regressions. New checks use actual mouse drags to complete one-, two-, three- and four-shot goals, verify all four original decoded recordings and their selected playback, confirm silence for multi-shot three stars and a muted goal, check restart cancellation, and check completion titles/stars. These do not inject goal events or change shot counters.
- Renderer pixel checks confirm transparent entrances on both orientations and shaded white bars. Studio checks place and rotate grass-enabled objects alongside a bare block, disable arena grass, resize the white goal, save/publish/reload, compare exported designs and score the resulting draft through mouse input.
- The production-build smoke test verifies save/publish/reload, an actual one-shot goal in the normal campaign, all four hashed MP3 responses and playback of the supplied 2.508-second one-shot buffer, with no page errors or failed requests.

Screenshots were visually inspected against the supplied goal reference, including the deliberate removal of its entrance post. Physical speaker/headphone listening and volume balance on iPhone/Android, Safari autoplay/interruptions and native Capacitor lifecycle behaviour still need device testing. Headless Chromium verifies decoded playback and routing, not subjective listening quality. The complete 60-level browser route tour was not repeated for this visual/audio update; existing layout and physics runtime regressions remain passing.
