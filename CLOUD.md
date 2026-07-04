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
