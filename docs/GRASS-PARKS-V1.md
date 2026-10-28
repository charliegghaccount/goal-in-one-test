# Grass Parks background V1

The approved artwork from **Goal In One Final Background.png.zip** is now integrated in all Grass Parks gameplay, user-created/published levels, Studio and Test mode. The same source also supplies the surrounding page background. No level data, physics settings, mechanisms, scoring, progress or campaign schema changed.

## Asset and implementation

- `src/assets/grass-parks/original.png`: exact original bytes extracted from the ZIP, 1672×941, 1,747,156 bytes. SHA-256: `50c09fa6a68f049765012abbcf60babe6162cc96ec14c4fae307df92be311543`.
- `src/assets/grass-parks/background.webp`: same dimensions, WebP quality 92, 172,242 bytes (about 90% smaller). Original retained for reference; this is an optimised derivative, not replacement artwork.
- `src/background.ts`: one shared image resource and cached two-image mirrored Canvas pattern per drawing context. The background draws before boundaries, mechanisms, net, football, aiming guides and overlays. No collision bodies are created. Unloaded/disabled artwork uses a plain blue placeholder; the old park image is no longer eagerly loaded.
- `src/background-layout.ts`: central settings for scale, horizontal/vertical parallax, vertical offset, maximum landscape rise and fill colour.
- `src/render.ts`, `src/editor/ui.ts`, `src/main.ts`, `src/art.ts`, `src/style.css`: shared renderer integration, developer comparison control, editor visibility toggle/load redraw, lazy legacy scenery and page background URL.
- `tests/background.test.ts`, `tests/browser/background.spec.ts`: aspect/scroll math, graphical coverage/seams, resource requests, comparison controls and Retina scoring.

The source aspect ratio is preserved. Canvas rendering uses CSS pixels beneath the existing DPR transform; background zoom stays independent of gameplay zoom. Motion is based on camera-centre displacement from a stable initial reference. Editing arena vertices therefore does not reposition the background or other objects.

## Scrolling and seams

Horizontal movement repeats an original/mirrored pair with moderate parallax. A single continuous Canvas pattern prevents subpixel gaps from separately drawn tile rectangles. Reflection makes adjoining image borders continuous; it is **not an artist-authored seamless texture**, and repeated/mirrored tree forms can still be recognisable. The actual fixed, panned and mobile captures were inspected for hard joins and blank regions.

Vertical movement shifts one landscape band. Above it, the top source-image row extends the matching sky; below it, the bottom row extends the ground. The park landscape never repeats vertically. Upward travel can become open blue sky. Downward movement is capped so the trees/horizon do not scroll entirely above the viewport and leave only grass. These fills are a V1 compromise: extreme extensions lose cloud/ground detail and may look flatter than the original composition.

A future proper layered version could separate sky/clouds, distant treeline and foreground hills into independently looping/parallax layers, with artist-made tile edges. That would reduce recognisable reflection and improve very tall views without changing level geometry.

## Compare or hide artwork

- Open `?dev=1`, then **Settings → BACKGROUND: ARTWORK / PLAIN**. The preference persists locally and applies to gameplay and Studio. This is a visual setting, separate from saved levels and physics. The comparison affects the arena canvas; the decorative page backdrop remains illustrated.
- Studio also has an **Artwork** checkbox, enabled by default, to hide its background while editing. This checkbox only affects that editor view; Test mode uses the developer comparison preference.

## Verification and evidence

The build, all 608 runtime tests and the complete 25-case background/editor/camera browser regression set passed, including the existing sixty level routes and camera/physics checks. Focused layout tests cover common aspect ratios, large positive/negative horizontal movement, preserved aspect ratio and reversible vertical movement. Browser checks cover:

- ordinary fixed level 1;
- horizontal level 53, vertical level 54 and multi-section level 60, including Explore/Return;
- desktop resizing to 844×390 landscape;
- Studio and Test mode, artwork/plain comparison and unchanged object coordinates;
- one artwork request across multiple levels/editor screens, with no failed requests/page errors;
- opaque coverage at extreme horizontal/vertical offsets and mirrored-edge pixel symmetry;
- double pixel density and a completed real mouse-drag goal;
- existing editor, campaign publishing, touch/pinch and fixed roof-edit framing regressions.

See the [ordinary arena](grass-parks-evidence/level-1.jpg), [horizontal exploration](grass-parks-evidence/explored-53.jpg), [vertical exploration](grass-parks-evidence/explored-54.jpg), [multi-section course](grass-parks-evidence/level-60.jpg), [mobile landscape](grass-parks-evidence/landscape.jpg), [Studio](grass-parks-evidence/studio.jpg) and [Retina aiming guide](grass-parks-evidence/aiming-retina.jpg).

Physical iPhone/Android hardware, Safari/Firefox and prolonged performance at very large authoring collections remain unverified. No claim of human playtesting or a full layered-parallax art system is made.

The production Pages subpath was checked in Chromium: the approved artwork loaded, a draft was published into the active campaign, persisted after reload and scored via a real drag. No page errors or failed requests occurred. [Machine-readable verification](grass-parks-evidence/validation.json).
