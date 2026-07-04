# SPEC: stormraider_game
> 版本: 1.0 | 创建时间: 2026-07-04 | 最后修改: 2026-07-04

## 项目概述
- 中文暂定名: 雷霆战机
- 英文工程名: stormraider_game
- 类型: Web 3D Low-Poly 纵版弹幕射击游戏
- 定位: 单机优先、双端可玩、静态部署优先、可部署到 GitHub + Cloudflare Pages 免费额度
- 一句话简介: 在深色霓虹低多边形宇宙中，玩家驾驶战机躲避弹幕、击破波次敌机和 Boss，并通过局内升级形成单局成长。

## 最终技术栈
- 前端: TypeScript + Vite + Three.js
- 渲染: WebGL2, Three.js InstancedMesh, Selective Bloom, 低多边形几何体
- UI: HTML/CSS HUD 覆盖层 + 少量 3D World Space UI
- 状态/玩法: 自研轻量 ECS/Data-Oriented 架构
- 碰撞: 自研 AABB/Sphere + Spatial Hash Grid；MVP 阶段不引入重物理引擎
- 数据: JSON 配置表；MVP 使用本地随包配置
- 本地存档: IndexedDB，LocalStorage 只保存极小设置项
- 后端推荐: MVP 不启用后端服务；只使用 GitHub + Cloudflare Pages 部署静态前端
- 部署: GitHub 仓库 + GitHub Actions + Cloudflare Pages

## 设计规范
- 视觉风格: 3D Low-Poly + 深色宇宙 + 雷霆蓝/电光紫 + Bloom 泛光
- 主色建议: 背景 #070A12, 雷霆蓝 #27D8FF, 电光紫 #9B5CFF, 警示橙 #FF8A3D, 敌方粉红 #FF3EA5
- 模型语言: 战机、敌机、碎片均由低面数几何体拼装，优先纯色材质和 flatShading
- HUD: 极简、半透明、信息贴边；不要遮挡核心战斗区
- 动效: 中等强度，必须包含命中闪白、短顿帧、轻屏震、爆炸碎片、飞行拖尾
- 移动端策略: 降低 Bloom 分辨率、降低弹幕上限、自动开火、触控滑动移动

## 核心玩法
- 操作: PC 支持 WASD/方向键移动、鼠标/左键射击、Space 炸弹、ESC 暂停；移动端支持拖拽移动、自动射击、右下角技能按钮
- 攻击: 普攻多轨升级、雷霆光束、空域爆破、追踪雷弹、全屏炸弹
- 敌人: 小怪、精英、Boss 三层；Boss 多阶段血量阈值切换弹幕
- 成长: 局内拾取升级 + 每关结束三选一 Roguelite 模块
- 关卡: JSON 波次驱动，支持固定波次、时间触发、Z 轴纵深入场、左右环绕切入
- 记录: 本地 IndexedDB 记录上一局数据和历史最高数据；不做联机排行榜

## 性能与内存强约束
- 游戏循环内禁止频繁 new/delete 高热对象。
- 子弹、敌机、掉落物、爆炸、伤害数字、碎片必须走对象池。
- 同屏弹幕 MVP 上限: PC 300，Mobile 160；低帧时自动降级。
- 同屏敌机 MVP 上限: PC 50，Mobile 30。
- 所有同类子弹/碎片优先使用 InstancedMesh 合批渲染。
- 碰撞只使用轻量碰撞体，不使用复杂 Mesh Collider，不在每帧使用 Three.js Raycaster 扫全场。
- 关卡切换时显式 dispose 不再使用的 geometry/material/texture，并清空活跃池引用。
- MVP 不启用 Render、Workers、KV/D1 等后端服务；游戏完全静态部署，战斗和记录均在浏览器本地完成。

## 子项目清单
| # | 子项目 | 描述 | 优先级 | 状态 |
|---|---|---|:---:|:---:|
| 1 | 工程脚手架 | Vite + TS + Three.js + 目录规范 + lint/build | P0 | 待开始 |
| 2 | 核心渲染场景 | 相机、灯光、Low-Poly 背景、Bloom、尺寸适配 | P0 | 待开始 |
| 3 | 输入系统 | PC/移动端统一输入抽象 | P0 | 待开始 |
| 4 | 数据池/ECS | TypedArray 数据池、实体生命周期、对象池 | P0 | 待开始 |
| 5 | 玩家与武器 | 战机移动、普攻、技能、炸弹、升级 | P0 | 待开始 |
| 6 | 敌人与波次 | JSON 波次导演、小怪/精英/Boss | P0 | 待开始 |
| 7 | 碰撞与伤害 | Spatial Hash、判定、防重复扣血 | P0 | 待开始 |
| 8 | VFX 与打击感 | 爆炸碎片、拖尾、闪白、震屏、顿帧 | P1 | 待开始 |
| 9 | UI/HUD | 分数、血量、护盾、技能 CD、暂停、结算 | P1 | 待开始 |
| 10 | 存档与配置 | IndexedDB、本地上一局/历史最高记录、本地设置 | P1 | 待开始 |
| 11 | 后端增强 | 暂不实施；仅保留未来扩展说明 | P3 | 暂缓 |
| 12 | 部署验收 | GitHub Actions、Cloudflare Pages、README | P0 | 待开始 |

## 需要用户确认
- 已确认视觉方向: 深色宇宙 + 雷霆蓝/电光紫 + Low-Poly + Bloom 泛光。
- 已确认部署方向: 只用 GitHub + Cloudflare Pages。
- 已确认排行榜方向: 不需要联机和公共排行榜，只做上一局记录与历史最高记录。

## 版本历史
- v1.0: 合并五份讨论方案，确定 Web 3D Low-Poly 技术路线。
