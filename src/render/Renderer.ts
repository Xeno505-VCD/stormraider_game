import {
  AmbientLight,
  BoxGeometry,
  Color,
  ConeGeometry,
  DirectionalLight,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer
} from 'three';
import { EnemyPool } from '../gameplay/EnemyPool';
import { EnemyBulletPool } from '../gameplay/EnemyBulletPool';
import { ExplosionPool } from '../gameplay/ExplosionPool';
import { PickupPool } from '../gameplay/PickupPool';
import { PlayerBulletPool, type BulletPoolStats, type WeaponUpgradeType } from '../gameplay/PlayerBulletPool';
import type { GameConfig } from '../data/GameConfig';
import type { InputState } from '../input/InputRouter';

const PLAYER_LIMIT_X = 4.85;
const PLAYER_MIN_Y = -5.25;
const PLAYER_MAX_Y = 4.05;

export interface RenderStats extends BulletPoolStats {
  activeEnemies: number;
  enemyPoolSize: number;
  hitCount: number;
  destroyedCount: number;
  activeExplosions: number;
  explosionPoolSize: number;
  leakedEnemies: number;
  playerCollisions: number;
  damageTaken: number;
  skillScoreDelta: number;
  skillKills: number;
  bombs: number;
  cooldown1: number;
  cooldown2: number;
  cooldown3: number;
  scoreDelta: number;
  bossActive: boolean;
  bossHp: number;
  bossMaxHp: number;
  bossPhase: number;
  activeEnemyBullets: number;
  enemyBulletPoolSize: number;
  activePickups: number;
  pickupPoolSize: number;
  collectedEnergy: number;
  repairedHp: number;
}

export class Renderer {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(48, 1, 0.1, 140);
  private readonly player = new Group();
  private readonly starField: InstancedMesh;
  private readonly playerBullets: PlayerBulletPool;
  private readonly enemies: EnemyPool;
  private readonly enemyBullets = new EnemyBulletPool();
  private readonly explosions = new ExplosionPool();
  private readonly pickups = new PickupPool();
  private readonly scratchMatrix = new Matrix4();
  private readonly scratchVector = new Vector3();
  private readonly cameraBasePosition = new Vector3(0, -10.2, 12);
  private elapsed = 0;
  private shakeTime = 0;
  private shakeStrength = 0;
  private cooldown1 = 0;
  private cooldown2 = 0;
  private cooldown3 = 0;
  private bombs = 3;
  private bombCapacity = 5;
  private skillCooldownLevel = 0;
  private mobileProfile = false;
  private bossShotCooldown = 0.8;

  constructor(canvas: HTMLCanvasElement, config: GameConfig) {
    this.playerBullets = new PlayerBulletPool(config.playerWeapon);
    this.enemies = new EnemyPool(config.enemies, config.stage);
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.applyDeviceProfile();
    this.renderer.setClearColor(new Color('#070a12'), 1);

    this.camera.position.copy(this.cameraBasePosition);
    this.camera.lookAt(0, 0.4, 0);
    this.scene.add(this.camera);

    this.scene.add(new AmbientLight('#6fcfff', 0.72));
    const keyLight = new DirectionalLight('#b79cff', 3.2);
    keyLight.position.set(4, -3, 8);
    this.scene.add(keyLight);

    this.starField = this.createStarField();
    this.scene.add(this.starField);
    this.scene.add(this.createLaneMarkers());
    this.player = this.createPlayerShip();
    this.scene.add(this.player);
    this.scene.add(this.enemies.mesh);
    this.scene.add(this.enemyBullets.mesh);
    this.scene.add(this.playerBullets.mesh);
    this.scene.add(this.pickups.mesh);
    this.scene.add(this.explosions.mesh);
  }

  resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.applyDeviceProfile();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  renderIdle(): void {
    this.renderer.render(this.scene, this.camera);
  }

  update(dt: number, input: InputState): RenderStats {
    this.elapsed += dt;
    this.cooldown1 = Math.max(0, this.cooldown1 - dt);
    this.cooldown2 = Math.max(0, this.cooldown2 - dt);
    this.cooldown3 = Math.max(0, this.cooldown3 - dt);
    this.bossShotCooldown = Math.max(0, this.bossShotCooldown - dt);
    this.updatePlayer(dt, input);
    const bulletStats = this.playerBullets.update(dt, this.player.position, input.firing);
    const enemyStats = this.enemies.update(
      dt,
      this.elapsed,
      this.player.position.x,
      this.player.position.y,
      this.player.position.z
    );
    const collisionStats = this.playerBullets.resolveHits((x, y, z, radius, damage) =>
      this.enemies.hitAt(x, y, z, radius, damage)
    );
    let chainDestroyed = 0;
    let chainScore = 0;
    let chainPickupEnergy = 0;
    let chainImpactX = collisionStats.chainX;
    let chainImpactY = collisionStats.chainY;
    let chainImpactZ = collisionStats.chainZ;
    if (collisionStats.chainBursts > 0) {
      const chainResult = this.enemies.damageInRadius(
        collisionStats.chainX,
        collisionStats.chainY,
        collisionStats.chainZ,
        collisionStats.chainRadius,
        collisionStats.chainDamage
      );
      chainDestroyed = chainResult.destroyed;
      chainScore = chainResult.score;
      chainPickupEnergy = chainResult.pickupEnergy;
      if (chainDestroyed > 0) {
        chainImpactX = chainResult.x;
        chainImpactY = chainResult.y;
        chainImpactZ = chainResult.z;
      }
    }
    if (collisionStats.destroyed > 0) {
      this.explosions.burst(collisionStats.impactX, collisionStats.impactY, collisionStats.impactZ);
      this.spawnPickupsForEnergy(collisionStats.pickupEnergy, collisionStats.impactX, collisionStats.impactY, collisionStats.impactZ);
      this.shake(0.12, 0.1);
    }
    if (chainDestroyed > 0) {
      this.explosions.burst(chainImpactX, chainImpactY, chainImpactZ);
      this.spawnPickupsForEnergy(chainPickupEnergy, chainImpactX, chainImpactY, chainImpactZ);
      this.shake(0.1, 0.085);
    } else if (collisionStats.hits > 0) {
      this.shake(0.045, 0.035);
    }
    this.resolveEnemyFire();
    this.resolveBossFire(enemyStats, dt);
    const enemyBulletStats = this.enemyBullets.update(dt, this.player.position);
    const pickupStats = this.pickups.update(dt, this.player.position.x, this.player.position.y, this.player.position.z);
    if (pickupStats.collectedBombs > 0) {
      this.bombs = Math.min(this.bombCapacity, this.bombs + pickupStats.collectedBombs);
    }
    const explosionStats = this.explosions.update(dt);
    const damageTaken =
      enemyStats.leaks * (this.mobileProfile ? 4 : 6) +
      enemyStats.collisions * (this.mobileProfile ? 12 : 16) +
      enemyBulletStats.bulletDamage;
    if (damageTaken > 0) {
      this.shake(0.16, 0.16);
    }
    const skillStats = this.resolveSkills(input, enemyStats.activeEnemies, enemyStats.nearPlayerThreats);
    this.updateCameraShake(dt);
    this.updateStars(dt);
    this.renderer.render(this.scene, this.camera);
    return {
      ...bulletStats,
      weaponLevel: bulletStats.weaponLevel + this.skillCooldownLevel + (this.bombCapacity - 5),
      activeEnemies: enemyStats.activeEnemies,
      enemyPoolSize: enemyStats.poolSize,
      hitCount: collisionStats.hits,
      destroyedCount: collisionStats.destroyed + chainDestroyed,
      activeExplosions: explosionStats.activeExplosions,
      explosionPoolSize: explosionStats.poolSize,
      leakedEnemies: enemyStats.leaks,
      playerCollisions: enemyStats.collisions,
      damageTaken,
      skillScoreDelta: skillStats.score,
      skillKills: skillStats.destroyed,
      bombs: this.bombs,
      cooldown1: this.cooldown1,
      cooldown2: this.cooldown2,
      cooldown3: this.cooldown3,
      scoreDelta: collisionStats.score + chainScore,
      bossActive: enemyStats.bossActive,
      bossHp: enemyStats.bossHp,
      bossMaxHp: enemyStats.bossMaxHp,
      bossPhase: enemyStats.bossPhase,
      activeEnemyBullets: enemyBulletStats.activeEnemyBullets,
      enemyBulletPoolSize: enemyBulletStats.enemyBulletPoolSize,
      activePickups: pickupStats.activePickups,
      pickupPoolSize: pickupStats.pickupPoolSize,
      collectedEnergy: pickupStats.collectedEnergy,
      repairedHp: pickupStats.repairedHp
    };
  }

  applyWeaponUpgrade(type: WeaponUpgradeType): number {
    if (type === 'capacitor') {
      this.skillCooldownLevel += 1;
      this.cooldown1 *= 0.82;
      this.cooldown2 *= 0.82;
      this.cooldown3 *= 0.82;
      return this.getDisplayedWeaponLevel();
    }

    if (type === 'arsenal') {
      this.bombCapacity = Math.min(8, this.bombCapacity + 1);
      this.bombs = Math.min(this.bombCapacity, this.bombs + 1);
      return this.getDisplayedWeaponLevel();
    }

    const level = this.playerBullets.applyUpgrade(type);
    if (type === 'magnet') {
      this.pickups.applyMagnetUpgrade();
    }
    return level;
  }

  private resolveBossFire(
    enemyStats: {
      bossActive: boolean;
      bossX: number;
      bossY: number;
      bossZ: number;
      bossPhase: number;
      bossVariant: number;
    },
    dt: number
  ): void {
    if (!enemyStats.bossActive || enemyStats.bossY > 5.25) {
      return;
    }

    if (this.bossShotCooldown > 0) {
      return;
    }

    this.enemyBullets.spawnBossPattern(
      enemyStats.bossX,
      enemyStats.bossY,
      enemyStats.bossZ,
      Math.max(1, enemyStats.bossPhase),
      enemyStats.bossVariant,
      this.elapsed,
      this.player.position.x,
      this.player.position.y
    );
    this.bossShotCooldown = bossPatternCooldown(enemyStats.bossVariant, enemyStats.bossPhase, this.mobileProfile) + dt * 0;
  }

  private resolveEnemyFire(): void {
    this.enemies.drainFireEvents((x, y, z, kind) => {
      this.enemyBullets.spawnEnemyShot(
        x,
        y,
        z,
        this.player.position.x,
        this.player.position.y,
        kind === 'elite'
      );
    });
  }

  private resolveSkills(input: InputState, activeEnemies: number, nearPlayerThreats: number): { destroyed: number; score: number } {
    let destroyed = 0;
    let score = 0;
    const autoSkill2 = input.autoSkills && (nearPlayerThreats > 0 || activeEnemies >= 7) && this.cooldown2 <= 0;
    const autoSkill3 = input.autoSkills && !autoSkill2 && activeEnemies >= 5 && this.cooldown3 <= 0;
    const autoSkill1 = input.autoSkills && !autoSkill2 && !autoSkill3 && activeEnemies >= 2 && this.cooldown1 <= 0;

    if ((input.skill1Pressed || autoSkill1) && this.cooldown1 <= 0) {
      const result = this.enemies.damageInRadius(this.player.position.x, this.player.position.y + 3.2, 0, 1.25, 80);
      this.cooldown1 = 3.5 * this.getSkillCooldownScale();
      destroyed += result.destroyed;
      score += result.score;
      this.spawnPickupsForEnergy(result.pickupEnergy, result.x || this.player.position.x, result.y || this.player.position.y + 3.2, result.z);
      this.spawnSkillBurst(result.x || this.player.position.x, result.y || this.player.position.y + 3.2, result.z);
      this.shake(0.16, 0.12);
    }

    if ((input.skill2Pressed || autoSkill2) && this.cooldown2 <= 0) {
      const result = this.enemies.damageInRadius(this.player.position.x, this.player.position.y, 0, 2.15, 120);
      this.cooldown2 = 5 * this.getSkillCooldownScale();
      destroyed += result.destroyed;
      score += result.score;
      this.spawnPickupsForEnergy(result.pickupEnergy, this.player.position.x, this.player.position.y + 0.2, 0);
      this.spawnSkillBurst(this.player.position.x, this.player.position.y + 0.2, 0);
      this.shake(0.18, 0.14);
    }

    if ((input.skill3Pressed || autoSkill3) && this.cooldown3 <= 0) {
      const result = this.enemies.damageInRadius(this.player.position.x, this.player.position.y + 4.5, 0, 3.6, 40);
      this.cooldown3 = 4.2 * this.getSkillCooldownScale();
      destroyed += result.destroyed;
      score += result.score;
      this.spawnPickupsForEnergy(result.pickupEnergy, result.x || this.player.position.x, result.y || this.player.position.y + 4.5, result.z);
      this.spawnSkillBurst(result.x || this.player.position.x, result.y || this.player.position.y + 4.5, result.z);
      this.shake(0.12, 0.09);
    }

    if (input.bombPressed && this.bombs > 0) {
      const result = this.enemies.clearAll();
      const bulletResult = this.enemyBullets.clearAll();
      this.bombs -= 1;
      destroyed += result.destroyed;
      score += result.score + bulletResult.cleared * 6;
      this.bossShotCooldown = Math.max(this.bossShotCooldown, this.mobileProfile ? 1.2 : 0.9);
      const burstX = result.destroyed > 0 ? result.x : bulletResult.x || this.player.position.x;
      const burstY = result.destroyed > 0 ? result.y : bulletResult.y || this.player.position.y + 2.8;
      const burstZ = result.destroyed > 0 ? result.z : bulletResult.z;
      this.spawnPickupsForEnergy(result.pickupEnergy, burstX, burstY, burstZ);
      this.spawnSkillBurst(burstX, burstY, burstZ);
      this.shake(0.28, 0.26);
    }

    return { destroyed, score };
  }

  private spawnSkillBurst(x: number, y: number, z: number): void {
    this.explosions.burst(x, y, z);
    this.explosions.burst(x + 0.45, y - 0.2, z);
    this.explosions.burst(x - 0.45, y + 0.2, z);
  }

  private getSkillCooldownScale(): number {
    return Math.max(0.68, 1 - this.skillCooldownLevel * 0.09);
  }

  private getDisplayedWeaponLevel(): number {
    return this.playerBullets.getWeaponLevel() + this.skillCooldownLevel + (this.bombCapacity - 5);
  }

  private spawnPickupsForEnergy(energy: number, x: number, y: number, z: number): void {
    if (energy <= 0) {
      return;
    }

    const amount = Math.min(this.mobileProfile ? 8 : 12, energy);
    this.pickups.spawnBurst(x, y, z, amount);
    if (energy >= 3) {
      this.pickups.spawnRepair(x, y, z);
    }
    if (energy >= 10) {
      this.pickups.spawnBomb(x, y, z);
    }
  }

  private shake(duration: number, strength: number): void {
    this.shakeTime = Math.max(this.shakeTime, duration);
    this.shakeStrength = Math.max(this.shakeStrength, strength);
  }

  private updateCameraShake(dt: number): void {
    if (this.shakeTime <= 0) {
      this.camera.position.copy(this.cameraBasePosition);
      return;
    }

    this.shakeTime = Math.max(0, this.shakeTime - dt);
    const fade = this.shakeTime / 0.12;
    const x = Math.sin(this.elapsed * 91.7) * this.shakeStrength * fade;
    const y = Math.cos(this.elapsed * 73.3) * this.shakeStrength * fade;
    this.camera.position.set(
      this.cameraBasePosition.x + x,
      this.cameraBasePosition.y + y,
      this.cameraBasePosition.z
    );
  }

  private updatePlayer(dt: number, input: InputState): void {
    const moveSpeed = 7.5;
    const targetX = this.player.position.x + input.moveX * moveSpeed * dt;
    const targetY = this.player.position.y + input.moveY * moveSpeed * dt;
    this.player.position.x = clamp(targetX, -PLAYER_LIMIT_X, PLAYER_LIMIT_X);
    this.player.position.y = clamp(targetY, PLAYER_MIN_Y, PLAYER_MAX_Y);
    this.player.rotation.z = -input.moveX * 0.24;
    this.player.rotation.x = input.moveY * 0.1;
    this.player.position.z = Math.sin(this.elapsed * 4.2) * 0.08;
  }

  private applyDeviceProfile(): void {
    const mobileProfile = window.innerWidth <= 680 || matchMedia('(pointer: coarse)').matches;
    this.mobileProfile = mobileProfile;
    this.enemies.setMobileMode(mobileProfile);
    this.enemyBullets.setMobileMode(mobileProfile);
    this.pickups.setMobileMode(mobileProfile);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobileProfile ? 1.25 : 1.75));
  }

  private updateStars(dt: number): void {
    const speed = dt * 7;
    for (let i = 0; i < this.starField.count; i += 1) {
      this.starField.getMatrixAt(i, this.scratchMatrix);
      this.scratchVector.setFromMatrixPosition(this.scratchMatrix);
      this.scratchVector.y -= speed * (0.45 + (i % 7) * 0.08);
      if (this.scratchVector.y < -12) {
        this.scratchVector.y = 15;
      }
      this.scratchMatrix.setPosition(this.scratchVector);
      this.starField.setMatrixAt(i, this.scratchMatrix);
    }
    this.starField.instanceMatrix.needsUpdate = true;
  }

  private createPlayerShip(): Group {
    const ship = new Group();
    ship.position.set(0, -5.2, 0);

    const bodyMaterial = new MeshStandardMaterial({
      color: '#27d8ff',
      emissive: '#104f8f',
      emissiveIntensity: 0.6,
      roughness: 0.38,
      metalness: 0.42,
      flatShading: true
    });
    const wingMaterial = new MeshStandardMaterial({
      color: '#9b5cff',
      emissive: '#301070',
      emissiveIntensity: 0.9,
      roughness: 0.45,
      metalness: 0.25,
      flatShading: true
    });
    const engineMaterial = new MeshStandardMaterial({
      color: '#ff8a3d',
      emissive: '#ff5c14',
      emissiveIntensity: 1.7,
      flatShading: true
    });

    const nose = new Mesh(new ConeGeometry(0.48, 1.55, 5), bodyMaterial);
    nose.rotation.x = Math.PI / 2;
    nose.position.y = 0.42;
    ship.add(nose);

    const core = new Mesh(new BoxGeometry(0.74, 1.1, 0.32), bodyMaterial);
    core.position.y = -0.32;
    ship.add(core);

    const leftWing = new Mesh(new BoxGeometry(1.4, 0.22, 0.2), wingMaterial);
    leftWing.position.set(-0.78, -0.44, -0.03);
    leftWing.rotation.z = -0.28;
    ship.add(leftWing);

    const rightWing = leftWing.clone();
    rightWing.position.x = 0.78;
    rightWing.rotation.z = 0.28;
    ship.add(rightWing);

    const engine = new Mesh(new ConeGeometry(0.24, 0.72, 6), engineMaterial);
    engine.rotation.x = -Math.PI / 2;
    engine.position.y = -1.1;
    ship.add(engine);

    return ship;
  }

  private createStarField(): InstancedMesh {
    const geometry = new IcosahedronGeometry(0.035, 0);
    const material = new MeshStandardMaterial({
      color: '#bdefff',
      emissive: '#27d8ff',
      emissiveIntensity: 0.85,
      roughness: 0.7,
      flatShading: true
    });
    const stars = new InstancedMesh(geometry, material, 180);

    for (let i = 0; i < stars.count; i += 1) {
      const x = seededRange(i * 13, -8.2, 8.2);
      const y = seededRange(i * 29, -12, 15);
      const z = seededRange(i * 41, -9, -2.8);
      const scale = seededRange(i * 17, 0.55, 2.4);
      this.scratchMatrix.makeScale(scale, scale, scale);
      this.scratchMatrix.setPosition(x, y, z);
      stars.setMatrixAt(i, this.scratchMatrix);
    }

    return stars;
  }

  private createLaneMarkers(): Group {
    const group = new Group();
    const material = new MeshStandardMaterial({
      color: '#17356a',
      emissive: '#081d50',
      emissiveIntensity: 0.55,
      roughness: 0.8,
      flatShading: true
    });

    for (let i = 0; i < 9; i += 1) {
      const marker = new Mesh(new BoxGeometry(0.03, 22, 0.02), material);
      marker.position.set(-4 + i, 0.5, -5.4);
      marker.rotation.z = Math.sin(i) * 0.02;
      group.add(marker);
    }

    return group;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function seededRange(seed: number, min: number, max: number): number {
  const value = Math.sin(seed * 999.13) * 43758.5453;
  const normalized = value - Math.floor(value);
  return min + normalized * (max - min);
}

function bossPatternCooldown(variant: number, phase: number, mobileProfile: boolean): number {
  const base = variant === 12 ? 3.15 : variant === 11 ? 2.95 : 2.75;
  const minimum = mobileProfile ? 2.45 : 2.18;
  const mobileScale = mobileProfile ? 1.1 : 1;
  return Math.max(minimum, (base - phase * 0.1) * mobileScale);
}
