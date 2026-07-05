# Workstream: Integration Preview

Branch: `codex/integration-preview`

Goal: combine the local stage-content, weapon-builds, and UI-polish workstreams into one preview build without deploying.

Included work:
- Stage pacing and enemy composition from `codex/stage-content`.
- Expanded Roguelite weapon and pickup modules from `codex/weapon-builds`.
- Start, pause, result, and record UI polish from `codex/ui-polish`.
- Settings pause flow and slower small-enemy bullet lifetime fixes.
- Roguelite three-choice upgrade selection now shuffles by run state and reduces repeats.

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
