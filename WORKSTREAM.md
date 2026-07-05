# Workstream: UI Polish

Branch: `codex/ui-polish`

Goal: improve playtest-facing screens and feedback clarity.

Scope:
- Start, pause, upgrade, result, settings, and HUD presentation.
- Local record display and run summary.
- Responsive layout in `src/styles/app.css`.
- Visible text and translations in `src/ui/I18n.ts`.

Avoid:
- Enemy/Boss combat tuning.
- New weapon mechanics.
- Deployment changes.
- Cloudflare deployment.

Verification:
- Run `npm run build`.
- Use local preview only.
- Do not merge to `main` until the user approves the stage.
