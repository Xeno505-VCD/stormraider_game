import {
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Vector3
} from 'three';

export interface BulletPoolStats {
  activeBullets: number;
  poolSize: number;
}

export interface CollisionResult {
  hits: number;
  destroyed: number;
  score: number;
  impactX: number;
  impactY: number;
  impactZ: number;
}

const PLAYER_BULLET_LIMIT = 180;
const FIRE_INTERVAL = 0.12;
const BULLET_SPEED = 14.5;
const BULLET_MAX_LIFE = 1.45;
const BULLET_TOP_BOUND = 7.7;
const BULLET_RADIUS = 0.18;
const BULLET_DAMAGE = 10;

export class PlayerBulletPool {
  readonly mesh: InstancedMesh;

  private readonly active = new Uint8Array(PLAYER_BULLET_LIMIT);
  private readonly x = new Float32Array(PLAYER_BULLET_LIMIT);
  private readonly y = new Float32Array(PLAYER_BULLET_LIMIT);
  private readonly z = new Float32Array(PLAYER_BULLET_LIMIT);
  private readonly vx = new Float32Array(PLAYER_BULLET_LIMIT);
  private readonly vy = new Float32Array(PLAYER_BULLET_LIMIT);
  private readonly life = new Float32Array(PLAYER_BULLET_LIMIT);
  private readonly scratchMatrix = new Matrix4();
  private fireCooldown = 0;
  private activeBullets = 0;

  constructor() {
    const geometry = new IcosahedronGeometry(0.105, 0);
    const material = new MeshStandardMaterial({
      color: '#27d8ff',
      emissive: '#22cfff',
      emissiveIntensity: 1.85,
      roughness: 0.35,
      metalness: 0.08,
      flatShading: true
    });

    this.mesh = new InstancedMesh(geometry, material, PLAYER_BULLET_LIMIT);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
  }

  update(dt: number, playerPosition: Vector3, firing: boolean): BulletPoolStats {
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);

    if (firing && this.fireCooldown <= 0) {
      this.spawnVolley(playerPosition);
      this.fireCooldown = FIRE_INTERVAL;
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

    return {
      activeBullets: this.activeBullets,
      poolSize: PLAYER_BULLET_LIMIT
    };
  }

  resolveHits(
    hitTest: (x: number, y: number, z: number, radius: number, damage: number) => {
      hit: boolean;
      destroyed: boolean;
      score: number;
      x: number;
      y: number;
      z: number;
    }
  ): CollisionResult {
    let hits = 0;
    let destroyed = 0;
    let score = 0;
    let impactX = 0;
    let impactY = 0;
    let impactZ = 0;

    for (let i = 0; i < PLAYER_BULLET_LIMIT; i += 1) {
      if (this.active[i] === 0) {
        continue;
      }

      const result = hitTest(this.x[i], this.y[i], this.z[i], BULLET_RADIUS, BULLET_DAMAGE);
      if (!result.hit) {
        continue;
      }

      hits += 1;
      if (result.destroyed) {
        destroyed += 1;
        impactX = result.x;
        impactY = result.y;
        impactZ = result.z;
      }
      score += result.score;
      this.recycle(i);
    }

    return { hits, destroyed, score, impactX, impactY, impactZ };
  }

  private spawnVolley(playerPosition: Vector3): void {
    this.spawn(playerPosition.x, playerPosition.y + 0.94, playerPosition.z, 0);
    this.spawn(playerPosition.x - 0.34, playerPosition.y + 0.42, playerPosition.z - 0.02, -0.55);
    this.spawn(playerPosition.x + 0.34, playerPosition.y + 0.42, playerPosition.z - 0.02, 0.55);
  }

  private spawn(x: number, y: number, z: number, sideDrift: number): void {
    const index = this.findInactive();
    if (index === -1) {
      return;
    }

    this.active[index] = 1;
    this.x[index] = x;
    this.y[index] = y;
    this.z[index] = z;
    this.vx[index] = sideDrift;
    this.vy[index] = BULLET_SPEED;
    this.life[index] = 0;

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
    this.scratchMatrix.makeScale(0.78 * pulse, 1.72 * pulse, 0.78 * pulse);
    this.scratchMatrix.setPosition(x, y, z + 0.05);
    this.mesh.setMatrixAt(instanceIndex, this.scratchMatrix);
  }
}
