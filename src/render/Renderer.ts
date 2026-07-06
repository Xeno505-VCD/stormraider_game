import {
  AdditiveBlending,
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
import { EnemyPool, type EnemyRenderSnapshot } from '../gameplay/EnemyPool';
import { EnemyBulletPool } from '../gameplay/EnemyBulletPool';
import { ExplosionPool } from '../gameplay/ExplosionPool';
import { PickupPool } from '../gameplay/PickupPool';
import { PlayerBulletPool, type BulletPoolStats, type WeaponUpgradeType } from '../gameplay/PlayerBulletPool';
import type { GameConfig, ModelDefinition } from '../data/GameConfig';
import type { InputState } from '../input/InputRouter';
import { EnemyModelBatch } from './EnemyModelBatch';

const PLAYER_LIMIT_X = 4.85;
const PLAYER_MIN_Y = -5.25;
const PLAYER_MAX_Y = 4.05;
const PLAYER_VISUAL_HALF_WIDTH = 1.6;
const MOBILE_PLAYER_SCALE = 0.76;
const MOBILE_PLAYER_SCREEN_SAFE_X = 0.92;
const PLAYER_MOVE_SPEED = 7.5;
const MOBILE_PLAYER_MOVE_SPEED = 8.65;
const PLAYER_TRICK_ROLL_DURATION = 0.54;
const MOBILE_PLAYER_TRICK_ROLL_DURATION = 0.48;
const PLAYER_TRICK_ROLL_COOLDOWN = 0.72;
const MOBILE_PLAYER_TRICK_ROLL_COOLDOWN = 0.42;
const PLAYER_TRICK_ROLL_INPUT = 0.86;
const MOBILE_PLAYER_TRICK_ROLL_INPUT = 0.56;
const RENDER_UPGRADE_MAX_LEVEL = 7;

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
  bossJustEntered: boolean;
  bossPhaseChanged: boolean;
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
  private readonly playerProceduralParts: Mesh[] = [];
  private readonly playerFlames: Mesh[] = [];
  private readonly playerFlameBaseScales: Vector3[] = [];
  private readonly playerRollGlints: Mesh[] = [];
  private readonly playerRollGlintBaseScales: Vector3[] = [];
  private readonly starField: InstancedMesh;
  private readonly playerBullets: PlayerBulletPool;
  private readonly enemies: EnemyPool;
  private readonly enemyModelBatch = new EnemyModelBatch();
  private readonly enemyRenderSnapshots: EnemyRenderSnapshot[] = [];
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
  private arsenalLevel = 0;
  private skillCooldownLevel = 0;
  private shieldLevel = 0;
  private pulseLevel = 0;
  private salvageLevel = 0;
  private pulseCooldown = 0;
  private pulseDestroyed = 0;
  private pulseScore = 0;
  private mobileProfile = false;
  private bossShotCooldown = 0.8;
  private playerLimitX = PLAYER_LIMIT_X;
  private bossPresentationActive = false;
  private previousBossPhase = 0;
  private playerRoll = 0;
  private playerPitch = 0;
  private playerYaw = 0;
  private playerStrafe = 0;
  private previousMoveX = 0;
  private trickRollTime = 0;
  private trickRollCooldown = 0;
  private trickRollDirection = 1;

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
    this.camera.updateMatrixWorld();
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
    void this.loadPlayerModel(config.models.player_ship);
    this.scene.add(this.enemies.object);
    this.scene.add(this.enemyModelBatch.object);
    void this.enemyModelBatch.load(config.models).then((loadedVariants) => {
      this.enemies.setModelBackedVariants(loadedVariants);
    }).catch((error) => {
      console.warn('Enemy model batch failed to load. Using procedural enemy fallback.', error);
    });
    this.scene.add(this.enemyBullets.mesh);
    this.scene.add(this.playerBullets.mesh);
    this.scene.add(this.pickups.object);
    this.scene.add(this.explosions.object);
  }

  resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.applyDeviceProfile();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    this.updatePlayerBounds();
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
    this.pulseCooldown = Math.max(0, this.pulseCooldown - dt);
    this.updatePlayer(dt, input);
    const bulletStats = this.playerBullets.update(dt, this.player.position, input.firing);
    const enemyStats = this.enemies.update(
      dt,
      this.elapsed,
      this.player.position.x,
      this.player.position.y,
      this.player.position.z
    );
    const enemyRenderCount = this.enemies.writeRenderSnapshots(this.enemyRenderSnapshots, this.elapsed);
    this.enemyModelBatch.update(this.enemyRenderSnapshots, enemyRenderCount);
    const bossPresentation = this.resolveBossPresentation(enemyStats);
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
      this.explosions.burst(collisionStats.impactX, collisionStats.impactY, collisionStats.impactZ, 'destroy');
      this.spawnPickupsForEnergy(collisionStats.pickupEnergy, collisionStats.impactX, collisionStats.impactY, collisionStats.impactZ);
      this.shake(0.12, 0.1);
    }
    if (chainDestroyed > 0) {
      this.explosions.burst(chainImpactX, chainImpactY, chainImpactZ, 'chain', 0.9);
      this.spawnPickupsForEnergy(chainPickupEnergy, chainImpactX, chainImpactY, chainImpactZ);
      this.shake(0.1, 0.085);
    } else if (collisionStats.hits > 0) {
      this.explosions.spark(collisionStats.impactX, collisionStats.impactY, collisionStats.impactZ, 'hit');
      this.shake(0.045, 0.035);
    }
    this.resolvePulse(enemyStats.nearPlayerThreats);
    this.resolveEnemyFire();
    this.resolveBossFire(enemyStats, dt);
    const enemyBulletStats = this.enemyBullets.update(dt, this.player.position);
    const pickupStats = this.pickups.update(dt, this.player.position.x, this.player.position.y, this.player.position.z);
    if (pickupStats.collectedBombs > 0) {
      this.bombs = Math.min(this.bombCapacity, this.bombs + pickupStats.collectedBombs);
    }
    const explosionStats = this.explosions.update(dt);
    const rawDamageTaken =
      enemyStats.leaks * (this.mobileProfile ? 4 : 6) +
      enemyStats.collisions * (this.mobileProfile ? 12 : 16) +
      enemyBulletStats.bulletDamage;
    const damageTaken = this.mitigateDamage(rawDamageTaken);
    if (damageTaken > 0) {
      this.explosions.spark(this.player.position.x, this.player.position.y + 0.25, this.player.position.z, 'damage');
      this.shake(0.16, 0.16);
    }
    const skillStats = this.resolveSkills(input, enemyStats.activeEnemies, enemyStats.nearPlayerThreats);
    this.updateCameraShake(dt);
    this.updateStars(dt);
    this.renderer.render(this.scene, this.camera);
    return {
      ...bulletStats,
      weaponLevel: this.getDisplayedWeaponLevel(),
      activeEnemies: enemyStats.activeEnemies,
      enemyPoolSize: enemyStats.poolSize,
      hitCount: collisionStats.hits,
      destroyedCount: collisionStats.destroyed + chainDestroyed,
      activeExplosions: explosionStats.activeExplosions,
      explosionPoolSize: explosionStats.poolSize,
      leakedEnemies: enemyStats.leaks,
      playerCollisions: enemyStats.collisions,
      damageTaken,
      skillScoreDelta: skillStats.score + this.pulseScore,
      skillKills: skillStats.destroyed + this.pulseDestroyed,
      bombs: this.bombs,
      cooldown1: this.cooldown1,
      cooldown2: this.cooldown2,
      cooldown3: this.cooldown3,
      scoreDelta: collisionStats.score + chainScore,
      bossActive: enemyStats.bossActive,
      bossHp: enemyStats.bossHp,
      bossMaxHp: enemyStats.bossMaxHp,
      bossPhase: enemyStats.bossPhase,
      bossJustEntered: bossPresentation.entered,
      bossPhaseChanged: bossPresentation.phaseChanged,
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
      this.skillCooldownLevel = Math.min(RENDER_UPGRADE_MAX_LEVEL, this.skillCooldownLevel + 1);
      const cooldownCut = this.skillCooldownLevel >= RENDER_UPGRADE_MAX_LEVEL ? 0.66 : 0.82;
      this.cooldown1 *= cooldownCut;
      this.cooldown2 *= cooldownCut;
      this.cooldown3 *= cooldownCut;
      return this.getDisplayedWeaponLevel();
    }

    if (type === 'arsenal') {
      this.arsenalLevel = Math.min(RENDER_UPGRADE_MAX_LEVEL, this.arsenalLevel + 1);
      const maxCapacity = this.arsenalLevel >= RENDER_UPGRADE_MAX_LEVEL ? 10 : 8;
      this.bombCapacity = Math.min(maxCapacity, this.bombCapacity + 1 + (this.arsenalLevel >= RENDER_UPGRADE_MAX_LEVEL ? 1 : 0));
      this.bombs = this.arsenalLevel >= RENDER_UPGRADE_MAX_LEVEL
        ? this.bombCapacity
        : Math.min(this.bombCapacity, this.bombs + 1);
      return this.getDisplayedWeaponLevel();
    }

    if (type === 'shield') {
      this.shieldLevel = Math.min(RENDER_UPGRADE_MAX_LEVEL, this.shieldLevel + 1);
      return this.getDisplayedWeaponLevel();
    }

    if (type === 'pulse') {
      this.pulseLevel = Math.min(RENDER_UPGRADE_MAX_LEVEL, this.pulseLevel + 1);
      this.pulseCooldown *= this.pulseLevel >= RENDER_UPGRADE_MAX_LEVEL ? 0.5 : 0.72;
      return this.getDisplayedWeaponLevel();
    }

    if (type === 'salvage') {
      this.salvageLevel = Math.min(RENDER_UPGRADE_MAX_LEVEL, this.salvageLevel + 1);
      this.pickups.applySalvageUpgrade();
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

  private resolveBossPresentation(enemyStats: {
    bossActive: boolean;
    bossX: number;
    bossY: number;
    bossZ: number;
    bossPhase: number;
  }): { entered: boolean; phaseChanged: boolean } {
    if (!enemyStats.bossActive) {
      this.bossPresentationActive = false;
      this.previousBossPhase = 0;
      return { entered: false, phaseChanged: false };
    }

    if (enemyStats.bossY > 5.35) {
      return { entered: false, phaseChanged: false };
    }

    let entered = false;
    let phaseChanged = false;
    const phase = Math.max(1, enemyStats.bossPhase);
    if (!this.bossPresentationActive) {
      entered = true;
      this.bossPresentationActive = true;
      this.previousBossPhase = phase;
      this.spawnBossPresentationBurst(enemyStats.bossX, enemyStats.bossY, enemyStats.bossZ, 1.12);
      this.bossShotCooldown = Math.max(this.bossShotCooldown, this.mobileProfile ? 1.45 : 1.18);
      this.shake(0.22, 0.18);
    } else if (phase > this.previousBossPhase) {
      phaseChanged = true;
      this.previousBossPhase = phase;
      this.spawnBossPresentationBurst(enemyStats.bossX, enemyStats.bossY, enemyStats.bossZ, 0.92 + phase * 0.08);
      this.bossShotCooldown = Math.max(this.bossShotCooldown, this.mobileProfile ? 1.25 : 1.05);
      this.shake(0.18, 0.13);
    }

    return { entered, phaseChanged };
  }

  private spawnBossPresentationBurst(x: number, y: number, z: number, intensity: number): void {
    this.explosions.burst(x, y, z, 'skill', intensity);
    this.explosions.burst(x - 0.72, y - 0.18, z + 0.08, 'damage', intensity * 0.76);
    this.explosions.burst(x + 0.72, y - 0.18, z + 0.08, 'damage', intensity * 0.76);
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
      this.spawnSkillBurst(result.x || this.player.position.x, result.y || this.player.position.y + 3.2, result.z, 'skill');
      this.shake(0.16, 0.12);
    }

    if ((input.skill2Pressed || autoSkill2) && this.cooldown2 <= 0) {
      const result = this.enemies.damageInRadius(this.player.position.x, this.player.position.y, 0, 2.15, 120);
      this.cooldown2 = 5 * this.getSkillCooldownScale();
      destroyed += result.destroyed;
      score += result.score;
      this.spawnPickupsForEnergy(result.pickupEnergy, this.player.position.x, this.player.position.y + 0.2, 0);
      this.spawnSkillBurst(this.player.position.x, this.player.position.y + 0.2, 0, 'skill');
      this.shake(0.18, 0.14);
    }

    if ((input.skill3Pressed || autoSkill3) && this.cooldown3 <= 0) {
      const result = this.enemies.damageInRadius(this.player.position.x, this.player.position.y + 4.5, 0, 3.6, 40);
      this.cooldown3 = 4.2 * this.getSkillCooldownScale();
      destroyed += result.destroyed;
      score += result.score;
      this.spawnPickupsForEnergy(result.pickupEnergy, result.x || this.player.position.x, result.y || this.player.position.y + 4.5, result.z);
      this.spawnSkillBurst(result.x || this.player.position.x, result.y || this.player.position.y + 4.5, result.z, 'skill');
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
      this.spawnSkillBurst(burstX, burstY, burstZ, 'skill');
      this.shake(0.28, 0.26);
    }

    return { destroyed, score };
  }

  private spawnSkillBurst(x: number, y: number, z: number, tone: 'skill' | 'chain' = 'skill'): void {
    this.explosions.burst(x, y, z, tone, 1.1);
    this.explosions.burst(x + 0.45, y - 0.2, z, tone, 0.82);
    this.explosions.burst(x - 0.45, y + 0.2, z, tone, 0.82);
  }

  private getSkillCooldownScale(): number {
    const floor = this.skillCooldownLevel >= RENDER_UPGRADE_MAX_LEVEL ? 0.5 : 0.68;
    return Math.max(floor, 1 - this.skillCooldownLevel * 0.09 - (this.skillCooldownLevel >= RENDER_UPGRADE_MAX_LEVEL ? 0.08 : 0));
  }

  private getDisplayedWeaponLevel(): number {
    return this.playerBullets.getWeaponLevel() +
      this.skillCooldownLevel +
      this.arsenalLevel +
      this.shieldLevel +
      this.pulseLevel +
      this.salvageLevel;
  }

  private resolvePulse(nearPlayerThreats: number): void {
    this.pulseDestroyed = 0;
    this.pulseScore = 0;
    if (this.pulseLevel <= 0 || this.pulseCooldown > 0 || nearPlayerThreats <= 0) {
      return;
    }

    const pulseUltra = this.pulseLevel >= RENDER_UPGRADE_MAX_LEVEL;
    const radius = 1.18 + this.pulseLevel * 0.28 + (pulseUltra ? 0.55 : 0);
    const damage = 34 + this.pulseLevel * 18 + (pulseUltra ? 42 : 0);
    const result = this.enemies.damageInRadius(this.player.position.x, this.player.position.y + 0.55, 0, radius, damage);
    this.pulseCooldown = Math.max(pulseUltra ? 0.9 : 1.45, 3.4 - this.pulseLevel * 0.32 - (pulseUltra ? 0.34 : 0));
    if (result.destroyed > 0) {
      this.spawnPickupsForEnergy(result.pickupEnergy, result.x || this.player.position.x, result.y || this.player.position.y + 0.55, result.z);
    }
    this.spawnSkillBurst(this.player.position.x, this.player.position.y + 0.55, 0, 'skill');
    this.shake(0.12, 0.09);
    this.pulseDestroyed = result.destroyed;
    this.pulseScore = result.score;
  }

  private mitigateDamage(rawDamage: number): number {
    if (rawDamage <= 0 || this.shieldLevel <= 0) {
      return rawDamage;
    }

    const shieldUltra = this.shieldLevel >= RENDER_UPGRADE_MAX_LEVEL;
    const reduction = Math.min(shieldUltra ? 0.62 : 0.48, this.shieldLevel * 0.14 + (shieldUltra ? 0.08 : 0));
    return Math.max(0, rawDamage * (1 - reduction) - this.shieldLevel * 0.35 - (shieldUltra ? 1.2 : 0));
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
    const moveSpeed = this.mobileProfile ? MOBILE_PLAYER_MOVE_SPEED : PLAYER_MOVE_SPEED;
    const previousX = this.player.position.x;
    const previousY = this.player.position.y;
    const targetX = this.player.position.x + input.moveX * moveSpeed * dt;
    const targetY = this.player.position.y + input.moveY * moveSpeed * dt;
    this.player.position.x = clamp(targetX, -this.playerLimitX, this.playerLimitX);
    this.player.position.y = clamp(targetY, PLAYER_MIN_Y, PLAYER_MAX_Y);

    const frameDt = Math.max(dt, 1 / 120);
    const velocityX = (this.player.position.x - previousX) / frameDt;
    const velocityY = (this.player.position.y - previousY) / frameDt;
    const normalizedX = clamp(velocityX / moveSpeed, -1, 1);
    const normalizedY = clamp(velocityY / moveSpeed, -1, 1);
    const strafe = smooth(this.playerStrafe, normalizedX, dt, this.mobileProfile ? 12 : 10);
    this.updateTrickRoll(dt, this.mobileProfile ? input.moveX : normalizedX);
    const trickDuration = this.mobileProfile ? MOBILE_PLAYER_TRICK_ROLL_DURATION : PLAYER_TRICK_ROLL_DURATION;
    const trickProgress = this.trickRollTime > 0
      ? 1 - this.trickRollTime / trickDuration
      : 1;
    const trickEnvelope = this.trickRollTime > 0 ? Math.sin(trickProgress * Math.PI) : 0;
    const trickSpin = this.trickRollTime > 0 ? trickProgress * Math.PI * 2 * this.trickRollDirection : 0;
    this.playerStrafe = strafe;
    this.playerRoll = smooth(this.playerRoll, -strafe * (this.mobileProfile ? 0.52 : 0.42), dt, this.mobileProfile ? 11 : 9);
    this.playerPitch = smooth(
      this.playerPitch,
      normalizedY * 0.16 + Math.abs(strafe) * (this.mobileProfile ? 0.048 : 0.035),
      dt,
      this.mobileProfile ? 8 : 7
    );
    this.playerYaw = smooth(this.playerYaw, -strafe * (this.mobileProfile ? 0.16 : 0.12), dt, this.mobileProfile ? 10 : 8);
    this.player.rotation.set(
      this.playerPitch + trickEnvelope * 0.1,
      this.playerYaw + trickSpin,
      this.playerRoll + trickEnvelope * this.trickRollDirection * 0.26
    );
    this.player.position.z = Math.sin(this.elapsed * 4.2) * 0.08 + Math.abs(strafe) * 0.08 + trickEnvelope * (this.mobileProfile ? 0.22 : 0.18);

    const forwardRatio = clamp((this.player.position.y - PLAYER_MIN_Y) / (PLAYER_MAX_Y - PLAYER_MIN_Y), 0, 1);
    const zoneThrust = 0.72 + forwardRatio * 0.68;
    const thrustPulse = zoneThrust + Math.sin(this.elapsed * 22) * 0.07 + Math.max(0, -normalizedY) * 0.12;
    const flameVisibility = 0.84 + forwardRatio * 0.38;
    for (let i = 0; i < this.playerFlames.length; i += 1) {
      const flame = this.playerFlames[i];
      const baseScale = this.playerFlameBaseScales[i];
      const side = flame.position.x < 0 ? -1 : 1;
      const layer = i % 3;
      const layerLength = layer === 0 ? 1.12 : layer === 1 ? 0.82 : 1.55;
      const layerWidth = layer === 0 ? 1.1 : layer === 1 ? 0.82 : 0.72;
      const layerOpacity = layer === 0 ? 0.6 : layer === 1 ? 0.82 : 0.48;
      const layerFlicker = 1 + Math.sin(this.elapsed * (18 + layer * 4) + side * 0.8) * (layer === 2 ? 0.13 : 0.06);
      const strafeBoost = 1 + Math.max(0, -side * strafe) * 0.28 + trickEnvelope * 0.24;
      const strafeSquash = 1 + Math.abs(strafe) * 0.04;
      const material = flame.material as MeshStandardMaterial;
      material.opacity = layerOpacity * flameVisibility;
      flame.rotation.z = Math.PI + Math.sin(this.elapsed * 11 + side * 0.7 + layer) * (layer === 2 ? 0.08 : 0.025);
      flame.scale.set(
        baseScale.x * (0.86 + thrustPulse * 0.06 * strafeSquash) * layerWidth,
        baseScale.y * thrustPulse * strafeBoost * layerLength * layerFlicker,
        baseScale.z * (0.84 + thrustPulse * 0.08) * layerWidth
      );
    }
    this.updateRollGlints(trickEnvelope, strafe);
  }

  private updateTrickRoll(dt: number, normalizedX: number): void {
    this.trickRollCooldown = Math.max(0, this.trickRollCooldown - dt);
    this.trickRollTime = Math.max(0, this.trickRollTime - dt);
    const triggerInput = this.mobileProfile ? MOBILE_PLAYER_TRICK_ROLL_INPUT : PLAYER_TRICK_ROLL_INPUT;
    const freshCommitWindow = this.mobileProfile ? 0.2 : 0.24;
    const rollDuration = this.mobileProfile ? MOBILE_PLAYER_TRICK_ROLL_DURATION : PLAYER_TRICK_ROLL_DURATION;
    const rollCooldown = this.mobileProfile ? MOBILE_PLAYER_TRICK_ROLL_COOLDOWN : PLAYER_TRICK_ROLL_COOLDOWN;
    const direction = Math.sign(normalizedX);
    const previousDirection = Math.sign(this.previousMoveX);
    const hardStrafe = Math.abs(normalizedX) >= triggerInput;
    const freshCommit = Math.abs(this.previousMoveX) < freshCommitWindow;
    const changedDirection = direction !== 0 && previousDirection !== 0 && direction !== previousDirection;

    if (this.trickRollCooldown <= 0 && hardStrafe && direction !== 0 && (freshCommit || changedDirection)) {
      this.trickRollTime = rollDuration;
      this.trickRollCooldown = rollCooldown;
      this.trickRollDirection = -direction;
    }

    this.previousMoveX = normalizedX;
  }

  private updateRollGlints(envelope: number, strafe: number): void {
    for (let i = 0; i < this.playerRollGlints.length; i += 1) {
      const glint = this.playerRollGlints[i];
      const baseScale = this.playerRollGlintBaseScales[i];
      const side = glint.position.x < 0 ? -1 : 1;
      const material = glint.material as MeshStandardMaterial;
      const sideBoost = Math.max(0, side * strafe) * 0.35;
      const pulse = envelope * (1 + sideBoost);
      glint.visible = pulse > 0.035;
      material.opacity = Math.min(0.78, pulse * 0.7);
      glint.rotation.z = side * (0.92 + Math.sin(this.elapsed * 18 + i) * 0.16) + envelope * this.trickRollDirection * 1.2;
      glint.scale.set(
        baseScale.x * (0.45 + pulse * 1.25),
        baseScale.y * (0.7 + pulse * 1.5),
        baseScale.z * (0.45 + pulse * 1.05)
      );
    }
  }

  private applyDeviceProfile(): void {
    const mobileProfile = window.innerWidth <= 680 || matchMedia('(pointer: coarse)').matches;
    this.mobileProfile = mobileProfile;
    this.enemies.setMobileMode(mobileProfile);
    this.enemyBullets.setMobileMode(mobileProfile);
    this.pickups.setMobileMode(mobileProfile);
    this.player.scale.setScalar(mobileProfile ? MOBILE_PLAYER_SCALE : 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobileProfile ? 1.25 : 1.75));
  }

  private updatePlayerBounds(): void {
    if (!this.mobileProfile) {
      this.playerLimitX = PLAYER_LIMIT_X;
      return;
    }

    let min = 0;
    let max = PLAYER_LIMIT_X;
    for (let i = 0; i < 18; i += 1) {
      const mid = (min + max) / 2;
      const visualEdgeX = mid + PLAYER_VISUAL_HALF_WIDTH * (this.mobileProfile ? MOBILE_PLAYER_SCALE : 1);
      this.scratchVector.set(visualEdgeX, PLAYER_MIN_Y, 0).project(this.camera);
      if (this.scratchVector.x < MOBILE_PLAYER_SCREEN_SAFE_X) {
        min = mid;
      } else {
        max = mid;
      }
    }
    this.playerLimitX = clamp(min, 0.72, 3.45);
    this.player.position.x = clamp(this.player.position.x, -this.playerLimitX, this.playerLimitX);
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
    this.playerProceduralParts.length = 0;
    this.playerFlames.length = 0;
    this.playerFlameBaseScales.length = 0;
    this.playerRollGlints.length = 0;
    this.playerRollGlintBaseScales.length = 0;

    const bodyMaterial = new MeshStandardMaterial({
      color: '#27d8ff',
      emissive: '#104f8f',
      emissiveIntensity: 0.75,
      roughness: 0.34,
      metalness: 0.5,
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
    const engineOuterMaterial = new MeshStandardMaterial({
      color: '#ffb15f',
      emissive: '#ff6a24',
      emissiveIntensity: 1.45,
      blending: AdditiveBlending,
      depthWrite: false,
      flatShading: true,
      opacity: 0.58,
      transparent: true
    });
    const engineCoreMaterial = new MeshStandardMaterial({
      color: '#d8fbff',
      emissive: '#27d8ff',
      emissiveIntensity: 1.75,
      blending: AdditiveBlending,
      depthWrite: false,
      flatShading: true,
      opacity: 0.68,
      transparent: true
    });
    const engineTrailMaterial = new MeshStandardMaterial({
      color: '#9b5cff',
      emissive: '#ff8a3d',
      emissiveIntensity: 1.28,
      blending: AdditiveBlending,
      depthWrite: false,
      flatShading: true,
      opacity: 0.42,
      transparent: true
    });
    const cockpitMaterial = new MeshStandardMaterial({
      color: '#d8fbff',
      emissive: '#27d8ff',
      emissiveIntensity: 1.15,
      roughness: 0.2,
      metalness: 0.35,
      flatShading: true
    });
    const accentMaterial = new MeshStandardMaterial({
      color: '#ff8a3d',
      emissive: '#ff5c14',
      emissiveIntensity: 1.05,
      roughness: 0.36,
      metalness: 0.28,
      flatShading: true
    });
    const rollGlintMaterial = new MeshStandardMaterial({
      color: '#d8fbff',
      emissive: '#27d8ff',
      emissiveIntensity: 1.85,
      blending: AdditiveBlending,
      depthWrite: false,
      flatShading: true,
      opacity: 0,
      transparent: true
    });

    const nose = new Mesh(new ConeGeometry(0.34, 1.42, 5), bodyMaterial);
    nose.rotation.x = Math.PI / 2;
    nose.position.y = 0.62;
    nose.position.z = 0.02;
    this.addPlayerProceduralPart(ship, nose);

    const core = new Mesh(new BoxGeometry(0.58, 1.44, 0.34), bodyMaterial);
    core.position.y = -0.22;
    core.rotation.z = 0.02;
    this.addPlayerProceduralPart(ship, core);

    const cockpit = new Mesh(new IcosahedronGeometry(0.22, 0), cockpitMaterial);
    cockpit.scale.set(0.82, 1.22, 0.52);
    cockpit.position.set(0, 0.08, 0.25);
    this.addPlayerProceduralPart(ship, cockpit);

    const leftWing = new Mesh(new BoxGeometry(1.55, 0.22, 0.18), wingMaterial);
    leftWing.position.set(-0.84, -0.42, -0.02);
    leftWing.rotation.z = -0.36;
    leftWing.rotation.y = 0.08;
    this.addPlayerProceduralPart(ship, leftWing);

    const rightWing = leftWing.clone();
    rightWing.position.x = 0.78;
    rightWing.rotation.z = 0.36;
    rightWing.rotation.y = -0.08;
    this.addPlayerProceduralPart(ship, rightWing);

    const leftTip = new Mesh(new ConeGeometry(0.12, 0.48, 4), accentMaterial);
    leftTip.rotation.x = Math.PI / 2;
    leftTip.rotation.z = -0.32;
    leftTip.position.set(-1.48, -0.56, 0);
    this.addPlayerProceduralPart(ship, leftTip);

    const rightTip = leftTip.clone();
    rightTip.position.x = 1.48;
    rightTip.rotation.z = 0.32;
    this.addPlayerProceduralPart(ship, rightTip);

    const tailFin = new Mesh(new BoxGeometry(0.22, 0.68, 0.22), wingMaterial);
    tailFin.position.set(0, -1.02, 0.2);
    tailFin.rotation.x = 0.24;
    this.addPlayerProceduralPart(ship, tailFin);

    const leftEngine = new Mesh(new BoxGeometry(0.22, 0.44, 0.22), bodyMaterial);
    leftEngine.position.set(-0.28, -1.05, -0.06);
    this.addPlayerProceduralPart(ship, leftEngine);

    const rightEngine = leftEngine.clone();
    rightEngine.position.x = 0.28;
    this.addPlayerProceduralPart(ship, rightEngine);

    this.addEngineFlame(ship, -0.28, engineOuterMaterial, engineCoreMaterial, engineTrailMaterial);
    this.addEngineFlame(ship, 0.28, engineOuterMaterial, engineCoreMaterial, engineTrailMaterial);
    this.addRollGlint(ship, -0.98, rollGlintMaterial);
    this.addRollGlint(ship, 0.98, rollGlintMaterial);

    ship.scale.setScalar(this.mobileProfile ? MOBILE_PLAYER_SCALE : 1);
    return ship;
  }

  private addPlayerProceduralPart(ship: Group, mesh: Mesh): void {
    ship.add(mesh);
    this.playerProceduralParts.push(mesh);
  }

  private addEngineFlame(
    ship: Group,
    x: number,
    outerMaterial: MeshStandardMaterial,
    coreMaterial: MeshStandardMaterial,
    trailMaterial: MeshStandardMaterial
  ): void {
    const outer = new Mesh(new ConeGeometry(0.13, 0.54, 7), outerMaterial);
    outer.rotation.z = Math.PI;
    outer.position.set(x, -1.31, -0.04);
    outer.scale.set(0.92, 0.78, 0.92);
    ship.add(outer);
    this.playerFlames.push(outer);
    this.playerFlameBaseScales.push(outer.scale.clone());

    const core = new Mesh(new ConeGeometry(0.07, 0.4, 6), coreMaterial);
    core.rotation.z = Math.PI;
    core.position.set(x, -1.27, -0.035);
    core.scale.set(0.76, 0.72, 0.76);
    ship.add(core);
    this.playerFlames.push(core);
    this.playerFlameBaseScales.push(core.scale.clone());

    const trail = new Mesh(new ConeGeometry(0.095, 0.74, 5), trailMaterial);
    trail.rotation.z = Math.PI;
    trail.position.set(x, -1.5, -0.055);
    trail.scale.set(0.76, 0.68, 0.76);
    ship.add(trail);
    this.playerFlames.push(trail);
    this.playerFlameBaseScales.push(trail.scale.clone());
  }

  private addRollGlint(ship: Group, x: number, material: MeshStandardMaterial): void {
    const glint = new Mesh(new ConeGeometry(0.08, 0.62, 5), material.clone());
    glint.position.set(x, -0.28, 0.18);
    glint.rotation.x = Math.PI / 2;
    glint.rotation.z = x < 0 ? -0.9 : 0.9;
    glint.scale.set(0.72, 0.52, 0.72);
    glint.visible = false;
    ship.add(glint);
    this.playerRollGlints.push(glint);
    this.playerRollGlintBaseScales.push(glint.scale.clone());
  }

  private configurePlayerFlamesForModel(model: ModelDefinition): void {
    const visualScale = Math.max(0.92, model.scale * 1.55);
    const nozzleY = model.offset[1] - 1.24 * model.scale;
    const z = model.offset[2] - 0.05 * model.scale;

    for (let sideIndex = 0; sideIndex < 2; sideIndex += 1) {
      const side = sideIndex === 0 ? -1 : 1;
      const x = model.offset[0] + side * 0.3 * model.scale;
      const flameIndex = sideIndex * 3;
      const outer = this.playerFlames[flameIndex];
      const core = this.playerFlames[flameIndex + 1];
      const trail = this.playerFlames[flameIndex + 2];
      const outerScale = this.playerFlameBaseScales[flameIndex];
      const coreScale = this.playerFlameBaseScales[flameIndex + 1];
      const trailScale = this.playerFlameBaseScales[flameIndex + 2];

      if (outer && outerScale) {
        outer.position.set(x, nozzleY - 0.075 * visualScale, z);
        outer.rotation.set(0, 0, Math.PI);
        outerScale.set(0.94 * visualScale, 0.98 * visualScale, 0.94 * visualScale);
      }

      if (core && coreScale) {
        core.position.set(x, nozzleY - 0.045 * visualScale, z + 0.006);
        core.rotation.set(0, 0, Math.PI);
        coreScale.set(0.74 * visualScale, 0.78 * visualScale, 0.74 * visualScale);
      }

      if (trail && trailScale) {
        trail.position.set(x, nozzleY - 0.22 * visualScale, z - 0.006);
        trail.rotation.set(0, 0, Math.PI);
        trailScale.set(0.72 * visualScale, 1.08 * visualScale, 0.72 * visualScale);
      }
    }
  }

  private async loadPlayerModel(model?: ModelDefinition): Promise<void> {
    if (!model?.enabled) {
      return;
    }

    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const gltf = await new GLTFLoader().loadAsync(resolveAssetUrl(model.url));
      const root = gltf.scene;
      root.name = 'player_ship_model';
      root.scale.setScalar(model.scale);
      root.rotation.set(model.rotation[0], model.rotation[1], model.rotation[2]);
      root.position.set(model.offset[0], model.offset[1], model.offset[2]);
      root.traverse((child) => {
        child.frustumCulled = false;
      });
      this.player.add(root);
      this.configurePlayerFlamesForModel(model);
      this.setPlayerProceduralVisible(false);
    } catch (error) {
      console.warn('Player model failed to load. Using procedural fallback.', error);
      this.setPlayerProceduralVisible(true);
    }
  }

  private setPlayerProceduralVisible(visible: boolean): void {
    for (const mesh of this.playerProceduralParts) {
      mesh.visible = visible;
    }
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

function smooth(value: number, target: number, dt: number, response: number): number {
  return value + (target - value) * (1 - Math.exp(-response * dt));
}

function seededRange(seed: number, min: number, max: number): number {
  const value = Math.sin(seed * 999.13) * 43758.5453;
  const normalized = value - Math.floor(value);
  return min + normalized * (max - min);
}

function resolveAssetUrl(url: string): string {
  if (/^https?:\/\//.test(url) || url.startsWith('/')) {
    return url;
  }
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
  return `${base}${url.replace(/^\/+/, '')}`;
}

function bossPatternCooldown(variant: number, phase: number, mobileProfile: boolean): number {
  const base = variant === 12 ? 3.55 : variant === 11 ? 3.35 : 2.85;
  const minimum = mobileProfile ? 2.78 : 2.48;
  const mobileScale = mobileProfile ? 1.16 : 1;
  return Math.max(minimum, (base - phase * 0.04) * mobileScale);
}
