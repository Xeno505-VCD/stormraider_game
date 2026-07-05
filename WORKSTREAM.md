# Workstream: Weapon Builds

Branch: `codex/weapon-builds`

Goal: expand Roguelite build variety while keeping hot paths pooled.

Scope:
- Upgrade definitions in `public/config/upgrades.json`.
- Weapon behavior in `src/gameplay/PlayerBulletPool.ts`.
- Pickup and resource upgrades in `src/gameplay/PickupPool.ts` and `src/render/Renderer.ts`.
- Upgrade translations in `src/ui/I18n.ts`.

Avoid:
- Stage wave pacing.
- Start/result screen layout work.
- Deployment changes.
- Cloudflare deployment.

Verification:
- Run `npm run build`.
- Use local preview only.
- Do not merge to `main` until the user approves the stage.
