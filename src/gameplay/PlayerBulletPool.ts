import {
  Color,
  DynamicDrawUsage,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Vector3
} from 'three';
import type { WeaponDefinition } from '../data/GameConfig';

export interface BulletPoolStats {
  activeBullets: number;
  poolSize: number;
  weaponLevel: number;
}

export interface CollisionResult {
  hits: number;
  destroyed: number;
  score: number;
  pickupEnergy: number;
  impactX: number;
  impactY: number;
  impactZ: number;
  chainBursts: number;
  chainX: number;
  chainY: number;
  chainZ: number;
  chainRadius: number;
  chainDamage: number;
}

export interface BulletHitResult {
  hit: boolean;
  destroyed: boolean;
  score: number;
  pickupEnergy: number;
  x: number;
  y: number;
  z: number;
}

const PLAYER_BULLET_LIMIT = 180;
const BULLET_MAX_LIFE = 1.45;
const BULLET_TOP_BOUND = 7.7;
const BULLET_RADIUS = 0.18;
const UPGRADE_MAX_LEVEL = 7;
const INHERITED_DRIFT_LIMIT = 1.6;
const BULLET_KIND_NORMAL = 0;
const BULLET_KIND_WING = 1;
const BULLET_KIND_SURGE = 2;
const BULLET_KIND_CRITICAL = 3;
const BULLET_KIND_SPREAD_ULTRA = 4;
const BULLET_KIND_WING_ULTRA = 5;
const BULLET_KIND_SURGE_ULTRA = 6;
const BULLET_KIND_CRITICAL_ULTRA = 7;
const BULLET_KIND_PRIMARY_ULTRA = 8;
const BULLET_KIND_DAMAGE_ULTRA = 9;
const BULLET_KIND_RAPID_ULTRA = 10;
const BULLET_KIND_VELOCITY_ULTRA = 11;
const BULLET_KIND_PIERCE_ULTRA = 12;
const BULLET_KIND_HEAVY_ULTRA = 13;
const BULLET_KIND_FORK_ULTRA = 14;
const BULLET_KIND_CHAIN_ULTRA = 15;

export type WeaponUpgradeType =
  'spread' |
  'damage' |
  'rapid' |
  'velocity' |
  'pierce' |
  'heavy' |
  'fork' |
  'chain' |
  'magnet' |
  'wing' |
  'surge' |
  'capacitor' |
  'arsenal' |
  'shield' |
  'pulse' |
  'salvage' |
  'critical';

export class PlayerBulletPool {
  readonly mesh: InstancedMesh;

  private readonly active = new Uint8Array(PLAYER_BULLET_LIMIT);
  private readonly x = new Float32Array(PLAYER_BULLET_LIMIT);
  private readonly y = new Float32Array(PLAYER_BULLET_LIMIT);
  private readonly z = new Float32Array(PLAYER_BULLET_LIMIT);
  private readonly vx = new Float32Array(PLAYER_BULLET_LIMIT);
  private readonly vy = new Float32Array(PLAYER_BULLET_LIMIT);
  private readonly angle = new Float32Array(PLAYER_BULLET_LIMIT);
  private readonly swayStrength = new Float32Array(PLAYER_BULLET_LIMIT);
  private readonly swayPhase = new Float32Array(PLAYER_BULLET_LIMIT);
  private readonly life = new Float32Array(PLAYER_BULLET_LIMIT);
  private readonly damageBonus = new Float32Array(PLAYER_BULLET_LIMIT);
  private readonly radiusBonus = new Float32Array(PLAYER_BULLET_LIMIT);
  private readonly pierceLeft = new Uint8Array(PLAYER_BULLET_LIMIT);
  private readonly bulletKind = new Uint8Array(PLAYER_BULLET_LIMIT);
  private readonly activeIndices = new Uint16Array(PLAYER_BULLET_LIMIT);
  private readonly activePosition = new Uint16Array(PLAYER_BULLET_LIMIT);
  private readonly instanceColorCodes = new Uint32Array(PLAYER_BULLET_LIMIT);
  private readonly trackOffsets = new Float32Array(5);
  private readonly scratchMatrix = new Matrix4();
  private readonly scratchScale = new Vector3();
  private readonly scratchColor = new Color();
  private readonly scratchHitResult: BulletHitResult = {
    hit: false,
    destroyed: false,
    score: 0,
    pickupEnergy: 0,
    x: 0,
    y: 0,
    z: 0
  };
  private fireCooldown = 0;
  private activeBullets = 0;
  private activeIndexCount = 0;
  private colorDirty = false;
  private colorUsagePrepared = false;
  private trackCount = 0;
  private damageLevel = 0;
  private rapidLevel = 0;
  private spreadLevel = 0;
  private velocityLevel = 0;
  private pierceLevel = 0;
  private heavyLevel = 0;
  private forkLevel = 0;
  private chainLevel = 0;
  private magnetLevel = 0;
  private wingLevel = 0;
  private surgeLevel = 0;
  private criticalLevel = 0;
  private volleyCount = 0;
  private nextFreeIndex = 0;
  private cachedDamage = 0;
  private cachedRadius = BULLET_RADIUS;
  private cachedFireRate = 0;
  private cachedSpeed = 0;
  private cachedChainRadius = 0;
  private cachedChainDamage = 0;

  constructor(private readonly config: WeaponDefinition) {
    const geometry = new IcosahedronGeometry(0.105, 0);
    const material = new MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#22cfff',
      emissiveIntensity: 1.85,
      roughness: 0.35,
      metalness: 0.08,
      flatShading: true
    });

    this.mesh = new InstancedMesh(geometry, material, PLAYER_BULLET_LIMIT);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.prepareInstanceColors(0x27d8ff);
    this.updateTrackOffsets();
    this.recalculateCachedStats();
  }

  applyUpgrade(type: WeaponUpgradeType): number {
    if (type === 'damage') {
      this.damageLevel = Math.min(UPGRADE_MAX_LEVEL, this.damageLevel + 1);
    } else if (type === 'rapid') {
      this.rapidLevel = Math.min(UPGRADE_MAX_LEVEL, this.rapidLevel + 1);
    } else if (type === 'spread') {
      this.spreadLevel = Math.min(UPGRADE_MAX_LEVEL, this.spreadLevel + 1);
      this.updateTrackOffsets();
    } else if (type === 'pierce') {
      this.pierceLevel = Math.min(UPGRADE_MAX_LEVEL, this.pierceLevel + 1);
    } else if (type === 'heavy') {
      this.heavyLevel = Math.min(UPGRADE_MAX_LEVEL, this.heavyLevel + 1);
    } else if (type === 'fork') {
      this.forkLevel = Math.min(UPGRADE_MAX_LEVEL, this.forkLevel + 1);
    } else if (type === 'chain') {
      this.chainLevel = Math.min(UPGRADE_MAX_LEVEL, this.chainLevel + 1);
    } else if (type === 'magnet') {
      this.magnetLevel = Math.min(UPGRADE_MAX_LEVEL, this.magnetLevel + 1);
    } else if (type === 'wing') {
      this.wingLevel = Math.min(UPGRADE_MAX_LEVEL, this.wingLevel + 1);
    } else if (type === 'surge') {
      this.surgeLevel = Math.min(UPGRADE_MAX_LEVEL, this.surgeLevel + 1);
    } else if (type === 'critical') {
      this.criticalLevel = Math.min(UPGRADE_MAX_LEVEL, this.criticalLevel + 1);
    } else if (type === 'velocity') {
      this.velocityLevel = Math.min(UPGRADE_MAX_LEVEL, this.velocityLevel + 1);
    }

    this.recalculateCachedStats();
    return this.getWeaponLevel();
  }

  getWeaponLevel(): number {
    return 1 +
      this.damageLevel +
      this.rapidLevel +
      this.spreadLevel +
      this.velocityLevel +
      this.pierceLevel +
      this.heavyLevel +
      this.forkLevel +
      this.chainLevel +
      this.magnetLevel +
      this.wingLevel +
      this.surgeLevel +
      this.criticalLevel;
  }

  update(dt: number, playerPosition: Vector3, firing: boolean, inheritedSideDrift = 0): BulletPoolStats {
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);

    if (firing && this.fireCooldown <= 0) {
      this.spawnVolley(playerPosition, inheritedSideDrift);
      this.fireCooldown = this.getFireRate();
    }

    this.activeBullets = 0;
    this.colorDirty = false;
    let cursor = 0;
    while (cursor < this.activeIndexCount) {
      const i = this.activeIndices[cursor];
      if (this.active[i] === 0) {
        this.untrackActive(i);
        continue;
      }

      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      if (this.swayStrength[i] !== 0) {
        this.x[i] += Math.sin(this.life[i] * 10.5 + this.swayPhase[i]) * this.swayStrength[i] * dt;
      }
      this.life[i] += dt;

      if (this.y[i] > BULLET_TOP_BOUND || this.life[i] > BULLET_MAX_LIFE) {
        this.recycle(i);
        continue;
      }

      this.writeInstance(this.activeBullets, i, this.x[i], this.y[i], this.z[i]);
      this.activeBullets += 1;
      cursor += 1;
    }

    this.mesh.count = this.activeBullets;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.colorDirty && this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }

    return {
      activeBullets: this.activeBullets,
      poolSize: PLAYER_BULLET_LIMIT,
      weaponLevel: this.getWeaponLevel()
    };
  }

  resolveHits(
    hitTest: (out: BulletHitResult, x: number, y: number, z: number, radius: number, damage: number) => void
  ): CollisionResult {
    let hits = 0;
    let destroyed = 0;
    let score = 0;
    let pickupEnergy = 0;
    let impactX = 0;
    let impactY = 0;
    let impactZ = 0;
    let chainBursts = 0;
    let chainX = 0;
    let chainY = 0;
    let chainZ = 0;

    const baseDamage = this.cachedDamage;
    const baseRadius = this.cachedRadius;
    let cursor = 0;
    while (cursor < this.activeIndexCount) {
      const i = this.activeIndices[cursor];
      if (this.active[i] === 0) {
        this.untrackActive(i);
        continue;
      }

      const result = this.scratchHitResult;
      hitTest(result, this.x[i], this.y[i], this.z[i], baseRadius + this.radiusBonus[i], baseDamage + this.damageBonus[i]);
      if (!result.hit) {
        cursor += 1;
        continue;
      }

      if (hits === 0) {
        impactX = result.x;
        impactY = result.y;
        impactZ = result.z;
      }
      hits += 1;
      if (result.destroyed) {
        destroyed += 1;
        impactX = result.x;
        impactY = result.y;
        impactZ = result.z;
        if (this.chainLevel > 0) {
          chainBursts += 1;
          chainX += result.x;
          chainY += result.y;
          chainZ += result.z;
        }
      }
      score += result.score;
      pickupEnergy += result.pickupEnergy;
      if (this.pierceLeft[i] > 0) {
        this.pierceLeft[i] -= 1;
        cursor += 1;
      } else {
        this.recycle(i);
      }
    }

    if (chainBursts > 0) {
      chainX /= chainBursts;
      chainY /= chainBursts;
      chainZ /= chainBursts;
    }

    return {
      hits,
      destroyed,
      score,
      pickupEnergy,
      impactX,
      impactY,
      impactZ,
      chainBursts,
      chainX,
      chainY,
      chainZ,
      chainRadius: this.getChainRadius(),
      chainDamage: this.getChainDamage()
    };
  }

  private spawnVolley(playerPosition: Vector3, inheritedSideDrift: number): void {
    this.volleyCount += 1;
    const inertiaDrift = Math.min(Math.max(inheritedSideDrift, -INHERITED_DRIFT_LIMIT), INHERITED_DRIFT_LIMIT);
    const criticalVolley = this.isCriticalVolley();
    const criticalDamage = criticalVolley ? 7 + this.criticalLevel * 4 + (this.criticalLevel >= UPGRADE_MAX_LEVEL ? 14 : 0) : 0;
    const criticalRadius = criticalVolley ? 0.035 + this.criticalLevel * 0.01 + (this.criticalLevel >= UPGRADE_MAX_LEVEL ? 0.08 : 0) : 0;
    const primaryKind = this.getPrimaryBulletKind();
    const primaryUltra = this.isUltraBulletKind(primaryKind);
    const criticalKind = criticalVolley
      ? (this.criticalLevel >= UPGRADE_MAX_LEVEL ? BULLET_KIND_CRITICAL_ULTRA : BULLET_KIND_CRITICAL)
      : primaryKind;
    for (let i = 0; i < this.trackCount; i += 1) {
      const drift = this.trackOffsets[i];
      const forkScale = 1 + this.forkLevel * 0.16 + (this.forkLevel >= UPGRADE_MAX_LEVEL ? 0.24 : 0);
      const sideOffset = drift * 0.62 * forkScale;
      const yOffset = drift === 0 ? 0.94 : 0.42;
      this.spawn(
        playerPosition.x + sideOffset,
        playerPosition.y + yOffset,
        playerPosition.z - Math.abs(drift) * 0.02,
        drift * (0.55 + this.forkLevel * 0.12) + inertiaDrift,
        criticalDamage,
        criticalRadius,
        criticalKind,
        primaryUltra ? 0.18 + Math.abs(drift) * 0.08 : 0,
        this.volleyCount * 0.7 + drift * 2.4
      );
    }

    if (criticalVolley && this.criticalLevel >= UPGRADE_MAX_LEVEL) {
      const echoDamage = 5 + this.criticalLevel * 1.6;
      this.spawn(playerPosition.x - 0.52, playerPosition.y + 0.78, playerPosition.z + 0.03, -0.28 + inertiaDrift * 0.36, echoDamage, 0.035, BULLET_KIND_CRITICAL_ULTRA, 0.24, this.volleyCount * 0.9);
      this.spawn(playerPosition.x + 0.52, playerPosition.y + 0.78, playerPosition.z + 0.03, 0.28 + inertiaDrift * 0.36, echoDamage, 0.035, BULLET_KIND_CRITICAL_ULTRA, 0.24, this.volleyCount * 0.9 + Math.PI);
    }

    if (this.spreadLevel >= UPGRADE_MAX_LEVEL) {
      const fanDrift = 1.18 + this.forkLevel * 0.09;
      const fanDamage = 2.6 + this.damageLevel * 0.72;
      this.spawn(playerPosition.x - 0.86, playerPosition.y + 0.35, playerPosition.z - 0.06, -fanDrift * 0.62 + inertiaDrift * 0.7, fanDamage, 0.02, BULLET_KIND_SPREAD_ULTRA, 0.18, this.volleyCount * 0.55);
      this.spawn(playerPosition.x + 0.86, playerPosition.y + 0.35, playerPosition.z - 0.06, fanDrift * 0.62 + inertiaDrift * 0.7, fanDamage, 0.02, BULLET_KIND_SPREAD_ULTRA, 0.18, this.volleyCount * 0.55 + Math.PI);
      this.spawn(playerPosition.x - 1.46, playerPosition.y + 0.16, playerPosition.z - 0.1, -fanDrift + inertiaDrift * 0.78, fanDamage, 0.025, BULLET_KIND_SPREAD_ULTRA, 0.3, this.volleyCount * 0.7 + 1.2);
      this.spawn(playerPosition.x + 1.46, playerPosition.y + 0.16, playerPosition.z - 0.1, fanDrift + inertiaDrift * 0.78, fanDamage, 0.025, BULLET_KIND_SPREAD_ULTRA, 0.3, this.volleyCount * 0.7 - 1.2);
    }

    if (this.wingLevel > 0) {
      const wingPairs = this.wingLevel >= UPGRADE_MAX_LEVEL ? 3 : Math.min(2, this.wingLevel);
      const wingKind = this.wingLevel >= UPGRADE_MAX_LEVEL ? BULLET_KIND_WING_ULTRA : BULLET_KIND_WING;
      for (let pair = 0; pair < wingPairs; pair += 1) {
        const offset = 1.12 + pair * 0.34 + this.wingLevel * 0.04;
        const drift = 0.92 + pair * 0.16 + this.forkLevel * 0.08;
        const bonusDamage = 1.5 + this.wingLevel + (this.wingLevel >= UPGRADE_MAX_LEVEL ? 4 : 0);
        const yStep = this.wingLevel >= UPGRADE_MAX_LEVEL ? pair * 0.12 : 0;
        const wingSway = this.wingLevel >= UPGRADE_MAX_LEVEL ? 0.16 + pair * 0.06 : 0;
        this.spawn(playerPosition.x - offset, playerPosition.y + 0.34 + yStep, playerPosition.z - 0.05, -drift + inertiaDrift * 0.72, bonusDamage, 0.01, wingKind, wingSway, this.volleyCount * 0.64 + pair);
        this.spawn(playerPosition.x + offset, playerPosition.y + 0.34 + yStep, playerPosition.z - 0.05, drift + inertiaDrift * 0.72, bonusDamage, 0.01, wingKind, wingSway, this.volleyCount * 0.64 + pair + Math.PI);
      }
    }

    if (this.surgeLevel > 0) {
      const cadence = this.surgeLevel >= UPGRADE_MAX_LEVEL ? 2 : Math.max(2, 5 - this.surgeLevel);
      if (this.volleyCount % cadence === 0) {
        this.spawn(
          playerPosition.x,
          playerPosition.y + 1.18,
          playerPosition.z + 0.02,
          inertiaDrift * 0.46,
          10 + this.surgeLevel * 4 + (this.surgeLevel >= UPGRADE_MAX_LEVEL ? 16 : 0),
          0.07 + (this.surgeLevel >= UPGRADE_MAX_LEVEL ? 0.08 : 0),
          this.surgeLevel >= UPGRADE_MAX_LEVEL ? BULLET_KIND_SURGE_ULTRA : BULLET_KIND_SURGE,
          this.surgeLevel >= UPGRADE_MAX_LEVEL ? 0.12 : 0,
          this.volleyCount * 0.8
        );
        if (this.surgeLevel >= UPGRADE_MAX_LEVEL) {
          const sideDamage = 7 + this.surgeLevel * 2.4;
          this.spawn(playerPosition.x - 0.5, playerPosition.y + 0.88, playerPosition.z - 0.02, -0.32 + inertiaDrift * 0.34, sideDamage, 0.035, BULLET_KIND_SURGE_ULTRA, 0.22, this.volleyCount * 0.8 + 0.8);
          this.spawn(playerPosition.x + 0.5, playerPosition.y + 0.88, playerPosition.z - 0.02, 0.32 + inertiaDrift * 0.34, sideDamage, 0.035, BULLET_KIND_SURGE_ULTRA, 0.22, this.volleyCount * 0.8 - 0.8);
        }
      }
    }
  }

  private spawn(
    x: number,
    y: number,
    z: number,
    sideDrift: number,
    damageBonus = 0,
    radiusBonus = 0,
    bulletKind = 0,
    swayStrength = 0,
    swayPhase = 0
  ): void {
    const index = this.findInactive();
    if (index === -1) {
      return;
    }

    this.active[index] = 1;
    this.x[index] = x;
    this.y[index] = y;
    this.z[index] = z;
    this.vx[index] = sideDrift;
    this.vy[index] = this.getSpeed();
    this.angle[index] = Math.atan2(this.vx[index], this.vy[index]);
    this.swayStrength[index] = swayStrength;
    this.swayPhase[index] = swayPhase;
    this.life[index] = 0;
    this.damageBonus[index] = damageBonus;
    this.radiusBonus[index] = radiusBonus;
    this.bulletKind[index] = bulletKind;
    this.pierceLeft[index] = Math.min(this.pierceLevel >= UPGRADE_MAX_LEVEL ? 5 : 3, this.pierceLevel);
    this.trackActive(index);

    if (sideDrift !== 0) {
      this.x[index] += sideDrift * 0.08;
    }
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
    this.angle[index] = 0;
    this.swayStrength[index] = 0;
    this.swayPhase[index] = 0;
    this.life[index] = 0;
    this.damageBonus[index] = 0;
    this.radiusBonus[index] = 0;
    this.bulletKind[index] = 0;
    this.pierceLeft[index] = 0;
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

  private findInactive(): number {
    for (let offset = 0; offset < PLAYER_BULLET_LIMIT; offset += 1) {
      const i = (this.nextFreeIndex + offset) % PLAYER_BULLET_LIMIT;
      if (this.active[i] === 0) {
        this.nextFreeIndex = (i + 1) % PLAYER_BULLET_LIMIT;
        return i;
      }
    }
    return -1;
  }

  private writeInstance(instanceIndex: number, bulletIndex: number, x: number, y: number, z: number): void {
    const pulse = 1 + Math.sin((this.life[bulletIndex] + bulletIndex * 0.17) * 18) * 0.08;
    const kind = this.bulletKind[bulletIndex];
    const ultraPulse = 1 + Math.sin((this.life[bulletIndex] + bulletIndex * 0.11) * 30) * 0.12;
    const heavyScale = 1 + this.heavyLevel * 0.12;
    const pierceStretch = this.pierceLeft[bulletIndex] > 0 ? 1.18 : 1;
    let width = 0.78;
    let height = 1.72;
    let depth = 0.78;

    if (kind === BULLET_KIND_WING) {
      width = 0.54;
      height = 1.24;
      depth = 0.54;
    } else if (kind === BULLET_KIND_SURGE) {
      width = 0.7;
      height = 2.32;
      depth = 0.7;
    } else if (kind === BULLET_KIND_CRITICAL) {
      width = 1.12;
      height = 1.42;
      depth = 1.12;
    } else if (kind === BULLET_KIND_SPREAD_ULTRA) {
      width = 0.96;
      height = 1.02;
      depth = 0.46;
    } else if (kind === BULLET_KIND_WING_ULTRA) {
      width = 0.52;
      height = 1.92;
      depth = 0.78;
    } else if (kind === BULLET_KIND_SURGE_ULTRA) {
      width = 1.06;
      height = 3.06;
      depth = 1.06;
    } else if (kind === BULLET_KIND_CRITICAL_ULTRA) {
      width = 1.42;
      height = 1.86;
      depth = 1.42;
    } else if (kind === BULLET_KIND_PRIMARY_ULTRA) {
      width = 0.92;
      height = 2.22;
      depth = 0.92;
    } else if (kind === BULLET_KIND_DAMAGE_ULTRA) {
      width = 1.08;
      height = 2.26;
      depth = 1.08;
    } else if (kind === BULLET_KIND_RAPID_ULTRA) {
      width = 0.54;
      height = 1.58;
      depth = 0.54;
    } else if (kind === BULLET_KIND_VELOCITY_ULTRA) {
      width = 0.46;
      height = 2.96;
      depth = 0.46;
    } else if (kind === BULLET_KIND_PIERCE_ULTRA) {
      width = 0.5;
      height = 3.36;
      depth = 0.42;
    } else if (kind === BULLET_KIND_HEAVY_ULTRA) {
      width = 1.48;
      height = 2.12;
      depth = 1.48;
    } else if (kind === BULLET_KIND_FORK_ULTRA) {
      width = 0.72;
      height = 2.04;
      depth = 0.48;
    } else if (kind === BULLET_KIND_CHAIN_ULTRA) {
      width = 1.08;
      height = 1.6;
      depth = 1.08;
    } else if (this.forkLevel > 0 && Math.abs(this.vx[bulletIndex]) > 0.01) {
      width = 0.62;
      height = 1.88;
      depth = 0.62;
    }

    this.scratchMatrix.makeRotationZ(-this.angle[bulletIndex]);
    const visualPulse = this.isUltraBulletKind(kind) ? ultraPulse : pulse;
    const surgeStretch = kind === BULLET_KIND_SURGE_ULTRA ? 1 + Math.sin(this.life[bulletIndex] * 24) * 0.12 : 1;
    const criticalBurst = kind === BULLET_KIND_CRITICAL_ULTRA ? 1 + Math.sin(this.life[bulletIndex] * 18) * 0.08 : 1;
    const rapidNeedle = kind === BULLET_KIND_RAPID_ULTRA ? 0.86 + Math.sin(this.life[bulletIndex] * 42 + bulletIndex) * 0.08 : 1;
    const railNeedle =
      kind === BULLET_KIND_VELOCITY_ULTRA || kind === BULLET_KIND_PIERCE_ULTRA
        ? 1 + Math.sin(this.life[bulletIndex] * 36 + bulletIndex * 0.3) * 0.09
        : 1;
    const heavyCore = kind === BULLET_KIND_HEAVY_ULTRA ? 1 + Math.sin(this.life[bulletIndex] * 14) * 0.06 : 1;
    const chainCore = kind === BULLET_KIND_CHAIN_ULTRA ? 1 + Math.sin(this.life[bulletIndex] * 22 + bulletIndex) * 0.1 : 1;
    this.scratchScale.set(
      width * visualPulse * heavyScale * criticalBurst * heavyCore * chainCore * rapidNeedle,
      height * visualPulse * heavyScale * pierceStretch * surgeStretch * railNeedle,
      depth * visualPulse * heavyScale * criticalBurst * heavyCore * chainCore * rapidNeedle
    );
    this.scratchMatrix.scale(this.scratchScale);
    this.scratchMatrix.setPosition(x, y, z + 0.05);
    this.mesh.setMatrixAt(instanceIndex, this.scratchMatrix);
    const colorCode = this.getBulletColorCode(bulletIndex);
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

  private getFireRate(): number {
    return this.cachedFireRate;
  }

  private prepareInstanceColors(colorCode: number): void {
    this.scratchColor.setHex(colorCode);
    for (let i = 0; i < PLAYER_BULLET_LIMIT; i += 1) {
      this.mesh.setColorAt(i, this.scratchColor);
    }
    this.instanceColorCodes.fill(colorCode);
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.setUsage(DynamicDrawUsage);
      this.mesh.instanceColor.needsUpdate = true;
      this.colorUsagePrepared = true;
    }
  }

  private getSpeed(): number {
    return this.cachedSpeed;
  }

  private getChainRadius(): number {
    return this.cachedChainRadius;
  }

  private getChainDamage(): number {
    return this.cachedChainDamage;
  }

  private recalculateCachedStats(): void {
    this.cachedDamage =
      this.config.damage +
      this.damageLevel * 4 +
      this.heavyLevel * 3 +
      (this.damageLevel >= UPGRADE_MAX_LEVEL ? 18 : 0) +
      (this.heavyLevel >= UPGRADE_MAX_LEVEL ? 12 : 0);
    this.cachedRadius =
      BULLET_RADIUS +
      this.heavyLevel * 0.035 +
      (this.heavyLevel >= UPGRADE_MAX_LEVEL ? 0.08 : 0);
    const minimumFireRate = this.rapidLevel >= UPGRADE_MAX_LEVEL ? 0.044 : 0.062;
    this.cachedFireRate = Math.max(minimumFireRate, this.config.fireRate * (1 - this.rapidLevel * 0.12));
    const velocityUltra = this.velocityLevel >= UPGRADE_MAX_LEVEL ? 2.6 : 0;
    const heavyPenalty = this.heavyLevel >= UPGRADE_MAX_LEVEL ? 0.12 : 0.35;
    this.cachedSpeed = this.config.speed + this.velocityLevel * 1.4 + velocityUltra - this.heavyLevel * heavyPenalty;
    this.cachedChainRadius = Math.min(
      this.chainLevel >= UPGRADE_MAX_LEVEL ? 4.2 : 3.0,
      1.18 + this.chainLevel * 0.34 + (this.chainLevel >= UPGRADE_MAX_LEVEL ? 0.38 : 0)
    );
    this.cachedChainDamage = 16 + this.chainLevel * 8 + this.damageLevel * 2 + (this.chainLevel >= UPGRADE_MAX_LEVEL ? 24 : 0);
  }

  private isCriticalVolley(): boolean {
    if (this.criticalLevel <= 0) {
      return false;
    }
    const cadence = this.criticalLevel >= UPGRADE_MAX_LEVEL ? 2 : Math.max(3, 7 - this.criticalLevel);
    return this.volleyCount % cadence === 0;
  }

  private getPrimaryBulletKind(): number {
    if (this.chainLevel >= UPGRADE_MAX_LEVEL) {
      return BULLET_KIND_CHAIN_ULTRA;
    }
    if (this.forkLevel >= UPGRADE_MAX_LEVEL) {
      return BULLET_KIND_FORK_ULTRA;
    }
    if (this.pierceLevel >= UPGRADE_MAX_LEVEL) {
      return BULLET_KIND_PIERCE_ULTRA;
    }
    if (this.velocityLevel >= UPGRADE_MAX_LEVEL) {
      return BULLET_KIND_VELOCITY_ULTRA;
    }
    if (this.rapidLevel >= UPGRADE_MAX_LEVEL) {
      return BULLET_KIND_RAPID_ULTRA;
    }
    if (this.heavyLevel >= UPGRADE_MAX_LEVEL) {
      return BULLET_KIND_HEAVY_ULTRA;
    }
    if (this.damageLevel >= UPGRADE_MAX_LEVEL) {
      return BULLET_KIND_DAMAGE_ULTRA;
    }
    return BULLET_KIND_NORMAL;
  }

  private isUltraBulletKind(kind: number): boolean {
    return kind >= BULLET_KIND_SPREAD_ULTRA;
  }

  private getBulletColorCode(bulletIndex: number): number {
    const isPiercing = this.pierceLeft[bulletIndex] > 0;
    const shimmer = Math.floor(this.life[bulletIndex] * 12 + bulletIndex) % 2 === 0;
    const fastShimmer = Math.floor(this.life[bulletIndex] * 20 + bulletIndex) % 2 === 0;
    if (this.bulletKind[bulletIndex] === BULLET_KIND_CRITICAL_ULTRA) {
      return shimmer ? 0xffffff : 0xff3ea5;
    }
    if (this.bulletKind[bulletIndex] === BULLET_KIND_SURGE_ULTRA) {
      return shimmer ? 0xfff1a6 : 0x7defff;
    }
    if (this.bulletKind[bulletIndex] === BULLET_KIND_WING_ULTRA) {
      return shimmer ? 0x7affd6 : 0xff6cff;
    }
    if (this.bulletKind[bulletIndex] === BULLET_KIND_SPREAD_ULTRA) {
      return shimmer ? 0xbdefff : 0x68ffb0;
    }
    if (this.bulletKind[bulletIndex] === BULLET_KIND_PRIMARY_ULTRA) {
      if (this.heavyLevel >= UPGRADE_MAX_LEVEL || this.damageLevel >= UPGRADE_MAX_LEVEL) {
        return shimmer ? 0xfff1a6 : 0xff8a3d;
      }
      if (this.pierceLevel >= UPGRADE_MAX_LEVEL || this.forkLevel >= UPGRADE_MAX_LEVEL) {
        return shimmer ? 0xbdefff : 0x9b5cff;
      }
      if (this.chainLevel >= UPGRADE_MAX_LEVEL) {
        return shimmer ? 0x68ffb0 : 0xfff1a6;
      }
      return shimmer ? 0xd8fbff : 0x27d8ff;
    }
    if (this.bulletKind[bulletIndex] === BULLET_KIND_DAMAGE_ULTRA) {
      return shimmer ? 0xffffff : 0xff3ea5;
    }
    if (this.bulletKind[bulletIndex] === BULLET_KIND_RAPID_ULTRA) {
      return fastShimmer ? 0xfff1a6 : 0x27d8ff;
    }
    if (this.bulletKind[bulletIndex] === BULLET_KIND_VELOCITY_ULTRA) {
      return fastShimmer ? 0xd8fbff : 0x7affd6;
    }
    if (this.bulletKind[bulletIndex] === BULLET_KIND_PIERCE_ULTRA) {
      return shimmer ? 0xbdefff : 0x9b5cff;
    }
    if (this.bulletKind[bulletIndex] === BULLET_KIND_HEAVY_ULTRA) {
      return shimmer ? 0xfff1a6 : 0xff6a2a;
    }
    if (this.bulletKind[bulletIndex] === BULLET_KIND_FORK_ULTRA) {
      return fastShimmer ? 0xbdefff : 0x9b5cff;
    }
    if (this.bulletKind[bulletIndex] === BULLET_KIND_CHAIN_ULTRA) {
      return shimmer ? 0x68ffb0 : 0xfff1a6;
    }
    if (this.bulletKind[bulletIndex] === BULLET_KIND_CRITICAL) {
      return 0xff3ea5;
    }
    if (this.bulletKind[bulletIndex] === BULLET_KIND_SURGE) {
      return 0xfff1a6;
    }
    if (this.bulletKind[bulletIndex] === BULLET_KIND_WING) {
      return 0x7affd6;
    }
    if (this.heavyLevel > 0 && isPiercing) {
      return 0xffd36d;
    }
    if (this.heavyLevel > 0) {
      return 0xff8a3d;
    }
    if (isPiercing) {
      return 0x9b5cff;
    }
    if (this.chainLevel > 0) {
      return 0x68ffb0;
    }
    if (this.forkLevel > 0) {
      return 0xbdefff;
    }
    return 0x27d8ff;
  }

  private updateTrackOffsets(): void {
    const baseCount = this.config.tracks.includes(3) ? 3 : Math.max(1, this.config.tracks[0] ?? 3);
    this.trackCount = Math.max(1, Math.min(5, baseCount + this.spreadLevel));
    this.trackOffsets.fill(0);

    if (this.trackCount === 1) {
      this.trackOffsets[0] = 0;
    } else if (this.trackCount === 2) {
      this.trackOffsets[0] = -0.5;
      this.trackOffsets[1] = 0.5;
    } else if (this.trackCount === 3) {
      this.trackOffsets[0] = 0;
      this.trackOffsets[1] = -0.55;
      this.trackOffsets[2] = 0.55;
    } else if (this.trackCount === 4) {
      this.trackOffsets[0] = -0.75;
      this.trackOffsets[1] = -0.25;
      this.trackOffsets[2] = 0.25;
      this.trackOffsets[3] = 0.75;
    } else {
      this.trackOffsets[0] = 0;
      this.trackOffsets[1] = -0.9;
      this.trackOffsets[2] = -0.45;
      this.trackOffsets[3] = 0.45;
      this.trackOffsets[4] = 0.9;
    }
  }
}
