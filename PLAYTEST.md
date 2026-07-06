# Stormraider Playtest Notes

Build: `PLAYTEST S83`

Use this file to collect feedback from external testers before the next upload/deploy.

## What To Ask Testers
- Device and browser: PC/mobile, Chrome/Safari/Edge, screen size if known.
- First 60 seconds: whether enemy waves feel fair or suddenly unfair.
- Stage pacing: whether the small recovery waves give enough breathing room between Boss encounters.
- Enemy density: whether late waves stay active without becoming a sudden wall.
- Boss fight: whether five Boss phases feel readable and whether late-phase bullet gaps stay dodgeable.
- Boss presentation: whether Boss entry and phase-shift pulses are readable without covering combat.
- Boss movement: whether the Boss patrols left and right enough to feel alive without becoming unfair.
- Visual identity: whether the player ship, small enemies, and Bosses now read more like aircraft instead of moving blocks or crystals.
- Player flight feel: whether left/right movement has readable banking and engine feedback instead of feeling like a flat object sliding.
- Player trick rolls: whether hard left/right movement and quick direction changes make the ship feel agile without making its hitbox confusing.
- Model pipeline readiness: the player ship and four normal enemy slots now use generated `.glb` blockouts, while elite and Boss slots still use procedural fallbacks.
- Player model fallback: if the player `.glb` is missing or disabled, the procedural ship should still render without crashing.
- Player GLB blockout: whether the generated v2 replacement ship reads better than the previous procedural body, especially the canopy, rear stabilizers, intakes, and engine nozzles, without being treated as final art.
- Player engine flames: whether the shorter layered thrust feels less fake than the previous cone-like fire, and whether it still reads clearly while strafing.
- Player thrust intensity: whether the flames feel stronger near the upper Boss area and dimmer near the lower safe lane, without detaching from the engine nozzles.
- Player idle flame visibility: whether the tail flame remains visible near the lower safe lane instead of looking like it has disappeared.
- Player flame shape: whether the new layered nozzle/core/trailing flame feels more like propulsion and less like a single cone behind the ship.
- Player flame size: whether the larger S79+ tail flame is visible and satisfying without covering the ship body or nearby bullets.
- Model Lab: `model-lab.html` should load model slots, show the placeholder craft, expose transform controls, and keep the main game unaffected.
- Model Lab export: screenshot save, JSON download, drag/drop import, and top/game/side view buttons should work without affecting the main game.
- Model Lab quality check: selected slots should show triangle budget, fit status, suggested scale, and a clear Pass/Review/Fix label.
- Mobile movement: whether dragging hard left/right keeps the ship fully inside the phone screen.
- Enemy silhouettes: whether drone, skimmer, sentinel, bulwark, wraith, and each Boss variant are visually distinguishable during play.
- Enemy GLB blockouts: Model Lab can load drone, skimmer, sentinel, and wraith generated `.glb` files for silhouette review, and the live combat runtime should render those four variants through the batched loader.
- Enemy model runtime: drone, skimmer, sentinel, and wraith enemies should use generated `.glb` assets through the batched loader, while elite and Boss variants still use procedural visuals.
- Enemy model fallback: if any enabled enemy model fails to load, that variant should remain visible through its procedural fallback instead of disappearing.
- Projectile and pickup clarity: whether player shots, enemy shots, POWER crystals, repair pickups, and SP refills are easy to distinguish during busy combat.
- Hit feedback: whether small hits, enemy kills, chain effects, skill clears, and player damage flashes feel readable without becoming visual noise.
- Boss variants: whether boss_01, boss_02, and boss_03 bullet shapes feel distinct and still dodgeable.
- Settings: whether opening settings pauses combat, Resume returns to the run, Chinese/English switching updates visible text, and the sound toggle persists after refresh.
- Settings codex: whether the upgrade codex stays collapsed by default, expands one trait at a time, keeps level colors readable, and uses the animated demo area to make level 1-6 and Ultra 7 effects understandable without stutter.
- Audio: whether start/toggle sounds are audible after a user click, whether the volume slider persists after refresh, and whether firing, hits, kills, pickups, repairs, damage, skills, upgrades, pause/resume, and run complete sounds stay helpful without becoming loud or tiring.
- HUD: whether the bottom HP bar is readable, color changes are clear, and damage trailing feels understandable.
- Pause: whether Esc makes the pause state clear and whether the current module list is useful.
- Later waves: whether Boss health scales enough to feel durable without phase 3 becoming oppressive.
- Loop start: whether the post-third-Boss return to boss_01 feels like a clear fourth segment or arrives too early.
- Small enemies: whether wandering and slow shots feel alive, reach the lower lane naturally, and do not become noisy.
- Upgrades: whether the POWER bar, pickup flow, and three-choice panel are understandable.
- Upgrade pacing: whether early upgrades arrive quickly and later upgrades still feel reachable.
- Upgrade evolution: whether repeated traits clearly show level colors, whether level 7 Ultra cards feel special, and whether the three-Ultra-per-run limit is understandable.
- Upgrade weighting: whether early choices offer enough support tools and later choices lean more toward offensive traits.
- Upgrade variety: whether repeated level-ups offer useful but less predictable module choices.
- Weapons: which upgrade felt strong, weak, or confusing, especially wing shots, surge bolts, shield, close pulse, salvage drops, critical rhythm, cooldown reduction, and SP capacity.
- Start flow: whether the briefing, controls, and local record summary give enough context before combat begins.
- Performance: any stutter, black screen, overheated phone, or long load.
- Result: score, survival time, chosen module list, and build label from the screen.

## Feedback Format
```text
Build:
Device / browser:
Approx survival time:
Score:
What felt good:
What felt unfair:
Any bug or visual issue:
Screenshot/video:
```

## Current Known Limits
- Records are local to each browser only.
- No public leaderboard or account system.
- No backend anti-cheat or cloud save.
- Balance is still tuned from short automated runs and needs real player feedback.
