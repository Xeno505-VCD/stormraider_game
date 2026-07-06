# Stormraider Model Drop Folder

Place optional model assets here when replacing procedural low-poly ships.

Expected folders:

- `player/`
- `enemies/`
- `boss/`

Preferred format:

- `.glb` first choice, `.gltf` only when external texture files are unavoidable.
- Draco compression is allowed later, but keep the first import uncompressed for easier debugging.
- Use flat or lightly stylized materials. Avoid tiny baked text and overly noisy textures.

Coordinate contract:

- Positive Y is forward in game space.
- Z is vertical height.
- Origin should sit at the gameplay center of the craft.
- Keep collision expectations separate from mesh size; gameplay still uses tuned simple radii.

Current runtime state:

- `public/config/models.json` defines the target slots.
- `player/stormraider-player.glb` is a generated v2 blockout asset and is enabled for pipeline validation.
- `enemies/enemy-drone.glb`, `enemy-skimmer.glb`, `enemy-sentinel.glb`, and `enemy-wraith.glb` are generated S89 blockout assets for Model Lab and runtime readability review.
- `boss/boss-01.glb`, `boss-02.glb`, and `boss-03.glb` are generated S89 blockout assets for Model Lab and runtime silhouette/readability review.
- `enemy_drone`, `enemy_skimmer`, `enemy_sentinel`, `enemy_wraith`, `boss_01`, `boss_02`, and `boss_03` are enabled as batched runtime model tests, with procedural fallback preserved if loading fails.
- Elite enemy variants still use procedural geometry.
- Do not enable a new slot until the referenced file exists and has been previewed on desktop and mobile.

Generation:

- Run `npm run asset:player` from the project root to regenerate the current player blockout.
- The source script is `scripts/generate-player-glb.mjs`.
- Run `npm run asset:enemies` from the project root to regenerate the current enemy blockouts.
- The source script is `scripts/generate-enemy-glbs.mjs`.
- Run `npm run asset:bosses` from the project root to regenerate the current Boss blockouts.
- The source script is `scripts/generate-boss-glbs.mjs`.
