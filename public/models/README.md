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
- All slots are disabled for now and fall back to procedural geometry.
- Do not enable a slot until the referenced file exists and has been previewed on desktop and mobile.
