# Stormraider Player Ship Model Brief

This brief is for generating the first real player `.glb` model from the selected concept direction.

## Selected Direction

Use concept direction 3 from the refined player ship sheet:

- Premium hero craft.
- Sleek A-shaped silhouette.
- Sharp narrow nose.
- Layered dorsal armor plates.
- Central glowing cockpit or energy core.
- Small wingtip emitters.
- Compact twin rear engines.
- Thunder blue main hull, electric purple energy accents, warning orange engine glow.

The craft should feel like a fast lightning interceptor with enough armor detail to read as the player's hero ship, not a generic blocky object.

## Text-To-3D Prompt

Use this prompt in Meshy, Tripo, or a similar text/image-to-3D tool:

```text
Create a premium sci-fi player aircraft for a vertical bullet shooter game. The ship is a sleek lightning interceptor with a clean A-shaped top silhouette, a sharp narrow nose, swept angular wings, layered dorsal armor plates, a central glowing cockpit or energy core, small wingtip energy emitters, and compact twin rear engines. Style is low-poly to mid-poly hard-surface game asset, readable from an angled top-down camera, thunder blue main hull, electric purple emissive accents, dark cool metal panels, and small warning orange engine glow. The model must be symmetrical, game-ready, clean topology, no pilot, no landing gear, no text, no logo, no huge background base. Keep the silhouette crisp and suitable for mobile gameplay.
```

## Negative Prompt

```text
photorealistic aircraft, modern real-world jet, organic creature, robot character, pilot, cockpit interior, landing gear, wheels, missiles covering the silhouette, messy cables, excessive tiny details, thin fragile antennae, unreadable silhouette, huge wingspan, bulky cargo ship, toy-like block, logo, text, decals with words, environment, pedestal, background scene
```

## Image-To-3D Guidance

If the generator accepts an image reference, use the refined concept 3 image and add:

```text
Follow the reference image's A-shaped silhouette, sharp nose, layered armor, central blue energy core, purple wing energy accents, and compact orange rear engines. Preserve top-down readability and keep the model symmetrical.
```

## Export Requirements

- Preferred file: `stormraider-player.glb`
- Target path: `public/models/player/stormraider-player.glb`
- Format: `.glb`
- Triangle budget: 1500-2500 triangles for first import.
- Texture size: 512px or 1024px max.
- Origin: center of the craft body.
- Forward: positive Y in game space if the tool allows orientation control.
- Height: Z axis.
- Materials: flat or lightly faceted, with restrained emissive accents.

## First Review Checklist

After export, inspect it in `model-lab.html`:

- Top silhouette is readable at phone size.
- Nose direction is obvious.
- Wings do not exceed the current mobile safe width too much.
- Engine glow does not dominate the body.
- The model is not too dark against the game background.
- Triangle count is under the player budget or close enough to justify.
- No unwanted text, logos, floor bases, pilots, or environment props.

## Import Steps

1. Put the file at `public/models/player/stormraider-player.glb`.
2. Open `http://127.0.0.1:4196/model-lab.html`.
3. Select `player_ship`.
4. Load the local file or slot URL.
5. Tune `scale`, `rotation`, and `offset`.
6. Copy the JSON snippet.
7. Update `public/config/models.json`.
8. Set `player_ship.enabled` to `true`.
9. Run `npm run build`.
10. Verify the game on desktop and mobile viewport.
