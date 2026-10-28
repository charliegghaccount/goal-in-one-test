# Timber Interface V1

Four approved images supplied in `Archive 2.zip` were inspected: Main Menu, HUD, Level Select and Level Completion. They are visual references only; none is displayed as a flattened interface or shipped in the production bundle.

## Shared design and screens

The previous layered game stylesheet is replaced with one timber design system. Panels, pills, buttons, tiles and overlays use the existing repeating honey-brown wood texture, dark rounded edges, inset highlights, screw heads, cream lettering and gold stars. The stars have scalable SVG shading; small grass trims and shadows remain decorative. Hover/press transitions are short and reduced-motion preferences suppress decorative animations.

- **Main Menu:** a live two-line wooden GOAL IN ONE sign with the existing football artwork, a prominent PLAY button, LEVEL SELECT and SETTINGS. PLAY continues to the first unfinished active campaign level, or replays the first when all are complete. An empty campaign disables PLAY. A decorative Canvas scene uses the existing timber, grass, ball and white goal helpers over Grass Parks; it is not a new playable level.
- **Gameplay HUD:** separated wooden LEVEL and live SHOTS/PAR pills, sound/restart/pause controls, and a compact camera drawer. The drawer retains overview, explore/pan, Return to Ball, zoom, precise aim and controls help. Settings remain directly accessible. Tools move into the HUD so the remaining viewport belongs to the unchanged camera; a separate bottom toolbar no longer reduces the arena view. Studio Test mode keeps its live shot counter, pause/restart and Return to editor.
- **Level Selection:** a five-by-five grid, one chapter at a time, with previous/next arrows, GRASS PARKS chapter sign and chapter stars out of 75. Tiles show their number and three stars; completed tiles have earned gold stars, available tiles remain playable, the next unfinished tile has a gold outline, and unpublished slots are dimmed with lock icons. Level thumbnails are removed from this screen; Studio retains its campaign thumbnails.
- **Completion:** a wooden panel with LEVEL, the existing performance-based heading, three earned/unearned stars, SHOTS/PAR and REPLAY/NEXT LEVEL. BACK TO LEVELS remains an accessible back button. Final active levels offer ALL LEVELS; drafts offer RETRY TEST/RETURN TO EDITOR. Brief gold particles are stronger for one-shot finishes. Original ElevenLabs recordings and their trigger rules are unchanged.

## Chapters, access and persistence

The current campaign contains **60 levels**, not 100. The UI reserves four chapters: 1–25, 26–50, 51–75 and 76–100. Existing levels 1–60 all remain open. Slots 61–100 are disabled **coming-soon placeholders**, not invented courses or newly locked existing courses. Published Studio levels fill available slots using the active campaign order. Campaigns larger than 100 can expose further 25-slot pages automatically.

Tiles 25, 50, 75 and 100 have gold LONG HOLE treatments. This is an interface marker: the existing course geometry is not lengthened or replaced.

Chapter totals and continuation use the existing `bestFor()` and `rating()` functions. Saved legacy scores, stable design IDs, revisions, mute settings, campaign edits and progress storage keys are preserved. Returning from a level opens its chapter. No unlock thresholds or new progress store were introduced.

## Responsive behaviour and controls

The UI reflows as HTML/CSS rather than scaling a 16:9 screenshot. The viewport includes `viewport-fit=cover`; screen padding uses safe-area insets. Landscape targets include 960×540 (16:9), 932×430 and 844×390 (wide iPhones), and 740×360. Main controls and level tiles retain at least 44-pixel tap targets at these sizes. A smaller-screen grid can scroll when that minimum cannot fit; a portrait fallback also reflows the HUD.

The camera drawer opens intentionally, with controls separated from the shooting canvas. Starting a kick closes it. Mouse/touch kicking, pan/zoom, camera overview pausing and keyboard shortcuts retain their existing implementations. The camera, simulation, level geometry, object artwork, announcer selection and save modules are unchanged.

## Visual evidence and verification

See the [desktop main menu](ui-v1-evidence/home-1440.jpg), [25-tile selection](ui-v1-evidence/select-1440.jpg), [HUD](ui-v1-evidence/hud-1440.jpg), [completion](ui-v1-evidence/complete-1440.jpg), [wide-iPhone menu](ui-v1-evidence/home-844.jpg), [mobile selection](ui-v1-evidence/select-844.jpg), [mobile HUD](ui-v1-evidence/hud-844.jpg) and [mobile completion](ui-v1-evidence/complete-844.jpg). Additional chapter and 1-/2-star result screenshots are in the same folder.

- The production Pages build passes TypeScript and Vite.
- All 623 runtime tests pass, including new checks for 100 chapter slots, preservation of all 60 accessible levels, stable-ID progress and continuation.
- All 59 distinct browser checks are verified. The primary run passed 58; one cached assertion still expected visible course names on tiles. It was updated for the requested number/star tiles to check the accessible name, completed state and earned stars, and the full Studio draft/test/publish/reload/export/import case passed on rerun.
- Fresh actual mouse-drag completions passed for all levels 1–60, including alternate routes and real-time touch goals.
- Dedicated browser checks exercise all four chapters, legacy-score preservation, unavailable slots, empty campaigns, live shooting, pause/replay, camera tools, Studio navigation and the above responsive sizes. Existing mobile camera checks retain the 20-pixel minimum ball diameter for the authored campaign.
- A production-build browser smoke check at `/goal-in-one-test/` verifies Studio save/publication/reload, an actual campaign goal and the original one-shot recording, with no page errors or failed asset requests.

Browser helpers were updated for the requested 25-slot paging, REPLAY label, tile names in accessible labels and the explicitly opened camera drawer. Physics assertions and real drag input remain in place.

## Manual follow-up

The desktop and landscape screenshots were visually compared against all four approved references, including the compact HUD, locked future chapter and one-/two-/three-star panels. The implementation uses platform rounded/system fonts and procedural trim/lighting; it is an adaptation rather than a pixel-identical copy of the painted references. Physical iPhone/Android devices, Safari font rendering, actual notch/home-indicator insets, browser chrome changes and native Capacitor packaging still require device testing. Subjective announcer loudness remains a listening check; the supplied recordings were preserved.
