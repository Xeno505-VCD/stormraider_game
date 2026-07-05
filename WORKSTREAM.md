# Workstream: Integration Preview

Branch: `codex/integration-preview`

Goal: combine the local stage-content, weapon-builds, and UI-polish workstreams into one preview build without deploying.

Included work:
- Stage pacing and enemy composition from `codex/stage-content`.
- Expanded Roguelite weapon and pickup modules from `codex/weapon-builds`.
- Start, pause, result, and record UI polish from `codex/ui-polish`.

Avoid:
- Deployment changes.
- Cloudflare deployment.

Verification:
- Run `npm run build`.
- Use local preview only.
- Do not merge to `main` until the user approves the stage.
