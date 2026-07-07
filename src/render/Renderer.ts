import {
  AdditiveBlending,
  AmbientLight,
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DynamicDrawUsage,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
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
import { SpaceHazardPool } from '../gameplay/SpaceHazardPool';
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
const PLAYER_TRICK_ROLL_DURATION = 0.34;
const MOBILE_PLAYER_TRICK_ROLL_DURATION = 0.32;
const PLAYER_TRICK_ROLL_COOLDOWN = 0.58;
const MOBILE_PLAYER_TRICK_ROLL_COOLDOWN = 0.38;
const PLAYER_TRICK_ROLL_INPUT = 0.86;
const MOBILE_PLAYER_TRICK_ROLL_INPUT = 0.56;
const MOBILE_BULLET_DRIFT_MAX = 1.52;
const RENDER_UPGRADE_MAX_LEVEL = 7;
const PERFORMANCE_TIER_MAX = 3;
const PERFORMANCE_SAMPLE_SECONDS = 0.62;
const PERFORMANCE_RECOVERY_SECONDS = 6.2;
const MODEL_UPDATE_INTERVAL_BY_TIER = [1, 2, 3, 4] as const;
const STAR_UPDATE_INTERVAL_BY_TIER = [2, 3, 4, 5] as const;
const VISUAL_UPDATE_INTERVAL_BY_TIER = [1, 1, 2, 3] as const;
const PIXEL_RATIO_CAP_DESKTOP = [1.42, 1.24, 1.04, 0.88] as const;
const PIXEL_RATIO_CAP_MOBILE = [1, 0.9, 0.78, 0.68] as const;
const STAR_COUNT = 120;

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
  bossVariant: number;
  bossJustEntered: boolean;
  bossPhaseChanged: boolean;
  activeEnemyBullets: number;
  enemyBulletPoolSize: number;
  activePickups: number;
  pickupPoolSize: number;
  collectedEnergy: number;
  repairedHp: number;
  activeHazards: number;
  hazardPoolSize: number;
  performanceTier: number;
  estimatedFps: number;
  renderPixelRatio: number;
  enemyModelDetailsEnabled: boolean;
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
  private readonly playerWingArmor: Mesh[] = [];
  private readonly playerNoseCannons: Mesh[] = [];
  private readonly playerTailBoosters: Mesh[] = [];
  private readonly playerExternalPods: Mesh[] = [];
  private readonly playerEscortDrones: Mesh[] = [];
  private readonly playerEscortLasers: Mesh[] = [];
  private readonly playerShieldPetals: Mesh[] = [];
  private readonly playerShieldProjectors: Mesh[] = [];
  private readonly playerEscortMounts: Mesh[] = [];
  private readonly playerUltraNodes: Mesh[] = [];
  private readonly playerUpgradePorts: Mesh[] = [];
  private readonly starField: InstancedMesh;
  private readonly starX = new Float32Array(STAR_COUNT);
  private readonly starY = new Float32Array(STAR_COUNT);
  private readonly starZ = new Float32Array(STAR_COUNT);
  private readonly starScale = new Float32Array(STAR_COUNT);
  private readonly starSpeed = new Float32Array(STAR_COUNT);
  private readonly playerBullets: PlayerBulletPool;
  private readonly enemies: EnemyPool;
  private readonly enemyModelBatch = new EnemyModelBatch();
  private readonly enemyRenderSnapshots: EnemyRenderSnapshot[] = [];
  private loadedEnemyModelVariants: number[] = [];
  private enemyModelDetailsEnabled = true;
  private readonly enemyBullets = new EnemyBulletPool();
  private readonly explosions = new ExplosionPool();
  private readonly pickups = new PickupPool();
  private readonly hazards = new SpaceHazardPool();
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
  private temporaryShield = 0;
  private mobileProfile = false;
  private bossShotCooldown = 0.8;
  private playerLimitX = PLAYER_LIMIT_X;
  private bossPresentationActive = false;
  private previousBossPhase = 0;
  private playerRoll = 0;
  private playerPitch = 0;
  private playerYaw = 0;
  private playerStrafe = 0;
  private playerBulletDrift = 0;
  private previousMoveX = 0;
  private trickRollTime = 0;
  private trickRollCooldown = 0;
  private trickRollDirection = 1;
  private visualWingLevel = 0;
  private visualNoseLevel = 0;
  private visualTailLevel = 0;
  private visualEscortLevel = 0;
  private visualLaserLevel = 0;
  private visualShieldLevel = 0;
  private performanceTier = 0;
  private performanceSampleTime = 0;
  private performanceRecoveryTime = 0;
  private fpsSmoothed = 60;
  private currentPixelRatio = 0;
  private enemyModelFrame = 0;
  private lastEnemyRenderCount = -1;
  private starUpdateFrame = 0;
  private starAccumulatedDt = 0;
  private visualUpdateFrame = 0;

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
    this.player = this.createPlayerShip();
    this.scene.add(this.player);
    void this.loadPlayerModel(config.models.player_ship);
    this.scene.add(this.enemies.object);
    this.scene.add(this.enemyModelBatch.object);
    void this.enemyModelBatch.load(config.models).then((loadedVariants) => {
      this.loadedEnemyModelVariants = loadedVariants;
      this.enemyModelDetailsEnabled = this.performanceTier < 3;
      this.enemies.setModelBackedVariants(this.enemyModelDetailsEnabled ? loadedVariants : []);
    }).catch((error) => {
      console.warn('Enemy model batch failed to load. Using procedural enemy fallback.', error);
    });
    this.scene.add(this.enemyBullets.mesh);
    this.scene.add(this.playerBullets.mesh);
    this.scene.add(this.hazards.object);
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
    const bulletStats = this.playerBullets.update(dt, this.player.position, input.firing, this.playerBulletDrift);
    const enemyStats = this.enemies.update(
      dt,
      this.elapsed,
      this.player.position.x,
      this.player.position.y,
      this.player.position.z
    );
    const enemyRenderCount = this.enemyModelDetailsEnabled
      ? this.enemies.writeRenderSnapshots(this.enemyRenderSnapshots, this.elapsed)
      : 0;
    this.updateEnemyModelBatch(enemyRenderCount, enemyStats.bossActive);
    const bossPresentation = this.resolveBossPresentation(enemyStats);
    const hazardStats = this.hazards.update(
      dt,
      this.elapsed,
      this.player.position.x,
      this.player.position.y,
      this.player.position.z,
      this.getDisplayedWeaponLevel()
    );
    const collisionStats = this.playerBullets.resolveHits((out, x, y, z, radius, damage) => {
      this.enemies.hitAtInto(out, x, y, z, radius, damage);
      if (!out.hit) {
        this.hazards.hitAtInto(out, x, y, z, radius, damage);
      }
    });
    let chainDestroyed = 0;
    let chainScore = 0;
    let chainPickupEnergy = 0;
    let hazardDestroyed = 0;
    let hazardScore = 0;
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
    this.hazards.drainEvents((event) => {
      if (event.type === 'asteroid') {
        const result = this.enemies.damageInRadius(event.x, event.y, event.z, event.radius, event.damage);
        hazardDestroyed += result.destroyed;
        hazardScore += result.score;
        this.explosions.burst(event.x, event.y, event.z, 'destroy', 1.18);
        this.spawnPickupsForEnergy(event.pickupEnergy + result.pickupEnergy, event.x, event.y, event.z);
        this.shake(0.16, 0.13);
        return;
      }

      this.cooldown1 *= event.cooldownCut;
      this.cooldown2 *= event.cooldownCut;
      this.cooldown3 *= event.cooldownCut;
      this.temporaryShield = Math.min(42, this.temporaryShield + event.shieldCharge);
      this.explosions.burst(event.x, event.y, event.z, 'chain', 1.05);
      this.spawnPickupsForEnergy(event.pickupEnergy, event.x, event.y, event.z);
      this.shake(0.12, 0.1);
    });
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
      enemyBulletStats.bulletDamage +
      hazardStats.playerDamage;
    const damageTaken = this.mitigateDamage(rawDamageTaken);
    if (damageTaken > 0) {
      this.explosions.spark(this.player.position.x, this.player.position.y + 0.25, this.player.position.z, 'damage');
      this.shake(0.16, 0.16);
    }
    const skillStats = this.resolveSkills(input, enemyStats.activeEnemies, enemyStats.nearPlayerThreats);
    this.updateCameraShake(dt);
    this.updateStars(dt);
    const stats = {
      ...bulletStats,
      weaponLevel: this.getDisplayedWeaponLevel(),
      activeEnemies: enemyStats.activeEnemies,
      enemyPoolSize: enemyStats.poolSize,
      hitCount: collisionStats.hits,
      destroyedCount: collisionStats.destroyed + chainDestroyed + hazardDestroyed,
      activeExplosions: explosionStats.activeExplosions,
      explosionPoolSize: explosionStats.poolSize,
      leakedEnemies: enemyStats.leaks,
      playerCollisions: enemyStats.collisions,
      damageTaken,
      skillScoreDelta: skillStats.score + this.pulseScore + hazardScore,
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
      bossVariant: enemyStats.bossVariant,
      bossJustEntered: bossPresentation.entered,
      bossPhaseChanged: bossPresentation.phaseChanged,
      activeEnemyBullets: enemyBulletStats.activeEnemyBullets,
      enemyBulletPoolSize: enemyBulletStats.enemyBulletPoolSize,
      activePickups: pickupStats.activePickups,
      pickupPoolSize: pickupStats.pickupPoolSize,
      collectedEnergy: pickupStats.collectedEnergy,
      repairedHp: pickupStats.repairedHp,
      activeHazards: hazardStats.activeHazards,
      hazardPoolSize: hazardStats.hazardPoolSize,
      performanceTier: this.performanceTier,
      estimatedFps: Math.round(this.fpsSmoothed),
      renderPixelRatio: this.currentPixelRatio,
      enemyModelDetailsEnabled: this.enemyModelDetailsEnabled
    };
    this.updatePerformanceProfile(dt, stats);
    stats.performanceTier = this.performanceTier;
    stats.estimatedFps = Math.round(this.fpsSmoothed);
    stats.renderPixelRatio = this.currentPixelRatio;
    stats.enemyModelDetailsEnabled = this.enemyModelDetailsEnabled;
    this.renderer.render(this.scene, this.camera);
    return stats;
  }

  applyWeaponUpgrade(type: WeaponUpgradeType): number {
    this.applyPlayerVisualUpgrade(type);

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
    bossVariant: number;
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
      this.spawnBossPresentationBurst(enemyStats.bossX, enemyStats.bossY, enemyStats.bossZ, enemyStats.bossVariant, phase, 1.12);
      this.bossShotCooldown = Math.max(this.bossShotCooldown, this.mobileProfile ? 1.45 : 1.18);
      this.shake(0.22, 0.18);
    } else if (phase > this.previousBossPhase) {
      phaseChanged = true;
      this.previousBossPhase = phase;
      this.spawnBossPresentationBurst(enemyStats.bossX, enemyStats.bossY, enemyStats.bossZ, enemyStats.bossVariant, phase, 0.92 + phase * 0.08);
      this.bossShotCooldown = Math.max(this.bossShotCooldown, this.mobileProfile ? 1.25 : 1.05);
      this.shake(0.18, 0.13);
    }

    return { entered, phaseChanged };
  }

  private spawnBossPresentationBurst(x: number, y: number, z: number, variant: number, phase: number, intensity: number): void {
    if (variant === 11) {
      const railOffset = this.mobileProfile ? 0.92 : 1.16;
      this.explosions.burst(x, y + 0.18, z + 0.08, 'damage', intensity * 0.96);
      this.explosions.burst(x - railOffset, y - 0.24, z + 0.12, 'skill', intensity * 0.72);
      this.explosions.burst(x + railOffset, y - 0.24, z + 0.12, 'skill', intensity * 0.72);
      return;
    }

    if (variant === 12) {
      const phaseLift = Math.min(0.38, phase * 0.04);
      const mirrorOffset = phase >= 5 ? 0.82 : 0.46;
      const mirrorY = phase >= 5 ? y - 0.3 : y - 0.18;
      const mirrorIntensity = phase >= 5 ? intensity * 0.76 : intensity * 0.68;
      this.explosions.burst(x, y + 0.36 + phaseLift, z + 0.16, 'chain', intensity * 0.9);
      this.explosions.burst(x - mirrorOffset, mirrorY, z + 0.24, 'skill', mirrorIntensity);
      this.explosions.burst(x + mirrorOffset, mirrorY, z + 0.24, 'skill', mirrorIntensity);
      return;
    }

    const wingOffset = this.mobileProfile ? 0.64 : 0.82;
    this.explosions.burst(x, y, z, 'skill', intensity);
    this.explosions.burst(x - wingOffset, y - 0.16, z + 0.08, 'damage', intensity * 0.72);
    this.explosions.burst(x + wingOffset, y - 0.16, z + 0.08, 'damage', intensity * 0.72);
  }

  private resolveEnemyFire(): void {
    this.enemies.drainFireEvents((x, y, z, kind) => {
      this.enemyBullets.spawnEnemyShot(
        x,
        y,
        z,
        this.player.position.x,
        this.player.position.y,
        kind
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
      return this.absorbTemporaryShield(rawDamage);
    }

    const shieldUltra = this.shieldLevel >= RENDER_UPGRADE_MAX_LEVEL;
    const reduction = Math.min(shieldUltra ? 0.62 : 0.48, this.shieldLevel * 0.14 + (shieldUltra ? 0.08 : 0));
    return this.absorbTemporaryShield(Math.max(0, rawDamage * (1 - reduction) - this.shieldLevel * 0.35 - (shieldUltra ? 1.2 : 0)));
  }

  private absorbTemporaryShield(damage: number): number {
    if (damage <= 0 || this.temporaryShield <= 0) {
      return damage;
    }

    const absorbed = Math.min(this.temporaryShield, damage);
    this.temporaryShield -= absorbed;
    return damage - absorbed;
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
    const bulletDriftTarget = this.mobileProfile
      ? clamp(input.moveX * 0.62 + normalizedX * 0.76, -1, 1) * MOBILE_BULLET_DRIFT_MAX
      : 0;
    this.playerBulletDrift = smooth(this.playerBulletDrift, bulletDriftTarget, dt, this.mobileProfile ? 6.2 : 10);
    this.updateTrickRoll(dt, this.mobileProfile ? input.moveX : normalizedX);
    const trickDuration = this.mobileProfile ? MOBILE_PLAYER_TRICK_ROLL_DURATION : PLAYER_TRICK_ROLL_DURATION;
    const trickProgress = this.trickRollTime > 0
      ? 1 - this.trickRollTime / trickDuration
      : 1;
    const trickEnvelope = this.trickRollTime > 0 ? Math.sin(trickProgress * Math.PI) : 0;
    const trickBank = trickEnvelope * this.trickRollDirection;
    this.playerStrafe = strafe;
    this.playerRoll = smooth(this.playerRoll, -strafe * (this.mobileProfile ? 0.46 : 0.34), dt, this.mobileProfile ? 12 : 10);
    this.playerPitch = smooth(
      this.playerPitch,
      normalizedY * 0.12 + Math.abs(strafe) * (this.mobileProfile ? 0.026 : 0.018),
      dt,
      this.mobileProfile ? 8 : 7
    );
    this.playerYaw = smooth(this.playerYaw, -strafe * (this.mobileProfile ? 0.13 : 0.1), dt, this.mobileProfile ? 10 : 8);
    this.player.rotation.set(
      this.playerPitch + trickEnvelope * 0.025,
      this.playerYaw + trickBank * (this.mobileProfile ? 0.065 : 0.05),
      this.playerRoll + trickBank * (this.mobileProfile ? 0.18 : 0.14)
    );
    this.player.position.z = Math.sin(this.elapsed * 4.2) * 0.08 + Math.abs(strafe) * 0.05 + trickEnvelope * (this.mobileProfile ? 0.08 : 0.06);

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
      const strafeBoost = 1 + Math.max(0, -side * strafe) * 0.28 + trickEnvelope * 0.12;
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
    if (this.shouldUpdatePlayerEvolutionVisuals()) {
      this.updatePlayerEvolutionVisuals(input.firing, strafe, trickEnvelope, forwardRatio);
    }
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
      glint.rotation.z = side * (0.92 + Math.sin(this.elapsed * 18 + i) * 0.12) + envelope * this.trickRollDirection * 0.38;
      glint.scale.set(
        baseScale.x * (0.42 + pulse * 0.95),
        baseScale.y * (0.64 + pulse * 1.1),
        baseScale.z * (0.42 + pulse * 0.82)
      );
    }
  }

  private applyDeviceProfile(): void {
    const mobileProfile = window.innerWidth <= 680 || matchMedia('(pointer: coarse)').matches;
    this.mobileProfile = mobileProfile;
    this.enemies.setMobileMode(mobileProfile);
    this.enemyBullets.setMobileMode(mobileProfile);
    this.pickups.setMobileMode(mobileProfile);
    this.hazards.setMobileMode(mobileProfile);
    this.player.scale.setScalar(mobileProfile ? MOBILE_PLAYER_SCALE : 1);
    this.applyRenderPixelRatio();
  }

  private updateEnemyModelBatch(enemyRenderCount: number, bossActive: boolean): void {
    if (!this.enemyModelDetailsEnabled) {
      return;
    }

    if (enemyRenderCount === 0) {
      if (this.lastEnemyRenderCount !== 0) {
        this.enemyModelBatch.update(this.enemyRenderSnapshots, 0);
        this.enemyModelFrame = 0;
        this.lastEnemyRenderCount = 0;
      }
      return;
    }

    if (enemyRenderCount !== this.lastEnemyRenderCount) {
      this.enemyModelBatch.update(this.enemyRenderSnapshots, enemyRenderCount);
      this.enemyModelFrame = 0;
      this.lastEnemyRenderCount = enemyRenderCount;
      return;
    }

    let interval = MODEL_UPDATE_INTERVAL_BY_TIER[this.performanceTier] ?? 1;
    if (bossActive && enemyRenderCount <= 10 && this.performanceTier <= 1) {
      interval = 1;
    }

    this.enemyModelFrame = (this.enemyModelFrame + 1) % interval;
    if (this.enemyModelFrame !== 0) {
      return;
    }

    this.enemyModelBatch.update(this.enemyRenderSnapshots, enemyRenderCount);
    this.lastEnemyRenderCount = enemyRenderCount;
  }

  private shouldUpdatePlayerEvolutionVisuals(): boolean {
    const interval = VISUAL_UPDATE_INTERVAL_BY_TIER[this.performanceTier] ?? 1;
    this.visualUpdateFrame = (this.visualUpdateFrame + 1) % interval;
    return this.visualUpdateFrame === 0;
  }

  private updatePerformanceProfile(dt: number, stats: RenderStats): void {
    const instantFps = dt > 0 ? Math.min(120, 1 / dt) : 60;
    const smoothing = Math.min(1, dt * 2.6);
    this.fpsSmoothed += (instantFps - this.fpsSmoothed) * smoothing;
    this.performanceSampleTime += dt;
    if (this.performanceSampleTime < PERFORMANCE_SAMPLE_SECONDS) {
      return;
    }

    const loadScore =
      stats.activeEnemies * 1.15 +
      stats.activeBullets * 0.16 +
      stats.activeEnemyBullets * 0.22 +
      stats.activeExplosions * 0.44 +
      stats.activeHazards * 1.35 +
      (stats.bossActive ? 12 : 0);
    let desiredTier = 0;
    if (this.fpsSmoothed < 34 || loadScore > 104) {
      desiredTier = 3;
    } else if (this.fpsSmoothed < 44 || loadScore > 76) {
      desiredTier = 2;
    } else if (this.fpsSmoothed < 56 || loadScore > 42) {
      desiredTier = 1;
    }
    if (stats.activeExplosions > 96) {
      desiredTier = Math.max(desiredTier, 2);
    } else if (stats.activeExplosions > 48) {
      desiredTier = Math.max(desiredTier, 1);
    }

    if (desiredTier > this.performanceTier) {
      this.setPerformanceTier(desiredTier);
      this.performanceRecoveryTime = 0;
    } else if (desiredTier < this.performanceTier) {
      this.performanceRecoveryTime += this.performanceSampleTime;
      if (this.performanceRecoveryTime >= PERFORMANCE_RECOVERY_SECONDS) {
        this.setPerformanceTier(this.performanceTier - 1);
        this.performanceRecoveryTime = 0;
      }
    } else {
      this.performanceRecoveryTime = 0;
    }

    this.performanceSampleTime = 0;
  }

  private setPerformanceTier(tier: number): void {
    const nextTier = clamp(Math.round(tier), 0, PERFORMANCE_TIER_MAX);
    if (nextTier === this.performanceTier) {
      return;
    }

    this.performanceTier = nextTier;
    this.explosions.setPerformanceTier(nextTier);
    this.updateEnemyModelDetailMode();
    this.applyRenderPixelRatio();
  }

  private updateEnemyModelDetailMode(): void {
    const enabled = this.performanceTier < 2;
    if (enabled === this.enemyModelDetailsEnabled) {
      return;
    }

    this.enemyModelDetailsEnabled = enabled;
    this.enemies.setModelBackedVariants(enabled ? this.loadedEnemyModelVariants : []);
    this.lastEnemyRenderCount = -1;
    if (!enabled) {
      this.enemyModelBatch.update(this.enemyRenderSnapshots, 0);
    }
  }

  private applyRenderPixelRatio(): void {
    const caps = this.mobileProfile ? PIXEL_RATIO_CAP_MOBILE : PIXEL_RATIO_CAP_DESKTOP;
    const cap = caps[this.performanceTier] ?? caps[0];
    const target = Math.max(0.68, Math.min(window.devicePixelRatio || 1, cap));
    if (Math.abs(target - this.currentPixelRatio) < 0.03) {
      return;
    }

    this.currentPixelRatio = target;
    this.renderer.setPixelRatio(target);
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
    const interval = STAR_UPDATE_INTERVAL_BY_TIER[this.performanceTier] ?? 1;
    this.starAccumulatedDt += dt;
    this.starUpdateFrame = (this.starUpdateFrame + 1) % interval;
    if (this.starUpdateFrame !== 0) {
      return;
    }

    const speed = this.starAccumulatedDt * 2.35;
    this.starAccumulatedDt = 0;
    for (let i = 0; i < this.starField.count; i += 1) {
      this.starY[i] -= speed * this.starSpeed[i];
      if (this.starY[i] < -12) {
        this.starY[i] = 15;
      }
      this.writeStarMatrix(this.starField, i);
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
    this.playerWingArmor.length = 0;
    this.playerNoseCannons.length = 0;
    this.playerTailBoosters.length = 0;
    this.playerExternalPods.length = 0;
    this.playerEscortDrones.length = 0;
    this.playerEscortLasers.length = 0;
    this.playerShieldPetals.length = 0;
    this.playerShieldProjectors.length = 0;
    this.playerEscortMounts.length = 0;
    this.playerUltraNodes.length = 0;
    this.playerUpgradePorts.length = 0;

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
    this.addPlayerEvolutionParts(ship);

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

  private addPlayerEvolutionParts(ship: Group): void {
    const wingMaterial = new MeshStandardMaterial({
      color: '#d8fbff',
      emissive: '#27d8ff',
      emissiveIntensity: 1.2,
      roughness: 0.28,
      metalness: 0.42,
      flatShading: true,
      transparent: true,
      opacity: 0
    });
    const noseMaterial = new MeshStandardMaterial({
      color: '#ff3ea5',
      emissive: '#9b5cff',
      emissiveIntensity: 1.45,
      roughness: 0.25,
      metalness: 0.38,
      flatShading: true,
      transparent: true,
      opacity: 0
    });
    const tailMaterial = new MeshStandardMaterial({
      color: '#ffb15f',
      emissive: '#ff6a24',
      emissiveIntensity: 1.35,
      roughness: 0.32,
      metalness: 0.26,
      flatShading: true,
      transparent: true,
      opacity: 0
    });
    const droneMaterial = new MeshStandardMaterial({
      color: '#bdefff',
      emissive: '#27d8ff',
      emissiveIntensity: 1.4,
      roughness: 0.3,
      metalness: 0.34,
      flatShading: true,
      transparent: true,
      opacity: 0
    });
    const laserMaterial = new MeshStandardMaterial({
      color: '#d8fbff',
      emissive: '#27d8ff',
      emissiveIntensity: 2.6,
      blending: AdditiveBlending,
      depthWrite: false,
      flatShading: true,
      transparent: true,
      opacity: 0
    });
    const shieldMaterial = new MeshStandardMaterial({
      color: '#68ffb0',
      emissive: '#27d8ff',
      emissiveIntensity: 1.5,
      roughness: 0.28,
      metalness: 0.18,
      flatShading: true,
      transparent: true,
      opacity: 0
    });
    const ultraMaterial = new MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#ff3ea5',
      emissiveIntensity: 2.2,
      blending: AdditiveBlending,
      depthWrite: false,
      roughness: 0.18,
      metalness: 0.35,
      flatShading: true,
      transparent: true,
      opacity: 0
    });
    const portMaterial = new MeshStandardMaterial({
      color: '#d8fbff',
      emissive: '#27d8ff',
      emissiveIntensity: 1.8,
      blending: AdditiveBlending,
      depthWrite: false,
      roughness: 0.2,
      metalness: 0.22,
      flatShading: true,
      transparent: true,
      opacity: 0
    });

    const nosePort = new Mesh(new BoxGeometry(0.08, 0.18, 0.045), portMaterial.clone());
    nosePort.position.set(0, 0.74, 0.34);
    nosePort.rotation.z = Math.PI / 4;
    nosePort.userData.channel = 'nose';
    nosePort.userData.baseX = nosePort.position.x;
    nosePort.userData.baseY = nosePort.position.y;
    nosePort.userData.baseZ = nosePort.position.z;
    nosePort.userData.baseRotationZ = nosePort.rotation.z;
    nosePort.visible = false;
    ship.add(nosePort);
    this.playerUpgradePorts.push(nosePort);

    for (const side of [-1, 1]) {
      const wingPort = new Mesh(new BoxGeometry(0.055, 0.34, 0.045), portMaterial.clone());
      wingPort.position.set(side * 0.78, -0.42, 0.3);
      wingPort.rotation.z = side * 0.48;
      wingPort.userData.channel = 'wing';
      wingPort.userData.baseX = wingPort.position.x;
      wingPort.userData.baseY = wingPort.position.y;
      wingPort.userData.baseZ = wingPort.position.z;
      wingPort.userData.baseRotationZ = wingPort.rotation.z;
      wingPort.visible = false;
      ship.add(wingPort);
      this.playerUpgradePorts.push(wingPort);

      const shieldPort = new Mesh(new BoxGeometry(0.06, 0.18, 0.045), portMaterial.clone());
      shieldPort.position.set(side * 0.4, -0.02, 0.42);
      shieldPort.rotation.z = side * 0.46;
      shieldPort.userData.channel = 'shield';
      shieldPort.userData.baseX = shieldPort.position.x;
      shieldPort.userData.baseY = shieldPort.position.y;
      shieldPort.userData.baseZ = shieldPort.position.z;
      shieldPort.userData.baseRotationZ = shieldPort.rotation.z;
      shieldPort.visible = false;
      ship.add(shieldPort);
      this.playerUpgradePorts.push(shieldPort);

      const tailPort = new Mesh(new BoxGeometry(0.055, 0.26, 0.045), portMaterial.clone());
      tailPort.position.set(side * 0.2, -1.12, 0.34);
      tailPort.rotation.z = side * 0.22;
      tailPort.userData.channel = 'tail';
      tailPort.userData.baseX = tailPort.position.x;
      tailPort.userData.baseY = tailPort.position.y;
      tailPort.userData.baseZ = tailPort.position.z;
      tailPort.userData.baseRotationZ = tailPort.rotation.z;
      tailPort.visible = false;
      ship.add(tailPort);
      this.playerUpgradePorts.push(tailPort);

      const escortPort = new Mesh(new BoxGeometry(0.06, 0.2, 0.045), portMaterial.clone());
      escortPort.position.set(side * 1.36, -0.78, 0.32);
      escortPort.rotation.z = side * 0.58;
      escortPort.userData.channel = 'escort';
      escortPort.userData.baseX = escortPort.position.x;
      escortPort.userData.baseY = escortPort.position.y;
      escortPort.userData.baseZ = escortPort.position.z;
      escortPort.userData.baseRotationZ = escortPort.rotation.z;
      escortPort.visible = false;
      ship.add(escortPort);
      this.playerUpgradePorts.push(escortPort);

      const escortLaunchSleeve = new Mesh(new BoxGeometry(0.1, 0.36, 0.07), droneMaterial.clone());
      escortLaunchSleeve.position.set(side * 1.5, -0.86, 0.22);
      escortLaunchSleeve.rotation.z = side * 0.58;
      escortLaunchSleeve.userData.baseX = escortLaunchSleeve.position.x;
      escortLaunchSleeve.userData.baseY = escortLaunchSleeve.position.y;
      escortLaunchSleeve.userData.baseZ = escortLaunchSleeve.position.z;
      escortLaunchSleeve.userData.baseRotationZ = escortLaunchSleeve.rotation.z;
      escortLaunchSleeve.userData.baseScale = 0.9;
      escortLaunchSleeve.visible = false;
      ship.add(escortLaunchSleeve);
      this.playerEscortMounts.push(escortLaunchSleeve);

      const escortWeaponPivot = new Mesh(new BoxGeometry(0.075, 0.16, 0.06), laserMaterial.clone());
      escortWeaponPivot.position.set(side * 1.62, -0.68, 0.24);
      escortWeaponPivot.rotation.z = side * 0.66;
      escortWeaponPivot.userData.baseX = escortWeaponPivot.position.x;
      escortWeaponPivot.userData.baseY = escortWeaponPivot.position.y;
      escortWeaponPivot.userData.baseZ = escortWeaponPivot.position.z;
      escortWeaponPivot.userData.baseRotationZ = escortWeaponPivot.rotation.z;
      escortWeaponPivot.userData.baseScale = 0.82;
      escortWeaponPivot.userData.deployOffset = 0.26;
      escortWeaponPivot.userData.detail = true;
      escortWeaponPivot.visible = false;
      ship.add(escortWeaponPivot);
      this.playerEscortMounts.push(escortWeaponPivot);

      const escortLockBeacon = new Mesh(new BoxGeometry(0.06, 0.06, 0.055), laserMaterial.clone());
      escortLockBeacon.position.set(side * 1.56, -1.04, 0.24);
      escortLockBeacon.rotation.z = Math.PI / 4;
      escortLockBeacon.userData.baseX = escortLockBeacon.position.x;
      escortLockBeacon.userData.baseY = escortLockBeacon.position.y;
      escortLockBeacon.userData.baseZ = escortLockBeacon.position.z;
      escortLockBeacon.userData.baseRotationZ = escortLockBeacon.rotation.z;
      escortLockBeacon.userData.baseScale = 0.74;
      escortLockBeacon.userData.deployOffset = 0.44;
      escortLockBeacon.userData.detail = true;
      escortLockBeacon.visible = false;
      ship.add(escortLockBeacon);
      this.playerEscortMounts.push(escortLockBeacon);

      const wingPlate = new Mesh(new BoxGeometry(0.74, 0.12, 0.08), wingMaterial.clone());
      wingPlate.position.set(side * 0.96, -0.38, 0.17);
      wingPlate.rotation.z = side * 0.32;
      wingPlate.rotation.y = -side * 0.12;
      wingPlate.userData.baseX = wingPlate.position.x;
      wingPlate.userData.baseY = wingPlate.position.y;
      wingPlate.visible = false;
      ship.add(wingPlate);
      this.playerWingArmor.push(wingPlate);

      const wingEdgeEmitter = new Mesh(new BoxGeometry(0.12, 0.62, 0.07), wingMaterial.clone());
      wingEdgeEmitter.position.set(side * 1.22, -0.48, 0.2);
      wingEdgeEmitter.rotation.z = side * 0.48;
      wingEdgeEmitter.userData.baseX = wingEdgeEmitter.position.x;
      wingEdgeEmitter.userData.baseY = wingEdgeEmitter.position.y;
      wingEdgeEmitter.userData.detail = true;
      wingEdgeEmitter.visible = false;
      ship.add(wingEdgeEmitter);
      this.playerWingArmor.push(wingEdgeEmitter);

      const wingUnderslungPod = new Mesh(new BoxGeometry(0.16, 0.34, 0.11), noseMaterial.clone());
      wingUnderslungPod.position.set(side * 0.82, -0.54, 0.05);
      wingUnderslungPod.rotation.z = side * 0.18;
      wingUnderslungPod.userData.baseX = wingUnderslungPod.position.x;
      wingUnderslungPod.userData.baseY = wingUnderslungPod.position.y;
      wingUnderslungPod.userData.detail = true;
      wingUnderslungPod.visible = false;
      ship.add(wingUnderslungPod);
      this.playerWingArmor.push(wingUnderslungPod);

      const wingAuxBarrel = new Mesh(new CylinderGeometry(0.035, 0.055, 0.62, 6), noseMaterial.clone());
      wingAuxBarrel.rotation.x = Math.PI / 2;
      wingAuxBarrel.rotation.z = side * 0.16;
      wingAuxBarrel.position.set(side * 1.04, -0.24, 0.23);
      wingAuxBarrel.userData.baseX = wingAuxBarrel.position.x;
      wingAuxBarrel.userData.baseY = wingAuxBarrel.position.y;
      wingAuxBarrel.userData.detail = true;
      wingAuxBarrel.visible = false;
      ship.add(wingAuxBarrel);
      this.playerWingArmor.push(wingAuxBarrel);

      const wingPulseMuzzle = new Mesh(new BoxGeometry(0.1, 0.1, 0.08), laserMaterial.clone());
      wingPulseMuzzle.position.set(side * 1.1, 0.02, 0.25);
      wingPulseMuzzle.rotation.z = Math.PI / 4;
      wingPulseMuzzle.userData.baseX = wingPulseMuzzle.position.x;
      wingPulseMuzzle.userData.baseY = wingPulseMuzzle.position.y;
      wingPulseMuzzle.userData.detail = true;
      wingPulseMuzzle.visible = false;
      ship.add(wingPulseMuzzle);
      this.playerWingArmor.push(wingPulseMuzzle);

      const wingStormRail = new Mesh(new BoxGeometry(0.09, 0.46, 0.06), wingMaterial.clone());
      wingStormRail.position.set(side * 1.22, -0.36, 0.28);
      wingStormRail.rotation.z = side * 0.5;
      wingStormRail.userData.baseX = wingStormRail.position.x;
      wingStormRail.userData.baseY = wingStormRail.position.y;
      wingStormRail.userData.deployOffset = 0.18;
      wingStormRail.userData.detail = true;
      wingStormRail.visible = false;
      ship.add(wingStormRail);
      this.playerWingArmor.push(wingStormRail);

      const wingSplitterEmitter = new Mesh(new BoxGeometry(0.08, 0.3, 0.06), laserMaterial.clone());
      wingSplitterEmitter.position.set(side * 1.36, -0.08, 0.3);
      wingSplitterEmitter.rotation.z = side * 0.76;
      wingSplitterEmitter.userData.baseX = wingSplitterEmitter.position.x;
      wingSplitterEmitter.userData.baseY = wingSplitterEmitter.position.y;
      wingSplitterEmitter.userData.deployOffset = 0.34;
      wingSplitterEmitter.userData.detail = true;
      wingSplitterEmitter.visible = false;
      ship.add(wingSplitterEmitter);
      this.playerWingArmor.push(wingSplitterEmitter);

      const wingCapacitorCell = new Mesh(new BoxGeometry(0.13, 0.1, 0.08), laserMaterial.clone());
      wingCapacitorCell.position.set(side * 1.18, -0.68, 0.29);
      wingCapacitorCell.rotation.z = Math.PI / 4;
      wingCapacitorCell.userData.baseX = wingCapacitorCell.position.x;
      wingCapacitorCell.userData.baseY = wingCapacitorCell.position.y;
      wingCapacitorCell.userData.deployOffset = 0.5;
      wingCapacitorCell.userData.detail = true;
      wingCapacitorCell.visible = false;
      ship.add(wingCapacitorCell);
      this.playerWingArmor.push(wingCapacitorCell);

      const tailBooster = new Mesh(new BoxGeometry(0.18, 0.28, 0.2), tailMaterial.clone());
      tailBooster.position.set(side * 0.46, -1.12, 0.12);
      tailBooster.rotation.z = side * 0.12;
      tailBooster.userData.baseY = tailBooster.position.y;
      tailBooster.visible = false;
      ship.add(tailBooster);
      this.playerTailBoosters.push(tailBooster);

      const tailHeatFin = new Mesh(new BoxGeometry(0.08, 0.42, 0.1), tailMaterial.clone());
      tailHeatFin.position.set(side * 0.62, -1.0, 0.16);
      tailHeatFin.rotation.z = side * 0.4;
      tailHeatFin.userData.baseY = tailHeatFin.position.y;
      tailHeatFin.userData.detail = true;
      tailHeatFin.visible = false;
      ship.add(tailHeatFin);
      this.playerTailBoosters.push(tailHeatFin);

      const rearExternalPylon = new Mesh(new BoxGeometry(0.08, 0.34, 0.07), tailMaterial.clone());
      rearExternalPylon.position.set(side * 0.76, -1.08, 0.1);
      rearExternalPylon.rotation.z = side * 0.22;
      rearExternalPylon.userData.baseX = rearExternalPylon.position.x;
      rearExternalPylon.userData.baseY = rearExternalPylon.position.y;
      rearExternalPylon.userData.baseZ = rearExternalPylon.position.z;
      rearExternalPylon.userData.baseRotationZ = rearExternalPylon.rotation.z;
      rearExternalPylon.userData.baseScale = 0.9;
      rearExternalPylon.visible = false;
      ship.add(rearExternalPylon);
      this.playerExternalPods.push(rearExternalPylon);

      const rearOrdnancePod = new Mesh(new BoxGeometry(0.2, 0.56, 0.15), noseMaterial.clone());
      rearOrdnancePod.position.set(side * 0.88, -1.34, 0.02);
      rearOrdnancePod.rotation.z = side * 0.08;
      rearOrdnancePod.userData.baseX = rearOrdnancePod.position.x;
      rearOrdnancePod.userData.baseY = rearOrdnancePod.position.y;
      rearOrdnancePod.userData.baseZ = rearOrdnancePod.position.z;
      rearOrdnancePod.userData.baseRotationZ = rearOrdnancePod.rotation.z;
      rearOrdnancePod.userData.baseScale = 0.86;
      rearOrdnancePod.visible = false;
      ship.add(rearOrdnancePod);
      this.playerExternalPods.push(rearOrdnancePod);

      const rearPodCap = new Mesh(new BoxGeometry(0.15, 0.1, 0.08), laserMaterial.clone());
      rearPodCap.position.set(side * 0.88, -1.02, 0.12);
      rearPodCap.rotation.z = Math.PI / 4;
      rearPodCap.userData.baseX = rearPodCap.position.x;
      rearPodCap.userData.baseY = rearPodCap.position.y;
      rearPodCap.userData.baseZ = rearPodCap.position.z;
      rearPodCap.userData.baseRotationZ = rearPodCap.rotation.z;
      rearPodCap.userData.baseScale = 0.74;
      rearPodCap.userData.detail = true;
      rearPodCap.visible = false;
      ship.add(rearPodCap);
      this.playerExternalPods.push(rearPodCap);

      const rearPodMuzzle = new Mesh(new BoxGeometry(0.1, 0.08, 0.08), laserMaterial.clone());
      rearPodMuzzle.position.set(side * 0.88, -1.68, 0.08);
      rearPodMuzzle.rotation.z = Math.PI / 4;
      rearPodMuzzle.userData.baseX = rearPodMuzzle.position.x;
      rearPodMuzzle.userData.baseY = rearPodMuzzle.position.y;
      rearPodMuzzle.userData.baseZ = rearPodMuzzle.position.z;
      rearPodMuzzle.userData.baseRotationZ = rearPodMuzzle.rotation.z;
      rearPodMuzzle.userData.baseScale = 0.78;
      rearPodMuzzle.userData.detail = true;
      rearPodMuzzle.visible = false;
      ship.add(rearPodMuzzle);
      this.playerExternalPods.push(rearPodMuzzle);

      const drone = new Mesh(new IcosahedronGeometry(0.18, 0), droneMaterial.clone());
      drone.scale.set(1.15, 0.72, 0.46);
      drone.position.set(side * 1.92, -0.76, 0.22);
      drone.rotation.z = -side * 0.28;
      drone.visible = false;

      const droneSharedMaterial = drone.material as MeshStandardMaterial;
      const droneWing = new Mesh(new BoxGeometry(0.34, 0.08, 0.05), droneSharedMaterial);
      droneWing.position.set(0, -0.02, 0);
      droneWing.rotation.z = -side * 0.18;
      drone.add(droneWing);

      const droneCore = new Mesh(new BoxGeometry(0.11, 0.11, 0.08), laserMaterial.clone());
      droneCore.position.set(0, 0.11, 0.05);
      droneCore.rotation.z = Math.PI / 4;
      droneCore.userData.glowCore = true;
      droneCore.userData.baseScaleX = droneCore.scale.x;
      droneCore.userData.baseScaleY = droneCore.scale.y;
      droneCore.userData.baseScaleZ = droneCore.scale.z;
      droneCore.userData.baseRotationZ = droneCore.rotation.z;
      drone.add(droneCore);

      const droneRearFin = new Mesh(new BoxGeometry(0.07, 0.24, 0.05), droneSharedMaterial);
      droneRearFin.position.set(-side * 0.1, -0.14, 0.02);
      droneRearFin.rotation.z = side * 0.36;
      drone.add(droneRearFin);

      const droneTwinGun = new Mesh(new BoxGeometry(0.08, 0.3, 0.05), laserMaterial.clone());
      droneTwinGun.position.set(side * 0.12, 0.18, 0.02);
      droneTwinGun.rotation.z = side * 0.08;
      drone.add(droneTwinGun);

      const droneSensorFin = new Mesh(new BoxGeometry(0.06, 0.16, 0.06), droneSharedMaterial);
      droneSensorFin.position.set(-side * 0.16, 0.03, 0.08);
      droneSensorFin.rotation.z = -side * 0.34;
      drone.add(droneSensorFin);

      const droneOuterWing = new Mesh(new BoxGeometry(0.26, 0.06, 0.05), droneSharedMaterial);
      droneOuterWing.position.set(side * 0.2, -0.04, -0.01);
      droneOuterWing.rotation.z = -side * 0.42;
      drone.add(droneOuterWing);

      const droneInnerWing = new Mesh(new BoxGeometry(0.2, 0.05, 0.05), droneSharedMaterial);
      droneInnerWing.position.set(-side * 0.18, -0.02, -0.01);
      droneInnerWing.rotation.z = side * 0.32;
      drone.add(droneInnerWing);

      const droneMuzzleTip = new Mesh(new BoxGeometry(0.06, 0.06, 0.05), laserMaterial.clone());
      droneMuzzleTip.position.set(side * 0.14, 0.34, 0.04);
      droneMuzzleTip.rotation.z = Math.PI / 4;
      droneMuzzleTip.userData.glowCore = true;
      droneMuzzleTip.userData.baseScaleX = droneMuzzleTip.scale.x;
      droneMuzzleTip.userData.baseScaleY = droneMuzzleTip.scale.y;
      droneMuzzleTip.userData.baseScaleZ = droneMuzzleTip.scale.z;
      droneMuzzleTip.userData.baseRotationZ = droneMuzzleTip.rotation.z;
      drone.add(droneMuzzleTip);

      const droneSyncBeacon = new Mesh(new IcosahedronGeometry(0.055, 0), laserMaterial.clone());
      droneSyncBeacon.scale.set(0.72, 0.72, 0.5);
      droneSyncBeacon.position.set(-side * 0.18, 0.15, 0.1);
      droneSyncBeacon.userData.glowCore = true;
      droneSyncBeacon.userData.baseScaleX = droneSyncBeacon.scale.x;
      droneSyncBeacon.userData.baseScaleY = droneSyncBeacon.scale.y;
      droneSyncBeacon.userData.baseScaleZ = droneSyncBeacon.scale.z;
      droneSyncBeacon.userData.baseRotationZ = droneSyncBeacon.rotation.z;
      drone.add(droneSyncBeacon);

      ship.add(drone);
      this.playerEscortDrones.push(drone);

      const droneLaser = new Mesh(new BoxGeometry(0.055, 1.34, 0.035), laserMaterial.clone());
      droneLaser.position.set(side * 1.92, 0.05, 0.2);
      droneLaser.visible = false;
      ship.add(droneLaser);
      this.playerEscortLasers.push(droneLaser);

      const shieldWingPetal = new Mesh(new BoxGeometry(0.28, 0.12, 0.08), shieldMaterial.clone());
      shieldWingPetal.position.set(side * 0.56, -0.02, 0.38);
      shieldWingPetal.rotation.z = side * 0.46;
      shieldWingPetal.userData.baseX = shieldWingPetal.position.x;
      shieldWingPetal.userData.baseY = shieldWingPetal.position.y;
      shieldWingPetal.visible = false;
      ship.add(shieldWingPetal);
      this.playerShieldPetals.push(shieldWingPetal);

      const shieldTailPetal = new Mesh(new BoxGeometry(0.22, 0.1, 0.07), shieldMaterial.clone());
      shieldTailPetal.position.set(side * 0.34, -0.72, 0.34);
      shieldTailPetal.rotation.z = side * 0.24;
      shieldTailPetal.userData.baseX = shieldTailPetal.position.x;
      shieldTailPetal.userData.baseY = shieldTailPetal.position.y;
      shieldTailPetal.visible = false;
      ship.add(shieldTailPetal);
      this.playerShieldPetals.push(shieldTailPetal);

      const shieldGeneratorLeaf = new Mesh(new BoxGeometry(0.08, 0.3, 0.06), shieldMaterial.clone());
      shieldGeneratorLeaf.position.set(side * 0.5, 0.02, 0.4);
      shieldGeneratorLeaf.rotation.z = side * 0.56;
      shieldGeneratorLeaf.userData.baseX = shieldGeneratorLeaf.position.x;
      shieldGeneratorLeaf.userData.baseY = shieldGeneratorLeaf.position.y;
      shieldGeneratorLeaf.userData.baseZ = shieldGeneratorLeaf.position.z;
      shieldGeneratorLeaf.userData.baseRotationZ = shieldGeneratorLeaf.rotation.z;
      shieldGeneratorLeaf.userData.baseScale = 0.86;
      shieldGeneratorLeaf.visible = false;
      ship.add(shieldGeneratorLeaf);
      this.playerShieldProjectors.push(shieldGeneratorLeaf);

      const shieldCapacitorLens = new Mesh(new BoxGeometry(0.07, 0.07, 0.06), laserMaterial.clone());
      shieldCapacitorLens.position.set(side * 0.46, 0.16, 0.46);
      shieldCapacitorLens.rotation.z = Math.PI / 4;
      shieldCapacitorLens.userData.baseX = shieldCapacitorLens.position.x;
      shieldCapacitorLens.userData.baseY = shieldCapacitorLens.position.y;
      shieldCapacitorLens.userData.baseZ = shieldCapacitorLens.position.z;
      shieldCapacitorLens.userData.baseRotationZ = shieldCapacitorLens.rotation.z;
      shieldCapacitorLens.userData.baseScale = 0.76;
      shieldCapacitorLens.userData.deployOffset = 0.28;
      shieldCapacitorLens.userData.detail = true;
      shieldCapacitorLens.visible = false;
      ship.add(shieldCapacitorLens);
      this.playerShieldProjectors.push(shieldCapacitorLens);

      const shieldRelaySink = new Mesh(new BoxGeometry(0.045, 0.18, 0.05), shieldMaterial.clone());
      shieldRelaySink.position.set(side * 0.36, -0.18, 0.38);
      shieldRelaySink.rotation.z = side * 0.42;
      shieldRelaySink.userData.baseX = shieldRelaySink.position.x;
      shieldRelaySink.userData.baseY = shieldRelaySink.position.y;
      shieldRelaySink.userData.baseZ = shieldRelaySink.position.z;
      shieldRelaySink.userData.baseRotationZ = shieldRelaySink.rotation.z;
      shieldRelaySink.userData.baseScale = 0.78;
      shieldRelaySink.userData.deployOffset = 0.48;
      shieldRelaySink.userData.detail = true;
      shieldRelaySink.visible = false;
      ship.add(shieldRelaySink);
      this.playerShieldProjectors.push(shieldRelaySink);

      const wingUltraCapacitor = new Mesh(new IcosahedronGeometry(0.13, 0), ultraMaterial.clone());
      wingUltraCapacitor.scale.set(0.85, 1.15, 0.55);
      wingUltraCapacitor.position.set(side * 1.42, -0.54, 0.28);
      wingUltraCapacitor.rotation.z = side * 0.42;
      wingUltraCapacitor.userData.channel = 'wing';
      wingUltraCapacitor.userData.baseX = wingUltraCapacitor.position.x;
      wingUltraCapacitor.userData.baseY = wingUltraCapacitor.position.y;
      wingUltraCapacitor.userData.baseZ = wingUltraCapacitor.position.z;
      wingUltraCapacitor.userData.baseScale = 1;
      wingUltraCapacitor.visible = false;
      ship.add(wingUltraCapacitor);
      this.playerUltraNodes.push(wingUltraCapacitor);

      const wingUltraBlade = new Mesh(new ConeGeometry(0.07, 0.52, 5), ultraMaterial.clone());
      wingUltraBlade.position.set(side * 1.58, -0.28, 0.24);
      wingUltraBlade.rotation.z = side * 0.92;
      wingUltraBlade.userData.channel = 'wing';
      wingUltraBlade.userData.baseX = wingUltraBlade.position.x;
      wingUltraBlade.userData.baseY = wingUltraBlade.position.y;
      wingUltraBlade.userData.baseZ = wingUltraBlade.position.z;
      wingUltraBlade.userData.baseScale = 0.82;
      wingUltraBlade.visible = false;
      ship.add(wingUltraBlade);
      this.playerUltraNodes.push(wingUltraBlade);

      const tailUltraVent = new Mesh(new ConeGeometry(0.085, 0.36, 5), ultraMaterial.clone());
      tailUltraVent.position.set(side * 0.36, -1.42, 0.2);
      tailUltraVent.rotation.z = Math.PI + side * 0.18;
      tailUltraVent.userData.channel = 'tail';
      tailUltraVent.userData.baseX = tailUltraVent.position.x;
      tailUltraVent.userData.baseY = tailUltraVent.position.y;
      tailUltraVent.userData.baseZ = tailUltraVent.position.z;
      tailUltraVent.userData.baseScale = 0.94;
      tailUltraVent.visible = false;
      ship.add(tailUltraVent);
      this.playerUltraNodes.push(tailUltraVent);

      const tailUltraAfterburner = new Mesh(new BoxGeometry(0.1, 0.46, 0.08), ultraMaterial.clone());
      tailUltraAfterburner.position.set(side * 0.56, -1.28, 0.24);
      tailUltraAfterburner.rotation.z = side * 0.38;
      tailUltraAfterburner.userData.channel = 'tail';
      tailUltraAfterburner.userData.baseX = tailUltraAfterburner.position.x;
      tailUltraAfterburner.userData.baseY = tailUltraAfterburner.position.y;
      tailUltraAfterburner.userData.baseZ = tailUltraAfterburner.position.z;
      tailUltraAfterburner.userData.baseScale = 0.86;
      tailUltraAfterburner.visible = false;
      ship.add(tailUltraAfterburner);
      this.playerUltraNodes.push(tailUltraAfterburner);

      const shieldUltraRelay = new Mesh(new BoxGeometry(0.18, 0.08, 0.08), ultraMaterial.clone());
      shieldUltraRelay.position.set(side * 0.72, -0.16, 0.52);
      shieldUltraRelay.rotation.z = side * 0.66;
      shieldUltraRelay.userData.channel = 'shield';
      shieldUltraRelay.userData.baseX = shieldUltraRelay.position.x;
      shieldUltraRelay.userData.baseY = shieldUltraRelay.position.y;
      shieldUltraRelay.userData.baseZ = shieldUltraRelay.position.z;
      shieldUltraRelay.userData.baseScale = 0.92;
      shieldUltraRelay.visible = false;
      ship.add(shieldUltraRelay);
      this.playerUltraNodes.push(shieldUltraRelay);

      const shieldUltraArc = new Mesh(new BoxGeometry(0.1, 0.5, 0.07), ultraMaterial.clone());
      shieldUltraArc.position.set(side * 0.88, -0.36, 0.5);
      shieldUltraArc.rotation.z = side * 0.86;
      shieldUltraArc.userData.channel = 'shield';
      shieldUltraArc.userData.baseX = shieldUltraArc.position.x;
      shieldUltraArc.userData.baseY = shieldUltraArc.position.y;
      shieldUltraArc.userData.baseZ = shieldUltraArc.position.z;
      shieldUltraArc.userData.baseScale = 0.78;
      shieldUltraArc.visible = false;
      ship.add(shieldUltraArc);
      this.playerUltraNodes.push(shieldUltraArc);

      const escortUltraAnchor = new Mesh(new BoxGeometry(0.11, 0.22, 0.07), ultraMaterial.clone());
      escortUltraAnchor.position.set(side * 1.62, -0.66, 0.34);
      escortUltraAnchor.rotation.z = -side * 0.32;
      escortUltraAnchor.userData.channel = 'escort';
      escortUltraAnchor.userData.baseX = escortUltraAnchor.position.x;
      escortUltraAnchor.userData.baseY = escortUltraAnchor.position.y;
      escortUltraAnchor.userData.baseZ = escortUltraAnchor.position.z;
      escortUltraAnchor.userData.baseScale = 0.9;
      escortUltraAnchor.visible = false;
      ship.add(escortUltraAnchor);
      this.playerUltraNodes.push(escortUltraAnchor);

      const escortUltraWinglet = new Mesh(new ConeGeometry(0.055, 0.34, 5), ultraMaterial.clone());
      escortUltraWinglet.position.set(side * 1.84, -0.48, 0.38);
      escortUltraWinglet.rotation.z = -side * 0.72;
      escortUltraWinglet.userData.channel = 'escort';
      escortUltraWinglet.userData.baseX = escortUltraWinglet.position.x;
      escortUltraWinglet.userData.baseY = escortUltraWinglet.position.y;
      escortUltraWinglet.userData.baseZ = escortUltraWinglet.position.z;
      escortUltraWinglet.userData.baseScale = 0.76;
      escortUltraWinglet.visible = false;
      ship.add(escortUltraWinglet);
      this.playerUltraNodes.push(escortUltraWinglet);
    }

    const centerCannon = new Mesh(new ConeGeometry(0.12, 0.72, 5), noseMaterial.clone());
    centerCannon.rotation.x = Math.PI / 2;
    centerCannon.position.set(0, 0.98, 0.18);
    centerCannon.userData.baseY = centerCannon.position.y;
    centerCannon.visible = false;
    ship.add(centerCannon);
    this.playerNoseCannons.push(centerCannon);

    for (const side of [-1, 1]) {
      const sideCannon = new Mesh(new BoxGeometry(0.1, 0.58, 0.08), noseMaterial.clone());
      sideCannon.position.set(side * 0.32, 0.58, 0.2);
      sideCannon.rotation.z = side * 0.12;
      sideCannon.userData.baseY = sideCannon.position.y;
      sideCannon.visible = false;
      ship.add(sideCannon);
      this.playerNoseCannons.push(sideCannon);

      const microRail = new Mesh(new BoxGeometry(0.06, 0.36, 0.06), noseMaterial.clone());
      microRail.position.set(side * 0.18, 0.84, 0.26);
      microRail.rotation.z = side * 0.08;
      microRail.userData.baseY = microRail.position.y;
      microRail.userData.detail = true;
      microRail.visible = false;
      ship.add(microRail);
      this.playerNoseCannons.push(microRail);

      const noseRailShroud = new Mesh(new BoxGeometry(0.08, 0.42, 0.06), noseMaterial.clone());
      noseRailShroud.position.set(side * 0.28, 0.88, 0.27);
      noseRailShroud.rotation.z = side * 0.16;
      noseRailShroud.userData.baseY = noseRailShroud.position.y;
      noseRailShroud.userData.deployOffset = 0.18;
      noseRailShroud.userData.detail = true;
      noseRailShroud.visible = false;
      ship.add(noseRailShroud);
      this.playerNoseCannons.push(noseRailShroud);

      const noseMuzzleLens = new Mesh(new BoxGeometry(0.06, 0.06, 0.06), laserMaterial.clone());
      noseMuzzleLens.position.set(side * 0.22, 1.18, 0.28);
      noseMuzzleLens.rotation.z = Math.PI / 4;
      noseMuzzleLens.userData.baseY = noseMuzzleLens.position.y;
      noseMuzzleLens.userData.deployOffset = 0.36;
      noseMuzzleLens.userData.detail = true;
      noseMuzzleLens.visible = false;
      ship.add(noseMuzzleLens);
      this.playerNoseCannons.push(noseMuzzleLens);

      const noseHeatSink = new Mesh(new BoxGeometry(0.045, 0.18, 0.05), noseMaterial.clone());
      noseHeatSink.position.set(side * 0.34, 0.68, 0.24);
      noseHeatSink.rotation.z = side * 0.22;
      noseHeatSink.userData.baseY = noseHeatSink.position.y;
      noseHeatSink.userData.deployOffset = 0.52;
      noseHeatSink.userData.detail = true;
      noseHeatSink.visible = false;
      ship.add(noseHeatSink);
      this.playerNoseCannons.push(noseHeatSink);
    }

    const noseUltraPrism = new Mesh(new IcosahedronGeometry(0.15, 0), ultraMaterial.clone());
    noseUltraPrism.scale.set(0.82, 1.28, 0.6);
    noseUltraPrism.position.set(0, 1.22, 0.3);
    noseUltraPrism.userData.channel = 'nose';
    noseUltraPrism.userData.baseX = noseUltraPrism.position.x;
    noseUltraPrism.userData.baseY = noseUltraPrism.position.y;
    noseUltraPrism.userData.baseZ = noseUltraPrism.position.z;
    noseUltraPrism.userData.baseScale = 1;
    noseUltraPrism.visible = false;
    ship.add(noseUltraPrism);
    this.playerUltraNodes.push(noseUltraPrism);

    for (const side of [-1, 1]) {
      const noseUltraRail = new Mesh(new BoxGeometry(0.07, 0.54, 0.06), ultraMaterial.clone());
      noseUltraRail.position.set(side * 0.24, 1.04, 0.32);
      noseUltraRail.rotation.z = side * 0.2;
      noseUltraRail.userData.channel = 'nose';
      noseUltraRail.userData.baseX = noseUltraRail.position.x;
      noseUltraRail.userData.baseY = noseUltraRail.position.y;
      noseUltraRail.userData.baseZ = noseUltraRail.position.z;
      noseUltraRail.userData.baseScale = 0.84;
      noseUltraRail.visible = false;
      ship.add(noseUltraRail);
      this.playerUltraNodes.push(noseUltraRail);
    }
  }

  private applyPlayerVisualUpgrade(type: WeaponUpgradeType): void {
    if (type === 'spread' || type === 'fork' || type === 'wing') {
      this.visualWingLevel = Math.min(RENDER_UPGRADE_MAX_LEVEL, this.visualWingLevel + 1);
    }

    if (type === 'damage' || type === 'pierce' || type === 'heavy' || type === 'velocity' || type === 'surge' || type === 'critical') {
      this.visualNoseLevel = Math.min(RENDER_UPGRADE_MAX_LEVEL, this.visualNoseLevel + 1);
    }

    if (type === 'rapid' || type === 'capacitor' || type === 'arsenal' || type === 'shield' || type === 'pulse') {
      this.visualTailLevel = Math.min(RENDER_UPGRADE_MAX_LEVEL, this.visualTailLevel + 1);
    }

    if (type === 'shield') {
      this.visualShieldLevel = Math.min(RENDER_UPGRADE_MAX_LEVEL, this.visualShieldLevel + 1);
    }

    if (type === 'wing' || type === 'arsenal' || type === 'magnet' || type === 'salvage') {
      this.visualEscortLevel = Math.min(RENDER_UPGRADE_MAX_LEVEL, this.visualEscortLevel + (type === 'wing' ? 2 : 1));
    }

    if (type === 'surge' || type === 'critical' || type === 'pierce' || type === 'wing') {
      this.visualLaserLevel = Math.min(RENDER_UPGRADE_MAX_LEVEL, this.visualLaserLevel + 1);
    }
  }

  private updatePlayerEvolutionVisuals(firing: boolean, strafe: number, trickEnvelope: number, forwardRatio: number): void {
    const wingRatio = this.visualWingLevel / RENDER_UPGRADE_MAX_LEVEL;
    const noseRatio = this.visualNoseLevel / RENDER_UPGRADE_MAX_LEVEL;
    const tailRatio = this.visualTailLevel / RENDER_UPGRADE_MAX_LEVEL;
    const escortRatio = this.visualEscortLevel / RENDER_UPGRADE_MAX_LEVEL;
    const laserRatio = this.visualLaserLevel / RENDER_UPGRADE_MAX_LEVEL;
    const shieldRatio = this.visualShieldLevel / RENDER_UPGRADE_MAX_LEVEL;
    const detailedEvolution = this.performanceTier < 2;
    const firePulse = firing ? 1 + Math.sin(this.elapsed * 26) * 0.12 : 0.72 + Math.sin(this.elapsed * 8) * 0.05;
    const wingUltra = this.visualWingLevel >= RENDER_UPGRADE_MAX_LEVEL ? 1 : 0;
    const noseUltra = this.visualNoseLevel >= RENDER_UPGRADE_MAX_LEVEL ? 1 : 0;
    const tailUltra = this.visualTailLevel >= RENDER_UPGRADE_MAX_LEVEL ? 1 : 0;
    const escortUltra = this.visualEscortLevel >= RENDER_UPGRADE_MAX_LEVEL ? 1 : 0;
    const shieldUltra = this.visualShieldLevel >= RENDER_UPGRADE_MAX_LEVEL ? 1 : 0;
    const ultraPulse = 0.5 + Math.sin(this.elapsed * 7.2) * 0.5;

    for (let i = 0; i < this.playerWingArmor.length; i += 1) {
      const mesh = this.playerWingArmor[i];
      const side = mesh.position.x < 0 ? -1 : 1;
      const material = mesh.material as MeshStandardMaterial;
      const deployOffset = typeof mesh.userData.deployOffset === 'number' ? mesh.userData.deployOffset : 0;
      const deploy = Math.min(1, Math.max(0, (wingRatio - deployOffset) / Math.max(0.18, 1 - deployOffset)));
      mesh.visible = deploy > 0.01 && (detailedEvolution || mesh.userData.detail !== true);
      material.opacity = Math.min(0.94, 0.24 + deploy * 0.66 + wingUltra * 0.08);
      material.emissiveIntensity = 0.92 + deploy * 1.7 + trickEnvelope * 0.8 + wingUltra * (0.7 + ultraPulse * 0.5);
      const baseY = typeof mesh.userData.baseY === 'number' ? mesh.userData.baseY : -0.38;
      const baseX = typeof mesh.userData.baseX === 'number' ? mesh.userData.baseX : mesh.position.x;
      mesh.position.x = baseX + side * wingUltra * Math.sin(this.elapsed * 4.4 + i) * 0.006;
      mesh.position.y = baseY + deploy * 0.06 + wingUltra * 0.04 + Math.sin(this.elapsed * 5 + side) * (0.015 + wingUltra * 0.01);
      mesh.scale.set(0.78 + deploy * 0.59 + wingUltra * 0.16, 0.76 + deploy * 0.28 + wingUltra * 0.12, 0.7 + deploy * 0.38 + wingUltra * 0.1);
    }

    for (let i = 0; i < this.playerNoseCannons.length; i += 1) {
      const mesh = this.playerNoseCannons[i];
      const material = mesh.material as MeshStandardMaterial;
      const deployOffset = typeof mesh.userData.deployOffset === 'number' ? mesh.userData.deployOffset : 0;
      const deploy = Math.min(1, Math.max(0, (noseRatio - deployOffset) / Math.max(0.18, 1 - deployOffset)));
      mesh.visible = deploy > 0.01 && (detailedEvolution || mesh.userData.detail !== true);
      material.opacity = Math.min(0.96, 0.3 + deploy * 0.62 + noseUltra * 0.06);
      material.emissiveIntensity = 1.1 + deploy * 1.8 + (firing ? 0.45 : 0) + noseUltra * (0.8 + ultraPulse * 0.5);
      const sideOffset = i === 0 ? 0 : mesh.position.x < 0 ? -1 : 1;
      const baseY = typeof mesh.userData.baseY === 'number' ? mesh.userData.baseY : i === 0 ? 0.98 : 0.58;
      mesh.position.y = baseY + deploy * 0.1 + noseUltra * 0.08;
      mesh.rotation.z = sideOffset * (0.12 + deploy * 0.08 + noseUltra * 0.06 + Math.sin(this.elapsed * 7 + i) * 0.015);
      mesh.scale.setScalar(0.8 + deploy * 0.44 + noseUltra * 0.18 + (firing ? 0.06 : 0));
    }

    for (let i = 0; i < this.playerTailBoosters.length; i += 1) {
      const mesh = this.playerTailBoosters[i];
      const side = mesh.position.x < 0 ? -1 : 1;
      const material = mesh.material as MeshStandardMaterial;
      mesh.visible = this.visualTailLevel > 0 && (detailedEvolution || mesh.userData.detail !== true);
      material.opacity = Math.min(0.94, 0.3 + tailRatio * 0.56 + tailUltra * 0.08);
      material.emissiveIntensity = 1.0 + tailRatio * 1.65 + forwardRatio * 0.8 + tailUltra * (0.75 + ultraPulse * 0.65);
      const baseY = typeof mesh.userData.baseY === 'number' ? mesh.userData.baseY : -1.12;
      mesh.position.y = baseY - tailRatio * 0.04 - tailUltra * 0.05;
      mesh.scale.set(0.88 + tailRatio * 0.32 + tailUltra * 0.12, 0.84 + tailRatio * 0.56 + tailUltra * 0.2, 0.82 + tailRatio * 0.4 + tailUltra * 0.14);
      mesh.rotation.z = side * (0.12 + Math.max(0, -side * strafe) * 0.14 + tailUltra * 0.08);
    }

    for (let i = 0; i < this.playerExternalPods.length; i += 1) {
      const mesh = this.playerExternalPods[i];
      const baseX = typeof mesh.userData.baseX === 'number' ? mesh.userData.baseX : mesh.position.x;
      const side = baseX < 0 ? -1 : 1;
      const material = mesh.material as MeshStandardMaterial;
      mesh.visible = tailRatio > 0.24 && (detailedEvolution || mesh.userData.detail !== true);
      if (!mesh.visible) {
        continue;
      }

      const baseY = typeof mesh.userData.baseY === 'number' ? mesh.userData.baseY : mesh.position.y;
      const baseZ = typeof mesh.userData.baseZ === 'number' ? mesh.userData.baseZ : mesh.position.z;
      const baseRotationZ =
        typeof mesh.userData.baseRotationZ === 'number' ? mesh.userData.baseRotationZ : mesh.rotation.z;
      const baseScale = typeof mesh.userData.baseScale === 'number' ? mesh.userData.baseScale : 0.84;
      const deploy = Math.min(1, Math.max(0, (tailRatio - 0.24) / 0.76));
      const podPulse = 0.5 + Math.sin(this.elapsed * 8.6 + i * 0.63) * 0.5;
      material.opacity = Math.min(0.96, 0.18 + deploy * 0.6 + tailUltra * 0.12);
      material.emissiveIntensity =
        1.05 + deploy * 1.75 + tailUltra * (0.9 + ultraPulse * 0.7) + (firing ? 0.22 : 0);
      mesh.position.set(
        baseX + side * (deploy * 0.08 + tailUltra * 0.06) + Math.sin(this.elapsed * 3.8 + i) * 0.006,
        baseY - deploy * 0.08 - tailUltra * 0.04 + podPulse * 0.012,
        baseZ + deploy * 0.03 + tailUltra * 0.025 + trickEnvelope * 0.012
      );
      mesh.rotation.z =
        baseRotationZ +
        side * (deploy * 0.05 + tailUltra * 0.05) +
        Math.sin(this.elapsed * 5.2 + i) * 0.012;
      const scale = baseScale * (0.72 + deploy * 0.36 + tailUltra * 0.16 + podPulse * 0.06);
      mesh.scale.set(scale, scale, scale * (0.9 + deploy * 0.08));
    }

    for (let i = 0; i < this.playerShieldPetals.length; i += 1) {
      const mesh = this.playerShieldPetals[i];
      const side = mesh.position.x < 0 ? -1 : 1;
      const material = mesh.material as MeshStandardMaterial;
      const shieldPulse = this.temporaryShield > 0 ? 0.18 + Math.sin(this.elapsed * 10 + i) * 0.08 : 0;
      const baseX = typeof mesh.userData.baseX === 'number' ? mesh.userData.baseX : mesh.position.x;
      const baseY = typeof mesh.userData.baseY === 'number' ? mesh.userData.baseY : mesh.position.y;
      mesh.visible = detailedEvolution && (this.visualShieldLevel > 0 || this.temporaryShield > 0);
      material.opacity = Math.min(0.86, 0.16 + shieldRatio * 0.48 + shieldPulse + shieldUltra * 0.1);
      material.emissiveIntensity = 1.0 + shieldRatio * 1.4 + shieldPulse * 3.2 + shieldUltra * (0.65 + ultraPulse * 0.7);
      mesh.position.set(
        baseX + side * (shieldRatio * 0.08 + shieldPulse * 0.16 + shieldUltra * 0.08),
        baseY + Math.sin(this.elapsed * 3.4 + i) * 0.012,
        0.34 + shieldRatio * 0.08 + shieldPulse * 0.12 + shieldUltra * 0.07
      );
      mesh.scale.set(0.82 + shieldRatio * 0.46 + shieldUltra * 0.16, 0.76 + shieldRatio * 0.32 + shieldUltra * 0.18, 0.76 + shieldRatio * 0.22 + shieldUltra * 0.12);
    }

    for (let i = 0; i < this.playerShieldProjectors.length; i += 1) {
      const mesh = this.playerShieldProjectors[i];
      const baseX = typeof mesh.userData.baseX === 'number' ? mesh.userData.baseX : mesh.position.x;
      const side = baseX < 0 ? -1 : 1;
      const material = mesh.material as MeshStandardMaterial;
      const shieldPulse = this.temporaryShield > 0 ? 0.18 + Math.sin(this.elapsed * 10.5 + i) * 0.08 : 0;
      const shieldDeployRatio = Math.max(shieldRatio, this.temporaryShield > 0 ? 0.36 : 0);
      const deployOffset = typeof mesh.userData.deployOffset === 'number' ? mesh.userData.deployOffset : 0;
      const deploy = Math.min(1, Math.max(0, (shieldDeployRatio - deployOffset) / Math.max(0.18, 1 - deployOffset)));
      mesh.visible = detailedEvolution && deploy > 0.01;
      if (!mesh.visible) {
        continue;
      }

      const baseY = typeof mesh.userData.baseY === 'number' ? mesh.userData.baseY : mesh.position.y;
      const baseZ = typeof mesh.userData.baseZ === 'number' ? mesh.userData.baseZ : mesh.position.z;
      const baseRotationZ =
        typeof mesh.userData.baseRotationZ === 'number' ? mesh.userData.baseRotationZ : mesh.rotation.z;
      const baseScale = typeof mesh.userData.baseScale === 'number' ? mesh.userData.baseScale : 0.82;
      const pulse = 0.5 + Math.sin(this.elapsed * 8.8 + i * 0.7) * 0.5;
      material.opacity = Math.min(0.88, 0.14 + deploy * 0.5 + shieldPulse + shieldUltra * 0.1);
      material.emissiveIntensity = 1.15 + deploy * 1.5 + shieldPulse * 3 + shieldUltra * (0.7 + ultraPulse * 0.65);
      mesh.position.set(
        baseX + side * (deploy * 0.05 + shieldPulse * 0.12 + shieldUltra * 0.05),
        baseY + Math.sin(this.elapsed * 3.8 + i) * 0.012,
        baseZ + deploy * 0.04 + shieldPulse * 0.1 + shieldUltra * 0.06
      );
      mesh.rotation.z = baseRotationZ + side * (deploy * 0.04 + shieldUltra * 0.05) + Math.sin(this.elapsed * 4.8 + i) * 0.012;
      const scale = baseScale * (0.76 + deploy * 0.42 + shieldUltra * 0.16 + pulse * 0.05);
      mesh.scale.set(scale, scale * (0.92 + deploy * 0.08), scale * (0.86 + deploy * 0.12));
    }

    for (let i = 0; i < this.playerUltraNodes.length; i += 1) {
      const mesh = this.playerUltraNodes[i];
      const channel = mesh.userData.channel as string;
      let ratio = 0;
      if (channel === 'wing') {
        ratio = wingRatio;
      } else if (channel === 'nose') {
        ratio = noseRatio;
      } else if (channel === 'tail') {
        ratio = tailRatio;
      } else if (channel === 'escort') {
        ratio = escortRatio;
      } else if (channel === 'shield') {
        ratio = shieldRatio;
      }

      mesh.visible = detailedEvolution && ratio >= 1;
      if (!mesh.visible) {
        continue;
      }

      const material = mesh.material as MeshStandardMaterial;
      const pulse = 0.5 + Math.sin(this.elapsed * 10 + i * 0.7) * 0.5;
      const baseX = typeof mesh.userData.baseX === 'number' ? mesh.userData.baseX : mesh.position.x;
      const baseY = typeof mesh.userData.baseY === 'number' ? mesh.userData.baseY : mesh.position.y;
      const baseZ = typeof mesh.userData.baseZ === 'number' ? mesh.userData.baseZ : mesh.position.z;
      const baseScale = typeof mesh.userData.baseScale === 'number' ? mesh.userData.baseScale : 1;
      const baseRotationZ = typeof mesh.userData.baseRotationZ === 'number' ? mesh.userData.baseRotationZ : mesh.rotation.z;
      mesh.userData.baseRotationZ = baseRotationZ;
      material.opacity = Math.min(0.96, 0.48 + pulse * 0.36 + trickEnvelope * 0.1);
      material.emissiveIntensity = 2.4 + pulse * 1.8 + (firing ? 0.65 : 0);
      mesh.position.set(
        baseX + Math.sin(this.elapsed * 4.2 + i) * 0.018,
        baseY + pulse * 0.028,
        baseZ + trickEnvelope * 0.018
      );
      mesh.rotation.y = Math.sin(this.elapsed * 5.2 + i) * 0.18;
      mesh.rotation.z = baseRotationZ + Math.sin(this.elapsed * 3.6 + i) * 0.015;
      mesh.scale.setScalar(baseScale * (1.08 + pulse * 0.2 + trickEnvelope * 0.08));
    }

    for (let i = 0; i < this.playerUpgradePorts.length; i += 1) {
      const mesh = this.playerUpgradePorts[i];
      const channel = mesh.userData.channel as string;
      let ratio = 0;
      if (channel === 'wing') {
        ratio = wingRatio;
      } else if (channel === 'nose') {
        ratio = noseRatio;
      } else if (channel === 'tail') {
        ratio = tailRatio;
      } else if (channel === 'escort') {
        ratio = escortRatio;
      } else if (channel === 'shield') {
        ratio = Math.max(shieldRatio, this.temporaryShield > 0 ? 0.32 : 0);
      }

      mesh.visible = detailedEvolution && ratio > 0;
      if (!mesh.visible) {
        continue;
      }

      const material = mesh.material as MeshStandardMaterial;
      const baseX = typeof mesh.userData.baseX === 'number' ? mesh.userData.baseX : mesh.position.x;
      const baseY = typeof mesh.userData.baseY === 'number' ? mesh.userData.baseY : mesh.position.y;
      const baseZ = typeof mesh.userData.baseZ === 'number' ? mesh.userData.baseZ : mesh.position.z;
      const baseRotationZ = typeof mesh.userData.baseRotationZ === 'number' ? mesh.userData.baseRotationZ : mesh.rotation.z;
      const pulse = 0.5 + Math.sin(this.elapsed * 9.4 + i * 0.74) * 0.5;
      const ultraBoost = ratio >= 1 ? 0.24 + ultraPulse * 0.14 : 0;
      material.opacity = Math.min(0.82, 0.12 + ratio * 0.44 + pulse * 0.12 + ultraBoost);
      material.emissiveIntensity = 1.2 + ratio * 2.2 + pulse * 0.7 + ultraBoost * 3;
      mesh.position.set(
        baseX + Math.sin(this.elapsed * 3.8 + i) * (0.004 + ratio * 0.006),
        baseY + pulse * (0.006 + ratio * 0.012),
        baseZ + ratio * 0.018 + trickEnvelope * 0.012
      );
      mesh.rotation.z = baseRotationZ + Math.sin(this.elapsed * 5.2 + i) * (0.012 + ratio * 0.014);
      mesh.scale.set(0.8 + ratio * 0.28 + ultraBoost, 0.82 + ratio * 0.34 + ultraBoost, 0.76 + ratio * 0.22 + ultraBoost * 0.6);
    }

    for (let i = 0; i < this.playerEscortMounts.length; i += 1) {
      const mesh = this.playerEscortMounts[i];
      const baseX = typeof mesh.userData.baseX === 'number' ? mesh.userData.baseX : mesh.position.x;
      const side = baseX < 0 ? -1 : 1;
      const material = mesh.material as MeshStandardMaterial;
      const deployOffset = typeof mesh.userData.deployOffset === 'number' ? mesh.userData.deployOffset : 0;
      const deploy = Math.min(1, Math.max(0, (escortRatio - deployOffset) / Math.max(0.18, 1 - deployOffset)));
      mesh.visible = deploy > 0.01 && (detailedEvolution || mesh.userData.detail !== true);
      if (!mesh.visible) {
        continue;
      }

      const baseY = typeof mesh.userData.baseY === 'number' ? mesh.userData.baseY : mesh.position.y;
      const baseZ = typeof mesh.userData.baseZ === 'number' ? mesh.userData.baseZ : mesh.position.z;
      const baseRotationZ =
        typeof mesh.userData.baseRotationZ === 'number' ? mesh.userData.baseRotationZ : mesh.rotation.z;
      const baseScale = typeof mesh.userData.baseScale === 'number' ? mesh.userData.baseScale : 0.84;
      const pulse = 0.5 + Math.sin(this.elapsed * 8.2 + i * 0.9) * 0.5;
      const laserActive = this.performanceTier < 2 && this.visualLaserLevel > 0 && (firing || this.visualLaserLevel >= 4);
      material.opacity = Math.min(0.94, 0.18 + deploy * 0.58 + escortUltra * 0.1);
      material.emissiveIntensity =
        1.05 + deploy * 1.6 + escortUltra * (0.75 + ultraPulse * 0.6) + (laserActive ? 0.35 : 0);
      mesh.position.set(
        baseX + side * (deploy * 0.07 + escortUltra * 0.06) + Math.sin(this.elapsed * 4 + i) * 0.006,
        baseY + deploy * 0.05 + escortUltra * 0.04 + pulse * 0.01,
        baseZ + deploy * 0.04 + escortUltra * 0.04 + trickEnvelope * 0.012
      );
      mesh.rotation.z =
        baseRotationZ + side * (deploy * 0.05 + escortUltra * 0.05) + Math.sin(this.elapsed * 5.4 + i) * 0.012;
      const scale = baseScale * (0.76 + deploy * 0.36 + escortUltra * 0.16 + pulse * 0.05);
      mesh.scale.set(scale, scale * (0.9 + deploy * 0.12), scale * (0.86 + deploy * 0.12));
    }

    for (let i = 0; i < this.playerEscortDrones.length; i += 1) {
      const drone = this.playerEscortDrones[i];
      const laser = this.playerEscortLasers[i];
      const side = i === 0 ? -1 : 1;
      const droneMaterial = drone.material as MeshStandardMaterial;
      const laserMaterial = laser.material as MeshStandardMaterial;
      const bob = Math.sin(this.elapsed * 4.8 + i * Math.PI) * 0.05;
      const orbit = Math.sin(this.elapsed * 2.6 + i * Math.PI) * 0.08;
      const laserActive = this.performanceTier < 2 && this.visualLaserLevel > 0 && (firing || this.visualLaserLevel >= 4);

      drone.visible = detailedEvolution && this.visualEscortLevel > 0;
      droneMaterial.opacity = Math.min(0.94, 0.26 + escortRatio * 0.62 + escortUltra * 0.06);
      droneMaterial.emissiveIntensity = 1.0 + escortRatio * 1.6 + (laserActive ? 0.55 : 0) + escortUltra * (0.65 + ultraPulse * 0.55);
      for (const child of drone.children) {
        const childMesh = child as Mesh;
        const childMaterial = childMesh.material as MeshStandardMaterial | MeshStandardMaterial[];
        if (Array.isArray(childMaterial)) {
          continue;
        }
        childMaterial.opacity = Math.min(0.94, 0.24 + escortRatio * 0.64 + escortUltra * 0.06);
        const glowCore = childMesh.userData.glowCore === true;
        const corePulse = glowCore ? 0.5 + Math.sin(this.elapsed * 12 + i * 0.9) * 0.5 : 0;
        childMaterial.emissiveIntensity = glowCore
          ? 2 + escortRatio * 2 + escortUltra * 0.8 + (laserActive ? 0.7 : 0.15) * corePulse
          : droneMaterial.emissiveIntensity;
        if (glowCore) {
          const baseScaleX = typeof childMesh.userData.baseScaleX === 'number' ? childMesh.userData.baseScaleX : 1;
          const baseScaleY = typeof childMesh.userData.baseScaleY === 'number' ? childMesh.userData.baseScaleY : 1;
          const baseScaleZ = typeof childMesh.userData.baseScaleZ === 'number' ? childMesh.userData.baseScaleZ : 1;
          const baseRotationZ = typeof childMesh.userData.baseRotationZ === 'number' ? childMesh.userData.baseRotationZ : childMesh.rotation.z;
          const activePulse = 1 + corePulse * (laserActive ? 0.18 : 0.08);
          childMesh.scale.set(baseScaleX * activePulse, baseScaleY * activePulse, baseScaleZ * activePulse);
          childMesh.rotation.z = baseRotationZ + corePulse * (laserActive ? 0.08 : 0.03);
        }
      }
      drone.position.set(
        side * (1.58 + escortRatio * 0.55 + escortUltra * 0.18 + Math.abs(strafe) * 0.12),
        -0.72 + escortRatio * 0.22 + escortUltra * 0.08 + bob,
        0.18 + orbit + trickEnvelope * 0.045
      );
      drone.rotation.set(0.08 + bob * 0.5, -side * (0.2 + strafe * 0.08), -side * (0.22 + trickEnvelope * 0.16));
      drone.scale.set(0.88 + escortRatio * 0.34 + escortUltra * 0.14, 0.58 + escortRatio * 0.2 + escortUltra * 0.1, 0.36 + escortRatio * 0.18 + escortUltra * 0.08);

      laser.visible = detailedEvolution && laserActive && this.visualEscortLevel > 0;
      laserMaterial.opacity = Math.min(0.76, (0.16 + laserRatio * 0.52) * firePulse);
      laserMaterial.emissiveIntensity = 2.1 + laserRatio * 2.5;
      laser.position.set(drone.position.x + side * 0.04, drone.position.y + 0.78 + laserRatio * 0.2, drone.position.z - 0.02);
      laser.scale.set(0.8 + laserRatio * 0.45, 0.72 + laserRatio * 1.05, 0.8 + laserRatio * 0.35);
    }
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
    const stars = new InstancedMesh(geometry, material, STAR_COUNT);
    stars.instanceMatrix.setUsage(DynamicDrawUsage);

    for (let i = 0; i < stars.count; i += 1) {
      const x = seededRange(i * 13, -8.2, 8.2);
      const y = seededRange(i * 29, -12, 15);
      const z = seededRange(i * 41, -9, -2.8);
      const scale = seededRange(i * 17, 0.55, 2.4);
      this.starX[i] = x;
      this.starY[i] = y;
      this.starZ[i] = z;
      this.starScale[i] = scale;
      this.starSpeed[i] = 0.24 + (i % 7) * 0.045;
      this.writeStarMatrix(stars, i);
    }

    return stars;
  }

  private writeStarMatrix(target: InstancedMesh, index: number): void {
    const elements = target.instanceMatrix.array;
    const offset = index * 16;
    const scale = this.starScale[index];
    elements[offset] = scale;
    elements[offset + 1] = 0;
    elements[offset + 2] = 0;
    elements[offset + 3] = 0;
    elements[offset + 4] = 0;
    elements[offset + 5] = scale;
    elements[offset + 6] = 0;
    elements[offset + 7] = 0;
    elements[offset + 8] = 0;
    elements[offset + 9] = 0;
    elements[offset + 10] = scale;
    elements[offset + 11] = 0;
    elements[offset + 12] = this.starX[index];
    elements[offset + 13] = this.starY[index];
    elements[offset + 14] = this.starZ[index];
    elements[offset + 15] = 1;
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
  const base = variant === 12 ? 3.32 : variant === 11 ? 3.18 : 2.85;
  const minimum = mobileProfile ? 2.55 : 2.25;
  const mobileScale = mobileProfile ? 1.16 : 1;
  return Math.max(minimum, (base - phase * 0.04) * mobileScale);
}
