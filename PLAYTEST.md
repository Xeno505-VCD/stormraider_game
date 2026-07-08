# Stormraider Playtest Notes

Build: `PLAYTEST S155`

Use this file to collect feedback from external testers before the next upload/deploy.

## What To Ask Testers
- Device and browser: PC/mobile, Chrome/Safari/Edge, screen size if known.
- First 60 seconds: whether enemy waves feel fair or suddenly unfair.
- Stage pacing: whether the small recovery waves give enough breathing room between Boss encounters.
- Enemy density: whether late waves feel more active without becoming a sudden wall.
- Elite pressure: whether sentinel, elite, and bulwark waves after the first Boss feel more threatening without trapping the player unfairly.
- Boss fight: whether five Boss phases feel stronger in later encounters while bullet gaps stay dodgeable.
- Model readability: whether the refreshed enemy and Boss muzzle glows make attack sources easier to read during dense waves.
- Boss presentation: whether Boss entry and phase-shift pulses are readable without covering combat.
- Boss phase HUD: whether the five-step phase strip makes late Boss pressure easier to understand without distracting from bullet dodging.
- Boss movement: whether the Boss patrols left and right enough to feel alive without becoming unfair.
- Visual identity: whether the player ship, small enemies, and Bosses now read more like aircraft instead of moving blocks or crystals.
- Player flight feel: whether left/right movement has readable banking and engine feedback instead of feeling like a flat object sliding.
- Player bank pulses: whether hard left/right movement and quick direction changes feel agile without looking like a forced one-axis flip.
- Mobile flight response: whether short thumb drags now move fast enough and trigger smooth left/right banking without pushing the ship off screen.
- Mobile bullet inertia: whether left/right dragging now lets bullets sling toward side enemies without feeling too inaccurate or chaotic.
- Model pipeline readiness: the player ship, five normal/elite enemy slots, and three Boss slots now use generated `.glb` blockouts with procedural fallbacks.
- Player model fallback: if the player `.glb` is missing or disabled, the procedural ship should still render without crashing.
- Player GLB blockout: whether the generated S112 v7 replacement ship reads better than the previous procedural body, especially the canopy, rear stabilizers, intakes, engine nozzles, wing hardpoints, Ultra sockets, canards, shield nodes, drone lock claws, auxiliary wing cannons, splitter prisms, cooling fins, underwing pylons, auxiliary ammo cells, drone outer guides, sync beacons, drone charge cables, and drone power sockets, without being treated as final art.
- Player engine flames: whether the shorter layered thrust feels less fake than the previous cone-like fire, and whether it still reads clearly while strafing.
- Player thrust intensity: whether the flames feel stronger near the upper Boss area and dimmer near the lower safe lane, without detaching from the engine nozzles.
- Player idle flame visibility: whether the tail flame remains visible near the lower safe lane instead of looking like it has disappeared.
- Player flame shape: whether the new layered nozzle/core/trailing flame feels more like propulsion and less like a single cone behind the ship.
- Player flame size: whether the larger S79+ tail flame is visible and satisfying without covering the ship body or nearby bullets.
- Model Lab: `model-lab.html` should load model slots, show the placeholder craft, expose transform controls, and keep the main game unaffected.
- Model Lab export: screenshot save, JSON download, drag/drop import, and top/game/side view buttons should work without affecting the main game.
- Model Lab quality check: selected slots should show triangle budget, fit status, suggested scale, and a clear Pass/Review/Fix label.
- Mobile movement: whether dragging hard left/right keeps the ship fully inside the phone screen.
- Enemy silhouettes: whether drone, skimmer, sentinel, bulwark, wraith, and each Boss variant are visually distinguishable during play, especially the S94 side sensors, acceleration slits, armor buckles, and phase beacons.
- Enemy GLB blockouts: Model Lab can load drone, skimmer, sentinel, wraith, and bulwark generated `.glb` files for silhouette review, and the live combat runtime should render those five variants through the batched loader.
- Enemy model runtime: drone, skimmer, sentinel, wraith, and bulwark enemies should use generated `.glb` assets through the batched loader, while any failed slot should keep its procedural fallback.
- Boss model runtime: boss_01, boss_02, and boss_03 should use generated `.glb` assets through the batched loader during live combat.
- Model fallback: if any enabled enemy or Boss model fails to load, that variant should remain visible through its procedural fallback instead of disappearing.
- Projectile and pickup clarity: whether player shots, enemy shots, POWER crystals, repair pickups, and SP refills are easy to distinguish during busy combat.
- Hit feedback: whether small hits, enemy kills, chain effects, skill clears, and player damage flashes feel readable without becoming visual noise.
- Boss variants: whether boss_01, boss_02, and boss_03 bullet shapes feel distinct and still dodgeable, including the short arming window before green lock-on shots become dangerous.
- Settings: whether opening settings pauses combat, Resume returns to the run, Chinese/English switching updates visible text, and the sound toggle persists after refresh.
- Settings armory codex: whether the armory codex stays collapsed by default, expands one trait at a time, keeps level colors readable, shows the trait-owned external module preview without the full prototype ship, and uses the animated demo area plus Next Ultra quick preview to make level 1-6 and Ultra 7 effects understandable without grinding a run.
- Settings enemy codex: whether the enemy codex stays collapsed by default, uses the top enemy rail plus one focused profile deck, and makes small, elite, and Boss roles understandable without visual stutter.
- Audio: whether start/toggle sounds are audible after a user click, whether the volume slider persists after refresh, and whether firing, hits, kills, pickups, repairs, damage, skills, upgrades, pause/resume, and run complete sounds stay helpful without becoming loud or tiring.
- HUD: whether the bottom HP bar is readable, color changes are clear, and damage trailing feels understandable.
- Pause: whether Esc makes the pause state clear and whether the current module list is useful.
- Later waves: whether Boss health scales enough to feel durable without phase 3 becoming oppressive.
- S90 late pressure: whether Boss 2 around 4.5k HP and Boss 3 around 9k HP feel durable enough without dragging, and whether 140s+ enemy density remains dodgeable on mobile.
- S91 map hazards: after higher power or longer flight, whether asteroid warning lanes are readable, asteroid explosions help break enemy clusters, and destructible transports feel like useful temporary equipment drops rather than random clutter.
- S92 player visual evolution: after repeated upgrades, whether reinforced wing plates, nose cannons, and tail boosters make the ship feel upgraded without hiding its silhouette.
- S92 escort prototype: whether the two small escort drones and laser beams read as allied weapons without being confused for enemy bullets or pickups.
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
- Upgrade panel smoothness: whether the three-choice upgrade panel appears quickly and whether Ultra cards feel special without causing visible stutter.
- Mobile long-run smoothness: whether Boss transitions and late hazards still feel smooth after several minutes of play.
- S93 performance governor: whether dense enemy/model/VFX moments feel smoother, and whether any temporary visual simplification is noticeable or distracting.
- S93 stress pass: during offense-heavy upgrades and many explosions, note whether the game stays responsive or still has visible hitching.
- S94 model/performance pass: check whether upgrade hardpoints, shield petals, refined Boss hull details, and the new Boss bloom/crossfire/lock-on patterns feel richer while staying smooth.
- S95 Ultra/Boss pass: after a trait reaches level 7, check whether the new bright Ultra nodes make the ship feel transformed without visual clutter; in boss_03 phase 5, check whether the crown-petal layer feels dramatic but still dodgeable.
- S96 model silhouette pass: check whether player evolution mounts and the three Boss silhouettes are easier to tell apart without stutter, especially boss_03 crown/lock-on arrays and boss_02 carrier deck structures.
- S97 late Boss patterns: in boss_02 phase 5, check whether side-rail interceptor shots feel distinct from the normal lanes; in boss_03 phase 5, check whether extra lock-on spikes feel dramatic but still leave readable escape routes.
- S98 late elite patterns: after roughly the second half of the run, check whether sentinel/wraith/bulwark shots feel different from basic elite shots while the first minute still feels fair.
- S99 model polish: check whether upgraded wing cannons and escort drones now read as real auxiliary weapons, and whether Boss attack sources are easier to understand from their silhouettes.
- S100 boss_03 mirror crossfire: in boss_03 phase 5, check whether the added slow side-mirror shots make the flagship feel more spectacular while still leaving readable bottom-lane escape gaps.
- S101 bulwark model: in late waves, check whether bulwarks read as heavy armored mortar enemies and are easier to distinguish from sentinels and wraiths.
- S102 model batching stability: check whether enemy/Boss `.glb` models still render normally and whether the browser console stays clean while model detail is enabled.
- S103 modular model polish: check whether player auxiliary weapon mounts and Boss attack-source sockets are more readable without making the screen feel visually heavier.
- S104 projectile readability: check whether sentinel, wraith, bulwark, and Boss lock-on bullets are easier to tell apart while their hitboxes still feel fair.
- S105 Boss presentation variants: check whether boss_01/boss_02/boss_03 entry and phase-shift bursts feel more distinct without covering bullets or causing stutter.
- S106 player Ultra evolution: after traits reach level 7, check whether wing/nose/tail/shield/escort transformations feel visibly upgraded without confusing the player hitbox or hiding bullets.
- S107 boss_03 phase curtain: in boss_03 phase 5, check whether the cyan outward curtain reads as a flagship attack while the lower lane still has usable gaps, especially on mobile.
- S108 boss_03 model emitters: check whether the added phase-curtain mirrors and prism nozzles make the cyan curtain feel like it comes from the Boss hull instead of appearing from nowhere.
- S109 pressure-tier model cadence: during dense late waves, check whether Boss/enemy models stay visually acceptable when the performance governor briefly reduces update cadence.
- S110 boss_03 presentation alignment: when boss_03 enters phase 5, check whether the phase-shift bursts line up with the outer curtain mirror/nozzle area without hiding bullets.
- S111 validation coverage: late-Boss smoke tests can now fail if they do not sample the required Boss variant and phase.
- S112 player auxiliary docking: after auxiliary/escort upgrades, check whether the new ammo cells, outer guides, and sync beacons make the ship feel more mechanically prepared for side weapons and drones.
- S113 warm performance metrics: when reviewing automated results, compare total FPS with warm-run FPS to distinguish startup spikes from combat stutter.
- S114 runtime escort detail: after escort-oriented upgrades, check whether the small drones read more like armed companions without visually blending into enemy bullets.
- S115 escort pulse: when escort drones are firing, check whether the pulsing cores and muzzle tips make them feel active without adding visual noise.
- S116 boss_02 carrier model: during boss_02, check whether micro-fighter silhouettes and launch rails make its side-rail interceptor attacks feel grounded in the model.
- S117 boss_01 bloom model: during boss_01, check whether charge rings, scatter lenses, and micro nozzles make bloom/scatter attacks easier to read.
- S118 elite model plating: in later waves, check whether sentinels, wraiths, and bulwarks remain visually distinct after the new cannon braces, phase-blade nodes, and siege plating, without adding stutter.
- S119 light enemy model pass: in the first minute, check whether drones and skimmers read more like small aircraft after the new sensor winglets, cold-edge nodes, and tail lenses, without making the screen feel noisy.
- S120 player upgrade bus: after several upgrades, check whether the player hull's upgrade rails, shield sockets, wing hinges, feed rails, and escort release tabs make auxiliary weapons feel mounted to the aircraft rather than floating around it.
- S121 upgrade port glow: after choosing upgrades, check whether the related player sockets glow clearly enough to show growth while staying subtle during dense combat.
- S122 Ultra projectile readability: after any trait reaches level 7, check whether the actual combat bullets clearly change silhouette/color enough to feel like a qualitative upgrade, not only a damage increase.
- S123 deep-space background: check whether the old vertical guide/flow lines are gone and whether open space still has enough depth without looking like a flat empty canvas.
- S124 SP input: on keyboard, check that `4` and `Space` both trigger SP, while the HUD button still works for click/touch.
- S125 smooth display pass: check whether the shorter `4 xN` SP button reads cleaner, whether the background feels more like deep space, and whether dense moments have fewer noticeable hitches.
- S126 flight motion pass: check whether lateral movement now banks naturally, with less nose lift and less accessory pop, while still feeling responsive.
- S127 player hardpoint detail: check whether the new ceramic plates, black brackets, recessed fasteners, barrel shrouds, service panels, and extra heat sinks make the player upgrades feel less plastic without making the small top-down ship too noisy.
- S128 Ultra pattern identity: after any offensive trait reaches level 7, check whether the real combat pattern feels qualitatively different: spread should fan wider, wing shots should read like flanking blades, surge should fire side capacitor spears, critical should add rhythm echoes, and Ultra bullets should pulse/curve without hiding enemy bullets.
- S129 codex preview: in Settings, open the armory codex and use Next Ultra to cycle level-7 weapon demos; then open the enemy codex and confirm small enemies, elites, and Bosses show readable stats and attack thumbnails.
- S130 rear external pods: after tail/engine-related upgrades, check whether the new side-rear weapon pods feel physically mounted to the ship, unfold naturally, and stay inside the readable player silhouette.
- S131 forward/wing modules: after offense-oriented upgrades, check whether nose rail shrouds, muzzle micro lenses, wing storm rails, splitter emitters, and capacitor cells appear progressively instead of popping all at once.
- S132 shield/escort modules: after shield or escort-oriented upgrades, check whether shield generator leaves, capacitor lenses, escort launch sleeves, weapon pivots, and lock beacons feel physically mounted and unfold progressively.
- S133 armory module previews: in Settings, expand the armory codex and click traits/levels to check whether each trait shows only its own evolving external module, with Ultra 7 feeling visibly stronger and no full prototype ship repeated in that module preview.
- S134 armory module polish: in Settings, check whether the local module preview now reads more like engineered equipment with rails, energy buses, core nodes, small emitters, and Ultra pulse sparks instead of a flat placeholder strip.
- S135 trait signatures: in Settings, click through multiple armory traits and confirm their module previews have distinct silhouettes, such as split fans, fork arms, rail needles, heavy blocks, chain coils, rotary drums, ordnance racks, shield arcs, magnetic claws, salvage crates, and critical rhythm ticks.
- S136 Ultra showcase rail: in Settings, expand the armory codex and use the compact trait rail to jump directly to several level-7 previews; only one module preview and one animated demo should run at a time.
- S137 showcase deck: after selecting a trait from the rail or Next Ultra, confirm the larger showcase deck appears above the rail, the expanded card keeps level/effect text only, and only one module preview plus one animated demo is active.
- S138 simplified armory codex: confirm the lower per-trait list is gone, the compact rail remains the only trait selector, and the single showcase deck's level strip still switches the selected trait between levels 1-7.
- S139 armory module detail: in the single showcase deck, compare several traits and check whether hardpoints, clamps, vents, hinges, facets, and family-specific silhouettes make the external modules feel more engineered without visual clutter.
- S140 animated demo identity: in the Armory showcase deck, compare several traits and confirm their attack demos use distinct identity markers such as fans, forks, rail needles, chain links, shield fields, pickup pull icons, SP racks, cooldown cells, and rhythm ticks.
- S141 enemy/Boss material polish: compare small enemies, elites, and Bosses during play or Model Lab and check whether added matte plates, dark retainers, heat slots, service panels, and rougher material response reduce the toy/plastic read without adding stutter.
- S142 Armory module depth polish: open Settings -> Armory Codex, select several Ultra chips, and check whether the single top showcase deck's external module preview reads as layered hardware through depth plates, shadows, bolts, clamps, vents, and family-specific silhouettes.
- S143 Boss bullet readability: in later Boss phases, check whether blue Prism lanes and stepped lock-on warning colors make dangerous patterns easier to read without feeling like the bullet count increased.
- S144 player material retune: compare the player ship, wing/nose/tail/shield/escort attachments, and Model Lab view for less plastic shine, darker brackets, rougher metal response, and calmer glow while preserving readability.
- S145 mobile VFX pressure: on phones, watch Boss transitions, upgrade-heavy moments, and explosion bursts for smoother motion; shard density is intentionally a little calmer while core combat feedback should remain visible.
- S154 Ultra projectile identity: after maxing damage, rapid, velocity, pierce, heavy, fork, or chain, check whether the main combat bullets now have distinct colors, silhouette proportions, and pulse rhythms instead of all feeling like the same primary Ultra shot.
- S154 attachment material pass: after several upgrades, compare wing/nose/tail/shield/escort runtime parts for rougher metal/ceramic response and less toy-like saturation while still staying readable in combat.
- S154 smoke verification: live or cold production smoke tests should wait long enough for GitHub Pages resource loading before declaring the Start button missing.
- S155 render upload trim: during the first Boss entry and sparse enemy moments, watch for fewer visible hitches while enemy/Boss `.glb` model details remain enabled.
- S155 empty-pool smoothness: on mobile, check whether moments with no enemy bullets, pickups, hazards, or explosions still feel stable instead of stuttering from invisible buffer work.
- Future model quality: note any player/Boss/enemy attachment that still feels plastic, flat, or toy-like; the next modeling passes should prioritize material layering, bevel-like geometry, heat sinks, brackets, and believable weapon cores.
- Future armory codex modules: after the runtime model set stabilizes further, the module previews can be replaced by higher-fidelity miniature part renders while keeping the same collapsed, one-trait-at-a-time interaction.
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
