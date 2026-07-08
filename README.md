# stormraider_game

Web 3D Low-Poly vertical bullet shooter prototype for the 雷霆战机 project.

## License
- Source code license: `AGPL-3.0-or-later`.
- If you modify, distribute, or provide a modified version over a network, you must make the complete corresponding source code available under the same license.
- The selected Stormraider trademark/icon asset is intentionally kept outside this repository and is not included in the open-source release.

## Current MVP
- Runs fully in the browser as a static Vite app.
- Current local playtest build: `PLAYTEST S155`.
- PC controls: WASD/arrow keys, `1`/`2`/`3` skills, `4` or `Space` SP bomb, `Esc` pause, `R` end run.
- Mobile controls: drag to move, auto fire, auto skills, manual `SP` bomb.
- Local records use IndexedDB for the last run and best run.
- Runtime gameplay tuning is loaded from static client JSON under the deployed `config` asset path.
- Settings include Chinese/English language switching plus persistent sound on/off and volume controls.
- Settings include a collapsible armory codex for the current player ship, with one-at-a-time trait expansion, a Next Ultra quick preview, level color selection, trait-owned external module previews, animated miniature effect demos, and the three-Ultra-per-run rule.
- Settings include a collapsible enemy codex for small enemies, elites, and Boss variants, showing role notes, HP, speed, score, scale, and a lightweight animated attack thumbnail.
- The start panel shows a short run briefing plus local last/best records before combat begins.
- Pause and result panels show the current run state and the weapon modules selected during the run.
- HP is shown as a bottom health bar with color tiers and delayed damage feedback.
- Roguelite POWER pickups fill an upgrade bar and trigger three-choice weapon modules; each trait can reach level 7 for an Ultra evolution, with at most three Ultra traits per run.
- Current content table includes three Boss variants, extra enemy variants, a staged `stage_01` pacing loop, and seventeen upgrade modules.
- Later waves now scale small-enemy density, elite pressure, and Boss durability more aggressively while preserving the early opening rhythm.
- S90 raises Boss 2/3 durability again, increases the post-140s wave pressure, and keeps the refreshed enemy/Boss GLB blockouts with clearer muzzle glows, weapon hardpoints, and readable combat lenses.
- S91 adds late-game space hazards: warning-lane asteroids, destructible transports, asteroid area explosions, temporary transport shield, and cooldown relief after the run reaches higher power or distance.
- S92 prototypes upgrade-driven player visual evolution: reinforced wing plates, nose cannons, tail boosters, two escort drones, and forward laser beams that appear as related upgrade traits are selected.
- S93 adds an adaptive performance governor, render-quality pressure tiers, active-index object-pool paths, cached bullet stats/angles/colors, dynamic InstancedMesh buffers, and lower-cost VFX/model hot paths to smooth dense model/VFX scenes without changing combat rules.
- S94 refines the generated player and Boss blockouts with upgrade hardpoints, shield petals, Boss weapon details, material-merged GLB batches, leaner explosion VFX, and cooler late Boss patterns including controlled bloom, crossfire, and low-strength lock-on shots.
- S94 also refreshes normal enemy GLBs with clearer side sensors, acceleration slits, armor buckles, phase beacons, and readable muzzle sources while keeping batched model rendering and procedural fallbacks.
- S95 adds performance-gated Ultra visual nodes to the player ship at level 7 and gives boss_03 phase 5 a slower crown-petal bullet layer for stronger late flagship pressure.
- S96 refreshes the player and Boss GLB silhouettes again with evolution sockets, canards, drone lock claws, carrier deck structures, bloom crown tips, and boss_03 crown/lock-on arrays while keeping assets lightweight.
- S97 gives late Boss phases more personality: boss_02 gains slow side-rail interceptor shots and boss_03 gains extra armed lock-on spike pressure, both limited on mobile.
- S98 gives late elite variants distinct pooled shots after the pressure curve unlocks: sentinels fire faster narrow shots, wraiths fire slower lightly tracking phase bolts, and bulwarks fire heavy slow rounds.
- S99 polishes the player auxiliary weapon silhouette and Boss attack-source modeling with visible wing cannons, drone gun details, bloom sockets, interceptor clamps, and lock-on crown parts.
- S100 gives boss_03 phase 5 an extra slow phase-mirror crossfire layer from its crown/side emitters, capped on mobile and tuned to leave dodge gaps.
- S101 adds a generated bulwark `.glb` model so the heavy elite now has its own shield-slab/mortar silhouette instead of relying on procedural fallback.
- S102 normalizes enemy/Boss GLB geometry attributes before material batching so low-poly parts merge cleanly without noisy `mergeGeometries()` failures.
- S103 adds another lightweight modular model polish pass: player wing weapons/docking rails gain cooling fins, pylons, and charge cables, while Boss attack emitters gain more readable socket guards, launch-bay floors, warning lamps, and phase-mirror frames.
- S104 improves hostile projectile readability without changing damage, collision, or spawn counts: sentinel shots are slimmer/faster-looking, wraith shots are flatter/phase-like, bulwark rounds are heavier, and Boss lock-on shots bloom before arming then tighten.
- S105 makes Boss entry and phase-shift VFX variant-specific while keeping the same three-burst budget: boss_01 blooms from wing emitters, boss_02 pulses from carrier rails, and boss_03 flares along its crown/phase-mirror axis.
- S106 strengthens player Ultra evolution visuals without changing combat stats: level-7 wing, nose, tail, shield, and escort channels now add extra low-poly nodes plus a stronger unfold/glow jump on existing upgrade parts.
- S107 gives boss_03 phase 5 a slow cyan phase-curtain layer from its crown mirrors, capped on mobile and aimed outward to add spectacle while preserving bottom-lane dodge gaps.
- S108 refreshes boss_03's generated GLB with visible phase-curtain mirrors, outer frames, and prism nozzles so the new cyan curtain has clearer physical emitters.
- S109 makes Boss GLB batch updates obey the pressure-tier cadence once performance drops into heavier governor tiers, preserving smoothness while keeping full-rate Boss model motion in light tiers.
- S110 aligns boss_03 phase-5 presentation bursts with the new phase-curtain mirror/nozzle positions while keeping the same three-burst VFX budget.
- S111 lets the local performance smoke test require a sampled Boss variant/phase, making boss_03 phase-5 validation explicit for future late-game changes.
- S112 refreshes the player GLB with auxiliary ammo cells, drone outer docking guides, and sync beacons so escort/auxiliary upgrades have clearer physical mount points.
- S113 adds warm-run performance metrics to the local smoke test so startup/load spikes can be separated from steady combat frame pacing.
- S114 adds more runtime escort-drone detail: micro wings, muzzle tips, and sync beacons appear with auxiliary/escort upgrades without changing combat stats.
- S115 gives escort-drone cores, muzzle tips, and sync beacons a light firing-state pulse so auxiliary companions feel active while preserving gameplay stats.
- S116 refreshes boss_02's generated carrier GLB with micro-fighter silhouettes, warning strips, and launch power cables to make its side-rail interceptor role clearer.
- S117 refreshes boss_01's generated broad-cannon GLB with charge rings, scatter sync lenses, and micro nozzles so its bloom/scatter attacks have clearer visible sources.
- S118 refreshes late elite enemy GLBs with braced sentinel cannons, wraith phase-blade nodes, and bulwark siege plating so elite silhouettes stay readable as density rises.
- S119 refreshes the lighter drone/skimmer GLBs with sensor winglets, cold-edge nodes, and tail lenses so early enemies read as aircraft without adding gameplay load.
- S120 refreshes the player GLB with visible upgrade bus rails, shield sockets, wing fold hinges, auxiliary feed rails, and escort release tabs so upgrade-driven parts feel more physically connected to the hull.
- S121 adds lightweight runtime glow feedback to the player's upgrade ports, so wing, nose, tail, shield, and escort sockets brighten as related upgrades are selected without changing combat stats.
- S122 makes level-7 Ultra weapon states more visible in combat: maxed spread, wing, surge, critical, and primary offensive traits now gain distinct projectile silhouettes and shimmering Ultra colors instead of only hidden damage increases.
- S123 removes the old vertical lane-marker guide lines from the main scene so the background reads more like open deep space instead of a visible positioning track.
- S124 maps the SP bomb to keyboard `4` as well as `Space`, matching the 1/2/3 active-skill row while keeping the clickable SP button for mobile.
- S125 smooths the current preview feel by shortening the SP button label, reducing and slowing the starfield, lowering render pixel-ratio caps, and letting the performance governor reduce VFX/model pressure earlier during busy moments.
- S126 replaces the showy full trick-roll spin with a shorter natural bank pulse, reducing nose lift and accessory lift so lateral movement reads more like aircraft momentum.
- S127 refreshes the player GLB with layered ceramic armor caps, black retaining brackets, recessed fasteners, barrel shrouds, service panels, and extra heat-sink fins so upgrade hardpoints feel less plastic while staying under the player triangle budget.
- S128 gives level-7 Ultra weapon traits stronger combat identity: spread adds a layered storm fan, wing shots form brighter flanking blades, surge fires side capacitor spears, critical volleys add rhythm echoes, and Ultra bullets gain subtle curve/pulse motion.
- S129 upgrades Settings into a faster preview surface: the armory codex can jump through Ultra 7 weapon demos without grinding a run, and a new enemy codex summarizes small, elite, and Boss identities with compact animated thumbnails.
- S130 adds rear external weapon pods to the player GLB and runtime tail-upgrade visuals, so tail/engine-related upgrades can unfold visible side-rear ordnance instead of only changing stats or projectile colors.
- S131 adds forward and wing weapon modules to the player GLB and runtime upgrade visuals, including nose rail shrouds, muzzle micro lenses, wing storm rails, splitter emitters, and staged level-based deployment for offense traits.
- S132 adds shield generator leaves and escort launch hardware to the player GLB and runtime support-upgrade visuals, so shield/escort routes also gain staged external modules for future trait-level codex previews.
- S133 adds lightweight trait-owned external module previews to the Armory Codex, so each expanded trait can show its evolving wing, nose, tail, shield, escort, or support attachment from levels 1-7 without rendering the full player ship inside every demo.
- S134 polishes those Armory Codex module previews with mechanical rails, energy buses, core nodes, per-part shells/emitters, and Ultra pulse sparks so the preview feels more like engineered equipment instead of a first-pass placeholder.
- S135 gives each Armory Codex trait a distinct signature attachment silhouette, so spread, fork, wing, rail, cannon, chain, rapid, capacitor, arsenal, shield, pulse, magnet, salvage, and critical routes no longer feel like the same module with different colors.
- S136 adds an Ultra showcase rail to the Armory Codex, letting testers jump directly to any trait's level-7 preview instead of cycling through the list one item at a time.
- S137 adds an Armory showcase deck above the trait rail, so the selected trait's external module and animated attack demo get a larger focus area while the expanded card keeps only level selection and effect text.
- S138 removes the redundant per-trait list below the Armory Codex rail; testers now pick a trait from the compact rail and use the single showcase deck's level strip to inspect levels 1-7.
- S139 polishes the single Armory showcase deck's external module art with hardpoints, clamps, calibration marks, vents, hinges, facets, and stronger family-specific silhouettes without adding combat objects.
- S140 gives Armory Codex animated demos per-trait identity markers, so split fans, fork arms, rail needles, chain links, shield fields, pickup pulls, cooldown cells, SP racks, and rhythm ticks read differently even in the small preview.
- S141 locally polishes enemy and Boss GLBs with rougher material response, layered matte plates, heat slots, retainers, and service panels while keeping assets far under triangle budgets; it also pre-renders model batches before Start Run and reduces repeated enemy-model matrix work.
- S142 locally deepens the single Armory Codex module deck with low-cost depth plates, shadows, bolts, and family-specific silhouettes so trait-owned external weapons feel less flat without adding combat render load.
- S143 locally improves Boss bullet readability: late bloom/rail bullets reuse the existing Prism silhouette for clearer high-phase lanes, and lock-on shots step through brighter warning colors before becoming dangerous.
- S144 locally retunes player ship and runtime attachment materials toward rougher anodized metal, darker brackets, calmer glow, and less glossy toy/plastic response while keeping the player GLB at 2450/2500 triangles.
- S145 locally lowers mobile explosion shard density by one performance tier so upgrade/Boss-transition VFX spikes are less likely while gameplay, damage, bullets, and enemy pressure stay unchanged.
- S146 locally adds a lightweight five-step Boss phase pressure strip and phase-colored Boss HP states so later phases read more clearly without increasing combat object count.
- S147 locally keeps mobile render pixel ratio stable across light pressure tiers to avoid mid-run canvas reallocations and reduce long-session frame spikes.
- S148 locally prewarms and render-primes InstancedMesh color/matrix buffers for player bullets, enemy bullets, explosions, pickups, and space hazards so first-use GPU work happens before combat pressure instead of during play.
- S149 locally aligns the enemy codex with the Armory showcase layout: enemy chips now drive one focused profile deck with a single animated attack demo instead of redundant expandable rows.
- S150 locally prewarms hidden player evolution parts before Start Run so first-time upgrade attachments, shield pieces, escort nodes, and roll glints compile before combat instead of during a level-up.
- S151 locally caches Boss phase HUD writes so the five-step phase strip, pressure color, and phase label update only when the phase changes rather than every frame.
- S152 locally adds an explosion shard per-frame budget so simultaneous kills, skills, and Boss presentation bursts cannot spawn too many VFX shards in a single frame.
- S153 locally lightens the upgrade panel Ultra card animation and keeps debug performance stats accurate while paused/upgrading; the latest production-preview mobile smoke held 60 FPS / p99 17ms / over50 0.
- S154 locally gives maxed main offensive traits their own combat projectile identity: damage, rapid, velocity, pierce, heavy, fork, and chain no longer share one generic primary Ultra look, while runtime upgrade attachment materials are retuned toward rougher metal and the performance smoke test waits longer for cold GitHub Pages starts.
- S155 locally trims render upload work: inactive enemy/Boss model batches and empty InstancedMesh pools no longer push matrix/color buffers every frame, improving desktop/Boss-entry stability while keeping combat rules and visuals unchanged.
- Weapon builds now include shield mitigation, close-range pulse clears, salvage-oriented pickup growth, rhythm critical volleys, and level-colored trait cards.
- The run starts from a playtest start panel instead of dropping the player directly into combat.
- Pickups include POWER energy, repair, and SP bomb refills.
- Boss encounters include a staged HP bar and phase indicator.
- Boss entry and phase changes now trigger readable VFX, a short firing delay, and HUD pulse feedback.
- Boss variants fire distinct pooled bullet patterns with mobile density scaling; Boss lock-on shots now have a short visible arming window before they can damage the player.
- Small enemies wander in the upper field and fire slow, readable pooled shots.
- Bomb/SP clears both enemies and active enemy bullets.
- Production builds split Three.js into a separate `vendor-three` chunk for cleaner caching.
- Player, enemy, and Boss silhouettes use clearer low-poly aircraft shapes instead of simple block/crystal forms.
- Player movement now uses smoothed banking, yaw, pitch, and asymmetric engine flame feedback so the ship reads less like a sliding block.
- Player movement now triggers natural banking pulses on hard lateral commits or quick direction changes, with controlled wing glints and thrust instead of a full forced spin.
- Mobile drag movement reaches full strafe sooner and uses a lower bank-pulse trigger threshold so left/right direction changes feel more responsive on phone screens.
- Mobile player shots inherit a smoothed slice of lateral movement, giving bullets a controlled side-sling so enemies near the left and right edges are easier to hit while dragging.
- Optional high-quality model slots are defined in `public/config/models.json`, with procedural fallbacks preserved until each `.glb` asset is ready.
- The player ship can now load an enabled `.glb` slot from `models.json`; if the asset is missing or disabled, the procedural ship remains active.
- `public/models/player/stormraider-player.glb` is a generated S132 v12 blockout asset with clearer canopy, rear stabilizers, intakes, engine nozzles, wing hardpoints, Ultra sockets, canards, shield generator leaves, shield capacitor lenses, shield relay heat sinks, shield arc sockets, upgrade bus rails, wing fold hinges, drone lock claws, escort launch sleeves, escort weapon pivots, escort refuel probes, escort lock beacons, sensor lenses, wing auxiliary cannons, wing storm rails, splitter emitters, nose rail shrouds, muzzle micro lenses, splitter prisms, cooling fins, underwing pylons, auxiliary feed rails, ammo cells, drone outer guides, escort release tabs, sync beacons, drone charge cables, rear external weapon pylons, side-rear ordnance pods, ceramic faces, muzzle cores, layered ceramic caps, black retaining brackets, recessed fasteners, barrel shrouds, service panels, and heat-sink details for validating the replacement pipeline before final art arrives.
- Future player upgrade parts should move beyond blockout/plastic readability: use layered armor plates, beveled metal/ceramic surfaces, visible brackets, heat sinks, muzzle cores, and controlled emissive trims so attachments feel like engineered mech components rather than toy-like add-ons.
- Armory codex module previews now show each trait's own external weapon or body attachment evolving through levels 1-7 without placing the whole prototype ship inside every demo.
- `public/models/enemies/` now contains generated detail blockout `.glb` assets for drone, skimmer, sentinel, wraith, and bulwark, all enabled through the batched enemy model renderer and refreshed with sensor winglets, cold-edge nodes, armor marks, braced cannons, phase-blade nodes, siege plating, heavy armor slabs, and muzzle/core readability markers.
- `public/models/boss/` now contains generated Boss blockout `.glb` assets for boss_01, boss_02, and boss_03, refreshed with brighter weapon hardpoints, combat lenses, guarded bloom sockets, charge rings, scatter sync lenses, interceptor bay floors, warning lamps, micro-fighter silhouettes, crown emitters, framed phase mirrors, phase-curtain prism nozzles, lock-on mirrors, and carrier/flagship silhouette details.
- Enemy and Boss `.glb` runtime support now uses a batched InstancedMesh path; drone, skimmer, sentinel, wraith, bulwark, boss_01, boss_02, and boss_03 slots are enabled with procedural fallbacks.
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
npm run test:perf
```

## Local Development
```bash
npm install
npm run dev -- --port 5173
```

Open `http://127.0.0.1:5173`.

## Local Performance Smoke
Start a local dev or preview server, then run:
```bash
npm run test:perf
```

The smoke runner prefers Chrome because Edge headless can throttle long WebGL runs on this machine. Use `BROWSER_PATH` to force another Chromium browser. GPU is enabled by default; set `PERF_DISABLE_GPU=1` only when intentionally testing an extreme fallback path.

Useful PowerShell options:
```powershell
$env:PERF_DURATION_MS='160000'; $env:PERF_INVULNERABLE='1'; npm run test:perf
$env:PERF_VIEWPORT='390x844'; $env:PERF_DURATION_MS='25000'; npm run test:perf
$env:PERF_CPU_RATE='6'; $env:PERF_DURATION_MS='18000'; npm run test:perf
$env:PERF_DURATION_MS='90000'; $env:PERF_INVULNERABLE='1'; npm run test:perf
$env:PERF_REQUIRE_BOSS_VARIANT='12'; $env:PERF_REQUIRE_BOSS_PHASE='5'; npm run test:perf -- --duration 210 --viewport desktop --invulnerable
$env:PERF_DISABLE_GPU='1'; $env:PERF_DURATION_MS='18000'; npm run test:perf
```

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
Run `npm run asset:enemies` to regenerate the current normal enemy blockout GLBs from `scripts/generate-enemy-glbs.mjs`.
Run `npm run asset:bosses` to regenerate the current Boss blockout GLBs from `scripts/generate-boss-glbs.mjs`.

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
