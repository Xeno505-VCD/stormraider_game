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
const ENEMY_RADIUS = 0.48;
const ENEMY_BOTTOM_BOUND = -5.65;
const MOBILE_ENEMY_LIMIT = 30;
const PLAYER_HIT_RADIUS = 0.72;
const NEAR_PLAYER_THREAT_RADIUS = 2.75;
const WAVE_LOOP_GAP = 8;

export class EnemyPool {
  readonly mesh: InstancedMesh;

  private readonly active = new Uint8Array(ENEMY_LIMIT);
  private readonly x = new Float32Array(ENEMY_LIMIT);
  private readonly y = new Float32Array(ENEMY_LIMIT);
  private readonly z = new Float32Array(ENEMY_LIMIT);
  private readonly hp = new Float32Array(ENEMY_LIMIT);
  private readonly speed = new Float32Array(ENEMY_LIMIT);
  private readonly score = new Float32Array(ENEMY_LIMIT);
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
    for (let i = 0; i < ENEMY_LIMIT; i += 1) {
      if (this.active[i] === 0) {
        continue;
      }

      this.y[i] -= this.speed[i] * (this.mobileMode ? 0.88 : 1) * dt;
      this.x[i] += Math.sin(elapsed * 2.2 + this.wobble[i]) * 0.18 * dt;

      if (this.collidesWithPlayer(i, playerX, playerY, playerZ)) {
        collisions += 1;
        this.recycle(i);
        continue;
      }

      if (this.y[i] < ENEMY_BOTTOM_BOUND) {
        leaks += 1;
        this.recycle(i);
        continue;
      }

      if (this.isNearPlayerThreat(i, playerX, playerY, playerZ)) {
        nearPlayerThreats += 1;
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
      collisions
    };
  }

  hitAt(x: number, y: number, z: number, radius: number, damage: number): HitResult {
    const hitRadius = ENEMY_RADIUS + radius;
    const hitRadiusSq = hitRadius * hitRadius;

    for (let i = 0; i < ENEMY_LIMIT; i += 1) {
      if (this.active[i] === 0) {
        continue;
      }

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
        this.recycle(i);
        return { hit: true, destroyed: true, score: this.score[i], x: hitX, y: hitY, z: hitZ };
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
    this.speed[index] = definition.speed;
    this.score[index] = definition.score;
    this.wobble[index] = seededRange(index * 11 + this.spawnCursor * 7, 0, Math.PI * 2);
  }

  private recycle(index: number): void {
    this.active[index] = 0;
    this.x[index] = 0;
    this.y[index] = 0;
    this.z[index] = 0;
    this.hp[index] = 0;
    this.speed[index] = 0;
    this.score[index] = 0;
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
    const hitRadius = ENEMY_RADIUS + PLAYER_HIT_RADIUS;
    const dx = this.x[index] - playerX;
    const dy = this.y[index] - playerY;
    const dz = this.z[index] - playerZ;
    return dx * dx + dy * dy + dz * dz < hitRadius * hitRadius;
  }

  private isNearPlayerThreat(index: number, playerX: number, playerY: number, playerZ: number): boolean {
    const dx = this.x[index] - playerX;
    const dy = this.y[index] - playerY;
    const dz = this.z[index] - playerZ;
    return dx * dx + dy * dy + dz * dz < NEAR_PLAYER_THREAT_RADIUS * NEAR_PLAYER_THREAT_RADIUS;
  }

  private writeInstance(instanceIndex: number, enemyIndex: number, elapsed: number): void {
    const pulse = 1 + Math.sin(elapsed * 7 + enemyIndex) * 0.045;
    this.scratchMatrix.makeScale(1.25 * pulse, 0.82 * pulse, 0.72 * pulse);
    this.scratchMatrix.setPosition(this.x[enemyIndex], this.y[enemyIndex], this.z[enemyIndex]);
    this.mesh.setMatrixAt(instanceIndex, this.scratchMatrix);
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
