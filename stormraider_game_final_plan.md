# stormraider_game 最终方案

## 1. 最终结论
五份方案的交集非常清晰：本项目不应走 Unity 重客户端路线，也不应做普通 2D Canvas 小游戏。最终建议采用 **Web 3D Low-Poly 纵版弹幕射击**，用 **Three.js + TypeScript + Vite** 构建前端游戏主体，用 **对象池 + 数据驱动 + InstancedMesh** 解决高弹幕和高刷怪压力。

后端保持极简：MVP 不启用后端服务，游戏本体作为静态前端部署到 Cloudflare Pages，记录写在浏览器本地。未来如果需要云同步或每日挑战，再单独启用 Cloudflare Workers/KV/D1 或 Render。

## 2. 为什么选 Web 3D Low-Poly
- GitHub 展示友好，浏览器即玩，不需要下载安装。
- Three.js 可精确控制渲染、内存、资源释放，适合你强调的性能和 GC 管控。
- Low-Poly 既有视觉差异化，又不依赖大量贴图资产，能显著降低制作和加载成本。
- Cloudflare Pages 免费额度适合静态游戏部署。
- Render 暂不使用，避免为了非核心功能增加账号和维护成本。

## 3. MVP 范围
第一版目标是“能玩、好看、稳定、可部署”，不要一次性做满商业手游系统。

- 一架主战机，支持移动、普攻、三技能、炸弹。
- 三类敌人：Drone、Elite、Boss。
- 三类弹幕：直线、扇形/环形、追踪。
- 三个关卡主题：星空航道、雷云战区、深空核心。
- 一个 Boss，至少三阶段弹幕。
- 局内升级：普攻等级、冷却缩减、护盾、追踪雷弹强化。
- 本地记录：上一局记录、历史最高记录。
- 完整部署：GitHub + Cloudflare Pages。

## 4. 非 MVP 暂缓
- 账号系统。
- 多人联机。
- 商店、装备养成、复杂皮肤系统。
- 复杂服务端反作弊。
- 真 3D 物理模拟。
- 大量贴图和大型 glTF 资产。

## 5. 目录建议
```text
stormraider_game/
  public/
    assets/
      audio/
      models/
      textures/
    config/
      enemies.json
      waves.json
      weapons.json
  src/
    core/
      Game.ts
      Loop.ts
      Time.ts
      Pool.ts
      EntityStore.ts
    render/
      Renderer.ts
      CameraRig.ts
      InstancedBatch.ts
      Effects.ts
    gameplay/
      PlayerSystem.ts
      WeaponSystem.ts
      BulletSystem.ts
      EnemySystem.ts
      WaveDirector.ts
      CollisionSystem.ts
      DifficultyDirector.ts
    input/
      InputRouter.ts
      KeyboardInput.ts
      PointerInput.ts
      TouchInput.ts
      GamepadInput.ts
    ui/
      Hud.ts
      PauseMenu.ts
      ResultPanel.ts
    data/
      ConfigLoader.ts
      Storage.ts
    styles/
      app.css
    main.ts
  docs/
  package.json
  vite.config.ts
  README.md
```

## 6. 实施顺序
1. 搭建 Vite/TS/Three.js 工程，跑通空场景。
2. 做战机移动、相机、背景滚动和 HUD。
3. 加对象池和 InstancedMesh 子弹批渲染。
4. 加敌机波次和碰撞伤害。
5. 加技能、炸弹、掉落物、升级。
6. 加 Boss 和完整关卡节奏。
7. 加本地存档、设置、结算。
8. 做移动端降级与部署验收。
9. 后端增强暂缓，仅在文档中保留扩展接口。

## 7. 成功标准
- 桌面端 60 FPS，移动端至少稳定 45 FPS。
- 长时间游玩 20 分钟内存曲线不持续上升。
- 关卡重开后活跃对象、资源引用、定时器清零。
- GitHub README 能说明玩法、部署、目录和开发命令。
- 配置表改数值可以影响刷怪、武器、敌人，而不改核心代码。
