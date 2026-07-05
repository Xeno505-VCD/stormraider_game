# stormraider_game

Web 3D Low-Poly vertical bullet shooter prototype for the 雷霆战机 project.

## Current MVP
- Runs fully in the browser as a static Vite app.
- Current local playtest build: `PLAYTEST S45`.
- PC controls: WASD/arrow keys, `1`/`2`/`3` skills, `Space` bomb, `Esc` pause, `R` end run.
- Mobile controls: drag to move, auto fire, auto skills, manual `SP` bomb.
- Local records use IndexedDB for the last run and best run.
- Runtime gameplay tuning is loaded from static client JSON under the deployed `config` asset path.
- Settings include a Chinese/English language switch for visible HUD and panel text.
- The start panel shows a short run briefing plus local last/best records before combat begins.
- Pause and result panels show the current run state and the weapon modules selected during the run.
- HP is shown as a bottom health bar with color tiers and delayed damage feedback.
- Roguelite POWER pickups fill an upgrade bar and trigger three-choice weapon modules.
- Current content table includes three Boss variants, extra enemy variants, a staged `stage_01` pacing loop, and seventeen upgrade modules.
- Weapon builds now include shield mitigation, close-range pulse clears, salvage-oriented pickup growth, and rhythm critical volleys.
- The run starts from a playtest start panel instead of dropping the player directly into combat.
- Pickups include POWER energy, repair, and SP bomb refills.
- Boss encounters include a staged HP bar and phase indicator.
- Boss variants fire distinct pooled bullet patterns with mobile density scaling.
- Small enemies wander in the upper field and fire slow, readable pooled shots.
- Bomb/SP clears both enemies and active enemy bullets.
- Production builds split Three.js into a separate `vendor-three` chunk for cleaner caching.

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
- `public/config/upgrades.json`: Roguelite upgrade option ids, labels, titles, and descriptions.

`stage_01` is tuned as a longer playtest flow with light opening waves, recovery beats, three escalating Boss encounters, and a fourth-loop restart marker. Mobile density remains lower through runtime wave scaling.

These files are public client assets and must not contain secrets or trusted anti-cheat logic.

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
