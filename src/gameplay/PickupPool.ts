import {
  BoxGeometry,
  Color,
  DynamicDrawUsage,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Vector3
} from 'three';

export interface PickupStats {
  activePickups: number;
  pickupPoolSize: number;
  collectedEnergy: number;
  repairedHp: number;
  collectedBombs: number;
}

const PICKUP_LIMIT = 80;
const MOBILE_PICKUP_LIMIT = 48;
const PICKUP_BOTTOM_BOUND = -6.3;
const PICKUP_COLLECT_RADIUS = 0.82;
const PICKUP_MAGNET_RADIUS = 9.5;
const PICKUP_UPGRADE_MAX_LEVEL = 7;

const enum PickupKind {
  Energy = 0,
  Repair = 1,
  Bomb = 2
}

export class PickupPool {
  readonly object = new Group();
  readonly mesh: InstancedMesh;
  readonly markerMesh: InstancedMesh;

  private readonly active = new Uint8Array(PICKUP_LIMIT);
  private readonly x = new Float32Array(PICKUP_LIMIT);
  private readonly y = new Float32Array(PICKUP_LIMIT);
  private readonly z = new Float32Array(PICKUP_LIMIT);
  private readonly vx = new Float32Array(PICKUP_LIMIT);
  private readonly vy = new Float32Array(PICKUP_LIMIT);
  private readonly life = new Float32Array(PICKUP_LIMIT);
  private readonly kind = new Uint8Array(PICKUP_LIMIT);
  private readonly activeIndices = new Uint16Array(PICKUP_LIMIT);
  private readonly activePosition = new Uint16Array(PICKUP_LIMIT);
  private readonly instanceColorCodes = new Uint32Array(PICKUP_LIMIT);
  private readonly markerColorCodes = new Uint32Array(PICKUP_LIMIT);
  private readonly scratchMatrix = new Matrix4();
  private readonly scratchScale = new Vector3();
  private readonly scratchColor = new Color();
  private mobileMode = false;
  private activePickups = 0;
  private activeIndexCount = 0;
  private colorDirty = false;
  private markerColorDirty = false;
  private colorUsagePrepared = false;
  private markerColorUsagePrepared = false;
  private magnetLevel = 0;
  private salvageLevel = 0;
  private nextFreeIndex = 0;

  constructor() {
    const geometry = new IcosahedronGeometry(0.14, 0);
    const material = new MeshStandardMaterial({
      color: '#bdefff',
      emissive: '#27d8ff',
      emissiveIntensity: 1.75,
      roughness: 0.28,
      metalness: 0.12,
      flatShading: true
    });

    this.mesh = new InstancedMesh(geometry, material, PICKUP_LIMIT);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);

    const markerGeometry = new BoxGeometry(0.12, 0.12, 0.12);
    const markerMaterial = new MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#ffffff',
      emissiveIntensity: 1.35,
      roughness: 0.32,
      metalness: 0.06,
      flatShading: true
    });

    this.markerMesh = new InstancedMesh(markerGeometry, markerMaterial, PICKUP_LIMIT);
    this.markerMesh.count = 0;
    this.markerMesh.frustumCulled = false;
    this.markerMesh.instanceMatrix.setUsage(DynamicDrawUsage);

    this.object.add(this.mesh);
    this.object.add(this.markerMesh);
  }

  setMobileMode(enabled: boolean): void {
    if (enabled && !this.mobileMode) {
      this.trimToLimit(MOBILE_PICKUP_LIMIT);
    }
    this.mobileMode = enabled;
  }

  applyMagnetUpgrade(): number {
    this.magnetLevel = Math.min(PICKUP_UPGRADE_MAX_LEVEL, this.magnetLevel + 1);
    return this.magnetLevel;
  }

  applySalvageUpgrade(): number {
    this.salvageLevel = Math.min(PICKUP_UPGRADE_MAX_LEVEL, this.salvageLevel + 1);
    return this.salvageLevel;
  }

  spawnBurst(x: number, y: number, z: number, amount: number): void {
    const salvageUltra = this.salvageLevel >= PICKUP_UPGRADE_MAX_LEVEL;
    const cap = (this.mobileMode ? 8 : 12) + Math.min(salvageUltra ? 8 : 4, this.salvageLevel * 2);
    const count = Math.min(cap, Math.max(0, amount + this.salvageLevel + (salvageUltra ? 2 : 0)));
    for (let i = 0; i < count; i += 1) {
      const angle = i * 2.399 + amount * 0.17;
      const speed = 0.36 + (i % 3) * 0.11;
      this.spawn(
        x + Math.cos(angle) * 0.24,
        y + Math.sin(angle) * 0.18,
        z + 0.08,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 0.22,
        PickupKind.Energy
      );
    }
  }

  spawnRepair(x: number, y: number, z: number): void {
    this.spawn(x - 0.28, y + 0.12, z + 0.1, -0.1, -0.2, PickupKind.Repair);
  }

  spawnBomb(x: number, y: number, z: number): void {
    this.spawn(x + 0.28, y + 0.12, z + 0.1, 0.1, -0.2, PickupKind.Bomb);
  }

  update(dt: number, playerX: number, playerY: number, playerZ: number): PickupStats {
    this.activePickups = 0;
    this.colorDirty = false;
    this.markerColorDirty = false;
    let collectedEnergy = 0;
    let repairedHp = 0;
    let collectedBombs = 0;
    const magnetUltra = this.magnetLevel >= PICKUP_UPGRADE_MAX_LEVEL;
    const salvageUltra = this.salvageLevel >= PICKUP_UPGRADE_MAX_LEVEL;
    const collectRadius = PICKUP_COLLECT_RADIUS + this.magnetLevel * 0.08 + (magnetUltra ? 0.18 : 0);
    const magnetRadius = PICKUP_MAGNET_RADIUS + this.magnetLevel * 1.35 + (magnetUltra ? 2.4 : 0);
    const magnetPull = 7.2 + this.magnetLevel * 1.45 + (magnetUltra ? 3.1 : 0);

    let cursor = 0;
    while (cursor < this.activeIndexCount) {
      const i = this.activeIndices[cursor];
      if (this.active[i] === 0) {
        this.untrackActive(i);
        continue;
      }

      const dx = playerX - this.x[i];
      const dy = playerY - this.y[i];
      const dz = playerZ - this.z[i];
      const distanceSq = dx * dx + dy * dy + dz * dz;

      if (distanceSq < collectRadius * collectRadius) {
        if (this.kind[i] === PickupKind.Repair) {
          repairedHp += 18 + this.salvageLevel * 4 + (salvageUltra ? 12 : 0);
        } else if (this.kind[i] === PickupKind.Bomb) {
          collectedBombs += 1;
        } else {
          collectedEnergy += 1;
        }
        this.recycle(i);
        continue;
      }

      if (distanceSq < magnetRadius * magnetRadius) {
        this.vx[i] += dx * dt * magnetPull;
        this.vy[i] += dy * dt * magnetPull;
      }

      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      this.life[i] += dt;
      this.vx[i] *= 0.985;
      this.vy[i] = this.vy[i] * 0.985 - dt * 0.72;

      if (this.y[i] < PICKUP_BOTTOM_BOUND || this.life[i] > 7.5) {
        this.recycle(i);
        continue;
      }

      this.writeInstance(this.activePickups, i);
      this.activePickups += 1;
      cursor += 1;
    }

    this.mesh.count = this.activePickups;
    this.markerMesh.count = this.activePickups;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.markerMesh.instanceMatrix.needsUpdate = true;
    if (this.colorDirty && this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
    if (this.markerColorDirty && this.markerMesh.instanceColor) {
      this.markerMesh.instanceColor.needsUpdate = true;
    }

    return {
      activePickups: this.activePickups,
      pickupPoolSize: this.mobileMode ? MOBILE_PICKUP_LIMIT : PICKUP_LIMIT,
      collectedEnergy,
      repairedHp,
      collectedBombs
    };
  }

  private spawn(x: number, y: number, z: number, vx: number, vy: number, kind: PickupKind): void {
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
    this.life[index] = 0;
    this.kind[index] = kind;
    this.trackActive(index);
  }

  private findInactive(): number {
    const limit = this.mobileMode ? MOBILE_PICKUP_LIMIT : PICKUP_LIMIT;
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
    for (let i = limit; i < PICKUP_LIMIT; i += 1) {
      if (this.active[i] === 1) {
        this.recycle(i);
      }
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
    this.life[index] = 0;
    this.kind[index] = PickupKind.Energy;
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

  private writeInstance(instanceIndex: number, pickupIndex: number): void {
    const kind = this.kind[pickupIndex];
    const pulse = 1 + Math.sin((this.life[pickupIndex] + pickupIndex * 0.23) * 9) * 0.12;
    let scale = 0.95;
    if (kind === PickupKind.Repair) {
      scale = 1.08;
    } else if (kind === PickupKind.Bomb) {
      scale = 1.24;
    }
    scale += this.salvageLevel * 0.015;
    this.scratchMatrix.makeRotationZ(this.life[pickupIndex] * 1.9 + pickupIndex * 0.03);
    this.scratchScale.set(scale * pulse, scale * pulse, scale * pulse);
    this.scratchMatrix.scale(this.scratchScale);
    this.scratchMatrix.setPosition(this.x[pickupIndex], this.y[pickupIndex], this.z[pickupIndex] + 0.08);
    this.mesh.setMatrixAt(instanceIndex, this.scratchMatrix);
    const colorCode = this.colorCodeForKind(kind);
    if (this.instanceColorCodes[instanceIndex] !== colorCode) {
      this.instanceColorCodes[instanceIndex] = colorCode;
      this.mesh.setColorAt(instanceIndex, this.scratchColor.setHex(colorCode));
      if (!this.colorUsagePrepared && this.mesh.instanceColor) {
        this.mesh.instanceColor.setUsage(DynamicDrawUsage);
        this.colorUsagePrepared = true;
      }
      this.colorDirty = true;
    }

    let markerAngle = 0;
    let markerWidth = 0.18;
    let markerHeight = 1.32;
    let markerDepth = 0.18;
    if (kind === PickupKind.Repair) {
      markerAngle = Math.PI * 0.5;
      markerWidth = 0.22;
      markerHeight = 1.52;
      markerDepth = 0.22;
    } else if (kind === PickupKind.Bomb) {
      markerAngle = Math.PI * 0.25;
      markerWidth = 0.26;
      markerHeight = 1.12;
      markerDepth = 0.26;
    }

    this.scratchMatrix.makeRotationZ(markerAngle + Math.sin(this.life[pickupIndex] * 4) * 0.05);
    this.scratchScale.set(markerWidth * pulse, markerHeight * pulse, markerDepth * pulse);
    this.scratchMatrix.scale(this.scratchScale);
    this.scratchMatrix.setPosition(this.x[pickupIndex], this.y[pickupIndex], this.z[pickupIndex] + 0.2);
    this.markerMesh.setMatrixAt(instanceIndex, this.scratchMatrix);
    const markerColorCode = this.markerColorCodeForKind(kind);
    if (this.markerColorCodes[instanceIndex] !== markerColorCode) {
      this.markerColorCodes[instanceIndex] = markerColorCode;
      this.markerMesh.setColorAt(instanceIndex, this.scratchColor.setHex(markerColorCode));
      if (!this.markerColorUsagePrepared && this.markerMesh.instanceColor) {
        this.markerMesh.instanceColor.setUsage(DynamicDrawUsage);
        this.markerColorUsagePrepared = true;
      }
      this.markerColorDirty = true;
    }
  }

  private colorCodeForKind(kind: PickupKind): number {
    if (kind === PickupKind.Repair) {
      return 0x68ffb0;
    }
    if (kind === PickupKind.Bomb) {
      return 0xff8a3d;
    }
    return 0x27d8ff;
  }

  private markerColorCodeForKind(kind: PickupKind): number {
    if (kind === PickupKind.Repair) {
      return 0xeafff5;
    }
    if (kind === PickupKind.Bomb) {
      return 0xfff1a6;
    }
    return 0xbdefff;
  }
}
