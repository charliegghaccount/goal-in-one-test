# Grass arenas validation — October 26

Current source and interpretation are documented in [DESIGN.md](DESIGN.md). Historical screenshot folders describe superseded versions; current captures are in `docs/grass-evidence/`.

## Runtime checks

`npm test` passes **109 simulation/storage tests** using the runtime Matter.js engine. Coverage includes input-only routes; exact additive velocity/spin; 100 consecutive kicks; over-par completion; boost direction; red reset retaining shots; goal false positives; mover contact/travel; retry; every reachable boundary segment and exposed polygon face; welded-corner impacts; all-level bank-shot containment; mover roof/floor crushing; save validation and original-layout record migration. Finite tests cannot prove every possible repeated impulse, but no escape occurred in the tested stress cases.

Browser tests use actual mouse press, move and release. They do not assign ball position, velocity, shot count or success. The all-level run uses a controlled animation clock for reproducible movement; a separate landscape touch run uses real time. The five-test browser suite passed with all twenty one-kick goals, save/reload, 21-shot completion, mid-flight kicking/retry, real-time landscape touch, and settings/pause/keyboard/mobile fit. After fixing the landscape precise-controls overlay, the affected UI check and new next-level/replay check both passed: six distinct browser checks in total.

The first browser run completed all 20 levels, including Level 6 in two kicks. A one-kick Level 6 route was then found by simulation search and confirmed in the final all-level browser run. All 20 levels earned three stars through actual drag input. Two new hanging baffles were visually found to extend outside the roof; their top vertices were corrected to the sloping boundary before the final captures.

Three stars require one kick; two stars allow three; later completions still award one. No par failure exists. Legal route inputs are retained in `tests/solutions.ts`; no completion state is injected.

## Visual review

The newly attached PDF was read in full and all ten drawings viewed. Every original arena screenshot is compared with its PDF page, including contour, triangle placement, strips, ball start and outward right net. The [Levels 1–10 contact sheet](grass-evidence/levels-1-10.png), [Levels 11–20 contact sheet](grass-evidence/levels-11-20.png), [PDF comparison 1–5](grass-evidence/comparison-1-5.png) and [PDF comparison 6–10](grass-evidence/comparison-6-10.png) were opened and visually inspected. Full arena and completion captures are retained alongside them. The 10 original levels use the same uniform source mapping, with welded joints and Level 4's closed interior filled. No designer-JSON platforms or internal goals remain.

## Limits

These are automated input playthroughs, not human difficulty testing. Original Flash references were blocked, so subjective original-game feel is unverified. Physical iPhones/Android hardware, Safari, Firefox, audio quality and battery/performance on devices remain untested. Landscape touch uses Chromium emulation. Levels 6 and 16–20 deserve human balancing, especially optimal one-kick solutions; unlimited recovery kicks always remain available. The trajectory guide does not model future collisions or pad impulses.

`npm run build:pages`, `npm run format:check` and `git diff --check` passed. Production-path browser smoke passed: HTTP 200, 20 level cards, successful real-time drag goal and no page errors or failed asset requests. GitHub deployment status is reported separately in the final delivery. Local development: `npm ci`, `npm run dev`; production: `npm run build`, `npm run preview`. Public hosting uses the `/goal-in-one-test/` asset base and existing GitHub Pages deployment script.
