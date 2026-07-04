# stormraider_game

Web 3D Low-Poly vertical bullet shooter prototype for the 雷霆战机 project.

## Current MVP
- Runs fully in the browser as a static Vite app.
- PC controls: WASD/arrow keys, `1`/`2`/`3` skills, `Space` bomb, `Esc` pause, `R` end run.
- Mobile controls: drag to move, auto fire, auto skills, manual `SP` bomb.
- Local records use IndexedDB for the last run and best run.

## Stack
- TypeScript
- Vite
- Three.js
- GitHub + Cloudflare Pages static deployment
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

Cloudflare Pages will copy `public/_headers` into `dist/_headers`, which sets cache and safety headers for static hosting.

## GitHub Deployment Flow
1. Create a GitHub repository and push this project.
2. Confirm the `build` workflow passes.
3. In Cloudflare Pages, create a project from the GitHub repository.
4. Use the Vite preset, build command `npm run build`, and output directory `dist`.
5. Deploy first to the free Pages subdomain; add a custom domain later if needed.

## Repository
- GitHub: https://github.com/Xeno505-VCD/stormraider_game
- Visibility: private

## MVP Scope
- Dark universe, thunder blue/electric purple, Low-Poly, Bloom-ready visual direction.
- Single-player only.
- No public leaderboard.
- No Render or Cloudflare Worker dependency in MVP.
