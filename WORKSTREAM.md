# Workstream: Stage Content

Branch: `codex/stage-content`

Goal: expand stage pacing without changing deployment policy.

Scope:
- Wave timing and enemy composition in `public/config/waves.json`.
- Enemy and Boss tuning in `public/config/enemies.json`.
- Boss support behavior if required in `src/gameplay/EnemyPool.ts`.
- Boss bullet pacing only when content changes require it.

Avoid:
- UI redesign.
- New weapon upgrade mechanics.
- Deployment changes.
- Cloudflare deployment.

Verification:
- Run `npm run build`.
- Use local preview only.
- Do not merge to `main` until the user approves the stage.
