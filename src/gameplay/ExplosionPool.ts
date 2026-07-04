import {
  BoxGeometry,
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

export class ExplosionPool {
  readonly mesh: InstancedMesh;

  private readonly active = new Uint8Array(EXPLOSION_LIMIT);
  private readonly x = new Float32Array(EXPLOSION_LIMIT);
  private readonly y = new Float32Array(EXPLOSION_LIMIT);
  private readonly z = new Float32Array(EXPLOSION_LIMIT);
  private readonly vx = new Float32Array(EXPLOSION_LIMIT);
  private readonly vy = new Float32Array(EXPLOSION_LIMIT);
  private readonly vz = new Float32Array(EXPLOSION_LIMIT);
  private readonly spin = new Float32Array(EXPLOSION_LIMIT);
  private readonly life = new Float32Array(EXPLOSION_LIMIT);
  private readonly scratchMatrix = new Matrix4();
  private readonly scratchScale = new Vector3();
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
  }

  burst(x: number, y: number, z: number): void {
    for (let i = 0; i < 12; i += 1) {
      const index = this.findInactive();
      if (index === -1) {
        return;
      }

      const angle = (Math.PI * 2 * i) / 12;
      const speed = 2.2 + (i % 4) * 0.42;
      this.active[index] = 1;
      this.x[index] = x;
      this.y[index] = y;
      this.z[index] = z + 0.1;
      this.vx[index] = Math.cos(angle) * speed;
      this.vy[index] = Math.sin(angle) * speed * 0.72 + 0.7;
      this.vz[index] = ((i % 3) - 1) * 0.9;
      this.spin[index] = 3.4 + i * 0.37;
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
    const scale = 1 - t * 0.68;
    this.scratchMatrix.makeRotationZ(this.spin[shardIndex] * this.life[shardIndex]);
    this.scratchScale.set(scale, scale * 0.7, scale);
    this.scratchMatrix.scale(this.scratchScale);
    this.scratchMatrix.setPosition(this.x[shardIndex], this.y[shardIndex], this.z[shardIndex]);
    this.mesh.setMatrixAt(instanceIndex, this.scratchMatrix);
  }
}
