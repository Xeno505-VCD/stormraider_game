# stormraider_game 工程架构

## 1. 核心原则
- 数据与表现分离：子弹、敌人、道具首先是数据，其次才是可见模型。
- 高频对象池化：战斗循环内不创建可被避免的临时对象。
- 配置驱动：敌人、武器、波次、难度曲线全部 JSON 化。
- 后端瘦身：客户端负责实时游戏，服务端只负责轻量记录与配置。

## 2. 游戏循环
```text
requestAnimationFrame
  -> Time.update(dt)
  -> InputRouter.update()
  -> WaveDirector.update(dt)
  -> PlayerSystem.update(dt)
  -> EnemySystem.update(dt)
  -> WeaponSystem.update(dt)
  -> BulletSystem.update(dt)
  -> CollisionSystem.update(dt)
  -> Effects.update(dt)
  -> Hud.update(snapshot)
  -> Renderer.render()
```

暂停、切后台、结算界面时停止或降频主循环，防止后台继续耗电和累积状态。

## 3. 对象池
池类型：
- BulletPool: 玩家弹、敌方弹、追踪弹。
- EnemyPool: 小怪、精英、Boss 分池。
- EffectPool: 爆炸、闪光、碎片、伤害数字。
- PickupPool: 升级、护盾、血包、炸弹补给。

每个池必须包含：
- inactive 列表
- active 列表或活跃索引
- maxSize
- spawn/reset/recycle
- trim/clear

规则：
- 池满时丢弃低优先级生成请求。
- 回收时清空速度、生命、目标引用、hit 标记、计时器、视觉状态。
- 关卡切换调用 clearActive，再根据资源生命周期决定是否 trim。

## 4. 弹幕系统
推荐数据结构：
```ts
type BulletKind = 'player' | 'enemy' | 'missile' | 'boss';

interface BulletData {
  active: boolean;
  kind: BulletKind;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  damage: number;
  life: number;
  maxLife: number;
  pattern: number;
  targetId: number;
  hit: boolean;
}
```

MVP 轨迹：
- Linear: `pos += velocity * dt`
- Fan/Ring: 发射时计算角度，运行时仍按 Linear 更新
- Sine: 使用预计算 sin 表
- Homing: 每帧小角度转向，超过追踪时长后转 Linear

## 5. 碰撞系统
MVP 不引入复杂物理引擎。

流程：
1. 视野和边界裁剪。
2. Spatial Hash Grid 分桶。
3. AABB 粗筛。
4. Sphere/圆形距离平方精判。
5. isHit 防重复扣血。

公式：
```text
dx = ax - bx
dy = ay - by
dz = az - bz
hit = dx*dx + dy*dy + dz*dz < (ra + rb)^2
```

## 6. 渲染系统
- 子弹: InstancedMesh，一种形态一个 batch。
- 敌机: 同类低多边形几何体复用材质和 geometry。
- 爆炸: 低多边形碎片 InstancedMesh。
- 背景: 三层视差，远景星点、中景陨石、近景云雾/能量带。
- Bloom: Selective Bloom，移动端降低分辨率或关闭。

## 7. 配置文件
`weapons.json`:
```json
{
  "player_basic": {
    "fireRate": 0.12,
    "damage": 10,
    "speed": 26,
    "tracks": [1, 2, 3, 5]
  }
}
```

`waves.json`:
```json
{
  "stage_01": [
    { "time": 1.0, "type": "drone", "count": 5, "path": "line", "interval": 0.25 },
    { "time": 12.0, "type": "elite", "count": 2, "path": "sine", "interval": 0.8 },
    { "time": 45.0, "type": "boss_01", "count": 1, "path": "boss_entry" }
  ]
}
```

## 8. 内存检查清单
- 每帧禁止创建 Vector3/Matrix4 临时对象，可复用 scratch 对象。
- 纹理、材质、几何体有 owner 和 dispose 时机。
- 离开页面监听 visibilitychange，暂停循环。
- 结算后所有 active 池计数必须归零。
- IndexedDB 只存结果，不存巨量 replay。
