import {
  Color,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial
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

const enum PickupKind {
  Energy = 0,
  Repair = 1,
  Bomb = 2
}

export class PickupPool {
  readonly mesh: InstancedMesh;

  private readonly active = new Uint8Array(PICKUP_LIMIT);
  private readonly x = new Float32Array(PICKUP_LIMIT);
  private readonly y = new Float32Array(PICKUP_LIMIT);
  private readonly z = new Float32Array(PICKUP_LIMIT);
  private readonly vx = new Float32Array(PICKUP_LIMIT);
  private readonly vy = new Float32Array(PICKUP_LIMIT);
  private readonly life = new Float32Array(PICKUP_LIMIT);
  private readonly kind = new Uint8Array(PICKUP_LIMIT);
  private readonly scratchMatrix = new Matrix4();
  private readonly scratchColor = new Color();
  private mobileMode = false;
  private activePickups = 0;

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
  }

  setMobileMode(enabled: boolean): void {
    this.mobileMode = enabled;
  }

  spawnBurst(x: number, y: number, z: number, amount: number): void {
    const count = Math.min(this.mobileMode ? 8 : 12, Math.max(0, amount));
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
    let collectedEnergy = 0;
    let repairedHp = 0;
    let collectedBombs = 0;

    for (let i = 0; i < PICKUP_LIMIT; i += 1) {
      if (this.active[i] === 0) {
        continue;
      }

      const dx = playerX - this.x[i];
      const dy = playerY - this.y[i];
      const dz = playerZ - this.z[i];
      const distanceSq = dx * dx + dy * dy + dz * dz;

      if (distanceSq < PICKUP_COLLECT_RADIUS * PICKUP_COLLECT_RADIUS) {
        if (this.kind[i] === PickupKind.Repair) {
          repairedHp += 18;
        } else if (this.kind[i] === PickupKind.Bomb) {
          collectedBombs += 1;
        } else {
          collectedEnergy += 1;
        }
        this.recycle(i);
        continue;
      }

      if (distanceSq < PICKUP_MAGNET_RADIUS * PICKUP_MAGNET_RADIUS) {
        this.vx[i] += dx * dt * 7.2;
        this.vy[i] += dy * dt * 7.2;
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
    }

    this.mesh.count = this.activePickups;
    this.mesh.instanceMatrix.needsUpdate = true;

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
  }

  private findInactive(): number {
    const limit = this.mobileMode ? MOBILE_PICKUP_LIMIT : PICKUP_LIMIT;
    for (let i = 0; i < limit; i += 1) {
      if (this.active[i] === 0) {
        return i;
      }
    }
    return -1;
  }

  private recycle(index: number): void {
    this.active[index] = 0;
    this.x[index] = 0;
    this.y[index] = 0;
    this.z[index] = 0;
    this.vx[index] = 0;
    this.vy[index] = 0;
    this.life[index] = 0;
    this.kind[index] = PickupKind.Energy;
  }

  private writeInstance(instanceIndex: number, pickupIndex: number): void {
    const pulse = 1 + Math.sin((this.life[pickupIndex] + pickupIndex * 0.23) * 9) * 0.12;
    const scale = this.kind[pickupIndex] === PickupKind.Energy ? 0.95 : 1.18;
    this.scratchMatrix.makeScale(scale * pulse, scale * pulse, scale * pulse);
    this.scratchMatrix.setPosition(this.x[pickupIndex], this.y[pickupIndex], this.z[pickupIndex] + 0.08);
    this.mesh.setMatrixAt(instanceIndex, this.scratchMatrix);
    this.mesh.setColorAt(instanceIndex, this.colorForKind(this.kind[pickupIndex]));
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  private colorForKind(kind: PickupKind): Color {
    if (kind === PickupKind.Repair) {
      return this.scratchColor.set('#68ffb0');
    }
    if (kind === PickupKind.Bomb) {
      return this.scratchColor.set('#ff8a3d');
    }
    return this.scratchColor.set('#27d8ff');
  }
}
