# stormraider_game 里程碑计划

## M0 规划定稿
- 产出 SPEC.md、CLOUD.md、最终方案、架构、部署计划。
- 用户已确认视觉风格与后端账号策略。

## M1 可运行空场景
- Vite + TypeScript + Three.js。
- 相机、灯光、深色背景、基础 HUD。
- PC/移动端窗口适配。
- `npm run dev` 和 `npm run build` 通过。

## M2 战机与输入
- Low-Poly 战机几何体。
- PC WASD/方向键、鼠标/触控拖拽。
- 移动边界、阻尼平滑、暂停。

## M3 子弹与对象池
- BulletPool。
- InstancedMesh 批渲染。
- 普攻三档升级。
- 弹幕生命周期与边界回收。

## M4 敌人与波次
- EnemyPool。
- JSON 波次导演。
- 小怪和精英基础移动。
- 击杀、掉落、得分。

## M5 碰撞与伤害
- Spatial Hash Grid。
- 玩家受伤、护盾、无敌帧。
- 敌人受击、死亡、清理引用。

## M6 Boss 与技能
- Boss 入场、血条、三阶段弹幕。
- 雷霆光束、空域爆破、追踪雷弹、全屏炸弹。
- 基础打击感：闪白、震屏、顿帧。

## M7 UI 与结算
- HUD、技能 CD、暂停、设置、结算。
- IndexedDB 上一局记录和历史最高记录。
- 移动端按钮布局。

## M8 部署与优化
- README。
- GitHub Actions。
- Cloudflare Pages 或 GitHub Pages。
- 移动端画质降级。
- 20 分钟稳定性测试。

## M9 后端增强（暂缓）
- 不进入 MVP。
- 未来如需云同步或每日挑战，再启用 Cloudflare Workers/KV/D1。
- 公共排行榜已确认不需要。
