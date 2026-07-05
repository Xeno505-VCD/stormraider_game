import {
  Color,
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
  bossVariant: number;
  bossX: number;
  bossY: number;
  bossZ: number;
}

export interface HitResult {
  hit: boolean;
  destroyed: boolean;
  score: number;
  pickupEnergy: number;
  x: number;
  y: number;
  z: number;
}

export interface ClearResult {
  destroyed: number;
  score: number;
  pickupEnergy: number;
  x: number;
  y: number;
  z: number;
}

export type EnemyShotKind = 'drone' | 'elite';

const ENEMY_LIMIT = 42;
const DEFAULT_ENEMY_RADIUS = 0.48;
const DEFAULT_ENEMY_SCALE = 1;
const ENEMY_BOTTOM_BOUND = -5.65;
const MOBILE_ENEMY_LIMIT = 30;
const PLAYER_HIT_RADIUS = 0.62;
const NEAR_PLAYER_THREAT_RADIUS = 2.75;
const WAVE_LOOP_GAP = 8;
const BOSS_HOVER_Y = 3.15;
const ENEMY_WANDER_FLOOR_Y = 1.05;
const ENEMY_FIRE_LIMIT = 12;

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
  private readonly supportInterval = new Float32Array(ENEMY_LIMIT);
  private readonly shotCooldown = new Float32Array(ENEMY_LIMIT);
  private readonly homeX = new Float32Array(ENEMY_LIMIT);
  private readonly kind = new Uint8Array(ENEMY_LIMIT);
  private readonly phase = new Uint8Array(ENEMY_LIMIT);
  private readonly phaseThresholdCount = new Uint8Array(ENEMY_LIMIT);
  private readonly phaseThresholdA = new Float32Array(ENEMY_LIMIT);
  private readonly phaseThresholdB = new Float32Array(ENEMY_LIMIT);
  private readonly phaseThresholdC = new Float32Array(ENEMY_LIMIT);
  private readonly phaseThresholdD = new Float32Array(ENEMY_LIMIT);
  private readonly variant = new Uint8Array(ENEMY_LIMIT);
  private readonly wobble = new Float32Array(ENEMY_LIMIT);
  private readonly fireX = new Float32Array(ENEMY_FIRE_LIMIT);
  private readonly fireY = new Float32Array(ENEMY_FIRE_LIMIT);
  private readonly fireZ = new Float32Array(ENEMY_FIRE_LIMIT);
  private readonly fireKind = new Uint8Array(ENEMY_FIRE_LIMIT);
  private readonly scratchMatrix = new Matrix4();
  private readonly scratchColor = new Color();
  private spawnCursor = 0;
  private activeEnemies = 0;
  private fireCount = 0;
  private mobileMode = false;
  private nextWaveIndex = 0;
  private waveCycleStart = 0;
  private waveCycle = 0;
  private pendingSpawnCount = 0;
  private pendingSpawnInterval = 0;
  private pendingSpawnCooldown = 0;
  private pendingSpawnType = 'drone';
  private pendingSpawnPath = 'line';
  private pendingSpawnBaseX = 0;
  private pendingSpawnTotal = 0;
  private pendingSpawnCycle = 0;

  constructor(
    private readonly definitions: Record<string, EnemyDefinition>,
    private readonly stage: WaveEventDefinition[]
  ) {
    const geometry = new OctahedronGeometry(0.46, 0);
    const material = new MeshStandardMaterial({
      color: '#ffffff',
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
    this.updateWaveDirector(dt, elapsed, playerX);
    this.fireCount = 0;

    this.activeEnemies = 0;
    let nearPlayerThreats = 0;
    let leaks = 0;
    let collisions = 0;
    let bossActive = false;
    let bossHp = 0;
    let bossMaxHp = 0;
    let bossPhase = 0;
    let bossVariant = 0;
    let bossX = 0;
    let bossY = 0;
    let bossZ = 0;
    for (let i = 0; i < ENEMY_LIMIT; i += 1) {
      if (this.active[i] === 0) {
        continue;
      }

      if (this.kind[i] === EnemyKind.Boss) {
        this.updateBoss(i, dt, elapsed, playerX);
      } else {
        this.updateWanderingEnemy(i, dt, elapsed, playerX);
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
        bossVariant = this.variant[i];
        bossX = this.x[i];
        bossY = this.y[i];
        bossZ = this.z[i];
      }

      this.writeInstance(this.activeEnemies, i, elapsed);
      this.activeEnemies += 1;
    }

    this.mesh.count = this.activeEnemies;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }

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
      bossVariant,
      bossX,
      bossY,
      bossZ
    };
  }

  drainFireEvents(
    fire: (x: number, y: number, z: number, kind: EnemyShotKind) => void
  ): void {
    for (let i = 0; i < this.fireCount; i += 1) {
      fire(this.fireX[i], this.fireY[i], this.fireZ[i], this.fireKind[i] === EnemyKind.Elite ? 'elite' : 'drone');
    }
    this.fireCount = 0;
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
        const pickupEnergy = pickupEnergyForKind(this.kind[i]);
        this.recycle(i);
        return { hit: true, destroyed: true, score, pickupEnergy, x: hitX, y: hitY, z: hitZ };
      }

      return { hit: true, destroyed: false, score: 0, pickupEnergy: 0, x: this.x[i], y: this.y[i], z: this.z[i] };
    }

    return { hit: false, destroyed: false, score: 0, pickupEnergy: 0, x: 0, y: 0, z: 0 };
  }

  clearAll(): ClearResult {
    let destroyed = 0;
    let score = 0;
    let pickupEnergy = 0;
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
      pickupEnergy += pickupEnergyForKind(this.kind[i]);
      this.recycle(i);
    }

    if (destroyed > 0) {
      x /= destroyed;
      y /= destroyed;
      z /= destroyed;
    }

    return { destroyed, score, pickupEnergy, x, y, z };
  }

  damageInRadius(x: number, y: number, z: number, radius: number, damage: number): ClearResult {
    const radiusSq = radius * radius;
    let destroyed = 0;
    let score = 0;
    let pickupEnergy = 0;
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
      pickupEnergy += pickupEnergyForKind(this.kind[i]);
      this.recycle(i);
    }

    if (destroyed > 0) {
      impactX /= destroyed;
      impactY /= destroyed;
      impactZ /= destroyed;
    }

    return { destroyed, score, pickupEnergy, x: impactX, y: impactY, z: impactZ };
  }

  private updateWaveDirector(dt: number, elapsed: number, playerX: number): void {
    if (this.stage.length === 0) {
      return;
    }

    const lastEvent = this.stage[this.stage.length - 1];
    if (elapsed - this.waveCycleStart > lastEvent.time + WAVE_LOOP_GAP && this.pendingSpawnCount <= 0) {
      this.waveCycleStart = elapsed;
      this.nextWaveIndex = 0;
      this.waveCycle += 1;
    }

    while (this.nextWaveIndex < this.stage.length && elapsed - this.waveCycleStart >= this.stage[this.nextWaveIndex].time) {
      this.queueWaveEvent(this.stage[this.nextWaveIndex], playerX);
      this.nextWaveIndex += 1;
    }

    this.pendingSpawnCooldown -= dt;
    while (this.pendingSpawnCount > 0 && this.pendingSpawnCooldown <= 0) {
      this.spawnFromPendingWave();
      this.pendingSpawnCount -= 1;
      this.pendingSpawnCooldown += this.pendingSpawnInterval;
    }
  }

  private queueWaveEvent(event: WaveEventDefinition, playerX: number): void {
    const isBoss = this.isBossType(event.type);
    const mobileCount = Math.max(1, Math.ceil(event.count * 0.45));
    const desktopCount = Math.max(1, Math.ceil(event.count * 0.65));
    const count = isBoss ? 1 : scaledWaveCount(this.mobileMode ? mobileCount : desktopCount, event.time, this.waveCycle, this.mobileMode);
    this.pendingSpawnCount += count;
    this.pendingSpawnTotal = this.pendingSpawnCount;
    this.pendingSpawnInterval = scaledSpawnInterval(event.interval ?? 0.35, event.time, this.waveCycle, this.mobileMode);
    this.pendingSpawnCooldown = Math.min(this.pendingSpawnCooldown, 0);
    this.pendingSpawnType = event.type;
    this.pendingSpawnPath = event.path;
    this.pendingSpawnCycle = this.waveCycle;
    const side = this.spawnCursor % 2 === 0 ? -1 : 1;
    const offset = seededRange(this.spawnCursor * 17, 1.25, 2.65) * side;
    this.pendingSpawnBaseX = isBoss
      ? seededRange(this.spawnCursor * 17, -0.4, 0.4)
      : clamp(playerX + offset, -3.7, 3.7);
    this.spawnCursor += 1;
  }

  private spawnFromPendingWave(): void {
    if (this.isBossType(this.pendingSpawnType) && this.hasActiveBoss()) {
      return;
    }

    const spawnIndex = Math.max(0, this.pendingSpawnTotal - this.pendingSpawnCount);
    const offsetSeed = spawnIndex + this.spawnCursor;
    const laneStep = this.mobileMode ? 1.55 : 1.75;
    const lane = lanePattern(spawnIndex + this.spawnCursor);
    const laneJitter = seededRange(offsetSeed * 23, -0.28, 0.28);
    const lineOffset = this.pendingSpawnPath === 'boss_entry'
      ? laneJitter * 0.25
      : lane * laneStep + laneJitter;
    const sineOffset = Math.sin(offsetSeed * 1.7) * 2.45;
    const x = this.pendingSpawnPath === 'sine'
      ? sineOffset
      : this.pendingSpawnBaseX + lineOffset;
    const z = this.pendingSpawnPath === 'boss_entry' ? -0.34 : -0.18 - (offsetSeed % 3) * 0.05;
    this.spawn(this.pendingSpawnType, x, 6.9 + spawnIndex * 0.36, z, this.pendingSpawnCycle);
  }

  private spawn(type: string, x: number, y: number, z: number, cycle = this.waveCycle): void {
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
    const hpScale = hpScaleForSpawn(definition, type, cycle);
    const scoreScale = scoreScaleForSpawn(definition, cycle);
    this.hp[index] = definition.hp * hpScale;
    this.maxHp[index] = definition.hp * hpScale;
    this.speed[index] = definition.speed;
    this.score[index] = Math.round(definition.score * scoreScale);
    this.radius[index] = definition.radius ?? DEFAULT_ENEMY_RADIUS;
    this.scale[index] = definition.scale ?? DEFAULT_ENEMY_SCALE;
    this.kind[index] = kindCode(definition);
    this.phase[index] = 1;
    this.supportCooldown[index] = definition.supportInterval ?? 0;
    this.supportInterval[index] = definition.supportInterval ?? 0;
    this.writePhaseThresholds(index, definition.phaseThresholds);
    this.variant[index] = variantCode(type);
    this.wobble[index] = seededRange(index * 11 + this.spawnCursor * 7, 0, Math.PI * 2);
    this.homeX[index] = this.x[index];
    this.shotCooldown[index] = initialShotCooldown(this.kind[index], this.mobileMode, index + this.spawnCursor * 5);
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
    this.supportInterval[index] = 0;
    this.shotCooldown[index] = 0;
    this.homeX[index] = 0;
    this.phaseThresholdCount[index] = 0;
    this.phaseThresholdA[index] = 0;
    this.phaseThresholdB[index] = 0;
    this.phaseThresholdC[index] = 0;
    this.phaseThresholdD[index] = 0;
    this.variant[index] = 0;
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
    this.mesh.setColorAt(instanceIndex, this.colorForEnemy(enemyIndex));
  }

  private updateWanderingEnemy(index: number, dt: number, elapsed: number, playerX: number): void {
    const inUpperField = this.y[index] > ENEMY_WANDER_FLOOR_Y;
    const mobileSpeedScale = this.mobileMode ? 0.82 : 1;
    const verticalScale = inUpperField ? (this.kind[index] === EnemyKind.Elite ? 0.34 : 0.42) : 0.78;
    const wanderScale = this.kind[index] === EnemyKind.Elite ? 1.04 : 0.74;
    const primary = Math.sin(elapsed * 0.88 + this.wobble[index]) * wanderScale;
    const secondary = Math.sin(elapsed * 1.47 + this.wobble[index] * 0.63) * 0.28;
    const playerPull = clamp((playerX - this.homeX[index]) * 0.12, -0.42, 0.42);
    const targetX = clamp(this.homeX[index] + primary + secondary + playerPull, -4.35, 4.35);

    this.y[index] -= this.speed[index] * mobileSpeedScale * verticalScale * dt;
    this.x[index] += (targetX - this.x[index]) * (inUpperField ? 1.25 : 0.75) * dt;
    this.x[index] = clamp(this.x[index], -4.7, 4.7);

    this.updateEnemyFire(index, dt, playerX);
  }

  private updateEnemyFire(index: number, dt: number, playerX: number): void {
    this.shotCooldown[index] -= dt;
    if (this.shotCooldown[index] > 0 || this.y[index] > 5.5 || this.y[index] < -0.8) {
      return;
    }

    this.shotCooldown[index] = nextShotCooldown(this.kind[index], this.mobileMode, index + Math.floor(this.y[index] * 17));
    if (this.kind[index] === EnemyKind.Elite && this.fireCount < ENEMY_FIRE_LIMIT - 1 && Math.abs(playerX - this.x[index]) > 0.45) {
      this.recordFire(index, -0.22);
      this.recordFire(index, 0.22);
    } else {
      this.recordFire(index, 0);
    }
  }

  private recordFire(index: number, offsetX: number): void {
    if (this.fireCount >= ENEMY_FIRE_LIMIT) {
      return;
    }

    this.fireX[this.fireCount] = this.x[index] + offsetX;
    this.fireY[this.fireCount] = this.y[index] - this.radius[index] * 0.65;
    this.fireZ[this.fireCount] = this.z[index] + 0.06;
    this.fireKind[this.fireCount] = this.kind[index] === EnemyKind.Elite ? EnemyKind.Elite : EnemyKind.Drone;
    this.fireCount += 1;
  }

  private updateBoss(index: number, dt: number, elapsed: number, playerX: number): void {
    const patrolRange = bossPatrolRange(this.variant[index], this.phase[index], this.mobileMode);
    const patrolA = Math.sin(elapsed * bossPatrolSpeed(this.variant[index]) + this.wobble[index]) * patrolRange;
    const patrolB = Math.sin(elapsed * 0.47 + this.wobble[index] * 1.7) * 0.58;
    const playerPull = clamp((playerX - this.x[index]) * 0.18, -0.62, 0.62);
    const targetX = clamp(this.homeX[index] + patrolA + patrolB + playerPull, -3.85, 3.85);

    if (this.y[index] > BOSS_HOVER_Y) {
      this.y[index] -= this.speed[index] * dt;
      this.x[index] += (targetX - this.x[index]) * 0.38 * dt;
    } else {
      this.y[index] = BOSS_HOVER_Y + Math.sin(elapsed * 1.4 + this.wobble[index]) * 0.18;
      this.x[index] += (targetX - this.x[index]) * (0.72 + this.phase[index] * 0.08) * dt;
      this.x[index] = clamp(this.x[index], -3.6, 3.6);
    }

    this.updateBossPhase(index);
    this.supportCooldown[index] -= dt;
    const baseInterval = this.supportInterval[index] || 4.8;
    const phaseInterval = Math.max(3.4, baseInterval * (1.24 - this.phase[index] * 0.06));
    if (this.supportCooldown[index] <= 0 && this.y[index] <= BOSS_HOVER_Y + 0.3) {
      this.spawnBossSupport(index, playerX);
      this.supportCooldown[index] = this.mobileMode ? phaseInterval * 1.35 : phaseInterval;
    }
  }

  private updateBossPhase(index: number): void {
    const hpRatio = this.maxHp[index] > 0 ? this.hp[index] / this.maxHp[index] : 1;
    const nextPhase = this.phaseForHpRatio(index, hpRatio);
    if (nextPhase <= this.phase[index]) {
      return;
    }

    this.phase[index] = nextPhase;
    this.pendingSpawnType = supportTypeForBoss(this.variant[index], nextPhase, this.definitions);
    this.pendingSpawnPath = 'sine';
    this.pendingSpawnBaseX = this.x[index];
    this.pendingSpawnCount += 1;
    this.pendingSpawnTotal = this.pendingSpawnCount;
    this.pendingSpawnInterval = this.mobileMode ? 0.9 : 0.72;
    this.pendingSpawnCooldown = 0;
  }

  private writePhaseThresholds(index: number, thresholds?: number[]): void {
    const source = thresholds && thresholds.length > 0 ? thresholds : [0.66, 0.33];
    const count = Math.min(4, source.length);
    this.phaseThresholdCount[index] = count;
    this.phaseThresholdA[index] = source[0] ?? 0;
    this.phaseThresholdB[index] = source[1] ?? 0;
    this.phaseThresholdC[index] = source[2] ?? 0;
    this.phaseThresholdD[index] = source[3] ?? 0;
  }

  private phaseForHpRatio(index: number, hpRatio: number): number {
    let nextPhase = 1;
    const count = this.phaseThresholdCount[index];
    if (count >= 1 && hpRatio <= this.phaseThresholdA[index]) {
      nextPhase = 2;
    }
    if (count >= 2 && hpRatio <= this.phaseThresholdB[index]) {
      nextPhase = 3;
    }
    if (count >= 3 && hpRatio <= this.phaseThresholdC[index]) {
      nextPhase = 4;
    }
    if (count >= 4 && hpRatio <= this.phaseThresholdD[index]) {
      nextPhase = 5;
    }
    return nextPhase;
  }

  private spawnBossSupport(index: number, playerX: number): void {
    const count = 1;
    const playerBias = clamp((playerX - this.x[index]) * 0.26, -1.1, 1.1);
    for (let i = 0; i < count; i += 1) {
      const offset = (i - (count - 1) / 2) * 1.55;
      const type = supportTypeForBoss(this.variant[index], this.phase[index], this.definitions, i);
      this.spawn(type, this.x[index] + playerBias + offset, this.y[index] - 0.8 - i * 0.18, -0.2, this.waveCycle);
    }
  }

  private isBossType(type: string): boolean {
    return this.definitions[type]?.kind === 'boss';
  }

  private colorForEnemy(index: number): Color {
    switch (this.variant[index]) {
      case 2:
        return this.scratchColor.set('#ff8a3d');
      case 3:
        return this.scratchColor.set('#9b5cff');
      case 11:
        return this.scratchColor.set('#ffb36d');
      case 12:
        return this.scratchColor.set('#b17cff');
      case 10:
        return this.scratchColor.set('#ff3ea5');
      default:
        if (this.kind[index] === EnemyKind.Elite) {
          return this.scratchColor.set('#ff8a3d');
        }
        return this.scratchColor.set('#ff3ea5');
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

function lanePattern(index: number): number {
  const lane = index % 5;
  if (lane === 0) {
    return -1;
  }
  if (lane === 1) {
    return 1;
  }
  if (lane === 2) {
    return -2;
  }
  if (lane === 3) {
    return 2;
  }
  return 0;
}

function pickupEnergyForKind(kind: EnemyKind): number {
  if (kind === EnemyKind.Boss) {
    return 10;
  }
  if (kind === EnemyKind.Elite) {
    return 3;
  }
  return 1;
}

function initialShotCooldown(kind: EnemyKind, mobileMode: boolean, seed: number): number {
  if (kind === EnemyKind.Boss) {
    return 0;
  }
  const base = kind === EnemyKind.Elite ? seededRange(seed * 19, 1.9, 3.0) : seededRange(seed * 19, 2.8, 4.4);
  return mobileMode ? base * 1.35 : base;
}

function nextShotCooldown(kind: EnemyKind, mobileMode: boolean, seed: number): number {
  const base = kind === EnemyKind.Elite ? seededRange(seed * 31, 2.4, 3.8) : seededRange(seed * 31, 3.4, 5.4);
  return mobileMode ? base * 1.45 : base;
}

function scaledWaveCount(baseCount: number, eventTime: number, cycle: number, mobileMode: boolean): number {
  const lateBonus = eventTime >= 96 ? 1 : eventTime >= 48 ? 0.55 : 0;
  const cycleBonus = cycle * (mobileMode ? 0.45 : 0.7);
  const scaled = baseCount + lateBonus + cycleBonus;
  const cap = mobileMode ? 4 : 6;
  return Math.max(1, Math.min(cap, Math.round(scaled)));
}

function scaledSpawnInterval(interval: number, eventTime: number, cycle: number, mobileMode: boolean): number {
  const base = interval * (mobileMode ? 1.75 : 1.45);
  const lateScale = eventTime >= 96 ? 0.86 : eventTime >= 48 ? 0.94 : 1;
  const cycleScale = Math.max(0.78, 1 - cycle * 0.06);
  return Math.max(mobileMode ? 0.72 : 0.52, base * lateScale * cycleScale);
}

function hpScaleForSpawn(definition: EnemyDefinition, type: string, cycle: number): number {
  if (definition.kind === 'boss') {
    const variantBonus = type === 'boss_03' ? 0.28 : type === 'boss_02' ? 0.18 : 0.06;
    return 1 + variantBonus + cycle * 0.24;
  }
  if (definition.kind === 'elite') {
    return 1 + cycle * 0.08;
  }
  return 1 + cycle * 0.05;
}

function scoreScaleForSpawn(definition: EnemyDefinition, cycle: number): number {
  if (definition.kind === 'boss') {
    return 1 + cycle * 0.18;
  }
  return 1 + cycle * 0.08;
}

function variantCode(type: string): number {
  if (type === 'sentinel') {
    return 2;
  }
  if (type === 'wraith') {
    return 3;
  }
  if (type === 'boss_01') {
    return 10;
  }
  if (type === 'boss_02') {
    return 11;
  }
  if (type === 'boss_03') {
    return 12;
  }
  return 0;
}

function supportTypeForBoss(
  variant: number,
  phase: number,
  definitions: Record<string, EnemyDefinition>,
  offset = 0
): string {
  if (variant >= 11 && phase >= 2 && definitions.wraith) {
    return 'wraith';
  }
  if (phase >= 3 && definitions.elite && offset === 0) {
    return 'elite';
  }
  return definitions.drone ? 'drone' : Object.keys(definitions)[0] ?? 'drone';
}

function bossPatrolRange(variant: number, phase: number, mobileMode: boolean): number {
  const base = variant === 12 ? 2.2 : variant === 11 ? 1.95 : 1.75;
  const phaseBoost = phase <= 1 ? 0 : phase * 0.1;
  return (base + phaseBoost) * (mobileMode ? 0.78 : 1);
}

function bossPatrolSpeed(variant: number): number {
  if (variant === 12) {
    return 0.82;
  }
  if (variant === 11) {
    return 0.72;
  }
  return 0.64;
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
