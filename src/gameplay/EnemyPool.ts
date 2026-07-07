import {
  BoxGeometry,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Vector3
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

export type EnemyShotKind = 'drone' | 'elite' | 'sentinel' | 'wraith' | 'bulwark';

export interface EnemyRenderSnapshot {
  x: number;
  y: number;
  z: number;
  scale: number;
  bank: number;
  variant: number;
  kind: 'drone' | 'elite' | 'boss';
  phase: number;
}

const ENEMY_LIMIT = 48;
const DEFAULT_ENEMY_RADIUS = 0.48;
const DEFAULT_ENEMY_SCALE = 1;
const ENEMY_BOTTOM_BOUND = -5.65;
const MOBILE_ENEMY_LIMIT = 34;
const PLAYER_HIT_RADIUS = 0.62;
const NEAR_PLAYER_THREAT_RADIUS = 2.75;
const WAVE_LOOP_GAP = 8;
const BOSS_HOVER_Y = 3.15;
const ENEMY_WANDER_FLOOR_Y = 1.05;
const ENEMY_FIRE_LIMIT = 16;

const enum EnemyKind {
  Drone = 0,
  Elite = 1,
  Boss = 2
}

const enum EnemyShotKindCode {
  Drone = 0,
  Elite = 1,
  Sentinel = 2,
  Wraith = 3,
  Bulwark = 4
}

export class EnemyPool {
  readonly object = new Group();
  readonly mesh: InstancedMesh;

  private readonly wingMesh: InstancedMesh;
  private readonly detailMesh: InstancedMesh;
  private readonly active = new Uint8Array(ENEMY_LIMIT);
  private readonly activeIndices = new Uint8Array(ENEMY_LIMIT);
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
  private readonly attackPressure = new Float32Array(ENEMY_LIMIT);
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
  private readonly modelBackedVariants = new Uint8Array(16);
  private readonly scratchMatrix = new Matrix4();
  private readonly scratchColor = new Color();
  private readonly scratchScale = new Vector3();
  private spawnCursor = 0;
  private nextFreeIndex = 0;
  private activeEnemies = 0;
  private activeIndexCount = 0;
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
  private pendingSpawnEventTime = 0;

  constructor(
    private readonly definitions: Record<string, EnemyDefinition>,
    private readonly stage: WaveEventDefinition[]
  ) {
    const geometry = createEnemyCraftGeometry();
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
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);

    const wingMaterial = new MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#230740',
      emissiveIntensity: 0.85,
      roughness: 0.48,
      metalness: 0.24,
      flatShading: true
    });
    this.wingMesh = new InstancedMesh(new BoxGeometry(0.92, 0.16, 0.08), wingMaterial, ENEMY_LIMIT);
    this.wingMesh.count = 0;
    this.wingMesh.frustumCulled = false;
    this.wingMesh.instanceMatrix.setUsage(DynamicDrawUsage);
    const detailMaterial = new MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#11315f',
      emissiveIntensity: 1,
      roughness: 0.38,
      metalness: 0.28,
      flatShading: true
    });
    this.detailMesh = new InstancedMesh(new BoxGeometry(0.18, 0.62, 0.14), detailMaterial, ENEMY_LIMIT);
    this.detailMesh.count = 0;
    this.detailMesh.frustumCulled = false;
    this.detailMesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.object.add(this.wingMesh);
    this.object.add(this.mesh);
    this.object.add(this.detailMesh);
  }

  setMobileMode(enabled: boolean): void {
    if (enabled && !this.mobileMode) {
      this.trimToLimit(MOBILE_ENEMY_LIMIT);
    }
    this.mobileMode = enabled;
  }

  setModelBackedVariants(variants: number[]): void {
    this.modelBackedVariants.fill(0);
    for (const variant of variants) {
      if (variant >= 0 && variant < this.modelBackedVariants.length) {
        this.modelBackedVariants[variant] = 1;
      }
    }
  }

  update(dt: number, elapsed: number, playerX: number, playerY: number, playerZ: number): EnemyPoolStats {
    this.updateWaveDirector(dt, elapsed, playerX);
    this.fireCount = 0;

    this.activeEnemies = 0;
    this.activeIndexCount = 0;
    let proceduralEnemies = 0;
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
    const limit = this.currentLimit();
    for (let i = 0; i < limit; i += 1) {
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

      if (this.shouldRenderProcedural(i)) {
        this.writeInstance(proceduralEnemies, i, elapsed);
        proceduralEnemies += 1;
      }
      this.activeIndices[this.activeIndexCount] = i;
      this.activeIndexCount += 1;
      this.activeEnemies += 1;
    }

    this.mesh.count = proceduralEnemies;
    this.wingMesh.count = proceduralEnemies;
    this.detailMesh.count = proceduralEnemies;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.wingMesh.instanceMatrix.needsUpdate = true;
    this.detailMesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
    if (this.wingMesh.instanceColor) {
      this.wingMesh.instanceColor.needsUpdate = true;
    }
    if (this.detailMesh.instanceColor) {
      this.detailMesh.instanceColor.needsUpdate = true;
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
      fire(this.fireX[i], this.fireY[i], this.fireZ[i], shotKindFromCode(this.fireKind[i]));
    }
    this.fireCount = 0;
  }

  writeRenderSnapshots(target: EnemyRenderSnapshot[], elapsed: number): number {
    let count = 0;
    for (let cursor = 0; cursor < this.activeIndexCount; cursor += 1) {
      const i = this.activeIndices[cursor];
      if (this.active[i] === 0) {
        continue;
      }
      if (this.modelBackedVariants[this.variant[i]] !== 1) {
        continue;
      }

      const phaseBoost = this.kind[i] === EnemyKind.Boss ? 1 + (this.phase[i] - 1) * 0.12 : 1;
      const bossPulse = this.kind[i] === EnemyKind.Boss ? 0.075 : 0.045;
      const pulse = (1 + Math.sin(elapsed * 7 + i) * bossPulse) * this.scale[i] * phaseBoost;
      const bank = this.kind[i] === EnemyKind.Boss
        ? Math.sin(elapsed * 1.15 + this.wobble[i]) * 0.08
        : Math.sin(elapsed * 2.4 + this.wobble[i]) * 0.18;
      const snapshot = target[count] ?? {
        x: 0,
        y: 0,
        z: 0,
        scale: 1,
        bank: 0,
        variant: 0,
        kind: 'drone',
        phase: 1
      };
      snapshot.x = this.x[i];
      snapshot.y = this.y[i];
      snapshot.z = this.z[i];
      snapshot.scale = pulse;
      snapshot.bank = bank;
      snapshot.variant = this.variant[i];
      snapshot.kind = renderKind(this.kind[i]);
      snapshot.phase = this.phase[i];
      target[count] = snapshot;
      count += 1;
    }
    return count;
  }

  hitAt(x: number, y: number, z: number, radius: number, damage: number): HitResult {
    const result: HitResult = { hit: false, destroyed: false, score: 0, pickupEnergy: 0, x: 0, y: 0, z: 0 };
    this.hitAtInto(result, x, y, z, radius, damage);
    return result;
  }

  hitAtInto(out: HitResult, x: number, y: number, z: number, radius: number, damage: number): void {
    out.hit = false;
    out.destroyed = false;
    out.score = 0;
    out.pickupEnergy = 0;
    out.x = 0;
    out.y = 0;
    out.z = 0;

    for (let cursor = 0; cursor < this.activeIndexCount; cursor += 1) {
      const i = this.activeIndices[cursor];
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
        out.hit = true;
        out.destroyed = true;
        out.score = score;
        out.pickupEnergy = pickupEnergy;
        out.x = hitX;
        out.y = hitY;
        out.z = hitZ;
        return;
      }

      out.hit = true;
      out.x = this.x[i];
      out.y = this.y[i];
      out.z = this.z[i];
      return;
    }
  }

  clearAll(): ClearResult {
    let destroyed = 0;
    let score = 0;
    let pickupEnergy = 0;
    let x = 0;
    let y = 0;
    let z = 0;

    for (let cursor = 0; cursor < this.activeIndexCount; cursor += 1) {
      const i = this.activeIndices[cursor];
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
      this.activeEnemies = 0;
      this.activeIndexCount = 0;
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

    for (let cursor = 0; cursor < this.activeIndexCount; cursor += 1) {
      const i = this.activeIndices[cursor];
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
    this.pendingSpawnEventTime = event.time;
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
    this.spawn(this.pendingSpawnType, x, 6.9 + spawnIndex * 0.36, z, this.pendingSpawnCycle, this.pendingSpawnEventTime);
  }

  private spawn(type: string, x: number, y: number, z: number, cycle = this.waveCycle, eventTime = 0): void {
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
    const hpScale = hpScaleForSpawn(definition, type, cycle, eventTime);
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
    this.attackPressure[index] = attackPressureForSpawn(definition, eventTime, cycle);
    this.writePhaseThresholds(index, definition.phaseThresholds);
    this.variant[index] = variantCode(type);
    this.wobble[index] = seededRange(index * 11 + this.spawnCursor * 7, 0, Math.PI * 2);
    this.homeX[index] = this.x[index];
    this.shotCooldown[index] = initialShotCooldown(
      this.kind[index],
      this.mobileMode,
      index + this.spawnCursor * 5,
      this.attackPressure[index]
    );
  }

  private recycle(index: number): void {
    if (this.active[index] === 0) {
      return;
    }

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
    this.attackPressure[index] = 0;
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
    const limit = this.currentLimit();
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

  private currentLimit(): number {
    return this.mobileMode ? MOBILE_ENEMY_LIMIT : ENEMY_LIMIT;
  }

  private trimToLimit(limit: number): void {
    for (let i = limit; i < ENEMY_LIMIT; i += 1) {
      if (this.active[i] === 1) {
        this.recycle(i);
      }
    }
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
    const bank = this.kind[enemyIndex] === EnemyKind.Boss
      ? Math.sin(elapsed * 1.15 + this.wobble[enemyIndex]) * 0.08
      : Math.sin(elapsed * 2.4 + this.wobble[enemyIndex]) * 0.18;
    const profile = visualProfile(this.kind[enemyIndex], this.variant[enemyIndex]);
    this.scratchMatrix.makeRotationZ(bank);
    this.scratchScale.set(profile.coreWide * pulse, profile.coreLong * pulse, profile.coreDepth * pulse);
    this.scratchMatrix.scale(this.scratchScale);
    this.scratchMatrix.setPosition(this.x[enemyIndex], this.y[enemyIndex], this.z[enemyIndex]);
    this.mesh.setMatrixAt(instanceIndex, this.scratchMatrix);
    this.mesh.setColorAt(instanceIndex, this.colorForEnemy(enemyIndex));

    this.scratchMatrix.makeRotationZ(bank * 1.25 + profile.wingAngle);
    this.scratchScale.set(profile.wingSpan * pulse, profile.wingChord * pulse, profile.wingDepth * pulse);
    this.scratchMatrix.scale(this.scratchScale);
    this.scratchMatrix.setPosition(
      this.x[enemyIndex],
      this.y[enemyIndex] + profile.wingOffsetY * pulse,
      this.z[enemyIndex] - 0.04
    );
    this.wingMesh.setMatrixAt(instanceIndex, this.scratchMatrix);
    this.wingMesh.setColorAt(instanceIndex, this.accentColorForEnemy(enemyIndex));

    this.scratchMatrix.makeRotationZ(bank * 0.65 + profile.detailAngle);
    this.scratchScale.set(profile.detailWide * pulse, profile.detailLong * pulse, profile.detailDepth * pulse);
    this.scratchMatrix.scale(this.scratchScale);
    this.scratchMatrix.setPosition(
      this.x[enemyIndex],
      this.y[enemyIndex] + profile.detailOffsetY * pulse,
      this.z[enemyIndex] + profile.detailOffsetZ
    );
    this.detailMesh.setMatrixAt(instanceIndex, this.scratchMatrix);
    this.detailMesh.setColorAt(instanceIndex, this.detailColorForEnemy(enemyIndex));
  }

  private shouldRenderProcedural(index: number): boolean {
    return this.modelBackedVariants[this.variant[index]] !== 1;
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

    this.shotCooldown[index] = nextShotCooldown(
      this.kind[index],
      this.mobileMode,
      index + Math.floor(this.y[index] * 17),
      this.attackPressure[index]
    );
    const advancedElite = this.kind[index] === EnemyKind.Elite && this.attackPressure[index] >= 1.18 && this.y[index] <= 4.85;
    if (advancedElite && this.variant[index] === 2 && this.fireCount < ENEMY_FIRE_LIMIT - 1) {
      this.recordFire(index, -0.28, EnemyShotKindCode.Sentinel);
      this.recordFire(index, 0.28, EnemyShotKindCode.Sentinel);
    } else if (advancedElite && this.variant[index] === 3 && this.fireCount < ENEMY_FIRE_LIMIT - 1) {
      this.recordFire(index, -0.18, EnemyShotKindCode.Wraith);
      this.recordFire(index, 0.18, EnemyShotKindCode.Wraith);
    } else if (advancedElite && this.variant[index] === 4) {
      this.recordFire(index, 0, EnemyShotKindCode.Bulwark);
    } else if (this.kind[index] === EnemyKind.Elite && this.fireCount < ENEMY_FIRE_LIMIT - 1 && Math.abs(playerX - this.x[index]) > 0.45) {
      this.recordFire(index, -0.22, EnemyShotKindCode.Elite);
      this.recordFire(index, 0.22, EnemyShotKindCode.Elite);
    } else {
      this.recordFire(index, 0, this.kind[index] === EnemyKind.Elite ? EnemyShotKindCode.Elite : EnemyShotKindCode.Drone);
    }
  }

  private recordFire(index: number, offsetX: number, shotKind: EnemyShotKindCode): void {
    if (this.fireCount >= ENEMY_FIRE_LIMIT) {
      return;
    }

    this.fireX[this.fireCount] = this.x[index] + offsetX;
    this.fireY[this.fireCount] = this.y[index] - this.radius[index] * 0.65;
    this.fireZ[this.fireCount] = this.z[index] + 0.06;
    this.fireKind[this.fireCount] = shotKind;
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
        return this.scratchColor.setHex(0xff8a3d);
      case 3:
        return this.scratchColor.setHex(0x9b5cff);
      case 4:
        return this.scratchColor.setHex(0xff6a2a);
      case 11:
        return this.scratchColor.setHex(0xffb36d);
      case 12:
        return this.scratchColor.setHex(0xb17cff);
      case 10:
        return this.scratchColor.setHex(0xff3ea5);
      default:
        if (this.kind[index] === EnemyKind.Elite) {
          return this.scratchColor.setHex(0xff8a3d);
        }
        return this.scratchColor.setHex(0xff3ea5);
    }
  }

  private accentColorForEnemy(index: number): Color {
    switch (this.variant[index]) {
      case 2:
        return this.scratchColor.setHex(0xff5a1f);
      case 3:
        return this.scratchColor.setHex(0x27d8ff);
      case 4:
        return this.scratchColor.setHex(0xffcf7a);
      case 11:
        return this.scratchColor.setHex(0xff8a3d);
      case 12:
        return this.scratchColor.setHex(0x27d8ff);
      case 10:
        return this.scratchColor.setHex(0x9b5cff);
      default:
        if (this.kind[index] === EnemyKind.Elite) {
          return this.scratchColor.setHex(0xffcf7a);
      }
      return this.scratchColor.setHex(0x9b5cff);
    }
  }

  private detailColorForEnemy(index: number): Color {
    switch (this.variant[index]) {
      case 1:
        return this.scratchColor.setHex(0x27d8ff);
      case 2:
        return this.scratchColor.setHex(0xffd28a);
      case 3:
        return this.scratchColor.setHex(0xaef7ff);
      case 4:
        return this.scratchColor.setHex(0xff8a3d);
      case 10:
        return this.scratchColor.setHex(0x27d8ff);
      case 11:
        return this.scratchColor.setHex(0xff3ea5);
      case 12:
        return this.scratchColor.setHex(0xbdefff);
      default:
        if (this.kind[index] === EnemyKind.Elite) {
          return this.scratchColor.setHex(0xfff1b8);
        }
        return this.scratchColor.setHex(0xff79c8);
    }
  }

  private hasActiveBoss(): boolean {
    for (let cursor = 0; cursor < this.activeIndexCount; cursor += 1) {
      const i = this.activeIndices[cursor];
      if (this.active[i] === 1 && this.kind[i] === EnemyKind.Boss) {
        return true;
      }
    }
    return false;
  }
}

function createEnemyCraftGeometry(): BufferGeometry {
  const geometry = new BufferGeometry();
  const vertices = [
    0, -0.68, 0.18,
    -0.54, 0.04, 0.04,
    -0.28, 0.46, -0.08,
    0, 0.3, 0.18,
    0.28, 0.46, -0.08,
    0.54, 0.04, 0.04,
    0, -0.68, -0.16,
    -0.42, 0.08, -0.14,
    0, 0.46, -0.2,
    0.42, 0.08, -0.14
  ];
  const indices = [
    0, 1, 3,
    0, 3, 5,
    1, 2, 3,
    3, 4, 5,
    0, 6, 7,
    0, 7, 1,
    0, 5, 9,
    0, 9, 6,
    6, 8, 7,
    6, 9, 8,
    2, 8, 3,
    3, 8, 4,
    1, 7, 2,
    5, 4, 9,
    2, 7, 8,
    4, 8, 9
  ];

  geometry.setIndex(indices);
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
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

function renderKind(kind: number): EnemyRenderSnapshot['kind'] {
  if (kind === EnemyKind.Boss) {
    return 'boss';
  }
  if (kind === EnemyKind.Elite) {
    return 'elite';
  }
  return 'drone';
}

function shotKindFromCode(code: number): EnemyShotKind {
  if (code === EnemyShotKindCode.Sentinel) {
    return 'sentinel';
  }
  if (code === EnemyShotKindCode.Wraith) {
    return 'wraith';
  }
  if (code === EnemyShotKindCode.Bulwark) {
    return 'bulwark';
  }
  if (code === EnemyShotKindCode.Elite) {
    return 'elite';
  }
  return 'drone';
}

function initialShotCooldown(kind: EnemyKind, mobileMode: boolean, seed: number, attackPressure = 1): number {
  if (kind === EnemyKind.Boss) {
    return 0;
  }
  const base = kind === EnemyKind.Elite ? seededRange(seed * 19, 1.9, 3.0) : seededRange(seed * 19, 2.8, 4.4);
  const pressure = kind === EnemyKind.Elite ? attackPressure : 1;
  return (mobileMode ? base * 1.35 : base) / pressure;
}

function nextShotCooldown(kind: EnemyKind, mobileMode: boolean, seed: number, attackPressure = 1): number {
  const base = kind === EnemyKind.Elite ? seededRange(seed * 31, 2.4, 3.8) : seededRange(seed * 31, 3.4, 5.4);
  const pressure = kind === EnemyKind.Elite ? attackPressure : 1;
  return (mobileMode ? base * 1.45 : base) / pressure;
}

function scaledWaveCount(baseCount: number, eventTime: number, cycle: number, mobileMode: boolean): number {
  const lateBonus = eventTime >= 140 ? 3.1 : eventTime >= 96 ? 2.4 : eventTime >= 48 ? 1.25 : 0.18;
  const cycleBonus = cycle * (mobileMode ? 0.65 : 1);
  const scaled = baseCount + lateBonus + cycleBonus;
  const cap = mobileMode ? 9 : 12;
  return Math.max(1, Math.min(cap, Math.round(scaled)));
}

function scaledSpawnInterval(interval: number, eventTime: number, cycle: number, mobileMode: boolean): number {
  const base = interval * (mobileMode ? 1.62 : 1.34);
  const lateScale = eventTime >= 140 ? 0.62 : eventTime >= 96 ? 0.68 : eventTime >= 48 ? 0.82 : 0.98;
  const cycleScale = Math.max(0.74, 1 - cycle * 0.065);
  return Math.max(mobileMode ? 0.56 : 0.38, base * lateScale * cycleScale);
}

function hpScaleForSpawn(definition: EnemyDefinition, type: string, cycle: number, eventTime: number): number {
  if (definition.kind === 'boss') {
    const variantBonus = type === 'boss_03' ? 0.28 : type === 'boss_02' ? 0.18 : 0.06;
    const lateBossBonus = eventTime >= 180 ? 0.42 : eventTime >= 140 ? 0.3 : eventTime >= 78 ? 0.12 : 0;
    return 1.04 + variantBonus + lateBossBonus + cycle * 0.34;
  }
  if (definition.kind === 'elite') {
    const lateEliteBonus = eventTime >= 96 ? 0.08 : eventTime >= 48 ? 0.04 : 0;
    return 1.06 + lateEliteBonus + cycle * 0.1;
  }
  const lateDroneBonus = eventTime >= 96 ? 0.04 : 0;
  return 1.04 + lateDroneBonus + cycle * 0.07;
}

function attackPressureForSpawn(definition: EnemyDefinition, eventTime: number, cycle: number): number {
  if (definition.kind !== 'elite') {
    return 1;
  }

  const latePressure = eventTime >= 140 ? 1.32 : eventTime >= 117 ? 1.24 : eventTime >= 66 ? 1.1 : 1;
  return Math.min(1.48, latePressure + cycle * 0.07);
}

function scoreScaleForSpawn(definition: EnemyDefinition, cycle: number): number {
  if (definition.kind === 'boss') {
    return 1 + cycle * 0.18;
  }
  return 1 + cycle * 0.08;
}

function variantCode(type: string): number {
  if (type === 'skimmer') {
    return 1;
  }
  if (type === 'sentinel') {
    return 2;
  }
  if (type === 'wraith') {
    return 3;
  }
  if (type === 'bulwark') {
    return 4;
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

interface VisualProfile {
  coreWide: number;
  coreLong: number;
  coreDepth: number;
  wingSpan: number;
  wingChord: number;
  wingDepth: number;
  wingAngle: number;
  wingOffsetY: number;
  detailWide: number;
  detailLong: number;
  detailDepth: number;
  detailAngle: number;
  detailOffsetY: number;
  detailOffsetZ: number;
}

function visualProfile(kind: EnemyKind, variant: number): VisualProfile {
  if (variant === 1) {
    return {
      coreWide: 1,
      coreLong: 0.72,
      coreDepth: 0.56,
      wingSpan: 1.28,
      wingChord: 0.42,
      wingDepth: 0.5,
      wingAngle: -0.1,
      wingOffsetY: -0.04,
      detailWide: 0.68,
      detailLong: 0.32,
      detailDepth: 0.52,
      detailAngle: 0.55,
      detailOffsetY: -0.22,
      detailOffsetZ: 0.09
    };
  }

  if (variant === 2) {
    return {
      coreWide: 1.34,
      coreLong: 0.96,
      coreDepth: 0.76,
      wingSpan: 1.12,
      wingChord: 1,
      wingDepth: 0.78,
      wingAngle: 0.02,
      wingOffsetY: 0.12,
      detailWide: 0.86,
      detailLong: 0.9,
      detailDepth: 0.78,
      detailAngle: 0,
      detailOffsetY: 0.2,
      detailOffsetZ: 0.12
    };
  }

  if (variant === 3) {
    return {
      coreWide: 0.86,
      coreLong: 1.08,
      coreDepth: 0.56,
      wingSpan: 1.55,
      wingChord: 0.36,
      wingDepth: 0.52,
      wingAngle: 0.36,
      wingOffsetY: 0.02,
      detailWide: 0.38,
      detailLong: 1.12,
      detailDepth: 0.46,
      detailAngle: 0,
      detailOffsetY: 0.16,
      detailOffsetZ: 0.12
    };
  }

  if (variant === 4) {
    return {
      coreWide: 1.5,
      coreLong: 1.04,
      coreDepth: 0.84,
      wingSpan: 1.64,
      wingChord: 0.9,
      wingDepth: 0.82,
      wingAngle: -0.04,
      wingOffsetY: 0.08,
      detailWide: 1.1,
      detailLong: 0.72,
      detailDepth: 0.82,
      detailAngle: Math.PI / 2,
      detailOffsetY: -0.04,
      detailOffsetZ: 0.12
    };
  }

  if (variant === 10) {
    return {
      coreWide: 1.5,
      coreLong: 1.12,
      coreDepth: 0.72,
      wingSpan: 1.95,
      wingChord: 0.78,
      wingDepth: 0.72,
      wingAngle: 0.08,
      wingOffsetY: 0.08,
      detailWide: 0.48,
      detailLong: 1.35,
      detailDepth: 0.62,
      detailAngle: 0,
      detailOffsetY: 0.1,
      detailOffsetZ: 0.16
    };
  }

  if (variant === 11) {
    return {
      coreWide: 1.78,
      coreLong: 1.02,
      coreDepth: 0.86,
      wingSpan: 2.22,
      wingChord: 0.92,
      wingDepth: 0.82,
      wingAngle: 0,
      wingOffsetY: 0.02,
      detailWide: 1.22,
      detailLong: 0.72,
      detailDepth: 0.76,
      detailAngle: Math.PI / 2,
      detailOffsetY: -0.04,
      detailOffsetZ: 0.18
    };
  }

  if (variant === 12) {
    return {
      coreWide: 1.22,
      coreLong: 1.36,
      coreDepth: 0.82,
      wingSpan: 2.05,
      wingChord: 0.68,
      wingDepth: 0.78,
      wingAngle: 0.32,
      wingOffsetY: 0.12,
      detailWide: 0.46,
      detailLong: 1.72,
      detailDepth: 0.72,
      detailAngle: 0,
      detailOffsetY: 0.2,
      detailOffsetZ: 0.2
    };
  }

  if (kind === EnemyKind.Elite) {
    return {
      coreWide: 1.28,
      coreLong: 1,
      coreDepth: 0.72,
      wingSpan: 1.35,
      wingChord: 0.76,
      wingDepth: 0.7,
      wingAngle: 0.14,
      wingOffsetY: 0.08,
      detailWide: 0.48,
      detailLong: 0.78,
      detailDepth: 0.62,
      detailAngle: 0,
      detailOffsetY: 0.08,
      detailOffsetZ: 0.12
    };
  }

  return {
    coreWide: 1.08,
    coreLong: 0.92,
    coreDepth: 0.72,
    wingSpan: 1,
    wingChord: 0.76,
    wingDepth: 0.72,
    wingAngle: 0.18,
    wingOffsetY: 0.08,
    detailWide: 0.42,
    detailLong: 0.62,
    detailDepth: 0.56,
    detailAngle: 0,
    detailOffsetY: 0.08,
    detailOffsetZ: 0.1
  };
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
