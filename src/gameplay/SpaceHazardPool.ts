import {
  BoxGeometry,
  Color,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Vector3
} from 'three';

export interface HazardStats {
  activeHazards: number;
  hazardPoolSize: number;
  playerHits: number;
  playerDamage: number;
}

export interface HazardHitResult {
  hit: boolean;
  destroyed: boolean;
  score: number;
  pickupEnergy: number;
  x: number;
  y: number;
  z: number;
}

export interface HazardEvent {
  type: 'asteroid' | 'transport';
  x: number;
  y: number;
  z: number;
  radius: number;
  damage: number;
  cooldownCut: number;
  shieldCharge: number;
  pickupEnergy: number;
}

const HAZARD_LIMIT = 40;
const MOBILE_HAZARD_LIMIT = 26;
const HAZARD_TOP_BOUND = 7.8;
const HAZARD_BOTTOM_BOUND = -6.8;
const HAZARD_SIDE_BOUND = 5.85;
const HAZARD_WARNING_TIME = 0.8;
const HAZARD_PLAYER_RADIUS = 0.52;
const HAZARD_EVENT_LIMIT = 16;

const enum HazardKind {
  Asteroid = 0,
  Transport = 1
}

export class SpaceHazardPool {
  readonly object = new Group();
  readonly mesh: InstancedMesh;
  readonly warningMesh: InstancedMesh;

  private readonly active = new Uint8Array(HAZARD_LIMIT);
  private readonly kind = new Uint8Array(HAZARD_LIMIT);
  private readonly x = new Float32Array(HAZARD_LIMIT);
  private readonly y = new Float32Array(HAZARD_LIMIT);
  private readonly z = new Float32Array(HAZARD_LIMIT);
  private readonly vx = new Float32Array(HAZARD_LIMIT);
  private readonly vy = new Float32Array(HAZARD_LIMIT);
  private readonly spin = new Float32Array(HAZARD_LIMIT);
  private readonly rotation = new Float32Array(HAZARD_LIMIT);
  private readonly radius = new Float32Array(HAZARD_LIMIT);
  private readonly hp = new Float32Array(HAZARD_LIMIT);
  private readonly maxHp = new Float32Array(HAZARD_LIMIT);
  private readonly warning = new Float32Array(HAZARD_LIMIT);
  private readonly eventType = new Uint8Array(HAZARD_EVENT_LIMIT);
  private readonly eventX = new Float32Array(HAZARD_EVENT_LIMIT);
  private readonly eventY = new Float32Array(HAZARD_EVENT_LIMIT);
  private readonly eventZ = new Float32Array(HAZARD_EVENT_LIMIT);
  private readonly eventRadius = new Float32Array(HAZARD_EVENT_LIMIT);
  private readonly eventDamage = new Float32Array(HAZARD_EVENT_LIMIT);
  private readonly eventCooldownCut = new Float32Array(HAZARD_EVENT_LIMIT);
  private readonly eventShieldCharge = new Float32Array(HAZARD_EVENT_LIMIT);
  private readonly eventPickupEnergy = new Float32Array(HAZARD_EVENT_LIMIT);
  private readonly scratchMatrix = new Matrix4();
  private readonly scratchScale = new Vector3();
  private readonly scratchColor = new Color();
  private activeHazards = 0;
  private activeWarnings = 0;
  private eventCount = 0;
  private spawnCursor = 0;
  private nextAsteroidAt = 68;
  private nextTransportAt = 48;
  private nextStormAt = 118;
  private mobileMode = false;

  constructor() {
    const hazardGeometry = new IcosahedronGeometry(0.42, 0);
    const hazardMaterial = new MeshStandardMaterial({
      color: '#8792a8',
      emissive: '#1d2638',
      emissiveIntensity: 0.72,
      roughness: 0.58,
      metalness: 0.18,
      flatShading: true
    });
    this.mesh = new InstancedMesh(hazardGeometry, hazardMaterial, HAZARD_LIMIT);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;

    const warningGeometry = new BoxGeometry(0.14, 9.4, 0.08);
    const warningMaterial = new MeshStandardMaterial({
      color: '#ff8a3d',
      emissive: '#ff3ea5',
      emissiveIntensity: 1.55,
      roughness: 0.42,
      metalness: 0.06,
      flatShading: true,
      transparent: true,
      opacity: 0.62
    });
    this.warningMesh = new InstancedMesh(warningGeometry, warningMaterial, HAZARD_LIMIT);
    this.warningMesh.count = 0;
    this.warningMesh.frustumCulled = false;

    this.object.add(this.warningMesh);
    this.object.add(this.mesh);
  }

  setMobileMode(enabled: boolean): void {
    this.mobileMode = enabled;
  }

  update(dt: number, elapsed: number, playerX: number, playerY: number, playerZ: number, weaponLevel: number): HazardStats {
    this.updateDirector(elapsed, weaponLevel);
    this.activeHazards = 0;
    this.activeWarnings = 0;
    let playerHits = 0;
    let playerDamage = 0;

    for (let i = 0; i < HAZARD_LIMIT; i += 1) {
      if (this.active[i] === 0) {
        continue;
      }

      this.warning[i] = Math.max(0, this.warning[i] - dt);
      if (this.warning[i] > 0) {
        this.writeWarning(this.activeWarnings, i);
        this.activeWarnings += 1;
        continue;
      }

      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      this.rotation[i] += this.spin[i] * dt;

      if (this.collidesWithPlayer(i, playerX, playerY, playerZ)) {
        playerHits += 1;
        playerDamage += this.kind[i] === HazardKind.Transport ? 7 : 12;
        if (this.kind[i] === HazardKind.Asteroid) {
          this.recordEvent(i, true);
        }
        this.recycle(i);
        continue;
      }

      if (this.y[i] < HAZARD_BOTTOM_BOUND || Math.abs(this.x[i]) > HAZARD_SIDE_BOUND) {
        this.recycle(i);
        continue;
      }

      this.writeHazard(this.activeHazards, i);
      this.activeHazards += 1;
    }

    this.mesh.count = this.activeHazards;
    this.warningMesh.count = this.activeWarnings;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.warningMesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
    if (this.warningMesh.instanceColor) {
      this.warningMesh.instanceColor.needsUpdate = true;
    }

    return {
      activeHazards: this.activeHazards,
      hazardPoolSize: this.mobileMode ? MOBILE_HAZARD_LIMIT : HAZARD_LIMIT,
      playerHits,
      playerDamage
    };
  }

  hitAt(x: number, y: number, z: number, radius: number, damage: number): HazardHitResult {
    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < HAZARD_LIMIT; i += 1) {
      if (this.active[i] === 0 || this.warning[i] > 0) {
        continue;
      }

      const hitRadius = radius + this.radius[i];
      const dx = this.x[i] - x;
      const dy = this.y[i] - y;
      const dz = this.z[i] - z;
      const distanceSq = dx * dx + dy * dy + dz * dz;
      if (distanceSq < hitRadius * hitRadius && distanceSq < bestDistance) {
        bestDistance = distanceSq;
        bestIndex = i;
      }
    }

    if (bestIndex === -1) {
      return { hit: false, destroyed: false, score: 0, pickupEnergy: 0, x: 0, y: 0, z: 0 };
    }

    this.hp[bestIndex] -= damage;
    if (this.hp[bestIndex] > 0) {
      return {
        hit: true,
        destroyed: false,
        score: 0,
        pickupEnergy: 0,
        x: this.x[bestIndex],
        y: this.y[bestIndex],
        z: this.z[bestIndex]
      };
    }

    const destroyed = this.kind[bestIndex] === HazardKind.Transport;
    const score = destroyed ? 720 : 260;
    const pickupEnergy = destroyed ? 6 : 2;
    const result = {
      hit: true,
      destroyed: true,
      score,
      pickupEnergy,
      x: this.x[bestIndex],
      y: this.y[bestIndex],
      z: this.z[bestIndex]
    };
    this.recordEvent(bestIndex, false);
    this.recycle(bestIndex);
    return result;
  }

  drainEvents(callback: (event: HazardEvent) => void): void {
    for (let i = 0; i < this.eventCount; i += 1) {
      callback({
        type: this.eventType[i] === HazardKind.Transport ? 'transport' : 'asteroid',
        x: this.eventX[i],
        y: this.eventY[i],
        z: this.eventZ[i],
        radius: this.eventRadius[i],
        damage: this.eventDamage[i],
        cooldownCut: this.eventCooldownCut[i],
        shieldCharge: this.eventShieldCharge[i],
        pickupEnergy: this.eventPickupEnergy[i]
      });
    }
    this.eventCount = 0;
  }

  private updateDirector(elapsed: number, weaponLevel: number): void {
    const armed = elapsed >= 58 || weaponLevel >= 7;
    const advanced = elapsed >= 118 || weaponLevel >= 7;
    if (!armed) {
      return;
    }

    if (elapsed >= this.nextAsteroidAt) {
      this.spawnAsteroid(advanced ? 1.24 : 1);
      const interval = advanced ? (this.mobileMode ? 4.2 : 3.3) : (this.mobileMode ? 6.6 : 5.2);
      this.nextAsteroidAt = elapsed + interval + seededRange(this.spawnCursor * 37, -0.7, 1.15);
    }

    if (elapsed >= this.nextTransportAt) {
      this.spawnTransport(elapsed);
      this.nextTransportAt = elapsed + (advanced ? 34 : 42) + seededRange(this.spawnCursor * 19, -5, 7);
    }

    if (advanced && elapsed >= this.nextStormAt) {
      const count = this.mobileMode ? 2 : 3;
      for (let i = 0; i < count; i += 1) {
        this.spawnAsteroid(1.42, i);
      }
      this.nextStormAt = elapsed + (this.mobileMode ? 28 : 22) + seededRange(this.spawnCursor * 23, -4, 5);
    }
  }

  private spawnAsteroid(intensity = 1, lane = 0): void {
    const index = this.findInactive();
    if (index === -1) {
      return;
    }

    const x = seededRange(this.spawnCursor * 11 + lane * 7, -4.5, 4.5);
    const size = seededRange(this.spawnCursor * 13 + lane * 5, 0.74, 1.22) * intensity;
    this.active[index] = 1;
    this.kind[index] = HazardKind.Asteroid;
    this.x[index] = x;
    this.y[index] = HAZARD_TOP_BOUND;
    this.z[index] = -0.36 + (this.spawnCursor % 3) * 0.06;
    this.vx[index] = seededRange(this.spawnCursor * 17, -0.42, 0.42);
    this.vy[index] = -(this.mobileMode ? 2.05 : 2.34) * seededRange(this.spawnCursor * 29, 0.86, 1.14);
    this.spin[index] = seededRange(this.spawnCursor * 31, -1.6, 1.6);
    this.rotation[index] = seededRange(this.spawnCursor * 41, 0, Math.PI * 2);
    this.radius[index] = 0.42 * size;
    this.maxHp[index] = 48 + size * 34;
    this.hp[index] = this.maxHp[index];
    this.warning[index] = HAZARD_WARNING_TIME;
    this.spawnCursor += 1;
  }

  private spawnTransport(elapsed: number): void {
    const index = this.findInactive();
    if (index === -1) {
      return;
    }

    const side = this.spawnCursor % 2 === 0 ? -1 : 1;
    this.active[index] = 1;
    this.kind[index] = HazardKind.Transport;
    this.x[index] = seededRange(this.spawnCursor * 11, -3.9, 3.9);
    this.y[index] = HAZARD_TOP_BOUND + 0.4;
    this.z[index] = -0.2;
    this.vx[index] = side * seededRange(this.spawnCursor * 17, 0.12, 0.34);
    this.vy[index] = -(this.mobileMode ? 1.18 : 1.34);
    this.spin[index] = side * 0.38;
    this.rotation[index] = 0;
    this.radius[index] = 0.62;
    this.maxHp[index] = elapsed >= 120 ? 150 : 110;
    this.hp[index] = this.maxHp[index];
    this.warning[index] = HAZARD_WARNING_TIME * 0.55;
    this.spawnCursor += 1;
  }

  private recordEvent(index: number, collision: boolean): void {
    if (this.eventCount >= HAZARD_EVENT_LIMIT) {
      return;
    }

    const target = this.eventCount;
    const transport = this.kind[index] === HazardKind.Transport;
    this.eventType[target] = this.kind[index];
    this.eventX[target] = this.x[index];
    this.eventY[target] = this.y[index];
    this.eventZ[target] = this.z[index];
    this.eventRadius[target] = transport ? 1.05 : collision ? 1.85 : 2.35;
    this.eventDamage[target] = transport ? 0 : collision ? 55 : 88;
    this.eventCooldownCut[target] = transport ? 0.74 : 1;
    this.eventShieldCharge[target] = transport ? 18 : 0;
    this.eventPickupEnergy[target] = transport ? 7 : 2;
    this.eventCount += 1;
  }

  private collidesWithPlayer(index: number, playerX: number, playerY: number, playerZ: number): boolean {
    const hitRadius = this.radius[index] + HAZARD_PLAYER_RADIUS;
    const dx = this.x[index] - playerX;
    const dy = this.y[index] - playerY;
    const dz = this.z[index] - playerZ;
    return dx * dx + dy * dy + dz * dz < hitRadius * hitRadius;
  }

  private writeHazard(instanceIndex: number, hazardIndex: number): void {
    const asteroid = this.kind[hazardIndex] === HazardKind.Asteroid;
    const hpRatio = this.maxHp[hazardIndex] > 0 ? this.hp[hazardIndex] / this.maxHp[hazardIndex] : 1;
    const flicker = 1 + Math.sin(this.rotation[hazardIndex] * 3.2 + hazardIndex) * 0.06;
    const baseScale = asteroid ? this.radius[hazardIndex] * 2.2 : 1.02;
    this.scratchMatrix.makeRotationZ(this.rotation[hazardIndex]);
    this.scratchScale.set(
      baseScale * (asteroid ? 1.14 : 1.7),
      baseScale * (asteroid ? 0.92 : 0.66),
      baseScale * (asteroid ? 1 : 0.62)
    );
    this.scratchMatrix.scale(this.scratchScale.multiplyScalar(flicker));
    this.scratchMatrix.setPosition(this.x[hazardIndex], this.y[hazardIndex], this.z[hazardIndex]);
    this.mesh.setMatrixAt(instanceIndex, this.scratchMatrix);
    if (asteroid) {
      this.mesh.setColorAt(instanceIndex, this.scratchColor.set(hpRatio < 0.42 ? '#ff8a3d' : '#8792a8'));
    } else {
      this.mesh.setColorAt(instanceIndex, this.scratchColor.set(hpRatio < 0.42 ? '#fff1a6' : '#68ffb0'));
    }
  }

  private writeWarning(instanceIndex: number, hazardIndex: number): void {
    const t = this.warning[hazardIndex] / HAZARD_WARNING_TIME;
    const pulse = 1 + Math.sin(t * Math.PI * 8) * 0.18;
    const asteroid = this.kind[hazardIndex] === HazardKind.Asteroid;
    this.scratchMatrix.identity();
    this.scratchScale.set((asteroid ? 0.9 : 1.25) * pulse, 1, 1);
    this.scratchMatrix.scale(this.scratchScale);
    this.scratchMatrix.setPosition(this.x[hazardIndex], -0.48, -0.82);
    this.warningMesh.setMatrixAt(instanceIndex, this.scratchMatrix);
    this.warningMesh.setColorAt(instanceIndex, this.scratchColor.set(asteroid ? '#ff8a3d' : '#68ffb0'));
  }

  private findInactive(): number {
    const limit = this.mobileMode ? MOBILE_HAZARD_LIMIT : HAZARD_LIMIT;
    for (let i = 0; i < limit; i += 1) {
      if (this.active[i] === 0) {
        return i;
      }
    }
    return -1;
  }

  private recycle(index: number): void {
    this.active[index] = 0;
    this.kind[index] = HazardKind.Asteroid;
    this.x[index] = 0;
    this.y[index] = 0;
    this.z[index] = 0;
    this.vx[index] = 0;
    this.vy[index] = 0;
    this.spin[index] = 0;
    this.rotation[index] = 0;
    this.radius[index] = 0;
    this.hp[index] = 0;
    this.maxHp[index] = 0;
    this.warning[index] = 0;
  }
}

function seededRange(seed: number, min: number, max: number): number {
  const value = Math.sin(seed * 999.13) * 43758.5453;
  const normalized = value - Math.floor(value);
  return min + normalized * (max - min);
}
