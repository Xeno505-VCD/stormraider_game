import {
  BoxGeometry,
  Color,
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

const EXPLOSION_LIMIT = 180;
const EXPLOSION_LIFE = 0.48;

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
  private readonly scratchMatrix = new Matrix4();
  private readonly scratchScale = new Vector3();
  private readonly scratchColor = new Color();
  private activeExplosions = 0;

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
    this.object.add(this.mesh);
  }

  burst(x: number, y: number, z: number, tone: ExplosionBurstTone = 'destroy', intensity = 1): void {
    const count = Math.min(18, Math.max(8, Math.round(12 * intensity)));
    this.spawnShards(x, y, z, count, 2.2 * intensity, this.toneCode(tone), 1);
  }

  spark(x: number, y: number, z: number, tone: ExplosionBurstTone = 'hit'): void {
    this.spawnShards(x, y, z, 5, 1.45, this.toneCode(tone), 0.55);
  }

  private spawnShards(x: number, y: number, z: number, count: number, baseSpeed: number, tone: ExplosionTone, size: number): void {
    for (let i = 0; i < count; i += 1) {
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
    }
  }

  update(dt: number): ExplosionPoolStats {
    this.activeExplosions = 0;

    for (let i = 0; i < EXPLOSION_LIMIT; i += 1) {
      if (this.active[i] === 0) {
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
    }

    this.mesh.count = this.activeExplosions;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }

    return {
      activeExplosions: this.activeExplosions,
      poolSize: EXPLOSION_LIMIT
    };
  }

  private recycle(index: number): void {
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

  private findInactive(): number {
    for (let i = 0; i < EXPLOSION_LIMIT; i += 1) {
      if (this.active[i] === 0) {
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
    this.mesh.setColorAt(instanceIndex, this.colorForTone(this.tone[shardIndex], t));
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

  private colorForTone(tone: ExplosionTone, t: number): Color {
    if (tone === ExplosionTone.Hit) {
      return this.scratchColor.set(t < 0.45 ? '#fff1a6' : '#27d8ff');
    }
    if (tone === ExplosionTone.Skill) {
      return this.scratchColor.set(t < 0.5 ? '#bdefff' : '#9b5cff');
    }
    if (tone === ExplosionTone.Chain) {
      return this.scratchColor.set(t < 0.5 ? '#68ffb0' : '#27d8ff');
    }
    if (tone === ExplosionTone.Damage) {
      return this.scratchColor.set(t < 0.45 ? '#ffb1d6' : '#ff3ea5');
    }
    return this.scratchColor.set(t < 0.45 ? '#fff1a6' : '#ff8a3d');
  }
}
