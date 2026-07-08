import {
  Color,
  DynamicDrawUsage,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Vector3
} from 'three';

export interface EnemyBulletStats {
  activeEnemyBullets: number;
  enemyBulletPoolSize: number;
  bulletHits: number;
  bulletDamage: number;
}

export interface EnemyBulletClearResult {
  cleared: number;
  x: number;
  y: number;
  z: number;
}

const ENEMY_BULLET_LIMIT = 180;
const MOBILE_ENEMY_BULLET_LIMIT = 96;
const BULLET_RADIUS = 0.18;
const PLAYER_RADIUS = 0.5;
const BULLET_BOTTOM_BOUND = -6.7;
const BULLET_SIDE_BOUND = 6.2;
const BOSS_BULLET_MAX_LIFE = 5.8;
const DRONE_BULLET_MAX_LIFE = 9.2;
const BOSS_LOCK_ARM_SECONDS = 0.45;
const BOSS_LOCK_WARNING_COLORS = [0xeaffff, 0xb6ffe6, 0x68ffb0, 0x54d9ff] as const;

const enum EnemyBulletKind {
  Boss = 0,
  Drone = 1,
  Elite = 2,
  BossAmber = 3,
  BossViolet = 4,
  BossLock = 5,
  Sentinel = 6,
  Wraith = 7,
  Bulwark = 8,
  BossPrism = 9
}

type EnemyShotPattern = 'drone' | 'elite' | 'sentinel' | 'wraith' | 'bulwark';

export class EnemyBulletPool {
  readonly mesh: InstancedMesh;

  private readonly active = new Uint8Array(ENEMY_BULLET_LIMIT);
  private readonly x = new Float32Array(ENEMY_BULLET_LIMIT);
  private readonly y = new Float32Array(ENEMY_BULLET_LIMIT);
  private readonly z = new Float32Array(ENEMY_BULLET_LIMIT);
  private readonly vx = new Float32Array(ENEMY_BULLET_LIMIT);
  private readonly vy = new Float32Array(ENEMY_BULLET_LIMIT);
  private readonly turnRate = new Float32Array(ENEMY_BULLET_LIMIT);
  private readonly angle = new Float32Array(ENEMY_BULLET_LIMIT);
  private readonly life = new Float32Array(ENEMY_BULLET_LIMIT);
  private readonly damage = new Float32Array(ENEMY_BULLET_LIMIT);
  private readonly radius = new Float32Array(ENEMY_BULLET_LIMIT);
  private readonly kind = new Uint8Array(ENEMY_BULLET_LIMIT);
  private readonly activeIndices = new Uint16Array(ENEMY_BULLET_LIMIT);
  private readonly activePosition = new Uint16Array(ENEMY_BULLET_LIMIT);
  private readonly instanceColorCodes = new Uint32Array(ENEMY_BULLET_LIMIT);
  private readonly scratchMatrix = new Matrix4();
  private readonly scratchScale = new Vector3();
  private readonly scratchColor = new Color();
  private mobileMode = false;
  private activeBullets = 0;
  private activeIndexCount = 0;
  private colorDirty = false;
  private colorUsagePrepared = false;
  private nextFreeIndex = 0;

  constructor() {
    const geometry = new IcosahedronGeometry(0.13, 0);
    const material = new MeshStandardMaterial({
      color: '#ff8a3d',
      emissive: '#ff3ea5',
      emissiveIntensity: 1.5,
      roughness: 0.38,
      metalness: 0.06,
      flatShading: true
    });

    this.mesh = new InstancedMesh(geometry, material, ENEMY_BULLET_LIMIT);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.prepareInstanceColors(0xff8a3d);
  }

  setMobileMode(enabled: boolean): void {
    if (enabled && !this.mobileMode) {
      this.trimToLimit(MOBILE_ENEMY_BULLET_LIMIT);
    }
    this.mobileMode = enabled;
  }

  spawnBossPattern(
    x: number,
    y: number,
    z: number,
    phase: number,
    variant: number,
    elapsed: number,
    playerX: number,
    playerY: number
  ): void {
    if (variant === 11) {
      this.spawnBossLanePattern(x, y, z, phase, elapsed, playerX, playerY);
      return;
    }
    if (variant === 12) {
      this.spawnBossPetalPattern(x, y, z, phase, elapsed, playerX, playerY);
      return;
    }

    this.spawnBossBloomPattern(x, y, z, phase, elapsed, playerX, playerY);
  }

  private spawnBossBloomPattern(x: number, y: number, z: number, phase: number, elapsed: number, playerX: number, playerY: number): void {
    const count = Math.min(phase + 1, this.mobileMode ? (phase >= 5 ? 4 : 3) : 4);
    const speed = (this.mobileMode ? 1.78 : 1.98) + phase * 0.1;
    const sourceY = y - 0.76;
    const aimX = clamp(playerX - x, -3.7, 3.7);
    const aimY = clamp(playerY - sourceY, -8.5, -1.2);
    const length = Math.max(0.001, Math.hypot(aimX, aimY));
    const baseVx = aimX / length;
    const baseVy = aimY / length;
    const arcStep = this.mobileMode ? 0.22 : 0.26;
    const phaseFan = phase >= 3 && !this.mobileMode ? 0.04 : 0;
    const sway = Math.sin(elapsed * 1.2) * 0.045;

    for (let i = 0; i < count; i += 1) {
      const t = (i + 1) / (count + 1) - 0.5;
      const angle = t * (arcStep + phaseFan) + sway;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const vx = (baseVx * cos - baseVy * sin) * speed;
      const vy = (baseVx * sin + baseVy * cos) * speed;
      this.spawn(x, sourceY, z + 0.08, vx, vy, this.mobileMode ? 4 : 5, BULLET_RADIUS, EnemyBulletKind.Boss);
    }

    if (phase < 3) {
      return;
    }

    const bloomCount = this.mobileMode ? 2 : 4;
    const bloomSpeed = speed * 0.78;
    const blossom = 0.5 + Math.sin(elapsed * 0.8) * 0.08;
    for (let i = 0; i < bloomCount; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const ring = Math.floor(i / 2) + 1;
      const angle = side * (blossom + ring * 0.18);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const vx = (baseVx * cos - baseVy * sin) * bloomSpeed;
      const vy = (baseVx * sin + baseVy * cos) * bloomSpeed;
      this.spawn(
        x + side * (0.42 + ring * 0.12),
        sourceY - 0.1,
        z + 0.12,
        vx,
        vy,
        this.mobileMode ? 4 : 5,
        0.15,
        phase >= 5 && ring % 2 === 0 ? EnemyBulletKind.BossPrism : EnemyBulletKind.BossAmber
      );
    }
  }

  private spawnBossLanePattern(x: number, y: number, z: number, phase: number, elapsed: number, playerX: number, playerY: number): void {
    const sourceY = y - 0.82;
    const count = this.mobileMode
      ? Math.min(phase + 1, phase >= 5 ? 4 : 3)
      : phase >= 4 ? 4 : Math.min(phase + 2, 4);
    const spacing = this.mobileMode ? 0.62 : 0.78;
    const waveOffset = Math.sin(elapsed * 1.4) * 0.18;
    const speed = (this.mobileMode ? 1.58 : 1.76) + phase * 0.06;

    for (let i = 0; i < count; i += 1) {
      const t = i - (count - 1) / 2;
      const sourceX = clamp(x + t * spacing, -4.4, 4.4);
      const aimX = clamp(playerX - sourceX, -3.4, 3.4) + waveOffset * Math.sign(t || 1);
      const aimY = clamp(playerY - sourceY, -8.5, -1.3);
      const length = Math.max(0.001, Math.hypot(aimX, aimY));
      const sideBias = t * (this.mobileMode ? 0.028 : 0.04);
      const vx = (aimX / length + sideBias) * speed;
      const vy = (aimY / length) * speed;
      this.spawn(sourceX, sourceY, z + 0.1, vx, vy, this.mobileMode ? 4 : 5, 0.17, EnemyBulletKind.BossAmber);
    }

    if (phase >= 4 && !this.mobileMode) {
      const crossSpeed = speed * 0.86;
      for (const side of [-1, 1]) {
        const sourceX = clamp(x + side * 1.05, -4.2, 4.2);
        const aimX = clamp(playerX - sourceX, -3.2, 3.2) - side * 0.42;
        const aimY = clamp(playerY - sourceY, -8.5, -1.4);
        const length = Math.max(0.001, Math.hypot(aimX, aimY));
        this.spawn(sourceX, sourceY - 0.08, z + 0.16, (aimX / length) * crossSpeed, (aimY / length) * crossSpeed, 5, 0.15, EnemyBulletKind.Boss);
      }
    }

    if (phase >= 5) {
      const railCount = this.mobileMode ? 2 : 4;
      const railSpeed = speed * (this.mobileMode ? 0.78 : 0.84);
      const railSpread = this.mobileMode ? 1.24 : 1.54;
      const railSway = Math.sin(elapsed * 1.1) * 0.14;
      for (let i = 0; i < railCount; i += 1) {
        const side = i % 2 === 0 ? -1 : 1;
        const row = Math.floor(i / 2);
        const sourceX = clamp(x + side * (railSpread + row * 0.42), -4.45, 4.45);
        const sourceYOffset = sourceY - 0.18 - row * 0.24;
        const aimX = clamp(playerX - sourceX, -2.8, 2.8) - side * (0.54 + row * 0.18) + railSway;
        const aimY = clamp(playerY - sourceYOffset, -8.2, -1.9);
        const length = Math.max(0.001, Math.hypot(aimX, aimY));
        this.spawn(
          sourceX,
          sourceYOffset,
          z + 0.2,
          (aimX / length) * railSpeed,
          (aimY / length) * railSpeed,
          this.mobileMode ? 3 : 4,
          0.14,
          phase >= 5 ? EnemyBulletKind.BossPrism : EnemyBulletKind.BossAmber
        );
      }
    }
  }

  private spawnBossPetalPattern(x: number, y: number, z: number, phase: number, elapsed: number, playerX: number, playerY: number): void {
    const sourceY = y - 0.86;
    const count = this.mobileMode ? (phase >= 5 ? 4 : 3) : (phase >= 5 ? 5 : 4);
    const speed = (this.mobileMode ? 1.46 : 1.62) + phase * 0.05;
    const aimX = clamp(playerX - x, -3.2, 3.2);
    const aimY = clamp(playerY - sourceY, -8.4, -1.2);
    const length = Math.max(0.001, Math.hypot(aimX, aimY));
    const baseVx = aimX / length;
    const baseVy = aimY / length;
    const rotate = Math.sin(elapsed * 0.9) * 0.14;
    const arcStep = this.mobileMode ? 0.26 : 0.3;

    for (let i = 0; i < count; i += 1) {
      const mirrored = i % 2 === 0 ? -1 : 1;
      const ring = Math.floor(i / 2) + 1;
      const angle = mirrored * ring * arcStep + rotate;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const vx = (baseVx * cos - baseVy * sin) * speed;
      const vy = (baseVx * sin + baseVy * cos) * speed;
      const sourceX = x + mirrored * Math.min(0.42, ring * 0.18);
      this.spawn(sourceX, sourceY, z + 0.12, vx, vy, this.mobileMode ? 4 : 5, 0.16, EnemyBulletKind.BossViolet);
    }

    if (phase >= 5) {
      const crownCount = this.mobileMode ? 2 : 4;
      const crownSpeed = speed * (this.mobileMode ? 0.78 : 0.84);
      const crownSourceY = sourceY - 0.34;
      const crownSway = Math.sin(elapsed * 1.55) * 0.16;
      for (let i = 0; i < crownCount; i += 1) {
        const side = i % 2 === 0 ? -1 : 1;
        const ring = Math.floor(i / 2) + 1;
        const sourceX = clamp(x + side * (0.72 + ring * 0.26), -4.35, 4.35);
        const crownAimX = clamp(playerX - sourceX, -2.7, 2.7) + side * (0.46 + ring * 0.16) + crownSway;
        const crownAimY = clamp(playerY - crownSourceY, -8.2, -1.8);
        const crownLength = Math.max(0.001, Math.hypot(crownAimX, crownAimY));
        this.spawn(
          sourceX,
          crownSourceY,
          z + 0.2,
          (crownAimX / crownLength) * crownSpeed,
          (crownAimY / crownLength) * crownSpeed,
          this.mobileMode ? 3 : 4,
          0.13,
          ring % 2 === 0 ? EnemyBulletKind.BossAmber : EnemyBulletKind.BossViolet
        );
      }

      const mirrorCount = this.mobileMode ? 2 : 4;
      const mirrorSpeed = speed * (this.mobileMode ? 0.68 : 0.74);
      const mirrorSourceY = sourceY - 0.58;
      const mirrorSweep = Math.sin(elapsed * 1.05) * (this.mobileMode ? 0.1 : 0.16);
      for (let i = 0; i < mirrorCount; i += 1) {
        const side = i % 2 === 0 ? -1 : 1;
        const row = Math.floor(i / 2);
        const sourceX = clamp(x + side * (1.02 + row * 0.36), -4.4, 4.4);
        const aimX = clamp(playerX - sourceX, -2.35, 2.35) - side * (0.7 + row * 0.22) + mirrorSweep;
        const aimY = clamp(playerY - mirrorSourceY, -8.2, -2.25);
        const mirrorLength = Math.max(0.001, Math.hypot(aimX, aimY));
        this.spawn(
          sourceX,
          mirrorSourceY - row * 0.16,
          z + 0.28,
          (aimX / mirrorLength) * mirrorSpeed,
          (aimY / mirrorLength) * mirrorSpeed,
          this.mobileMode ? 3 : 4,
          0.12,
          row % 2 === 0 ? EnemyBulletKind.BossViolet : EnemyBulletKind.BossAmber
        );
      }

      const curtainPairs = this.mobileMode ? 1 : 2;
      const curtainSpeed = speed * (this.mobileMode ? 0.5 : 0.56);
      const curtainSourceY = sourceY - 0.92;
      const curtainSweep = Math.sin(elapsed * 0.72) * (this.mobileMode ? 0.14 : 0.22);
      for (let row = 0; row < curtainPairs; row += 1) {
        for (const side of [-1, 1]) {
          const sourceX = clamp(x + side * (0.62 + row * 0.52), -4.25, 4.25);
          const aimX = side * (0.72 + row * 0.24) + curtainSweep;
          const aimY = -2.25 - row * 0.18;
          const curtainLength = Math.max(0.001, Math.hypot(aimX, aimY));
          this.spawn(
            sourceX,
            curtainSourceY - row * 0.16,
            z + 0.32,
            (aimX / curtainLength) * curtainSpeed,
            (aimY / curtainLength) * curtainSpeed,
            this.mobileMode ? 3 : 4,
            0.11,
            EnemyBulletKind.BossPrism
          );
        }
      }
    }

    if (phase < 4) {
      return;
    }

    const lockCount = this.mobileMode ? 1 : phase >= 6 ? 3 : 2;
    const lockSpeed = (this.mobileMode ? 1.16 : 1.28) + phase * 0.03;
    const lockTurnRate = this.mobileMode ? 0.18 : 0.26;
    for (let i = 0; i < lockCount; i += 1) {
      const t = lockCount === 1 ? 0 : i / (lockCount - 1) - 0.5;
      const sourceX = clamp(x + t * 0.9, -4.2, 4.2);
      const aimX = clamp(playerX - sourceX, -3.2, 3.2) + t * 0.4;
      const aimY = clamp(playerY - sourceY, -8.4, -1.2);
      const lockLength = Math.max(0.001, Math.hypot(aimX, aimY));
      this.spawn(
        sourceX,
        sourceY - 0.16,
        z + 0.18,
        (aimX / lockLength) * lockSpeed,
        (aimY / lockLength) * lockSpeed,
        this.mobileMode ? 4 : 5,
        0.14,
        EnemyBulletKind.BossLock,
        lockTurnRate
      );
    }

    if (phase >= 5) {
      const spikeCount = this.mobileMode ? 1 : 2;
      const spikeSpeed = lockSpeed * 0.84;
      const spikeTurnRate = this.mobileMode ? 0.12 : 0.18;
      const sideBias = Math.sin(elapsed * 1.35) > 0 ? 1 : -1;
      for (let i = 0; i < spikeCount; i += 1) {
        const side = spikeCount === 1 ? sideBias : i === 0 ? -1 : 1;
        const sourceX = clamp(x + side * 1.08, -4.35, 4.35);
        const sourceYOffset = sourceY - 0.48;
        const aimX = clamp(playerX - sourceX, -2.6, 2.6) + side * 0.34;
        const aimY = clamp(playerY - sourceYOffset, -8.2, -2);
        const length = Math.max(0.001, Math.hypot(aimX, aimY));
        this.spawn(
          sourceX,
          sourceYOffset,
          z + 0.24,
          (aimX / length) * spikeSpeed,
          (aimY / length) * spikeSpeed,
          this.mobileMode ? 3 : 4,
          0.13,
          EnemyBulletKind.BossLock,
          spikeTurnRate
        );
      }
    }
  }

  spawnEnemyShot(x: number, y: number, z: number, playerX: number, playerY: number, pattern: EnemyShotPattern): void {
    const aimX = clamp(playerX - x, -4.2, 4.2);
    const aimY = clamp(playerY - y, -8.2, -0.8);
    const length = Math.max(0.001, Math.hypot(aimX, aimY));
    const elite = pattern !== 'drone';
    let speed = elite ? (this.mobileMode ? 1.36 : 1.52) : (this.mobileMode ? 1.1 : 1.24);
    let sway = elite ? 0.12 : 0;
    let damage = this.mobileMode ? 2 : 3;
    let radius = elite ? 0.15 : 0.13;
    let kind = elite ? EnemyBulletKind.Elite : EnemyBulletKind.Drone;
    let turnRate = 0;

    if (pattern === 'sentinel') {
      speed = this.mobileMode ? 1.5 : 1.68;
      sway = 0.04 * Math.sign(aimX || 1);
      damage = this.mobileMode ? 3 : 4;
      radius = 0.14;
      kind = EnemyBulletKind.Sentinel;
    } else if (pattern === 'wraith') {
      speed = this.mobileMode ? 1.16 : 1.28;
      sway = 0.18 * Math.sign(aimX || 1);
      damage = this.mobileMode ? 2 : 3;
      radius = 0.14;
      kind = EnemyBulletKind.Wraith;
      turnRate = this.mobileMode ? 0.08 : 0.12;
    } else if (pattern === 'bulwark') {
      speed = this.mobileMode ? 1.02 : 1.16;
      sway = 0;
      damage = this.mobileMode ? 4 : 5;
      radius = 0.19;
      kind = EnemyBulletKind.Bulwark;
    }

    const vx = (aimX / length) * speed + sway;
    const vy = (aimY / length) * speed;
    this.spawn(x, y, z, vx, vy, damage, radius, kind, turnRate);
  }

  clearAll(): EnemyBulletClearResult {
    let cleared = 0;
    let x = 0;
    let y = 0;
    let z = 0;

    let cursor = 0;
    while (cursor < this.activeIndexCount) {
      const i = this.activeIndices[cursor];
      if (this.active[i] === 0) {
        this.untrackActive(i);
        continue;
      }

      cleared += 1;
      x += this.x[i];
      y += this.y[i];
      z += this.z[i];
      this.recycle(i);
      continue;
    }

    this.activeBullets = 0;
    this.mesh.count = 0;
    this.mesh.instanceMatrix.needsUpdate = true;

    if (cleared === 0) {
      return { cleared, x: 0, y: 0, z: 0 };
    }

    return {
      cleared,
      x: x / cleared,
      y: y / cleared,
      z: z / cleared
    };
  }

  update(dt: number, playerPosition: Vector3): EnemyBulletStats {
    this.activeBullets = 0;
    this.colorDirty = false;
    let bulletHits = 0;
    let bulletDamage = 0;

    let cursor = 0;
    while (cursor < this.activeIndexCount) {
      const i = this.activeIndices[cursor];
      if (this.active[i] === 0) {
        this.untrackActive(i);
        continue;
      }

      if (this.turnRate[i] > 0) {
        const dx = playerPosition.x - this.x[i];
        const dy = playerPosition.y - this.y[i];
        const desiredLength = Math.max(0.001, Math.hypot(dx, dy));
        const speed = Math.max(0.001, Math.hypot(this.vx[i], this.vy[i]));
        const blend = Math.min(0.12, this.turnRate[i] * dt);
        this.vx[i] = this.vx[i] * (1 - blend) + (dx / desiredLength) * speed * blend;
        this.vy[i] = this.vy[i] * (1 - blend) + (dy / desiredLength) * speed * blend;
        const normalizedSpeed = Math.max(0.001, Math.hypot(this.vx[i], this.vy[i]));
        this.vx[i] = (this.vx[i] / normalizedSpeed) * speed;
        this.vy[i] = (this.vy[i] / normalizedSpeed) * speed;
        this.angle[i] = Math.atan2(this.vx[i], this.vy[i]);
      }

      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      this.life[i] += dt;

      if (this.collidesWithPlayer(i, playerPosition)) {
        bulletHits += 1;
        bulletDamage += this.damage[i];
        this.recycle(i);
        continue;
      }

      if (
        this.y[i] < BULLET_BOTTOM_BOUND ||
        Math.abs(this.x[i]) > BULLET_SIDE_BOUND ||
        this.life[i] > this.maxLifeForKind(this.kind[i])
      ) {
        this.recycle(i);
        continue;
      }

      this.writeInstance(this.activeBullets, i);
      this.activeBullets += 1;
      cursor += 1;
    }

    this.mesh.count = this.activeBullets;
    if (this.activeBullets > 0) {
      this.mesh.instanceMatrix.needsUpdate = true;
    }
    if (this.activeBullets > 0 && this.colorDirty && this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }

    return {
      activeEnemyBullets: this.activeBullets,
      enemyBulletPoolSize: this.mobileMode ? MOBILE_ENEMY_BULLET_LIMIT : ENEMY_BULLET_LIMIT,
      bulletHits,
      bulletDamage
    };
  }

  private spawn(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    damage: number,
    radius: number,
    kind: EnemyBulletKind,
    turnRate = 0
  ): void {
    const index = this.findInactive();
    if (index === -1) {
      return;
    }

    this.active[index] = 1;
    this.x[index] = x;
    this.y[index] = y;
    this.z[index] = z;
    this.vx[index] = vx;
    this.vy[index] = vy;
    this.turnRate[index] = turnRate;
    this.angle[index] = Math.atan2(vx, vy);
    this.life[index] = 0;
    this.damage[index] = damage;
    this.radius[index] = radius;
    this.kind[index] = kind;
    this.trackActive(index);
  }

  private findInactive(): number {
    const limit = this.mobileMode ? MOBILE_ENEMY_BULLET_LIMIT : ENEMY_BULLET_LIMIT;
    this.nextFreeIndex %= limit;
    for (let offset = 0; offset < limit; offset += 1) {
      const i = (this.nextFreeIndex + offset) % limit;
      if (this.active[i] === 0) {
        this.nextFreeIndex = (i + 1) % limit;
        return i;
      }
    }
    return -1;
  }

  private trimToLimit(limit: number): void {
    for (let i = limit; i < ENEMY_BULLET_LIMIT; i += 1) {
      if (this.active[i] === 1) {
        this.recycle(i);
      }
    }
  }

  private collidesWithPlayer(index: number, playerPosition: Vector3): boolean {
    if (this.kind[index] === EnemyBulletKind.BossLock && this.life[index] < BOSS_LOCK_ARM_SECONDS) {
      return false;
    }

    const hitRadius = this.radius[index] + PLAYER_RADIUS;
    const dx = this.x[index] - playerPosition.x;
    const dy = this.y[index] - playerPosition.y;
    const dz = this.z[index] - playerPosition.z;
    return dx * dx + dy * dy + dz * dz < hitRadius * hitRadius;
  }

  private recycle(index: number): void {
    if (this.active[index] === 0) {
      return;
    }

    this.untrackActive(index);
    this.active[index] = 0;
    this.x[index] = 0;
    this.y[index] = 0;
    this.z[index] = 0;
    this.vx[index] = 0;
    this.vy[index] = 0;
    this.turnRate[index] = 0;
    this.angle[index] = 0;
    this.life[index] = 0;
    this.damage[index] = 0;
    this.radius[index] = 0;
    this.kind[index] = EnemyBulletKind.Boss;
  }

  private trackActive(index: number): void {
    this.activePosition[index] = this.activeIndexCount;
    this.activeIndices[this.activeIndexCount] = index;
    this.activeIndexCount += 1;
  }

  private untrackActive(index: number): void {
    const position = this.activePosition[index];
    const lastPosition = this.activeIndexCount - 1;
    const lastIndex = this.activeIndices[lastPosition];
    this.activeIndices[position] = lastIndex;
    this.activePosition[lastIndex] = position;
    this.activeIndexCount = lastPosition;
  }

  private maxLifeForKind(kind: EnemyBulletKind): number {
    return kind === EnemyBulletKind.Drone ||
      kind === EnemyBulletKind.Elite ||
      kind === EnemyBulletKind.Sentinel ||
      kind === EnemyBulletKind.Wraith ||
      kind === EnemyBulletKind.Bulwark
      ? DRONE_BULLET_MAX_LIFE
      : BOSS_BULLET_MAX_LIFE;
  }

  private writeInstance(instanceIndex: number, bulletIndex: number): void {
    const pulse = 1 + Math.sin((this.life[bulletIndex] + bulletIndex * 0.11) * 14) * 0.1;
    const kind = this.kind[bulletIndex];
    let width = 0.54;
    let height = 0.82;
    let depth = 0.54;

    if (kind === EnemyBulletKind.Sentinel) {
      width = 0.44;
      height = 1.48;
      depth = 0.44;
    } else if (kind === EnemyBulletKind.Wraith) {
      width = 0.96;
      height = 0.78;
      depth = 0.96;
    } else if (kind === EnemyBulletKind.Bulwark) {
      width = 1.04;
      height = 1.16;
      depth = 1.04;
    } else if (kind === EnemyBulletKind.Elite) {
      width = 0.68;
      height = 1.18;
      depth = 0.68;
    } else if (kind === EnemyBulletKind.BossAmber) {
      width = 0.56;
      height = 1.78;
      depth = 0.56;
    } else if (kind === EnemyBulletKind.BossViolet) {
      width = 1.08;
      height = 1.08;
      depth = 1.08;
    } else if (kind === EnemyBulletKind.BossLock) {
      const armRatio = Math.min(1, this.life[bulletIndex] / BOSS_LOCK_ARM_SECONDS);
      const warningBloom = 1 + (1 - armRatio) * 0.72;
      width = 0.56 * warningBloom;
      height = 1.42 * (0.72 + armRatio * 0.28);
      depth = 0.56 * warningBloom;
    } else if (kind === EnemyBulletKind.BossPrism) {
      width = 1.36;
      height = 0.64;
      depth = 0.58;
    } else if (kind === EnemyBulletKind.Boss) {
      width = 0.82;
      height = 1.52;
      depth = 0.82;
    }

    this.scratchMatrix.makeRotationZ(-this.angle[bulletIndex]);
    this.scratchScale.set(width * pulse, height * pulse, depth * pulse);
    this.scratchMatrix.scale(this.scratchScale);
    this.scratchMatrix.setPosition(this.x[bulletIndex], this.y[bulletIndex], this.z[bulletIndex] + 0.09);
    this.mesh.setMatrixAt(instanceIndex, this.scratchMatrix);
    const colorCode = this.colorCodeForBullet(bulletIndex, kind);
    if (this.instanceColorCodes[instanceIndex] !== colorCode) {
      this.instanceColorCodes[instanceIndex] = colorCode;
      this.mesh.setColorAt(instanceIndex, this.scratchColor.setHex(colorCode));
      if (!this.colorUsagePrepared && this.mesh.instanceColor) {
        this.mesh.instanceColor.setUsage(DynamicDrawUsage);
        this.colorUsagePrepared = true;
      }
      this.colorDirty = true;
    }
  }

  private colorCodeForBullet(index: number, kind: EnemyBulletKind): number {
    if (kind === EnemyBulletKind.BossLock) {
      const armRatio = Math.min(1, this.life[index] / BOSS_LOCK_ARM_SECONDS);
      const warningIndex = Math.min(
        BOSS_LOCK_WARNING_COLORS.length - 1,
        Math.floor(armRatio * BOSS_LOCK_WARNING_COLORS.length)
      );
      return BOSS_LOCK_WARNING_COLORS[warningIndex];
    }

    if (kind === EnemyBulletKind.BossAmber) {
      return 0xff8a3d;
    }
    if (kind === EnemyBulletKind.BossViolet) {
      return 0xb17cff;
    }
    if (kind === EnemyBulletKind.BossPrism) {
      return 0x27d8ff;
    }
    if (kind === EnemyBulletKind.Sentinel) {
      return 0xffcf7a;
    }
    if (kind === EnemyBulletKind.Wraith) {
      return 0xb17cff;
    }
    if (kind === EnemyBulletKind.Bulwark) {
      return 0xff5c14;
    }
    if (kind === EnemyBulletKind.Elite) {
      return 0xff8a3d;
    }
    if (kind === EnemyBulletKind.Drone) {
      return 0x9b5cff;
    }
    return 0xff3ea5;
  }

  private prepareInstanceColors(colorCode: number): void {
    this.scratchColor.setHex(colorCode);
    for (let i = 0; i < ENEMY_BULLET_LIMIT; i += 1) {
      this.mesh.setColorAt(i, this.scratchColor);
    }
    this.instanceColorCodes.fill(colorCode);
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.setUsage(DynamicDrawUsage);
      this.mesh.instanceColor.needsUpdate = true;
      this.colorUsagePrepared = true;
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
