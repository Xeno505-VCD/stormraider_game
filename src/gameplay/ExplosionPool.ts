import {
  BoxGeometry,
  Color,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Vector3
} from 'three';

export interface ExplosionPoolStats {
  activeExplosions: number;
  poolSize: number;
}

const EXPLOSION_LIMIT = 128;
const EXPLOSION_LIFE = 0.4;

const EXPLOSION_DENSITY_BY_TIER = [0.62, 0.42, 0.26, 0.16] as const;
const EXPLOSION_FRAME_BUDGET_BY_TIER = [48, 32, 22, 14] as const;

const enum ExplosionTone {
  Destroy = 0,
  Hit = 1,
  Skill = 2,
  Chain = 3,
  Damage = 4
}

export type ExplosionBurstTone = 'destroy' | 'hit' | 'skill' | 'chain' | 'damage';

export class ExplosionPool {
  readonly object = new Group();
  readonly mesh: InstancedMesh;

  private readonly active = new Uint8Array(EXPLOSION_LIMIT);
  private readonly x = new Float32Array(EXPLOSION_LIMIT);
  private readonly y = new Float32Array(EXPLOSION_LIMIT);
  private readonly z = new Float32Array(EXPLOSION_LIMIT);
  private readonly vx = new Float32Array(EXPLOSION_LIMIT);
  private readonly vy = new Float32Array(EXPLOSION_LIMIT);
  private readonly vz = new Float32Array(EXPLOSION_LIMIT);
  private readonly spin = new Float32Array(EXPLOSION_LIMIT);
  private readonly tone = new Uint8Array(EXPLOSION_LIMIT);
  private readonly size = new Float32Array(EXPLOSION_LIMIT);
  private readonly life = new Float32Array(EXPLOSION_LIMIT);
  private readonly activeIndices = new Uint16Array(EXPLOSION_LIMIT);
  private readonly activePosition = new Uint16Array(EXPLOSION_LIMIT);
  private readonly instanceColorCodes = new Uint32Array(EXPLOSION_LIMIT);
  private readonly scratchMatrix = new Matrix4();
  private readonly scratchScale = new Vector3();
  private readonly scratchColor = new Color();
  private activeExplosions = 0;
  private activeIndexCount = 0;
  private performanceTier = 0;
  private nextFreeIndex = 0;
  private colorDirty = false;
  private colorUsagePrepared = false;
  private frameShardBudget = EXPLOSION_LIMIT;

  constructor() {
    const geometry = new BoxGeometry(0.16, 0.16, 0.16);
    const material = new MeshStandardMaterial({
      color: '#ff8a3d',
      emissive: '#ff5c14',
      emissiveIntensity: 1.65,
      roughness: 0.48,
      metalness: 0.12,
      flatShading: true
    });

    this.mesh = new InstancedMesh(geometry, material, EXPLOSION_LIMIT);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.prepareInstanceColors(0xff8a3d);
    this.object.add(this.mesh);
  }

  burst(x: number, y: number, z: number, tone: ExplosionBurstTone = 'destroy', intensity = 1): void {
    const density = EXPLOSION_DENSITY_BY_TIER[this.performanceTier] ?? 1;
    const count = Math.min(10, Math.max(3, Math.round(8 * intensity * density)));
    this.spawnShards(x, y, z, count, 2.5 * intensity, this.toneCode(tone), 1.12);
  }

  spark(x: number, y: number, z: number, tone: ExplosionBurstTone = 'hit'): void {
    const density = EXPLOSION_DENSITY_BY_TIER[this.performanceTier] ?? 1;
    this.spawnShards(x, y, z, Math.max(1, Math.round(3 * density)), 1.55, this.toneCode(tone), 0.64);
  }

  setPerformanceTier(tier: number): void {
    this.performanceTier = Math.max(0, Math.min(EXPLOSION_DENSITY_BY_TIER.length - 1, Math.round(tier)));
  }

  beginFrame(): void {
    this.frameShardBudget = EXPLOSION_FRAME_BUDGET_BY_TIER[this.performanceTier] ?? EXPLOSION_LIMIT;
  }

  private spawnShards(x: number, y: number, z: number, count: number, baseSpeed: number, tone: ExplosionTone, size: number): void {
    const spawnCount = Math.min(count, this.frameShardBudget);
    this.frameShardBudget -= spawnCount;
    for (let i = 0; i < spawnCount; i += 1) {
      const index = this.findInactive();
      if (index === -1) {
        return;
      }

      const angle = (Math.PI * 2 * i) / count;
      const speed = baseSpeed + (i % 4) * 0.42;
      this.active[index] = 1;
      this.x[index] = x;
      this.y[index] = y;
      this.z[index] = z + 0.1;
      this.vx[index] = Math.cos(angle) * speed;
      this.vy[index] = Math.sin(angle) * speed * 0.72 + 0.7;
      this.vz[index] = ((i % 3) - 1) * 0.9;
      this.spin[index] = 3.4 + i * 0.37;
      this.tone[index] = tone;
      this.size[index] = size;
      this.life[index] = 0;
      this.trackActive(index);
    }
  }

  update(dt: number): ExplosionPoolStats {
    this.activeExplosions = 0;
    this.colorDirty = false;

    let cursor = 0;
    while (cursor < this.activeIndexCount) {
      const i = this.activeIndices[cursor];
      if (this.active[i] === 0) {
        this.untrackActive(i);
        continue;
      }

      this.life[i] += dt;
      if (this.life[i] >= EXPLOSION_LIFE) {
        this.recycle(i);
        continue;
      }

      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      this.z[i] += this.vz[i] * dt;
      this.vy[i] -= 2.6 * dt;

      this.writeInstance(this.activeExplosions, i);
      this.activeExplosions += 1;
      cursor += 1;
    }

    this.mesh.count = this.activeExplosions;
    if (this.activeExplosions > 0) {
      this.mesh.instanceMatrix.needsUpdate = true;
    }
    if (this.activeExplosions > 0 && this.colorDirty && this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }

    return {
      activeExplosions: this.activeExplosions,
      poolSize: EXPLOSION_LIMIT
    };
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
    this.vz[index] = 0;
    this.spin[index] = 0;
    this.tone[index] = ExplosionTone.Destroy;
    this.size[index] = 0;
    this.life[index] = 0;
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
    for (let offset = 0; offset < EXPLOSION_LIMIT; offset += 1) {
      const i = (this.nextFreeIndex + offset) % EXPLOSION_LIMIT;
      if (this.active[i] === 0) {
        this.nextFreeIndex = (i + 1) % EXPLOSION_LIMIT;
        return i;
      }
    }
    return -1;
  }

  private writeInstance(instanceIndex: number, shardIndex: number): void {
    const t = this.life[shardIndex] / EXPLOSION_LIFE;
    const scale = (1 - t * 0.68) * this.size[shardIndex];
    this.scratchMatrix.makeRotationZ(this.spin[shardIndex] * this.life[shardIndex]);
    this.scratchScale.set(scale, scale * 0.7, scale);
    this.scratchMatrix.scale(this.scratchScale);
    this.scratchMatrix.setPosition(this.x[shardIndex], this.y[shardIndex], this.z[shardIndex]);
    this.mesh.setMatrixAt(instanceIndex, this.scratchMatrix);
    const colorCode = this.colorCodeForTone(this.tone[shardIndex]);
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

  private prepareInstanceColors(colorCode: number): void {
    this.scratchColor.setHex(colorCode);
    for (let i = 0; i < EXPLOSION_LIMIT; i += 1) {
      this.mesh.setColorAt(i, this.scratchColor);
    }
    this.instanceColorCodes.fill(colorCode);
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.setUsage(DynamicDrawUsage);
      this.mesh.instanceColor.needsUpdate = true;
      this.colorUsagePrepared = true;
    }
  }

  private toneCode(tone: ExplosionBurstTone): ExplosionTone {
    if (tone === 'hit') {
      return ExplosionTone.Hit;
    }
    if (tone === 'skill') {
      return ExplosionTone.Skill;
    }
    if (tone === 'chain') {
      return ExplosionTone.Chain;
    }
    if (tone === 'damage') {
      return ExplosionTone.Damage;
    }
    return ExplosionTone.Destroy;
  }

  private colorCodeForTone(tone: ExplosionTone): number {
    if (tone === ExplosionTone.Hit) {
      return 0x27d8ff;
    }
    if (tone === ExplosionTone.Skill) {
      return 0x9b5cff;
    }
    if (tone === ExplosionTone.Chain) {
      return 0x68ffb0;
    }
    if (tone === ExplosionTone.Damage) {
      return 0xff3ea5;
    }
    return 0xff8a3d;
  }
}
