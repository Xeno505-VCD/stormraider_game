import {
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  OctahedronGeometry
} from 'three';
import type { EnemyDefinition, WaveEventDefinition } from '../data/GameConfig';

export interface EnemyPoolStats {
  activeEnemies: number;
  nearPlayerThreats: number;
  poolSize: number;
  leaks: number;
  collisions: number;
  bossActive: boolean;
  bossHp: number;
  bossMaxHp: number;
  bossPhase: number;
  bossX: number;
  bossY: number;
  bossZ: number;
}

export interface HitResult {
  hit: boolean;
  destroyed: boolean;
  score: number;
  x: number;
  y: number;
  z: number;
}

export interface ClearResult {
  destroyed: number;
  score: number;
  x: number;
  y: number;
  z: number;
}

const ENEMY_LIMIT = 42;
const DEFAULT_ENEMY_RADIUS = 0.48;
const DEFAULT_ENEMY_SCALE = 1;
const ENEMY_BOTTOM_BOUND = -5.65;
const MOBILE_ENEMY_LIMIT = 30;
const PLAYER_HIT_RADIUS = 0.72;
const NEAR_PLAYER_THREAT_RADIUS = 2.75;
const WAVE_LOOP_GAP = 8;
const BOSS_HOVER_Y = 3.15;

const enum EnemyKind {
  Drone = 0,
  Elite = 1,
  Boss = 2
}

export class EnemyPool {
  readonly mesh: InstancedMesh;

  private readonly active = new Uint8Array(ENEMY_LIMIT);
  private readonly x = new Float32Array(ENEMY_LIMIT);
  private readonly y = new Float32Array(ENEMY_LIMIT);
  private readonly z = new Float32Array(ENEMY_LIMIT);
  private readonly hp = new Float32Array(ENEMY_LIMIT);
  private readonly maxHp = new Float32Array(ENEMY_LIMIT);
  private readonly speed = new Float32Array(ENEMY_LIMIT);
  private readonly score = new Float32Array(ENEMY_LIMIT);
  private readonly radius = new Float32Array(ENEMY_LIMIT);
  private readonly scale = new Float32Array(ENEMY_LIMIT);
  private readonly supportCooldown = new Float32Array(ENEMY_LIMIT);
  private readonly kind = new Uint8Array(ENEMY_LIMIT);
  private readonly phase = new Uint8Array(ENEMY_LIMIT);
  private readonly wobble = new Float32Array(ENEMY_LIMIT);
  private readonly scratchMatrix = new Matrix4();
  private spawnCursor = 0;
  private activeEnemies = 0;
  private mobileMode = false;
  private nextWaveIndex = 0;
  private waveCycleStart = 0;
  private pendingSpawnCount = 0;
  private pendingSpawnInterval = 0;
  private pendingSpawnCooldown = 0;
  private pendingSpawnType = 'drone';
  private pendingSpawnPath = 'line';
  private pendingSpawnBaseX = 0;

  constructor(
    private readonly definitions: Record<string, EnemyDefinition>,
    private readonly stage: WaveEventDefinition[]
  ) {
    const geometry = new OctahedronGeometry(0.46, 0);
    const material = new MeshStandardMaterial({
      color: '#ff3ea5',
      emissive: '#7f114d',
      emissiveIntensity: 1.05,
      roughness: 0.42,
      metalness: 0.18,
      flatShading: true
    });

    this.mesh = new InstancedMesh(geometry, material, ENEMY_LIMIT);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
  }

  setMobileMode(enabled: boolean): void {
    this.mobileMode = enabled;
  }

  update(dt: number, elapsed: number, playerX: number, playerY: number, playerZ: number): EnemyPoolStats {
    this.updateWaveDirector(dt, elapsed);

    this.activeEnemies = 0;
    let nearPlayerThreats = 0;
    let leaks = 0;
    let collisions = 0;
    let bossActive = false;
    let bossHp = 0;
    let bossMaxHp = 0;
    let bossPhase = 0;
    let bossX = 0;
    let bossY = 0;
    let bossZ = 0;
    for (let i = 0; i < ENEMY_LIMIT; i += 1) {
      if (this.active[i] === 0) {
        continue;
      }

      if (this.kind[i] === EnemyKind.Boss) {
        this.updateBoss(i, dt, elapsed);
      } else {
        this.y[i] -= this.speed[i] * (this.mobileMode ? 0.88 : 1) * dt;
        this.x[i] += Math.sin(elapsed * 2.2 + this.wobble[i]) * 0.18 * dt;
      }

      if (this.collidesWithPlayer(i, playerX, playerY, playerZ)) {
        collisions += 1;
        this.recycle(i);
        continue;
      }

      if (this.kind[i] !== EnemyKind.Boss && this.y[i] < ENEMY_BOTTOM_BOUND) {
        leaks += 1;
        this.recycle(i);
        continue;
      }

      if (this.isNearPlayerThreat(i, playerX, playerY, playerZ)) {
        nearPlayerThreats += 1;
      }

      if (this.kind[i] === EnemyKind.Boss) {
        bossActive = true;
        bossHp = this.hp[i];
        bossMaxHp = this.maxHp[i];
        bossPhase = this.phase[i];
        bossX = this.x[i];
        bossY = this.y[i];
        bossZ = this.z[i];
      }

      this.writeInstance(this.activeEnemies, i, elapsed);
      this.activeEnemies += 1;
    }

    this.mesh.count = this.activeEnemies;
    this.mesh.instanceMatrix.needsUpdate = true;

    return {
      activeEnemies: this.activeEnemies,
      nearPlayerThreats,
      poolSize: this.mobileMode ? MOBILE_ENEMY_LIMIT : ENEMY_LIMIT,
      leaks,
      collisions,
      bossActive,
      bossHp,
      bossMaxHp,
      bossPhase,
      bossX,
      bossY,
      bossZ
    };
  }

  hitAt(x: number, y: number, z: number, radius: number, damage: number): HitResult {
    for (let i = 0; i < ENEMY_LIMIT; i += 1) {
      if (this.active[i] === 0) {
        continue;
      }

      const hitRadius = this.radius[i] + radius;
      const hitRadiusSq = hitRadius * hitRadius;
      const dx = this.x[i] - x;
      const dy = this.y[i] - y;
      const dz = this.z[i] - z;
      const distanceSq = dx * dx + dy * dy + dz * dz;

      if (distanceSq > hitRadiusSq) {
        continue;
      }

      this.hp[i] -= damage;
      if (this.hp[i] <= 0) {
        const hitX = this.x[i];
        const hitY = this.y[i];
        const hitZ = this.z[i];
        const score = this.score[i];
        this.recycle(i);
        return { hit: true, destroyed: true, score, x: hitX, y: hitY, z: hitZ };
      }

      return { hit: true, destroyed: false, score: 0, x: this.x[i], y: this.y[i], z: this.z[i] };
    }

    return { hit: false, destroyed: false, score: 0, x: 0, y: 0, z: 0 };
  }

  clearAll(): ClearResult {
    let destroyed = 0;
    let score = 0;
    let x = 0;
    let y = 0;
    let z = 0;

    for (let i = 0; i < ENEMY_LIMIT; i += 1) {
      if (this.active[i] === 0) {
        continue;
      }

      x += this.x[i];
      y += this.y[i];
      z += this.z[i];
      destroyed += 1;
      score += this.score[i];
      this.recycle(i);
    }

    if (destroyed > 0) {
      x /= destroyed;
      y /= destroyed;
      z /= destroyed;
    }

    return { destroyed, score, x, y, z };
  }

  damageInRadius(x: number, y: number, z: number, radius: number, damage: number): ClearResult {
    const radiusSq = radius * radius;
    let destroyed = 0;
    let score = 0;
    let impactX = 0;
    let impactY = 0;
    let impactZ = 0;

    for (let i = 0; i < ENEMY_LIMIT; i += 1) {
      if (this.active[i] === 0) {
        continue;
      }

      const dx = this.x[i] - x;
      const dy = this.y[i] - y;
      const dz = this.z[i] - z;
      if (dx * dx + dy * dy + dz * dz > radiusSq) {
        continue;
      }

      this.hp[i] -= damage;
      if (this.hp[i] > 0) {
        continue;
      }

      impactX += this.x[i];
      impactY += this.y[i];
      impactZ += this.z[i];
      destroyed += 1;
      score += this.score[i];
      this.recycle(i);
    }

    if (destroyed > 0) {
      impactX /= destroyed;
      impactY /= destroyed;
      impactZ /= destroyed;
    }

    return { destroyed, score, x: impactX, y: impactY, z: impactZ };
  }

  private updateWaveDirector(dt: number, elapsed: number): void {
    if (this.stage.length === 0) {
      return;
    }

    const lastEvent = this.stage[this.stage.length - 1];
    if (elapsed - this.waveCycleStart > lastEvent.time + WAVE_LOOP_GAP && this.pendingSpawnCount <= 0) {
      this.waveCycleStart = elapsed;
      this.nextWaveIndex = 0;
    }

    while (this.nextWaveIndex < this.stage.length && elapsed - this.waveCycleStart >= this.stage[this.nextWaveIndex].time) {
      this.queueWaveEvent(this.stage[this.nextWaveIndex]);
      this.nextWaveIndex += 1;
    }

    this.pendingSpawnCooldown -= dt;
    while (this.pendingSpawnCount > 0 && this.pendingSpawnCooldown <= 0) {
      this.spawnFromPendingWave();
      this.pendingSpawnCount -= 1;
      this.pendingSpawnCooldown += this.pendingSpawnInterval;
    }
  }

  private queueWaveEvent(event: WaveEventDefinition): void {
    const mobileCount = Math.max(1, Math.ceil(event.count * 0.7));
    this.pendingSpawnCount += this.mobileMode ? mobileCount : event.count;
    this.pendingSpawnInterval = event.interval ?? 0.35;
    this.pendingSpawnCooldown = Math.min(this.pendingSpawnCooldown, 0);
    this.pendingSpawnType = event.type;
    this.pendingSpawnPath = event.path;
    this.pendingSpawnBaseX = seededRange(this.spawnCursor * 17, -3.8, 3.8);
    this.spawnCursor += 1;
  }

  private spawnFromPendingWave(): void {
    if (this.pendingSpawnType === 'boss_01' && this.hasActiveBoss()) {
      return;
    }

    const offsetSeed = this.pendingSpawnCount + this.spawnCursor;
    const side = seededRange(offsetSeed * 23, -1, 1);
    const lineOffset = side * (this.pendingSpawnPath === 'boss_entry' ? 0.15 : 1.85);
    const sineOffset = Math.sin(offsetSeed * 1.7) * 2.2;
    const x = this.pendingSpawnPath === 'sine'
      ? sineOffset
      : this.pendingSpawnBaseX + lineOffset;
    const z = this.pendingSpawnPath === 'boss_entry' ? -0.34 : -0.18 - (offsetSeed % 3) * 0.05;
    this.spawn(this.pendingSpawnType, x, 6.9 + (offsetSeed % 4) * 0.24, z);
  }

  private spawn(type: string, x: number, y: number, z: number): void {
    const index = this.findInactive();
    if (index === -1) {
      return;
    }
    const definition = this.definitions[type] ?? this.definitions.drone;
    if (!definition) {
      return;
    }

    this.active[index] = 1;
    this.x[index] = clamp(x, -4.7, 4.7);
    this.y[index] = y;
    this.z[index] = z;
    this.hp[index] = definition.hp;
    this.maxHp[index] = definition.hp;
    this.speed[index] = definition.speed;
    this.score[index] = definition.score;
    this.radius[index] = definition.radius ?? DEFAULT_ENEMY_RADIUS;
    this.scale[index] = definition.scale ?? DEFAULT_ENEMY_SCALE;
    this.kind[index] = kindCode(definition);
    this.phase[index] = 1;
    this.supportCooldown[index] = definition.supportInterval ?? 0;
    this.wobble[index] = seededRange(index * 11 + this.spawnCursor * 7, 0, Math.PI * 2);
  }

  private recycle(index: number): void {
    this.active[index] = 0;
    this.x[index] = 0;
    this.y[index] = 0;
    this.z[index] = 0;
    this.hp[index] = 0;
    this.maxHp[index] = 0;
    this.speed[index] = 0;
    this.score[index] = 0;
    this.radius[index] = 0;
    this.scale[index] = 0;
    this.kind[index] = EnemyKind.Drone;
    this.phase[index] = 0;
    this.supportCooldown[index] = 0;
    this.wobble[index] = 0;
  }

  private findInactive(): number {
    const limit = this.mobileMode ? MOBILE_ENEMY_LIMIT : ENEMY_LIMIT;
    for (let i = 0; i < limit; i += 1) {
      if (this.active[i] === 0) {
        return i;
      }
    }
    return -1;
  }

  private collidesWithPlayer(index: number, playerX: number, playerY: number, playerZ: number): boolean {
    const hitRadius = this.radius[index] + PLAYER_HIT_RADIUS;
    const dx = this.x[index] - playerX;
    const dy = this.y[index] - playerY;
    const dz = this.z[index] - playerZ;
    return dx * dx + dy * dy + dz * dz < hitRadius * hitRadius;
  }

  private isNearPlayerThreat(index: number, playerX: number, playerY: number, playerZ: number): boolean {
    const dx = this.x[index] - playerX;
    const dy = this.y[index] - playerY;
    const dz = this.z[index] - playerZ;
    const threatRadius = NEAR_PLAYER_THREAT_RADIUS + this.radius[index] * 0.45;
    return dx * dx + dy * dy + dz * dz < threatRadius * threatRadius;
  }

  private writeInstance(instanceIndex: number, enemyIndex: number, elapsed: number): void {
    const bossPulse = this.kind[enemyIndex] === EnemyKind.Boss ? 0.075 : 0.045;
    const phaseBoost = this.kind[enemyIndex] === EnemyKind.Boss ? 1 + (this.phase[enemyIndex] - 1) * 0.12 : 1;
    const pulse = (1 + Math.sin(elapsed * 7 + enemyIndex) * bossPulse) * this.scale[enemyIndex] * phaseBoost;
    this.scratchMatrix.makeScale(1.25 * pulse, 0.82 * pulse, 0.72 * pulse);
    this.scratchMatrix.setPosition(this.x[enemyIndex], this.y[enemyIndex], this.z[enemyIndex]);
    this.mesh.setMatrixAt(instanceIndex, this.scratchMatrix);
  }

  private updateBoss(index: number, dt: number, elapsed: number): void {
    if (this.y[index] > BOSS_HOVER_Y) {
      this.y[index] -= this.speed[index] * dt;
    } else {
      this.y[index] = BOSS_HOVER_Y + Math.sin(elapsed * 1.4 + this.wobble[index]) * 0.18;
      this.x[index] += Math.sin(elapsed * 1.1 + this.wobble[index]) * 0.34 * dt;
      this.x[index] = clamp(this.x[index], -3.6, 3.6);
    }

    this.updateBossPhase(index);
    this.supportCooldown[index] -= dt;
    const definition = this.definitions.boss_01;
    const baseInterval = definition?.supportInterval ?? 4.8;
    const phaseInterval = baseInterval / Math.max(1, this.phase[index]);
    if (this.supportCooldown[index] <= 0 && this.y[index] <= BOSS_HOVER_Y + 0.3) {
      this.spawnBossSupport(index);
      this.supportCooldown[index] = this.mobileMode ? phaseInterval * 1.35 : phaseInterval;
    }
  }

  private updateBossPhase(index: number): void {
    const definition = this.definitions.boss_01;
    const thresholds = definition?.phaseThresholds ?? [0.66, 0.33];
    const hpRatio = this.maxHp[index] > 0 ? this.hp[index] / this.maxHp[index] : 1;
    const nextPhase = hpRatio <= thresholds[1] ? 3 : hpRatio <= thresholds[0] ? 2 : 1;
    if (nextPhase <= this.phase[index]) {
      return;
    }

    this.phase[index] = nextPhase;
    this.pendingSpawnType = nextPhase >= 3 ? 'elite' : 'drone';
    this.pendingSpawnPath = 'sine';
    this.pendingSpawnBaseX = this.x[index];
    this.pendingSpawnCount += this.mobileMode ? 2 : 3;
    this.pendingSpawnInterval = 0.28;
    this.pendingSpawnCooldown = 0;
  }

  private spawnBossSupport(index: number): void {
    const count = this.mobileMode ? 1 : this.phase[index];
    for (let i = 0; i < count; i += 1) {
      const offset = (i - (count - 1) / 2) * 1.55;
      const type = this.phase[index] >= 3 && i === 0 ? 'elite' : 'drone';
      this.spawn(type, this.x[index] + offset, this.y[index] - 0.8 - i * 0.18, -0.2);
    }
  }

  private hasActiveBoss(): boolean {
    for (let i = 0; i < ENEMY_LIMIT; i += 1) {
      if (this.active[i] === 1 && this.kind[i] === EnemyKind.Boss) {
        return true;
      }
    }
    return false;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function seededRange(seed: number, min: number, max: number): number {
  const value = Math.sin(seed * 774.31) * 19173.137;
  const normalized = value - Math.floor(value);
  return min + normalized * (max - min);
}

function kindCode(definition: EnemyDefinition): EnemyKind {
  if (definition.kind === 'boss') {
    return EnemyKind.Boss;
  }
  if (definition.kind === 'elite') {
    return EnemyKind.Elite;
  }
  return EnemyKind.Drone;
}
