# Designer-authored levels, October 24 revision

The latest `Goal_In_One_First_10_Level_Blueprints.json` and `Goal_In_One_First_10_Level_Designs.pdf` supersede the October 21 rough contours. All JSON fields and all eleven PDF pages were inspected, including the layout drawings. The original supplied JSON is retained as `src/blueprints.json`; the visual source is `docs/specifications/levels-v2.pdf`. Embedded design suggestions are treated as specifications, with the user's scope and rules taking precedence.

The runtime imports the JSON directly, using one uniform mapping from bottom-left design units into Canvas coordinates: x=40+12x, y=740−12y. Rectangles, shelf pads, start positions and movers use that mapping. The existing football radius, kick impulse, restitution, gravity and friction are unchanged. A fixed full-arena view fits the enclosure independently of goal elevation.

The rectangular enclosure is closed on all four sides. Its visible strokes and colliders share segments, using the existing welded rounded-wall construction. The existing 10.4-unit stroke is retained instead of the schematic's suggested 24-unit border, avoiding an unnecessary physics change. Internal goals have a roof, back and floor. Their open mouth is directional: positive travel for the right-side goals and negative travel for Level 5. Goal art mirrors the net mesh as well as the frame. A whole-ball crossing through the mouth is required; spawning inside or striking the outside does not count.

Goal markers in the PDF are interpreted as centers of eight-unit-wide, eight-unit-tall nets resting at the specified goal height. Level 10's goal base is lowered one design unit to meet the high deck (top y=39), rather than leaving an unsupported y=40 lip. This preserves the high-goal challenge and makes rolling entries fair. Left/right goal meanings follow the intended travel direction stated by the designer.

Level 2's low wall is reduced from 15 to 10 design units after only 2/15 nearby one-kick samples succeeded at the authored height; 7/15 succeeded after tuning. Level 9's red strip is narrowed symmetrically from x=61…79 to 64…76, improving recovery around the ledge while retaining visible risk.

Level 7's gate travel is shortened to bottom-edge y=5…12 instead of 5…24 so the 21-unit-tall block does not pass through the ceiling shelf at y=36. A trapped ball blocks the descending gate at the floor. Other moving-object ranges and periods remain authored, including Level 9's horizontal sweeper. No new mechanic, world, UI system or engine is introduced.

Par values remain 1,1,2,2,2,2,2,3,3,3: practical routes fit them, with extra allowance in later combinations for recovery. Two-star thresholds are par+2; all later completions earn one star. Unlimited additive kicks, mid-flight aiming, immediate retry, red reset preserving shots, menus and local saves remain. A new designer:v4 namespace avoids presenting scores from replaced levels as current records; previous sound preference is retained and old keys are untouched.

Current evidence and limitations are in [VALIDATION.md](VALIDATION.md). Older screenshot folders record superseded layouts and are not current validation.
