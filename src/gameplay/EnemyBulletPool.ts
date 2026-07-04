import {
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Vector3
} from 'three';

export interface EnemyBulletStats {
  activeEnemyBullets: number;
  enemyBulletPoolSize: number;
  bulletHits: number;
  bulletDamage: number;
}

const ENEMY_BULLET_LIMIT = 180;
const MOBILE_ENEMY_BULLET_LIMIT = 96;
const BULLET_RADIUS = 0.2;
const PLAYER_RADIUS = 0.58;
const BULLET_BOTTOM_BOUND = -6.2;
const BULLET_SIDE_BOUND = 6.2;
const BULLET_MAX_LIFE = 5.2;

export class EnemyBulletPool {
  readonly mesh: InstancedMesh;

  private readonly active = new Uint8Array(ENEMY_BULLET_LIMIT);
  private readonly x = new Float32Array(ENEMY_BULLET_LIMIT);
  private readonly y = new Float32Array(ENEMY_BULLET_LIMIT);
  private readonly z = new Float32Array(ENEMY_BULLET_LIMIT);
  private readonly vx = new Float32Array(ENEMY_BULLET_LIMIT);
  private readonly vy = new Float32Array(ENEMY_BULLET_LIMIT);
  private readonly life = new Float32Array(ENEMY_BULLET_LIMIT);
  private readonly scratchMatrix = new Matrix4();
  private mobileMode = false;
  private activeBullets = 0;

  constructor() {
    const geometry = new IcosahedronGeometry(0.13, 0);
    const material = new MeshStandardMaterial({
      color: '#ff8a3d',
      emissive: '#ff3ea5',
      emissiveIntensity: 1.5,
      roughness: 0.38,
      metalness: 0.06,
      flatShading: true
    });

    this.mesh = new InstancedMesh(geometry, material, ENEMY_BULLET_LIMIT);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
  }

  setMobileMode(enabled: boolean): void {
    this.mobileMode = enabled;
  }

  spawnBossPattern(x: number, y: number, z: number, phase: number, elapsed: number): void {
    const count = this.mobileMode ? Math.min(phase + 2, 5) : phase * 2 + 3;
    const spread = 0.38 + phase * 0.12;
    const speed = (this.mobileMode ? 2.6 : 3.15) + phase * 0.32;
    const sway = Math.sin(elapsed * 1.7) * 0.18;

    for (let i = 0; i < count; i += 1) {
      const t = count === 1 ? 0 : i / (count - 1) - 0.5;
      const vx = (t * spread + sway) * speed;
      const vy = -speed * (0.82 + Math.abs(t) * 0.18);
      this.spawn(x, y - 0.76, z + 0.08, vx, vy);
    }

    if (phase >= 3 && !this.mobileMode) {
      this.spawn(x - 0.75, y - 0.54, z + 0.08, -0.35, -speed * 1.08);
      this.spawn(x + 0.75, y - 0.54, z + 0.08, 0.35, -speed * 1.08);
    }
  }

  update(dt: number, playerPosition: Vector3): EnemyBulletStats {
    this.activeBullets = 0;
    let bulletHits = 0;
    let bulletDamage = 0;

    for (let i = 0; i < ENEMY_BULLET_LIMIT; i += 1) {
      if (this.active[i] === 0) {
        continue;
      }

      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      this.life[i] += dt;

      if (this.collidesWithPlayer(i, playerPosition)) {
        bulletHits += 1;
        bulletDamage += this.mobileMode ? 7 : 10;
        this.recycle(i);
        continue;
      }

      if (
        this.y[i] < BULLET_BOTTOM_BOUND ||
        Math.abs(this.x[i]) > BULLET_SIDE_BOUND ||
        this.life[i] > BULLET_MAX_LIFE
      ) {
        this.recycle(i);
        continue;
      }

      this.writeInstance(this.activeBullets, i);
      this.activeBullets += 1;
    }

    this.mesh.count = this.activeBullets;
    this.mesh.instanceMatrix.needsUpdate = true;

    return {
      activeEnemyBullets: this.activeBullets,
      enemyBulletPoolSize: this.mobileMode ? MOBILE_ENEMY_BULLET_LIMIT : ENEMY_BULLET_LIMIT,
      bulletHits,
      bulletDamage
    };
  }

  private spawn(x: number, y: number, z: number, vx: number, vy: number): void {
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
  }

  private findInactive(): number {
    const limit = this.mobileMode ? MOBILE_ENEMY_BULLET_LIMIT : ENEMY_BULLET_LIMIT;
    for (let i = 0; i < limit; i += 1) {
      if (this.active[i] === 0) {
        return i;
      }
    }
    return -1;
  }

  private collidesWithPlayer(index: number, playerPosition: Vector3): boolean {
    const hitRadius = BULLET_RADIUS + PLAYER_RADIUS;
    const dx = this.x[index] - playerPosition.x;
    const dy = this.y[index] - playerPosition.y;
    const dz = this.z[index] - playerPosition.z;
    return dx * dx + dy * dy + dz * dz < hitRadius * hitRadius;
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

  private writeInstance(instanceIndex: number, bulletIndex: number): void {
    const pulse = 1 + Math.sin((this.life[bulletIndex] + bulletIndex * 0.11) * 14) * 0.1;
    this.scratchMatrix.makeScale(0.92 * pulse, 1.24 * pulse, 0.92 * pulse);
    this.scratchMatrix.setPosition(this.x[bulletIndex], this.y[bulletIndex], this.z[bulletIndex] + 0.09);
    this.mesh.setMatrixAt(instanceIndex, this.scratchMatrix);
  }
}
