# stormraider_game

Web 3D Low-Poly vertical bullet shooter prototype for the 雷霆战机 project.

## Current MVP
- Runs fully in the browser as a static Vite app.
- Current local playtest build: `PLAYTEST S84`.
- PC controls: WASD/arrow keys, `1`/`2`/`3` skills, `Space` bomb, `Esc` pause, `R` end run.
- Mobile controls: drag to move, auto fire, auto skills, manual `SP` bomb.
- Local records use IndexedDB for the last run and best run.
- Runtime gameplay tuning is loaded from static client JSON under the deployed `config` asset path.
- Settings include Chinese/English language switching plus persistent sound on/off and volume controls.
- Settings include a collapsible upgrade codex for the current player ship, with one-at-a-time trait expansion, level color selection, animated miniature effect demos, and the three-Ultra-per-run rule.
- The start panel shows a short run briefing plus local last/best records before combat begins.
- Pause and result panels show the current run state and the weapon modules selected during the run.
- HP is shown as a bottom health bar with color tiers and delayed damage feedback.
- Roguelite POWER pickups fill an upgrade bar and trigger three-choice weapon modules; each trait can reach level 7 for an Ultra evolution, with at most three Ultra traits per run.
- Current content table includes three Boss variants, extra enemy variants, a staged `stage_01` pacing loop, and seventeen upgrade modules.
- Weapon builds now include shield mitigation, close-range pulse clears, salvage-oriented pickup growth, rhythm critical volleys, and level-colored trait cards.
- The run starts from a playtest start panel instead of dropping the player directly into combat.
- Pickups include POWER energy, repair, and SP bomb refills.
- Boss encounters include a staged HP bar and phase indicator.
- Boss entry and phase changes now trigger readable VFX, a short firing delay, and HUD pulse feedback.
- Boss variants fire distinct pooled bullet patterns with mobile density scaling.
- Small enemies wander in the upper field and fire slow, readable pooled shots.
- Bomb/SP clears both enemies and active enemy bullets.
- Production builds split Three.js into a separate `vendor-three` chunk for cleaner caching.
- Player, enemy, and Boss silhouettes use clearer low-poly aircraft shapes instead of simple block/crystal forms.
- Player movement now uses smoothed banking, yaw, pitch, and asymmetric engine flame feedback so the ship reads less like a sliding block.
- Player movement now triggers visual trick rolls on hard lateral commits or quick direction changes, with wing glints and stronger thrust during the maneuver.
- Mobile drag movement reaches full strafe sooner and uses a lower trick-roll trigger threshold so left/right direction changes feel more responsive on phone screens.
- Optional high-quality model slots are defined in `public/config/models.json`, with procedural fallbacks preserved until each `.glb` asset is ready.
- The player ship can now load an enabled `.glb` slot from `models.json`; if the asset is missing or disabled, the procedural ship remains active.
- `public/models/player/stormraider-player.glb` is a generated v2 blockout asset with clearer canopy, rear stabilizers, intakes, and engine nozzles for validating the replacement pipeline before final art arrives.
- `public/models/enemies/` now contains generated blockout `.glb` assets for drone, skimmer, sentinel, and wraith, all enabled through the batched enemy model renderer.
- Enemy `.glb` runtime support now uses a batched InstancedMesh path; drone, skimmer, sentinel, and wraith enemy slots are all enabled with procedural fallbacks.
- Player engine flames now use layered transparent runtime thrust instead of baked static cones in the blockout model.
- Player engine flames are anchored to the loaded GLB nozzles and intensify as the ship moves toward the upper combat zone.
- Player engine flames keep a visible idle glow near the lower lane so the thrust does not disappear while cruising.
- Player engine flames now use a three-layer nozzle/core/trailing-tongue setup with subtle flicker so the thrust reads less like a single fake cone.
- Player engine flames are larger and brighter in S79 so the thrust reads clearly after the GLB replacement.
- `model-lab.html` provides a separate model import preview, quality check, and transform tuning tool for future `.glb` assets.
- Mobile movement uses a camera-projected safe horizontal boundary so the ship stays inside narrow phone screens.
- Enemy and Boss variants now use distinct pooled silhouette profiles, including light skimmers, bulky sentinels, slender wraiths, and three different Boss hull shapes.
- Player bullets, enemy bullets, and pickups now use clearer pooled visual profiles so weapon traits, hostile shots, POWER, repair, and SP refills are easier to tell apart.
- Hit feedback now distinguishes small hit sparks, enemy destruction bursts, chain effects, skill clears, and player damage flashes through the same pooled VFX system.
- Procedural Web Audio sound effects cover run start, firing, hits, kills, pickups, repairs, damage, skills, upgrades, pause/resume, and run complete without external audio files; S59 keeps the softer mix and adds a persistent settings volume slider.

See `PLAYTEST.md` for the external tester feedback checklist.

## Stack
- TypeScript
- Vite
- Three.js
- GitHub Pages + Cloudflare Pages static deployment
- IndexedDB for local last-run and best-run records

## Commands
```bash
npm install
npm run dev
npm run build
npm run preview
```

## Local Development
```bash
npm install
npm run dev -- --port 5173
```

Open `http://127.0.0.1:5173`.

## Production Check
```bash
npm run build
npm run preview -- --port 4173
```

Open `http://127.0.0.1:4173` and verify:

- the canvas renders a dark low-poly battlefield,
- score, HP, enemies, skills, and result panel update correctly,
- mobile viewport keeps HUD readable and skills on the right side,
- records are saved locally after ending or losing a run.

## Cloudflare Pages
- Build command: `npm run build`
- Output directory: `dist`
- Framework preset: Vite
- Node version: `22`
- GitHub Actions also builds on every push to `main` and pull request.
- Live URL: https://stormraider-game.pages.dev/

Cloudflare Pages will copy `public/_headers` into `dist/_headers`, which sets cache and safety headers for static hosting.

## GitHub Pages
- GitHub Pages workflow: `.github/workflows/pages.yml`
- Build command: `npm run build`
- Output directory: `dist`
- Live URL: https://xeno505-vcd.github.io/stormraider_game/
- The app uses relative asset paths, so the same build can run from the GitHub Pages subpath `/stormraider_game/`.

## Runtime Config
- `public/config/enemies.json`: enemy HP, speed, score, size, collision radius, and Boss phase/support tuning.
- `public/config/weapons.json`: player fire rate, bullet damage, speed, and track count.
- `public/config/waves.json`: stage wave timing, enemy type, count, path, and spawn interval.
- `public/config/upgrades.json`: Roguelite upgrade option ids, labels, titles, descriptions, category, Ultra color, and codex text.
- `public/config/models.json`: optional player, enemy, and Boss model slots, paths, scale, rotation, offset, and triangle budgets.

`stage_01` is tuned as a longer playtest flow with light opening waves, recovery beats, three escalating Boss encounters, and a fourth-loop restart marker. Mobile density remains lower through runtime wave scaling.

These files are public client assets and must not contain secrets or trusted anti-cheat logic.

Model assets should be placed under `public/models/`; see `MODEL_ASSET_GUIDE.md` and `PLAYER_MODEL_BRIEF.md` before enabling a slot.

Open `model-lab.html` during local development to test a local `.glb` file, inspect triangle counts, check slot-specific size/budget status, tune scale/rotation/offset, save preview screenshots, download config snippets, and check top/game/side views.

Run `npm run asset:player` to regenerate the current player blockout GLB from `scripts/generate-player-glb.mjs`.

## GitHub Deployment Flow
1. Create a GitHub repository and push this project.
2. Confirm the `build` workflow passes.
3. GitHub Pages deploys automatically from the `pages` workflow on every push to `main`.
4. Optionally keep Cloudflare Pages connected to the same repository for the Cloudflare URL.
5. Add a custom domain later if needed.

## Repository
- GitHub: https://github.com/Xeno505-VCD/stormraider_game
- Visibility: public
- GitHub Pages: https://xeno505-vcd.github.io/stormraider_game/
- Cloudflare Pages: https://stormraider-game.pages.dev/

## MVP Scope
- Dark universe, thunder blue/electric purple, Low-Poly, Bloom-ready visual direction.
- Single-player only.
- No public leaderboard.
- No Render or Cloudflare Worker dependency in MVP.
