# Stormraider Model Asset Guide

This guide defines the model quality bar and file contract for future player, enemy, and Boss art.

For the first player ship, use `PLAYER_MODEL_BRIEF.md`.

## Art Direction

- Style: premium low-poly sci-fi aircraft, not toy blocks.
- Readability: each craft needs a clear nose, body mass, wing or armor language, and one memorable silhouette hook.
- Camera: models are viewed from an angled top-down camera, so the top silhouette matters more than side detail.
- Palette: thunder blue, electric purple, warning orange, enemy pink, and cool dark metals.
- Materials: flat shaded or lightly faceted, with controlled emissive accents. Avoid photoreal PBR noise.
- Upgrade attachments should not read as plastic blocks. Favor layered armor plates, bevel-like chamfer geometry, metal/ceramic contrast, recessed emissive cores, weapon barrels, brackets, vents, heat sinks, and power conduits.
- Level-7 Ultra parts should look mechanically transformed: brighter trims are not enough on their own; add visible emitters, opened fins, split armor, charged capacitors, or deployed auxiliary hardware tied to the trait's combat effect.
- Future armory codex previews should show the trait-owned external attachment by itself across levels 1-7, not the whole prototype ship. Use the full ship for combat and Model Lab review; use cropped/local modules for trait evolution.

## File Format

- Preferred format: `.glb`.
- Acceptable format: `.gltf` with adjacent textures only when needed.
- Texture target: 512px or 1024px max per map for normal units, 2048px max for Bosses.
- Meshes should be named clearly: `body`, `wing_l`, `wing_r`, `cockpit`, `engine_l`, `engine_r`, `weapon_mount`, etc.
- Keep transforms applied before export. Do not rely on hidden editor scale.

## Scale And Orientation

- Positive Y points forward, toward enemies.
- Z is vertical height.
- The model origin is the gameplay center.
- Player ship should fit inside the current mobile safe width.
- Boss models can be wide, but bullets and HP panel must stay readable around them.

## Triangle Budgets

- Player: up to 2500 triangles.
- Common enemies: 800-1200 triangles.
- Elite enemies: 1200-1800 triangles.
- Bosses: 6000-7500 triangles.

These are first-pass budgets. We can raise them later if mobile performance stays stable.

## Runtime Slots

`public/config/models.json` defines the first import slots:

- `player_ship`
- `enemy_drone`
- `enemy_skimmer`
- `enemy_sentinel`
- `enemy_wraith`
- `boss_01`
- `boss_02`
- `boss_03`

Each slot has:

- `enabled`: keeps the procedural fallback active until a model is ready.
- `url`: path under `public/models/`.
- `fallback`: currently always `procedural`.
- `scale`, `rotation`, `offset`: tuning values for in-game alignment.
- `maxTriangles`: asset budget for review.

Current runtime support:

- `player_ship` is wired to a runtime `.glb` loader with procedural fallback.
- Enemy `.glb` blockouts can be generated and reviewed in Model Lab. S80 enables `enemy_drone`, `enemy_skimmer`, `enemy_sentinel`, and `enemy_wraith` through the batched InstancedMesh runtime path, while elite variants stay procedural.
- Boss `.glb` blockouts can be generated and reviewed in Model Lab. S87 enables `boss_01`, `boss_02`, and `boss_03` through the same batched InstancedMesh runtime path, with procedural fallback if loading fails.

## Acceptance Checklist

- The model reads clearly at 390px mobile width.
- The ship does not leave the mobile screen when dragged hard left or right.
- The silhouette remains visible during firing, pickups, and Boss effects.
- The mesh does not hide enemy bullets or upgrade pickups.
- The build still passes and the local preview has zero console errors.
- The procedural fallback still works if the file is missing or disabled.

## Regeneration Commands

- `npm run asset:player`: regenerate the current player blockout.
- `npm run asset:enemies`: regenerate the normal enemy blockouts.
- `npm run asset:bosses`: regenerate the Boss blockouts.
