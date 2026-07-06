# Stormraider Playtest Notes

Build: `PLAYTEST S63`

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
- Model pipeline readiness: future `.glb` model slots are configured but disabled, so the current procedural low-poly fallback should still render exactly as before.
- Player model fallback: with `player_ship.enabled` still false, the current procedural ship should render normally and no missing-model error should appear.
- Mobile movement: whether dragging hard left/right keeps the ship fully inside the phone screen.
- Enemy silhouettes: whether drone, skimmer, sentinel, bulwark, wraith, and each Boss variant are visually distinguishable during play.
- Projectile and pickup clarity: whether player shots, enemy shots, POWER crystals, repair pickups, and SP refills are easy to distinguish during busy combat.
- Hit feedback: whether small hits, enemy kills, chain effects, skill clears, and player damage flashes feel readable without becoming visual noise.
- Boss variants: whether boss_01, boss_02, and boss_03 bullet shapes feel distinct and still dodgeable.
- Settings: whether opening settings pauses combat, Resume returns to the run, Chinese/English switching updates visible text, and the sound toggle persists after refresh.
- Audio: whether start/toggle sounds are audible after a user click, whether the volume slider persists after refresh, and whether firing, hits, kills, pickups, repairs, damage, skills, upgrades, pause/resume, and run complete sounds stay helpful without becoming loud or tiring.
- HUD: whether the bottom HP bar is readable, color changes are clear, and damage trailing feels understandable.
- Pause: whether Esc makes the pause state clear and whether the current module list is useful.
- Later waves: whether Boss health scales enough to feel durable without phase 3 becoming oppressive.
- Loop start: whether the post-third-Boss return to boss_01 feels like a clear fourth segment or arrives too early.
- Small enemies: whether wandering and slow shots feel alive, reach the lower lane naturally, and do not become noisy.
- Upgrades: whether the POWER bar, pickup flow, and three-choice panel are understandable.
- Upgrade pacing: whether early upgrades arrive quickly and later upgrades still feel reachable.
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
