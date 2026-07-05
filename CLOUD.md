# CLOUD: stormraider_game 持久记忆
> 创建时间: 2026-07-04

## IMPORTANT
- 工程名: stormraider_game
- 用户指定输出目录: C:\Users\86159\Desktop\PROJECTS\Game_Pro\stormraider_game
- 最终路线: Web 3D Low-Poly 弹幕射击，Three.js + TypeScript + Vite。
- 视觉确认: 深色宇宙 + 雷霆蓝/电光紫 + Low-Poly + Bloom 泛光。
- 部署确认: 只用 GitHub + Cloudflare Pages。
- 后端原则: MVP 不使用 Render、Cloudflare Workers、KV/D1；不做联机，不做公共排行榜。
- 存档确认: 使用本地 IndexedDB，只记录上一局记录和历史最高记录。
- 性能红线: 高频对象必须对象池化；关卡切换必须清理引用并 dispose 资源；移动端必须有降级策略。
- 设计默认: 深色宇宙背景、雷霆蓝/电光紫/警示橙、霓虹 Bloom、低多边形几何体。
- 用户已确认: 不需要公共排行榜；需要个人历史里的上一局记录和历史最高记录。

## 项目状态
- 阶段: MVP 已上线 100%
- 当前子项目: Cloudflare Pages 线上发布已完成
- 下一个子项目: 扩展玩法或视觉后处理

## 已完成
| # | 子项目 | 完成时间 | 关键产出 |
|---|---|:---:|---|
| 0 | 方案汇总 | 2026-07-04 | SPEC.md 与规划文档 |
| 1 | 工程脚手架 | 2026-07-04 | Vite + TypeScript + Three.js + GitHub Actions + README |
| 2 | 可运行空场景 | 2026-07-04 | Low-Poly 战机、星场、航道线、HUD、IndexedDB 存档骨架 |
| 3 | 基础射击切片 | 2026-07-04 | 自动开火、玩家子弹池、InstancedMesh 批渲染、HUD 子弹池状态 |
| 4 | 基础敌人与命中闭环 | 2026-07-04 | EnemyPool、波次生成、距离平方命中、击杀得分、HUD 敌人数 |
| 5 | 基础打击感 | 2026-07-04 | ExplosionPool、敌机爆碎、轻微屏幕震动、HUD VFX 状态 |
| 6 | 结算与本地记录 | 2026-07-04 | Esc 暂停、R 结束本局、结算面板、IndexedDB 上一局/历史最高记录 |
| 7 | 真实失败条件 | 2026-07-04 | 敌机突破底线/撞击玩家扣 HP，HP 归零自动 DESTROYED 结算 |
| 8 | 技能与炸弹 | 2026-07-04 | 1/2/3 技能雏形、SP 清屏、冷却显示、炸弹次数 |
| 9 | 移动端自动技能 | 2026-07-04 | 1/2/3 默认按敌人压力和冷却自动释放；2 号技能按近身威胁优先触发；SP 清屏保留手动 |
| 10 | 移动端布局与难度调参 | 2026-07-04 | 移动端 HUD 仅保留核心指标，技能按钮改为右侧单列；手机 profile 降低像素比、刷怪频率、波次密度、敌机速度与碰撞惩罚 |
| 12 | 部署验收 | 2026-07-04 | `.node-version`、Cloudflare Pages `_headers`、GitHub Actions artifact、README 部署步骤、生产 preview 桌面/移动验收 |
| 全局 | 全局连接与最终验收 | 2026-07-04 | 生产构建、桌面 preview、移动 preview、结算链路、dist 结构、Cloudflare `_headers`、npm audit 全部通过 |

## 待执行
- [x] 1: 工程脚手架
- [x] 2: 核心渲染场景
- [x] 3: 输入系统深化
- [x] 4: 数据池/ECS 基础子弹池
- [x] 5: 玩家与武器基础普攻
- [x] 6: 敌人与波次基础版
- [x] 7: 碰撞与伤害基础版
- [x] 8: VFX 与打击感基础版
- [x] 9: UI/HUD 结算与暂停基础版
- [x] 10: 存档与配置基础版
- [ ] 11: 后端增强
- [x] 12: 部署验收
- [x] 全局连接与最终验收

## 最近会话摘要
- 2026-07-04 S1: 读取五份雷霆战机讨论方案，统一为 stormraider_game 工程规划。核心决策为 Web 3D Low-Poly、Three.js、TypeScript、Vite、对象池、InstancedMesh、配置驱动、GitHub + Cloudflare Pages 静态部署。
- 2026-07-04 S2: 用户确认视觉为深色宇宙 + 雷霆蓝/电光紫 + Low-Poly + Bloom 泛光；确认不做联机和公共排行榜；本地只记录上一局和历史最高。
- 2026-07-04 S3: 创建 Vite/TS/Three.js 工程，安装依赖并通过 `npm run build`；启动本地服务器 `http://127.0.0.1:5173`；浏览器截图确认 canvas、HUD、Low-Poly 战机和星场渲染正常。
- 2026-07-04 S4: 修复玩家移动边界过宽问题，将玩家可移动区域收紧到可视安全框，避免战机从页面底部飞出屏幕外；构建通过并完成浏览器截图检查。
- 2026-07-04 S5: 实现玩家自动射击、固定容量 `PlayerBulletPool`、TypedArray 子弹数据、InstancedMesh 批量子弹渲染、HUD 显示 `BULLETS` 和 `FIRE`；修复分数逐帧取整导致不增长的问题；构建与浏览器截图验收通过。
- 2026-07-04 S6: 实现 `EnemyPool`、基础小怪波次、InstancedMesh 敌机批渲染、子弹与敌机距离平方碰撞、击杀得分、HUD `ENEMIES`；桌面目录构建通过，浏览器截图确认粉色敌机、自动射击和得分闭环正常。
- 2026-07-04 S7: 实现 `ExplosionPool`，敌机击毁时生成低多边形橙色碎片并触发短屏震；HUD 增加 `VFX` 计数；桌面目录构建通过，浏览器验收确认 VFX 池、敌人、子弹、得分正常。
- 2026-07-04 S8: 实现 `ResultPanel`、Esc 暂停/继续、R 结束本局并保存记录、Restart 重开；本地记录路径为 `saveLastRun -> load -> showComplete`，浏览器验收显示上一局分数、历史最高、击杀数和生存时间。
- 2026-07-04 S9: 实现真实失败条件：敌机突破底线扣 8 HP，撞击玩家扣 20 HP，HP 归零自动保存并展示 `DESTROYED` 结算；浏览器验收 HP 从 100 降至 0 并弹出结算面板。
- 2026-07-04 S10: 实现技能输入与按钮：`1/2/3` 触发范围伤害雏形并进入冷却，`Space/SP` 清屏消耗炸弹次数；HUD 按钮显示冷却和剩余炸弹。浏览器验收 `SP 3 -> SP 2`、分数上涨，`1` 键显示冷却并禁用按钮。
- 2026-07-04 S11: 为移动端优化技能操作：`1/2/3` 默认自动释放，每帧最多自动选择一个技能，敌人压力阈值为 2/5/8；`T` 可切换自动技能，`Space/SP` 清屏不自动消耗。桌面与 390x844 手机视口浏览器验收通过。
- 2026-07-04 S12: 修正 `2` 号技能自动触发体感弱的问题：`EnemyPool` 新增近身威胁统计，`2` 号技能现在在近身威胁出现或场上敌人积压到 7 个时优先自动触发。浏览器 12 秒采样确认 `2` 多次进入冷却，`SP` 保持手动不消耗。
- 2026-07-04 S13: 完成移动端布局与难度调参：移动端隐藏 BULLETS/VFX/FIRE 诊断项，390px 视口保留 SCORE/BEST/HP/ENEMIES，超窄屏隐藏 BEST；技能按钮从 2x2 改为右侧单列，避免遮挡玩家机体；Renderer 增加 mobile profile，手机像素比上限降至 1.25，EnemyPool 手机上限显示为 30，刷怪间隔 0.95s，每波 1-2 架，敌机速度和碰撞/漏怪伤害下调。`npm run build` 通过，390x844 浏览器截图验收通过。
- 2026-07-04 S14: 完成 M12 部署验收：新增 `.node-version` 固定 Node 22，`public/_headers` 配置 Cloudflare Pages 安全头与缓存策略；GitHub Actions 改为读取 `.node-version` 并上传 `dist` artifact；README 增加本地开发、生产检查、Cloudflare Pages 与 GitHub 部署流程；`npm install --package-lock-only --ignore-scripts` 同步 lockfile 且 0 漏洞；`npm run build` 通过，`dist/_headers` 存在，生产 preview `http://127.0.0.1:4174` 桌面与 390x844 移动视口验收通过，`R` 结束本局可显示结算面板并写入本地记录。
- 2026-07-04 S15: 完成全局连接与最终验收：补充 `.gitignore` 忽略 `preview.log`；`npm run build` 通过，`dist/index.html`、`dist/assets/`、`dist/config/`、`dist/_headers` 均存在；Codex 内置浏览器验证 production preview `http://127.0.0.1:4174/` 桌面端可启动、HUD 更新、`R` 结束本局后 `MANUAL END` 结算面板出现；390x844 移动端显示 SCORE/BEST/HP/ENEMIES，技能栏右侧单列，敌机上限 `*/30`；`npm audit --audit-level=moderate` 0 漏洞。剩余未做：真实线上 GitHub/Cloudflare 部署、后端增强、Boss/Roguelite/JSON 配置运行时接入等扩展项。
- 2026-07-04 S16: 完成首个 Git 基线与 GitHub 推送：提交 `a5d039b feat: initialize stormraider game MVP`，创建 GitHub 私有仓库 `https://github.com/Xeno505-VCD/stormraider_game` 并推送 `main`。Cloudflare Pages 线上部署尚未完成：Wrangler 已安装但当前 Cloudflare 登录/Token 不可用，`wrangler whoami` 与 `wrangler pages project list` 均超时；本机也未发现 `CLOUDFLARE_API_TOKEN`/`CF_*` 环境变量。
- 2026-07-04 S17: 用户完成 Wrangler OAuth 登录；Cloudflare Pages 项目 `stormraider-game` 创建成功，并部署 `dist` 到 Production。线上地址 `https://stormraider-game.pages.dev/` 与首次部署预览 `https://7a2f958c.stormraider-game.pages.dev` 均经 Codex 内置浏览器验证：页面标题 `Stormraider Game`，canvas 渲染正常，HUD 实时更新。新增 `npm run deploy` 脚本用于后续构建并部署。
- 2026-07-04 S18: 完成 JSON 配置运行时接入：新增 `src/data/GameConfig.ts`，启动时从 `/config/enemies.json`、`/config/weapons.json`、`/config/waves.json` 加载客户端静态配置；`PlayerBulletPool` 使用 weapon 配置控制射速、伤害、弹速和轨道；`EnemyPool` 使用 enemy 配置控制每个敌人的 HP/速度/得分，并使用 wave 配置按时间轴生成波次。校准 JSON 数值保持原 MVP 体感。`npm run build` 通过，本地 production preview 可读取 `/config` 三张表，浏览器运行 10 秒后 HUD/波次持续更新。
- 2026-07-04 S19: 完成 Boss 多阶段基础版：`enemies.json` 增加 `kind/radius/scale/supportInterval/phaseThresholds`，`boss_01` 现在以大体型入场，抵达战场上方后悬停横移，不再像普通敌人直接漏底；HP 低于 66%/33% 时进入 2/3 阶段，阶段越高支援生成越频繁，第 3 阶段可混入 elite 支援。Boss/精英/小怪继续共用 `EnemyPool` 与 InstancedMesh，不新增热路径对象。`npm run build` 通过，本地 production preview 跑到 Boss 波次并继续运行超过 40 秒，HUD/技能/HP/敌人数正常更新。
- 2026-07-04 S20: 完成 Boss HUD 可读性增强：`EnemyPoolStats` 暴露 Boss active/hp/maxHp/phase，Renderer/Game/Hud 串联到 UI；`index.html` 新增 `boss-panel`，CSS 新增顶部 Boss 血条、阶段提示和移动端布局；Boss HP 调整到 720、得分 2200，让血条有足够存在时间。本地 production preview 桌面 26 秒截图确认 Boss 血条显示 `PHASE 3` 与 HP 数值；390x844 移动端确认 Boss 面板位于顶部 HUD 下方，不遮挡技能栏，画面可读。`npm run build` 通过。
- 2026-07-04 S21: 完成 Boss 专属弹幕基础版：新增 `EnemyBulletPool`，敌弹使用 TypedArray 对象池与 InstancedMesh 合批，PC 上限 180、移动端上限 96；Boss 根据阶段发射粉橙色扇形弹幕，移动端自动降低弹幕密度，敌弹命中玩家扣 HP 并回收。`EnemyPoolStats` 增加 Boss 坐标，Renderer 按 Boss 坐标/阶段触发发弹并合并敌弹伤害。Boss HP 调整到 1800、得分 4200，让 Boss 战和弹幕窗口更完整。本地 production preview 桌面与 390x844 移动端 29 秒截图确认 Boss 血条、阶段、敌弹、HUD 和 HP 正常。
- 2026-07-04 S22: 完成 SP 清弹增强：`EnemyBulletPool` 新增 `clearAll()`，SP/炸弹现在同时清除敌机和屏幕内敌弹，并按清掉的敌弹给少量分数；释放后 Boss 发弹冷却会短暂延后，形成可感知的安全窗口。`README.md` 已同步说明。
- 2026-07-04 S23: 按用户新节奏进入“本地大阶段开发，不每次上传部署”：使用派生 agent 并行勘察三选一升级与拾取/武器系统，主线程实现本地第一版 Roguelite 成长闭环。新增 `PickupPool` 对象池与 InstancedMesh 能量晶体，击杀后掉落并强吸附；新增 `UpgradePanel` 三选一 UI，Game 增加 `upgrade` 模式，POWER 达阈值后暂停战斗，选择模块后恢复；`PlayerBulletPool` 增加 spread/damage/rapid/velocity 四类运行时升级，并把弹道轨道改为升级时预计算，避免热路径分配。当前仅本地构建通过，尚未 commit/push/deploy。
- 2026-07-04 S24: 根据用户反馈调整难度：Boss 弹幕从持续压迫改为更稀疏的节奏扇形波，每波数量、速度、判定半径和伤害下调，发射间隔拉长并取消三阶段额外侧弹，给玩家回位窗口；小怪刷点改为横向 lane 轮换加纵向错位，降低同线堆叠导致的突然失败；撞机/漏怪伤害和玩家碰撞半径同步下调。本地 `npm run build` 通过，浏览器跑到 Boss 三阶段 32 秒时 HP 63、未结算，选择升级后继续 12 秒 HP 49、未结算。尚未 commit/push/deploy。
- 2026-07-04 S25: 根据用户进一步反馈做第二轮节奏调参：Boss 弹幕改为按玩家当前位置瞄准的弧形散弹，但每波最多 3 发、速度/伤害继续降低、发射间隔拉到约 2 秒以上，保证底线区域能钻过弹缝；小怪波次 JSON 降低数量与频率，`EnemyPool` 按玩家横向位置偏移刷怪，优先在玩家附近两侧生成而不是同线压顶；Boss 支援小怪降频并减少阶段切换支援数。本地 `npm run build` 通过，浏览器跑到 Boss 三阶段 33 秒时 HP 84、场上小怪 2 个；选择升级后继续 16 秒 HP 62、未结算。尚未 commit/push/deploy。
- 2026-07-04 S26: 调整 POWER 经验掉落为按敌人类型计算：小怪 1、精英 3、Boss 10；`EnemyPool` 的 `HitResult/ClearResult` 增加 `pickupEnergy`，普通子弹、技能和 SP 清屏都按该值生成拾取物；`PickupPool.spawnBurst` 单次上限提高到 PC 12 / Mobile 8，允许 Boss 掉落足量晶体。本地 `npm run build` 通过，浏览器验证 Boss 段后 POWER 到 `L2 11/9` 并触发升级选择。尚未 commit/push/deploy。
- 2026-07-04 S27: 扩展武器升级形态：`PlayerBulletPool` 新增 `pierce` 与 `heavy` 两类模块，穿透弹命中后可继续贯穿目标，重弹提高伤害/半径并略降弹速；三选一升级池从 4 个模块扩展到 6 个，包含 spread/damage/rapid/velocity/pierce/heavy，并继续按阶段轮换展示 3 个选项。弹道轨道仍保持升级时预计算，热路径不新增数组分配。本地 `npm run build` 通过，浏览器验证第一轮升级面板正常显示、战斗未结算。尚未 commit/push/deploy。
- 2026-07-04 S28: 将 Roguelite 升级选项迁入客户端 JSON：新增 `public/config/upgrades.json`，`GameConfig` 启动时加载并校验至少 3 个升级选项，`Game.ts` 移除硬编码升级文案，改用 `config.upgrades` 轮换展示；README 同步增加 upgrades 配置说明。本地 `npm run build` 通过，`dist/config/upgrades.json` 存在，preview 可访问 `/config/upgrades.json`，浏览器验证第一轮升级面板仍正常显示。尚未 commit/push/deploy。
- 2026-07-04 S29: 扩展拾取物类型：`PickupPool` 增加 Energy/Repair/Bomb 三类，继续共用 TypedArray 与 InstancedMesh，并用 instance color 区分蓝色 POWER、绿色回血、橙色 SP；精英及以上掉落回血，Boss 掉落回血和 SP 补给。Renderer 收集 SP 后上限叠到 5，Game 收集 Repair 后 HP 回到最高 100。本地 `npm run build` 通过，浏览器验证 Boss 后 HP `90 -> 100`、SP `3 -> 4`、POWER `L2 11/9`，未结算。尚未 commit/push/deploy。
- 2026-07-04 S30: 增加 Minecraft 风格 POWER 经验条：`index.html` 在顶部 HUD 数值下方新增 `hud__xp` 细长进度条，`Hud.ts` 根据 `upgradeCharge / upgradeThreshold` 同步进度和 `Lx current/target` 文本，CSS 增加细长发光条、满格高亮，并将 Boss 血条下移避免重叠。`npm run build` 通过；浏览器桌面验证 `L1 6/6` 时经验条满格且与 Boss 面板不重叠，390x844 移动视口验证顶部 HUD 与经验条不重叠。尚未 commit/push/deploy。
- 2026-07-05 S31: 本地继续收口 Roguelite 武器形态：`PlayerBulletPool` 为普通/穿透/重弹/重弹穿透子弹写入 InstancedMesh instance color，普通保持雷霆蓝、穿透为电紫、重弹为警示橙、重弹穿透为橙金，同时复用 scratch Color 避免热路径分配。上一轮浏览器 120 秒长测已验证多轮 Boss、拾取物、升级面板与经验条稳定，未结算失败；本轮仍仅本地变更，尚未 commit/push/deploy。
- 2026-07-05 S32: 将 Vite/Three.js 分包优化纳入后续任务池：当前 `npm run build` 的 500KB chunk 提示不阻塞运行或部署，主要来自 Three.js 与游戏入口同包；后续在较大阶段收口或首屏加载变慢时，可通过 Vite `build.rollupOptions.output.manualChunks` 将 `three` 单独拆成 vendor chunk，并验证 Cloudflare Pages 缓存、首屏加载、移动端运行无回退。该项暂定为性能优化任务，不在当前 Roguelite 功能阶段强制实施。
- 2026-07-05 S33: 根据用户要求增强小怪行为：`EnemyPool` 为非 Boss 敌人加入上半屏横向游荡/缓降逻辑，基于 homeX、wobble 与轻微玩家横向牵引形成“在屏幕上方游荡”的体感，不再笔直下压；同池记录低频开火事件，普通小怪单发、精英左右错位双发。`EnemyBulletPool` 新增小怪慢速瞄准弹，速度和伤害均低于 Boss 弹幕，仍复用 TypedArray 对象池与 InstancedMesh；`Renderer` 将小怪开火事件接入敌弹池。`npm run build` 通过；本地 preview 45 秒自动试玩无控制台错误，HP 在 90-100 区间波动，升级/Boss/拾取链路仍正常。尚未 commit/push/deploy。
- 2026-07-05 S34: 补充移动端验证小怪游荡与低频弹幕：390x844 视口本地 preview 自动采样约 67 秒，控制台错误 0，未触发结算失败；过程中 Boss、升级面板、拾取物和 POWER 经验条仍正常工作，HP 在无持续手动躲避的情况下出现波动但仍可通过补给恢复。额外截图确认 390px 宽度下 HUD 与经验条没有横向滚动或重叠；POWER 文本在窄屏按钮内会省略，但不影响核心可读性。当前仍为本地大阶段开发，尚未 commit/push/deploy。
- 2026-07-05 S35: 完成 Vite/Three.js 分包优化：`vite.config.ts` 增加 Rollup `manualChunks`，将 Three.js 拆为 `vendor-three` chunk，其余 node_modules 预留到 `vendor`。`npm run build` 通过且原 500KB chunk 警告消失；当前产物为入口 `index` 约 44KB、`vendor-three` 约 479KB、gzip 约 120KB，`dist/index.html` 自动加入 `modulepreload`。本地 preview 刷新后浏览器验证标题、canvas、HUD、分数/HP/POWER 正常，控制台错误 0。当前仍为本地大阶段开发，尚未 commit/push/deploy。
- 2026-07-05 S36: 修正移动端 POWER HUD 可读性：390px 视口下 POWER 数值曾可能省略为 `L4 4/...`，现将移动端 HUD 的 POWER 列宽从 70px 提高到 82px，并在 380px 以下保留 76px，同时略收 POWER 内边距。`npm run build` 通过且分包警告仍消失；390x844 preview 验证 body 无横向滚动、POWER/XP 无 overflow、控制台错误 0。当前仍为本地大阶段开发，尚未 commit/push/deploy。
- 2026-07-05 S37: 增强敌弹可读性并做阶段文档同步：`EnemyBulletPool` 为 Boss/普通小怪/精英小怪弹增加弹种标记、instance color 与独立判定半径，Boss 弹保持粉色长弹，普通小怪弹为较小电紫弹，精英弹为稍大警示橙弹，视觉大小与碰撞半径同步，降低误判感。`npm run build` 通过；本地 preview 约 48 秒采样无控制台错误，Boss、升级面板、POWER、继续战斗链路正常。`README.md` 同步补充 Roguelite 升级、拾取物、小怪游荡射击与 Three.js 分包说明。当前仍为本地大阶段开发，尚未 commit/push/deploy。
- 2026-07-05 S38: 根据用户准备后续多人试玩的节奏，暂停长时间人工/自动试玩，转为外部试玩准备：新增 `src/data/BuildInfo.ts`，当前 build 标识为 `PLAYTEST S38` / `stormraider-roguelite-playtest-s38`；`index.html` 增加左下角 build badge 与结算面板 build 文本，`main.ts` 启动时写入 build 文案和 `documentElement.dataset.buildId`，方便截图和反馈定位版本。新增 `PLAYTEST.md`，包含设备、Boss、升级、拾取、性能和反馈格式清单；`README.md` 同步指向试玩清单。`npm run build` 通过，静态检查确认 dist 中包含 build badge、result build、vendor-three preload 与 build ID 文案；按用户意愿本轮未做长时间游戏测试，尚未 commit/push/deploy。
- 2026-07-05 S39: 按用户优先级先做“更多关卡/Boss/武器词条内容扩展”：`enemies.json` 新增 sentinel、wraith、boss_02、boss_03，`waves.json` 将 stage_01 扩展到三段 Boss 流程并保持循环，`upgrades.json` 新增 Forked Wake、Storm Relay、Graviton Coil；`EnemyPool` 不再写死 boss_01，按 JSON 的 `kind: boss` 识别 Boss 变体，并保存每个 Boss 的阶段阈值、支援间隔、支援类型和 instance color；`PlayerBulletPool` 增加 fork/chain/magnet 词条，fork 扩大侧向弹道，chain 击杀后触发短距连锁伤害，magnet 计入武器等级；`PickupPool` 实现磁吸半径/吸力升级，`Renderer` 串联连锁击杀的爆炸、得分和掉落。Build 标识更新为 `PLAYTEST S39` / `stormraider-content-expansion-s39`，README 与 PLAYTEST 同步。`npm run build` 通过；本轮遵循用户节奏，仅本地构建验证，尚未 commit/push/deploy。
- 2026-07-05 S40: 按用户要求新增屏幕上方设置按钮与中英文切换：新增 `src/ui/I18n.ts` 和 `src/ui/SettingsPanel.ts`，语言选择保存到 localStorage，默认按浏览器语言选择；`index.html` 静态 HUD/设置/结算/升级标题加入翻译标记，`Hud`、`ResultPanel`、`UpgradePanel` 接入动态翻译，覆盖开火状态、Boss 阶段、暂停/结算原因、升级词条标题/描述等可见文本。设置按钮位于上方右侧，移动端同步避开经验条。Boss 巡航从微弱速度积分改为目标式左右巡航，按 Boss 变体和阶段调整横向范围，同时保留上方悬停不前进。Build 标识更新为 `PLAYTEST S40` / `stormraider-settings-i18n-boss-patrol-s40`。`npm run build` 通过；内置浏览器本地 dev 验证默认中文、设置面板切 English 后 HUD/Boss/升级标题同步切换。尚未 commit/push/deploy。
- 2026-07-05 S41: 按用户反馈重排 HUD：顶部信息栏移除 HP 和 POWER 小格，避免 POWER 与经验条重复；经验条文字改为直接显示 `能量/POWER Lx current/target`。新增底部短生命条 `hud__health`，显示 `当前/100`，并按血量分为 safe 绿色、warn 黄绿/黄色、danger 橙色、critical 红/粉红四档；扣血时前景血条立即下降，背景 damage trail 延迟追随，形成可见掉血过程。移动端血条避开右侧技能列和左下 build 标识。Build 标识更新为 `PLAYTEST S41` / `stormraider-health-xp-hud-s41`。`npm run build` 通过；内置浏览器本地 dev 验证顶部仅剩积分/最高/子弹/敌机/特效/开火，经验条显示 `能量 L1 0/6`，底部 `100/100` 血条不与技能按钮或 build 标识重叠。尚未 commit/push/deploy。
- 2026-07-05 S42: 继续补齐 Boss 变体差异：`EnemyPoolStats` 增加 `bossVariant`，Renderer 将当前 Boss 变体传给 `EnemyBulletPool`；`EnemyBulletPool.spawnBossPattern` 按变体拆分三种低密度弹幕，boss_01 保持按玩家位置瞄准的弧形散弹，boss_02 使用多发射点线状压迫弹并用警示橙色区分，boss_03 使用更慢的花瓣式分散弹并用电紫色区分；Renderer 根据 Boss 变体调整发弹冷却，boss_02/boss_03 稍慢以避免弹幕过密。Build 标识更新为 `PLAYTEST S42` / `stormraider-boss-patterns-s42`。`npm run build` 通过；本轮未做长时间试玩、未 commit/push/deploy。

<!-- 2026-07-05 S43: GitHub Pages readiness + deploy. Added .github/workflows/pages.yml, changed runtime config loading from absolute /config to import.meta.env.BASE_URL relative config, updated build marker to PLAYTEST S43 / stormraider-github-pages-s43, pushed commits f4ab01b and dbb4fa6. GitHub build workflow passed; GitHub Pages enablement is blocked while the repo remains private on the current GitHub plan. Cloudflare production verified at https://stormraider-game.pages.dev/, latest preview https://58f2b6b1.stormraider-game.pages.dev. -->

<!-- 2026-07-05 S44: Repository made public and GitHub Pages enabled. Repo visibility changed to PUBLIC at https://github.com/Xeno505-VCD/stormraider_game. GitHub Pages enabled with workflow build type and verified at https://xeno505-vcd.github.io/stormraider_game/ with PLAYTEST S43 assets. Updated README and pages workflow so pushes to main automatically deploy GitHub Pages; latest pages workflow passed after rerun. -->

<!-- 2026-07-05 S45: Added playtest start flow and upgrade expansion. New StartPanel pauses combat until Start Run / Enter / Space, with keyboard event isolation so Space does not consume SP. Added wing shots, surge center bolts, cooldown reduction, and SP capacity upgrades; upgrade table now has 13 options. Updated i18n, README, PLAYTEST, and build marker to PLAYTEST S45 / stormraider-start-upgrades-s45. npm run build passed; local preview at 127.0.0.1:4185 verified start panel HTML and new upgrade JSON. Cloudflare intentionally not deployed; GitHub Pages remains primary deployment. -->
<!-- 2026-07-05 S47: Integrated local stage-content, weapon-builds, and UI-polish branches into codex/integration-preview. Added settings-open combat pause with in-panel Resume, longer small-enemy bullet lifetime so slow shots reach the lower lane, S47 build marker, and Roguelite three-choice upgrade shuffle with reduced repeat weighting. npm run build passed and local preview http://127.0.0.1:4194/ verified PLAYTEST S47 with zero browser console errors. User approved deployment; next step is merge to main and push for GitHub Pages. Cloudflare remains intentionally not deployed. -->
<!-- 2026-07-05 S48: Started Boss late-phase balance pass on codex/boss-balance-s48. Tuned boss_02/boss_03 HP down, delayed phase 3 thresholds, lengthened support intervals, reduced support count to one, removed sentinel support from boss_03 phase 3, softened boss_02 lane shots and boss_03 petal shots, and lengthened boss shot cooldowns. Updated build marker to PLAYTEST S48 / stormraider-boss-balance-s48. npm run build passed; local preview http://127.0.0.1:4194/ verified S48 with zero browser console errors. No push/deploy yet. -->
<!-- 2026-07-05 S49: Progression balance pass on codex/boss-balance-s48. Improved late enemy density with time/cycle-scaled non-boss wave counts and spawn intervals; changed upgrade thresholds to 4/7/10/13/16/18/20/22 cap for faster early traits and steadier late growth; added spawn-time HP/score scaling so boss_02/boss_03 and later loop Bosses become more durable. Restored boss_02/boss_03 base HP upward while keeping S48 late-phase bullet/support softening. Updated build marker to PLAYTEST S49 / stormraider-progression-balance-s49. npm run build passed; local preview http://127.0.0.1:4194/ verified S49, initial XP 0/4, zero browser console errors. No push/deploy yet. -->
<!-- 2026-07-05 S50: Increased Boss phase support on codex/boss-balance-s48 before deployment. EnemyPool now stores up to four HP thresholds per Boss in TypedArrays, supporting five displayed Boss phases while preserving pooled runtime structure. boss_01/boss_02/boss_03 configs now use four thresholds; existing support/bullet behavior is reused. Updated build marker to PLAYTEST S50 / stormraider-boss-five-phase-s50. User requested deployment after this change. -->
