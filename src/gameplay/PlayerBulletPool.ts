import {
  Color,
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

const PLAYER_BULLET_LIMIT = 180;
const BULLET_MAX_LIFE = 1.45;
const BULLET_TOP_BOUND = 7.7;
const BULLET_RADIUS = 0.18;

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
  private readonly life = new Float32Array(PLAYER_BULLET_LIMIT);
  private readonly damageBonus = new Float32Array(PLAYER_BULLET_LIMIT);
  private readonly radiusBonus = new Float32Array(PLAYER_BULLET_LIMIT);
  private readonly pierceLeft = new Uint8Array(PLAYER_BULLET_LIMIT);
  private readonly bulletKind = new Uint8Array(PLAYER_BULLET_LIMIT);
  private readonly trackOffsets = new Float32Array(5);
  private readonly scratchMatrix = new Matrix4();
  private readonly scratchColor = new Color();
  private fireCooldown = 0;
  private activeBullets = 0;
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
    this.updateTrackOffsets();
  }

  applyUpgrade(type: WeaponUpgradeType): number {
    if (type === 'damage') {
      this.damageLevel += 1;
    } else if (type === 'rapid') {
      this.rapidLevel += 1;
    } else if (type === 'spread') {
      this.spreadLevel += 1;
      this.updateTrackOffsets();
    } else if (type === 'pierce') {
      this.pierceLevel += 1;
    } else if (type === 'heavy') {
      this.heavyLevel += 1;
    } else if (type === 'fork') {
      this.forkLevel += 1;
    } else if (type === 'chain') {
      this.chainLevel += 1;
    } else if (type === 'magnet') {
      this.magnetLevel += 1;
    } else if (type === 'wing') {
      this.wingLevel += 1;
    } else if (type === 'surge') {
      this.surgeLevel += 1;
    } else if (type === 'critical') {
      this.criticalLevel += 1;
    } else if (type === 'velocity') {
      this.velocityLevel += 1;
    }

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

  update(dt: number, playerPosition: Vector3, firing: boolean): BulletPoolStats {
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);

    if (firing && this.fireCooldown <= 0) {
      this.spawnVolley(playerPosition);
      this.fireCooldown = this.getFireRate();
    }

    this.activeBullets = 0;
    for (let i = 0; i < PLAYER_BULLET_LIMIT; i += 1) {
      if (this.active[i] === 0) {
        continue;
      }

      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      this.life[i] += dt;

      if (this.y[i] > BULLET_TOP_BOUND || this.life[i] > BULLET_MAX_LIFE) {
        this.recycle(i);
        continue;
      }

      this.writeInstance(this.activeBullets, i, this.x[i], this.y[i], this.z[i]);
      this.activeBullets += 1;
    }

    this.mesh.count = this.activeBullets;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }

    return {
      activeBullets: this.activeBullets,
      poolSize: PLAYER_BULLET_LIMIT,
      weaponLevel: this.getWeaponLevel()
    };
  }

  resolveHits(
    hitTest: (x: number, y: number, z: number, radius: number, damage: number) => {
      hit: boolean;
      destroyed: boolean;
      score: number;
      pickupEnergy: number;
      x: number;
      y: number;
      z: number;
    }
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

    for (let i = 0; i < PLAYER_BULLET_LIMIT; i += 1) {
      if (this.active[i] === 0) {
        continue;
      }

      const result = hitTest(this.x[i], this.y[i], this.z[i], this.getRadius(i), this.getDamage(i));
      if (!result.hit) {
        continue;
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

  private spawnVolley(playerPosition: Vector3): void {
    this.volleyCount += 1;
    const criticalVolley = this.isCriticalVolley();
    const criticalDamage = criticalVolley ? 7 + this.criticalLevel * 4 : 0;
    const criticalRadius = criticalVolley ? 0.035 + this.criticalLevel * 0.01 : 0;
    const criticalKind = criticalVolley ? 3 : 0;
    for (let i = 0; i < this.trackCount; i += 1) {
      const drift = this.trackOffsets[i];
      const forkScale = 1 + this.forkLevel * 0.16;
      const sideOffset = drift * 0.62 * forkScale;
      const yOffset = drift === 0 ? 0.94 : 0.42;
      this.spawn(
        playerPosition.x + sideOffset,
        playerPosition.y + yOffset,
        playerPosition.z - Math.abs(drift) * 0.02,
        drift * (0.55 + this.forkLevel * 0.12),
        criticalDamage,
        criticalRadius,
        criticalKind
      );
    }

    if (this.wingLevel > 0) {
      const wingPairs = Math.min(2, this.wingLevel);
      for (let pair = 0; pair < wingPairs; pair += 1) {
        const offset = 1.12 + pair * 0.34 + this.wingLevel * 0.04;
        const drift = 0.92 + pair * 0.16 + this.forkLevel * 0.08;
        const bonusDamage = 1.5 + this.wingLevel;
        this.spawn(playerPosition.x - offset, playerPosition.y + 0.34, playerPosition.z - 0.05, -drift, bonusDamage, 0.01, 1);
        this.spawn(playerPosition.x + offset, playerPosition.y + 0.34, playerPosition.z - 0.05, drift, bonusDamage, 0.01, 1);
      }
    }

    if (this.surgeLevel > 0) {
      const cadence = Math.max(2, 5 - this.surgeLevel);
      if (this.volleyCount % cadence === 0) {
        this.spawn(
          playerPosition.x,
          playerPosition.y + 1.18,
          playerPosition.z + 0.02,
          0,
          10 + this.surgeLevel * 4,
          0.07,
          2
        );
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
    bulletKind = 0
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
    this.life[index] = 0;
    this.damageBonus[index] = damageBonus;
    this.radiusBonus[index] = radiusBonus;
    this.bulletKind[index] = bulletKind;
    this.pierceLeft[index] = Math.min(3, this.pierceLevel);

    if (sideDrift !== 0) {
      this.x[index] += sideDrift * 0.08;
    }
  }

  private recycle(index: number): void {
    this.active[index] = 0;
    this.x[index] = 0;
    this.y[index] = 0;
    this.z[index] = 0;
    this.vx[index] = 0;
    this.vy[index] = 0;
    this.life[index] = 0;
    this.damageBonus[index] = 0;
    this.radiusBonus[index] = 0;
    this.bulletKind[index] = 0;
    this.pierceLeft[index] = 0;
  }

  private findInactive(): number {
    for (let i = 0; i < PLAYER_BULLET_LIMIT; i += 1) {
      if (this.active[i] === 0) {
        return i;
      }
    }
    return -1;
  }

  private writeInstance(instanceIndex: number, bulletIndex: number, x: number, y: number, z: number): void {
    const pulse = 1 + Math.sin((this.life[bulletIndex] + bulletIndex * 0.17) * 18) * 0.08;
    const heavyScale = 1 + this.heavyLevel * 0.12;
    const pierceStretch = this.pierceLeft[bulletIndex] > 0 ? 1.18 : 1;
    this.scratchMatrix.makeScale(0.78 * pulse * heavyScale, 1.72 * pulse * heavyScale * pierceStretch, 0.78 * pulse * heavyScale);
    this.scratchMatrix.setPosition(x, y, z + 0.05);
    this.mesh.setMatrixAt(instanceIndex, this.scratchMatrix);
    this.mesh.setColorAt(instanceIndex, this.getBulletColor(bulletIndex));
  }

  private getDamage(index: number): number {
    return this.config.damage + this.damageLevel * 4 + this.heavyLevel * 3 + this.damageBonus[index];
  }

  private getFireRate(): number {
    return Math.max(0.062, this.config.fireRate * (1 - this.rapidLevel * 0.11));
  }

  private getSpeed(): number {
    return this.config.speed + this.velocityLevel * 1.4 - this.heavyLevel * 0.35;
  }

  private getRadius(index: number): number {
    return BULLET_RADIUS + this.heavyLevel * 0.035 + this.radiusBonus[index];
  }

  private getChainRadius(): number {
    return Math.min(3.0, 1.18 + this.chainLevel * 0.34);
  }

  private getChainDamage(): number {
    return 16 + this.chainLevel * 8 + this.damageLevel * 2;
  }

  private isCriticalVolley(): boolean {
    if (this.criticalLevel <= 0) {
      return false;
    }
    const cadence = Math.max(3, 7 - this.criticalLevel);
    return this.volleyCount % cadence === 0;
  }

  private getBulletColor(bulletIndex: number): Color {
    const isPiercing = this.pierceLeft[bulletIndex] > 0;
    if (this.bulletKind[bulletIndex] === 3) {
      return this.scratchColor.setHex(0xff3ea5);
    }
    if (this.bulletKind[bulletIndex] === 2) {
      return this.scratchColor.setHex(0xfff1a6);
    }
    if (this.bulletKind[bulletIndex] === 1) {
      return this.scratchColor.setHex(0x7affd6);
    }
    if (this.heavyLevel > 0 && isPiercing) {
      return this.scratchColor.setHex(0xffd36d);
    }
    if (this.heavyLevel > 0) {
      return this.scratchColor.setHex(0xff8a3d);
    }
    if (isPiercing) {
      return this.scratchColor.setHex(0x9b5cff);
    }
    if (this.chainLevel > 0) {
      return this.scratchColor.setHex(0x68ffb0);
    }
    if (this.forkLevel > 0) {
      return this.scratchColor.setHex(0xbdefff);
    }
    return this.scratchColor.setHex(0x27d8ff);
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
