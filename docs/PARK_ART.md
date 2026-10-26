# Park & Treeline artwork update

The user's pasted artwork request and five-page [Park & Treeline Style Guide](specifications/park-treeline-style-guide.pdf) define this update. All pages were extracted/read; the page 2 world/UI imagery and page 3 A3/B2/C1 components were rendered and visually inspected. The selected combination is park scenery, wooden obstacles, timber boundaries and green training goals. Unselected black-metal frames/ramps in the reference examples are not reproduced.

## Assets produced

- `src/assets/park.webp`: original scenery generated with the image-generation tool specifically for this project, then encoded as a 285 KB WebP. Blue sky, soft clouds, distant hills, trees, grass, a bench, fence and path create depth. It contains **no ball, goal, arena, obstacle, logo or UI**, and is not a pasted reference screenshot.
- `src/assets/logo.svg`: separate white/yellow outlined logo artwork.
- `src/assets/football.svg`: separate shaded football illustration for the menu. The in-game rotating football remains a separate Canvas object, with improved radial shading at the existing radius.
- `src/art.ts`: reusable Canvas timber system. A cached procedural plank texture includes warm shading, grain, knots and seams. Polygon clipping keeps bevels and bolts inside the existing shapes. Texture origins follow moving blocks, so the grain travels with the object. Beam strokes follow the exact boundary segments and width; separate metal plates/fasteners mark joins.
- Floor grass/dirt decoration, bright green post highlights and white netting are drawn separately. Special pad colors and arrows remain exposed; dark rims improve contrast against grass. The existing boost/reset/impact/net particles and brief net ripple remain, with dust/grass colors adjusted to the setting.

Scenery uses uniform cover scaling, without image distortion. There is no parallax or new camera behavior. Its scenery depth is painted into one cached background asset; gameplay, timber, floor trim, goal/net, football, effects and HUD remain independent rendering layers. The background is also reused behind the menus. No external runtime image/font service is needed.

## Screens and scope

All 20 levels use the shared renderer. The main menu now has the logo, Play, Level Select and Settings over the park. Level selection shows all 20 open tiles, score stars and saved completion styling; no new lock restrictions were introduced. HUD, pause/help/settings and completion panels share rounded blue/white panels, glossy blue controls, green primary buttons and gold star animations. Reduced-motion preferences disable the new star animation.

No changes were made to `src/levels.ts`, `src/extra-layouts.ts`, `src/simulation.ts`, `src/progress.ts` or the canonical simulation solutions. Spawn points, all obstacle shapes and paths, goals, colliders, impulse strengths, timing, unlimited/moving kicks, shot counts, star thresholds and saved progression remain identical to the preceding release. The menu's old animated gameplay preview was replaced with separate decorative artwork; live gameplay rendering remains unchanged in timing and input handling.

## Executed verification

Before editing, fresh browser captures were made of the menu, selection and Levels 1, 6, 9 and 20: [before captures](park-evidence/before/).

- **109 runtime physics/storage tests passed.** These include all 20 routes, boundary/corner impacts, enclosure stress, ramps, boosts, red reset retaining shots, moving obstacles, goal validation, unlimited/additive kicks and saves.
- **Six browser tests passed as a complete suite**, using actual pointer inputs for all 20 one-kick goals, saved 60-star progression after reload, 21-shot completion, mid-flight kicking, immediate retry/next controls, pause, keyboard, settings and mobile fit. Landscape touch completion also passed in real time. The full twenty-level run uses a controlled animation clock and never injects ball position, velocity or success.
- Level 3's old input route missed in the new canvas fit. The browser route was changed to a separately simulation-verified 65°/90% kick, then the entire browser suite passed. Game geometry and physics were not changed to make the test pass.
- After reviewing pad visibility against grass, only its decorative rim was changed. A separate browser capture run refreshed all 20 final arena/layout screenshots. Screenshots are JPEG review artifacts to keep repository size reasonable; runtime assets remain WebP/SVG/Canvas.
- Desktop, 932×430, 844×390 and 740×360 landscape captures were reviewed. The existing mobile controls, full-arena fitting, no horizontal overflow and precise-aim overlay continue to work.

The final Pages-path build and formatting checks passed. Production-path browser smoke passed: HTTP 200, all 20 cards, loaded artwork assets, a real drag goal, no failed asset requests and no page errors. Publishing status is reported separately in the final delivery. Contact sheets can be regenerated with `python scripts/art-contact-sheet.py` (Pillow required).

## Visual review evidence

All twenty layouts were opened through the two larger contact sheets and the full contact sheet, then compared with the world/component reference pages. Wood is clipped to triangles, platforms, baffles and moving blocks; frame joins follow the unchanged roof geometry; the white mesh stays behind the open right-hand goal mouth. The final review corrected flat-button cascade overrides and improved pad contrast.

- [All 20 levels](park-evidence/all-20-levels.jpg)
- [Larger Levels 1–10](park-evidence/levels-1-10.jpg) · [Larger Levels 11–20](park-evidence/levels-11-20.jpg)
- [Main menu](park-evidence/menu.jpg) · [Level selection](park-evidence/select.jpg)
- [Completion](park-evidence/goal-1.jpg) · [Before/after menu](park-evidence/before-after-menu.jpg)
- [Moving wooden block](park-evidence/level-9.jpg) · [Boost strip](park-evidence/level-5.jpg) · [Combined mechanics](park-evidence/level-20.jpg)
- [Landscape gameplay](park-evidence/landscape-844.jpg)

## Remaining differences and limits

This is an original implementation of the selected visual direction, not a pixel-identical copy of the concept images. The timber beams retain the existing collider width, so they appear slimmer than the reference's chunky beams. The park is one painted scenery layer rather than independently animated tree/cloud sprites. The logo, wood grain and button details are original; simplified miniature level previews prioritize legibility.

Physical iPhone/Android hardware, Safari/Firefox, device battery use and low-end GPU performance have not been tested. Mobile evidence uses Chromium viewport/touch emulation. The playthroughs are automated browser input, not human difficulty testing. No new human balancing claims are made for this artwork-only release.
