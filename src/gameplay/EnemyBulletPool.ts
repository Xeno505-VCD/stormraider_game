import {
  Color,
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

export interface EnemyBulletClearResult {
  cleared: number;
  x: number;
  y: number;
  z: number;
}

const ENEMY_BULLET_LIMIT = 180;
const MOBILE_ENEMY_BULLET_LIMIT = 96;
const BULLET_RADIUS = 0.18;
const PLAYER_RADIUS = 0.5;
const BULLET_BOTTOM_BOUND = -6.7;
const BULLET_SIDE_BOUND = 6.2;
const BOSS_BULLET_MAX_LIFE = 5.8;
const DRONE_BULLET_MAX_LIFE = 9.2;

const enum EnemyBulletKind {
  Boss = 0,
  Drone = 1,
  Elite = 2,
  BossAmber = 3,
  BossViolet = 4
}

export class EnemyBulletPool {
  readonly mesh: InstancedMesh;

  private readonly active = new Uint8Array(ENEMY_BULLET_LIMIT);
  private readonly x = new Float32Array(ENEMY_BULLET_LIMIT);
  private readonly y = new Float32Array(ENEMY_BULLET_LIMIT);
  private readonly z = new Float32Array(ENEMY_BULLET_LIMIT);
  private readonly vx = new Float32Array(ENEMY_BULLET_LIMIT);
  private readonly vy = new Float32Array(ENEMY_BULLET_LIMIT);
  private readonly life = new Float32Array(ENEMY_BULLET_LIMIT);
  private readonly damage = new Float32Array(ENEMY_BULLET_LIMIT);
  private readonly radius = new Float32Array(ENEMY_BULLET_LIMIT);
  private readonly kind = new Uint8Array(ENEMY_BULLET_LIMIT);
  private readonly scratchMatrix = new Matrix4();
  private readonly scratchColor = new Color();
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

  spawnBossPattern(
    x: number,
    y: number,
    z: number,
    phase: number,
    variant: number,
    elapsed: number,
    playerX: number,
    playerY: number
  ): void {
    if (variant === 11) {
      this.spawnBossLanePattern(x, y, z, phase, elapsed, playerX, playerY);
      return;
    }
    if (variant === 12) {
      this.spawnBossPetalPattern(x, y, z, phase, elapsed, playerX, playerY);
      return;
    }

    this.spawnBossAimedArc(x, y, z, phase, elapsed, playerX, playerY);
  }

  private spawnBossAimedArc(x: number, y: number, z: number, phase: number, elapsed: number, playerX: number, playerY: number): void {
    const count = Math.min(phase + 1, 3);
    const speed = (this.mobileMode ? 1.85 : 2.05) + phase * 0.1;
    const sourceY = y - 0.76;
    const aimX = clamp(playerX - x, -3.7, 3.7);
    const aimY = clamp(playerY - sourceY, -8.5, -1.2);
    const length = Math.max(0.001, Math.hypot(aimX, aimY));
    const baseVx = aimX / length;
    const baseVy = aimY / length;
    const arcStep = this.mobileMode ? 0.22 : 0.26;
    const phaseFan = phase >= 3 && !this.mobileMode ? 0.04 : 0;
    const sway = Math.sin(elapsed * 1.2) * 0.045;

    for (let i = 0; i < count; i += 1) {
      const t = (i + 1) / (count + 1) - 0.5;
      const angle = t * (arcStep + phaseFan) + sway;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const vx = (baseVx * cos - baseVy * sin) * speed;
      const vy = (baseVx * sin + baseVy * cos) * speed;
      this.spawn(x, sourceY, z + 0.08, vx, vy, this.mobileMode ? 4 : 5, BULLET_RADIUS, EnemyBulletKind.Boss);
    }
  }

  private spawnBossLanePattern(x: number, y: number, z: number, phase: number, elapsed: number, playerX: number, playerY: number): void {
    const sourceY = y - 0.82;
    const count = this.mobileMode ? Math.min(phase + 1, 3) : Math.min(phase + 2, 4);
    const spacing = this.mobileMode ? 0.58 : 0.72;
    const waveOffset = Math.sin(elapsed * 1.4) * 0.22;
    const speed = (this.mobileMode ? 1.72 : 1.92) + phase * 0.08;

    for (let i = 0; i < count; i += 1) {
      const t = i - (count - 1) / 2;
      const sourceX = clamp(x + t * spacing, -4.4, 4.4);
      const aimX = clamp(playerX - sourceX, -3.4, 3.4) + waveOffset * Math.sign(t || 1);
      const aimY = clamp(playerY - sourceY, -8.5, -1.3);
      const length = Math.max(0.001, Math.hypot(aimX, aimY));
      const sideBias = t * (this.mobileMode ? 0.035 : 0.05);
      const vx = (aimX / length + sideBias) * speed;
      const vy = (aimY / length) * speed;
      this.spawn(sourceX, sourceY, z + 0.1, vx, vy, this.mobileMode ? 4 : 5, 0.17, EnemyBulletKind.BossAmber);
    }
  }

  private spawnBossPetalPattern(x: number, y: number, z: number, phase: number, elapsed: number, playerX: number, playerY: number): void {
    const sourceY = y - 0.86;
    const count = this.mobileMode ? 3 : phase >= 3 ? 5 : 4;
    const speed = (this.mobileMode ? 1.58 : 1.74) + phase * 0.07;
    const aimX = clamp(playerX - x, -3.2, 3.2);
    const aimY = clamp(playerY - sourceY, -8.4, -1.2);
    const length = Math.max(0.001, Math.hypot(aimX, aimY));
    const baseVx = aimX / length;
    const baseVy = aimY / length;
    const rotate = Math.sin(elapsed * 0.9) * 0.18;
    const arcStep = this.mobileMode ? 0.24 : 0.28;

    for (let i = 0; i < count; i += 1) {
      const mirrored = i % 2 === 0 ? -1 : 1;
      const ring = Math.floor(i / 2) + 1;
      const angle = mirrored * ring * arcStep + rotate;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const vx = (baseVx * cos - baseVy * sin) * speed;
      const vy = (baseVx * sin + baseVy * cos) * speed;
      const sourceX = x + mirrored * Math.min(0.42, ring * 0.18);
      this.spawn(sourceX, sourceY, z + 0.12, vx, vy, this.mobileMode ? 4 : 5, 0.16, EnemyBulletKind.BossViolet);
    }
  }

  spawnEnemyShot(x: number, y: number, z: number, playerX: number, playerY: number, elite: boolean): void {
    const aimX = clamp(playerX - x, -4.2, 4.2);
    const aimY = clamp(playerY - y, -8.2, -0.8);
    const length = Math.max(0.001, Math.hypot(aimX, aimY));
    const speed = elite ? (this.mobileMode ? 1.28 : 1.42) : (this.mobileMode ? 1.1 : 1.24);
    const sway = elite ? 0.12 : 0;
    const vx = (aimX / length) * speed + sway * Math.sign(aimX || 1);
    const vy = (aimY / length) * speed;
    this.spawn(x, y, z, vx, vy, this.mobileMode ? 2 : 3, elite ? 0.15 : 0.13, elite ? EnemyBulletKind.Elite : EnemyBulletKind.Drone);
  }

  clearAll(): EnemyBulletClearResult {
    let cleared = 0;
    let x = 0;
    let y = 0;
    let z = 0;

    for (let i = 0; i < ENEMY_BULLET_LIMIT; i += 1) {
      if (this.active[i] === 0) {
        continue;
      }

      cleared += 1;
      x += this.x[i];
      y += this.y[i];
      z += this.z[i];
      this.recycle(i);
    }

    this.activeBullets = 0;
    this.mesh.count = 0;
    this.mesh.instanceMatrix.needsUpdate = true;

    if (cleared === 0) {
      return { cleared, x: 0, y: 0, z: 0 };
    }

    return {
      cleared,
      x: x / cleared,
      y: y / cleared,
      z: z / cleared
    };
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
        bulletDamage += this.damage[i];
        this.recycle(i);
        continue;
      }

      if (
        this.y[i] < BULLET_BOTTOM_BOUND ||
        Math.abs(this.x[i]) > BULLET_SIDE_BOUND ||
        this.life[i] > this.maxLifeForKind(this.kind[i])
      ) {
        this.recycle(i);
        continue;
      }

      this.writeInstance(this.activeBullets, i);
      this.activeBullets += 1;
    }

    this.mesh.count = this.activeBullets;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }

    return {
      activeEnemyBullets: this.activeBullets,
      enemyBulletPoolSize: this.mobileMode ? MOBILE_ENEMY_BULLET_LIMIT : ENEMY_BULLET_LIMIT,
      bulletHits,
      bulletDamage
    };
  }

  private spawn(x: number, y: number, z: number, vx: number, vy: number, damage: number, radius: number, kind: EnemyBulletKind): void {
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
    this.damage[index] = damage;
    this.radius[index] = radius;
    this.kind[index] = kind;
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
    const hitRadius = this.radius[index] + PLAYER_RADIUS;
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
    this.damage[index] = 0;
    this.radius[index] = 0;
    this.kind[index] = EnemyBulletKind.Boss;
  }

  private maxLifeForKind(kind: EnemyBulletKind): number {
    return kind === EnemyBulletKind.Drone || kind === EnemyBulletKind.Elite
      ? DRONE_BULLET_MAX_LIFE
      : BOSS_BULLET_MAX_LIFE;
  }

  private writeInstance(instanceIndex: number, bulletIndex: number): void {
    const pulse = 1 + Math.sin((this.life[bulletIndex] + bulletIndex * 0.11) * 14) * 0.1;
    const kind = this.kind[bulletIndex];
    const bossBullet = kind === EnemyBulletKind.Boss || kind === EnemyBulletKind.BossAmber || kind === EnemyBulletKind.BossViolet;
    const width = bossBullet ? 0.92 : kind === EnemyBulletKind.Elite ? 0.76 : 0.64;
    const height = bossBullet ? 1.24 : kind === EnemyBulletKind.Elite ? 1.02 : 0.86;
    this.scratchMatrix.makeScale(width * pulse, height * pulse, width * pulse);
    this.scratchMatrix.setPosition(this.x[bulletIndex], this.y[bulletIndex], this.z[bulletIndex] + 0.09);
    this.mesh.setMatrixAt(instanceIndex, this.scratchMatrix);
    this.mesh.setColorAt(instanceIndex, this.colorForKind(kind));
  }

  private colorForKind(kind: EnemyBulletKind): Color {
    if (kind === EnemyBulletKind.BossAmber) {
      return this.scratchColor.set('#ff8a3d');
    }
    if (kind === EnemyBulletKind.BossViolet) {
      return this.scratchColor.set('#b17cff');
    }
    if (kind === EnemyBulletKind.Elite) {
      return this.scratchColor.set('#ff8a3d');
    }
    if (kind === EnemyBulletKind.Drone) {
      return this.scratchColor.set('#9b5cff');
    }
    return this.scratchColor.set('#ff3ea5');
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
