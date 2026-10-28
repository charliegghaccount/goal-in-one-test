# Cartoon wood texture V1

The supplied **Goal In One Wood Base.png.zip** now supplies the shared wood material in gameplay, Level Studio and Test mode. There are no new dependencies or changes to level data, physics, collision geometry, scoring, campaign storage or camera behaviour.

- `src/assets/wood/original.png` preserves the exact 1254×1254 source PNG (1,491,260 bytes; SHA-256 `9e51e731be0f14adcc45d0cac9f5211a176f613264edae79ec7cd28bd0d9b51d`).
- `src/assets/wood/texture.webp` is a 512×512, quality-94 derivative, 43,196 bytes. Its aspect ratio is unchanged; the full-resolution original remains available for future art work.
- `src/wood-material.ts` loads the image once and caches a small mirrored 2×2 repeating pattern per Canvas context. One source tile always occupies **256 world units**, controlled by `WOOD_TILE_WORLD_SIZE`. Object width/height never changes the texture scale.
- `src/art.ts` applies the texture to polygon wood, arena beams and the exposed wood under floor turf. Polygon fills, dark outlines and directional highlights/shadows are clipped inside the original polygon, including concave cutouts. Boundary outline widths and corner hardware retain their previous extent.
- `src/render.ts` supplies supported polygon/mover rotation to the texture transform. Rotors and swinging timber inherit their existing local Canvas rotation. Moving objects carry their texture with them. Gates and breakable timber use the same material through the existing shared renderer.
- `src/editor/ui.ts` redraws the stationary editor when the texture finishes loading. Handles, selection overlays and the fixed authoring frame continue to use the actual geometry.

The green net, metal fasteners and coloured mechanism markings remain recognisable. This is a material test, not a new lighting engine or a redesign of those objects. Small borders naturally reveal less grain, and mirrored/repeated grain may be recognisable on very large surfaces. Legacy irregular polygons without an authored rotation keep horizontal grain; editor-rotated polygons and rotating bodies use their supported rotation.

Browser checks compare interior pixels of differently sized blocks and beams to verify fixed grain density, check transparent concave notches and outside pixels, and exercise actual editor placement/rotation and Test mode. Level 2 scores through a real drag with the new textured ramp and boundaries. Screenshots were visually inspected: [gameplay ramp](wood-evidence/gameplay-ramp.jpg), [rotated and custom Studio shapes](wood-evidence/studio-shapes.jpg), [live wooden mechanisms](wood-evidence/live-mechanisms.jpg).

The runtime suite covers all sixty existing input routes and their physics/camera checks. The final delivery includes the relevant background/editor/camera/campaign browser regression results and production-subpath smoke test. Physical phones and Safari/Firefox remain unverified; Chromium and emulated landscape touch are tested.

Final checks: **608 runtime tests and all 27 visual/editor/camera browser tests passed**. The production Pages subpath loaded the shared texture successfully, retained a published draft after refresh and completed it with a real drag, with no page errors or failed requests. [Verification data](wood-evidence/validation.json).
