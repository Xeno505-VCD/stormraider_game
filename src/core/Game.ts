import { Clock } from 'three';
import { Renderer, type RenderStats } from '../render/Renderer';
import { Hud } from '../ui/Hud';
import { ResultPanel } from '../ui/ResultPanel';
import { StartPanel } from '../ui/StartPanel';
import { UpgradePanel, type UpgradeOption } from '../ui/UpgradePanel';
import { InputRouter } from '../input/InputRouter';
import type { GameConfig, UpgradeOptionDefinition } from '../data/GameConfig';
import { LocalRunStore, type RunRecord, type RunUpgradeRecord, type StoredRecords } from '../data/LocalRunStore';
import type { WeaponUpgradeType } from '../gameplay/PlayerBulletPool';
import { SoundEngine } from '../audio/SoundEngine';

type GameMode = 'ready' | 'running' | 'paused' | 'upgrade' | 'complete';

type StormraiderDebugStats = {
  mode: GameMode;
  score: number;
  hp: number;
  kills: number;
  survivalSeconds: number;
  activeEnemies: number;
  activeBullets: number;
  activeEnemyBullets: number;
  activeExplosions: number;
  activeHazards: number;
  bossActive: boolean;
  bossHp: number;
  bossMaxHp: number;
  bossPhase: number;
  bossVariant: number;
  performanceTier: number;
  estimatedFps: number;
  renderPixelRatio: number;
  enemyModelDetailsEnabled: boolean;
};

declare global {
  interface Window {
    __stormraiderStats?: StormraiderDebugStats;
  }
}

const MAX_UPGRADE_LEVEL = 7;
const SOFT_UPGRADE_CAP = 6;
const MAX_ULTRA_UPGRADES = 3;
const UPGRADE_LEVEL_COLORS = ['#27d8ff', '#3df2c9', '#84ff6d', '#ffd36d', '#ff8a3d', '#ff3ea5'];
const DEFAULT_ULTRA_COLORS = new Map<string, string>([
  ['spread', '#27d8ff'],
  ['damage', '#ff3ea5'],
  ['rapid', '#ffcf33'],
  ['velocity', '#7affd6'],
  ['pierce', '#9b5cff'],
  ['heavy', '#ff6a2a'],
  ['fork', '#bdefff'],
  ['chain', '#68ffb0'],
  ['magnet', '#5ee1ff'],
  ['wing', '#d8fbff'],
  ['surge', '#fff1a6'],
  ['capacitor', '#b17cff'],
  ['arsenal', '#ffb36d'],
  ['shield', '#68ffb0'],
  ['pulse', '#ff79c8'],
  ['salvage', '#7affd6'],
  ['critical', '#ff2df5']
]);
const OFFENSE_UPGRADES = new Set<string>([
  'spread',
  'damage',
  'rapid',
  'velocity',
  'pierce',
  'heavy',
  'fork',
  'chain',
  'wing',
  'surge',
  'critical'
]);

export class Game {
  private readonly clock = new Clock();
  private readonly renderer: Renderer;
  private readonly hud = new Hud();
  private readonly resultPanel = new ResultPanel({
    onResume: () => this.resume(),
    onRestart: () => this.restart()
  });
  private readonly input = new InputRouter();
  private readonly startPanel = new StartPanel({
    onStart: () => this.beginRun()
  });
  private animationFrame = 0;
  private mode: GameMode = 'ready';
  private score = 0;
  private hp = 100;
  private kills = 0;
  private survivalSeconds = 0;
  private upgradeCharge = 0;
  private upgradeThreshold = upgradeThresholdForStage(1);
  private upgradeStage = 1;
  private records: StoredRecords = LocalRunStore.emptyRecords();
  private selectedUpgrades: RunUpgradeRecord[] = [];
  private readonly upgradeOptions: UpgradeOptionDefinition[];
  private readonly localTestInvulnerable = isLocalDebugHost() && new URLSearchParams(window.location.search).has('testInvulnerable');
  private previousBombs = 3;
  private nextDebugPublishAt = 0;
  private lastRenderStats: RenderStats | undefined;
  private readonly upgradePanel = new UpgradePanel({
    onChoose: (id) => this.chooseUpgrade(id)
  });

  constructor(
    canvas: HTMLCanvasElement,
    private readonly store: LocalRunStore,
    config: GameConfig,
    private readonly sound: SoundEngine
  ) {
    this.renderer = new Renderer(canvas, config);
    this.upgradeOptions = config.upgrades;
  }

  async start(): Promise<void> {
    this.records = await this.store.load();
    this.startPanel.setRecords(this.records);
    this.hud.update({
      score: this.score,
      bestScore: this.records.best.score,
      hp: this.hp,
      upgradeCharge: this.upgradeCharge,
      upgradeThreshold: this.upgradeThreshold,
      weaponLevel: 1
    });

    this.input.attach();
    window.addEventListener('resize', this.handleResize);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.renderer.resize();
    this.renderer.renderIdle();
    await this.renderer.waitForModelWarmup();
    this.startPanel.show();
    this.clock.start();
    this.tick();
  }

  private readonly handleResize = (): void => {
    this.renderer.resize();
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) {
      cancelAnimationFrame(this.animationFrame);
      return;
    }

    this.clock.getDelta();
    this.tick();
  };

  private readonly tick = (): void => {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const inputState = this.input.snapshot();

    if (inputState.pausePressed && this.mode !== 'ready' && this.mode !== 'upgrade') {
      this.togglePause();
    }
    if (inputState.endRunPressed && this.mode !== 'ready' && this.mode !== 'complete' && this.mode !== 'upgrade') {
      void this.completeRun('MANUAL END');
    }

    if (this.mode !== 'running') {
      this.publishDebugStats();
      this.animationFrame = requestAnimationFrame(this.tick);
      return;
    }

    const renderStats = this.renderer.update(dt, inputState);
    this.lastRenderStats = renderStats;
    this.publishDebugStats(renderStats);
    this.playCombatAudio(inputState.firing, renderStats);
    this.score += dt * 12 + renderStats.scoreDelta + renderStats.skillScoreDelta;
    this.kills += renderStats.destroyedCount + renderStats.skillKills;
    this.upgradeCharge += renderStats.collectedEnergy;
    this.survivalSeconds += dt;
    const nextHp = Math.max(0, Math.min(100, this.hp - renderStats.damageTaken + renderStats.repairedHp));
    this.hp = this.localTestInvulnerable ? 100 : nextHp;
    this.hud.update({
      score: this.score,
      bestScore: Math.max(this.records.best.score, this.score),
      hp: this.hp,
      activeBullets: renderStats.activeBullets,
      bulletPoolSize: renderStats.poolSize,
      activeEnemies: renderStats.activeEnemies,
      enemyPoolSize: renderStats.enemyPoolSize,
      activeExplosions: renderStats.activeExplosions,
      explosionPoolSize: renderStats.explosionPoolSize,
      hitCount: renderStats.hitCount,
      destroyedCount: renderStats.destroyedCount,
      damageTaken: renderStats.damageTaken,
      bombs: renderStats.bombs,
      cooldown1: renderStats.cooldown1,
      cooldown2: renderStats.cooldown2,
      cooldown3: renderStats.cooldown3,
      bossActive: renderStats.bossActive,
      bossHp: renderStats.bossHp,
      bossMaxHp: renderStats.bossMaxHp,
      bossPhase: renderStats.bossPhase,
      upgradeCharge: this.upgradeCharge,
      upgradeThreshold: this.upgradeThreshold,
      weaponLevel: renderStats.weaponLevel,
      firing: inputState.firing
    });

    if (this.hp <= 0) {
      void this.completeRun('DESTROYED');
    } else if (this.upgradeCharge >= this.upgradeThreshold) {
      this.openUpgradePanel();
    }

    this.animationFrame = requestAnimationFrame(this.tick);
  };

  private togglePause(): void {
    if (this.mode === 'complete') {
      return;
    }

    if (this.mode === 'paused') {
      this.resume();
      return;
    }

    this.mode = 'paused';
    this.sound.play('pause');
    this.resultPanel.showPaused(
      this.score,
      Math.max(this.records.best.score, this.score),
      this.kills,
      this.survivalSeconds,
      this.selectedUpgrades
    );
  }

  pauseForSettings(): boolean {
    if (this.mode !== 'running') {
      return false;
    }

    this.mode = 'paused';
    this.resultPanel.hide();
    return true;
  }

  resumeFromSettings(): boolean {
    if (this.mode !== 'paused') {
      return false;
    }

    this.mode = 'running';
    this.sound.play('resume');
    this.resultPanel.hide();
    this.clock.getDelta();
    return true;
  }

  canResumeFromSettings(): boolean {
    return this.mode === 'paused';
  }

  private async beginRun(): Promise<void> {
    if (this.mode !== 'ready') {
      return;
    }

    this.mode = 'running';
    await this.sound.unlockAndPlay('start');
    this.clock.getDelta();
  }

  private publishDebugStats(renderStats?: RenderStats): void {
    if (!isDebugStatsEnabled()) {
      return;
    }

    const now = Date.now();
    if (now < this.nextDebugPublishAt) {
      return;
    }
    this.nextDebugPublishAt = now + 250;
    const stats = renderStats ?? this.lastRenderStats;

    window.__stormraiderStats = {
      mode: this.mode,
      score: this.score,
      hp: this.hp,
      kills: this.kills,
      survivalSeconds: this.survivalSeconds,
      activeEnemies: stats?.activeEnemies ?? 0,
      activeBullets: stats?.activeBullets ?? 0,
      activeEnemyBullets: stats?.activeEnemyBullets ?? 0,
      activeExplosions: stats?.activeExplosions ?? 0,
      activeHazards: stats?.activeHazards ?? 0,
      bossActive: stats?.bossActive ?? false,
      bossHp: stats?.bossHp ?? 0,
      bossMaxHp: stats?.bossMaxHp ?? 0,
      bossPhase: stats?.bossPhase ?? 0,
      bossVariant: stats?.bossVariant ?? 0,
      performanceTier: stats?.performanceTier ?? 0,
      estimatedFps: stats?.estimatedFps ?? 60,
      renderPixelRatio: stats?.renderPixelRatio ?? 1,
      enemyModelDetailsEnabled: stats?.enemyModelDetailsEnabled ?? true
    };
    document.documentElement.dataset.gameMode = window.__stormraiderStats.mode;
    document.documentElement.dataset.perfTier = String(window.__stormraiderStats.performanceTier);
    document.documentElement.dataset.estimatedFps = String(window.__stormraiderStats.estimatedFps);
    document.documentElement.dataset.renderPixelRatio = window.__stormraiderStats.renderPixelRatio.toFixed(2);
    document.documentElement.dataset.enemyModelDetails = window.__stormraiderStats.enemyModelDetailsEnabled ? 'on' : 'off';
    document.documentElement.dataset.survivalSeconds = String(Math.round(window.__stormraiderStats.survivalSeconds));
    document.documentElement.dataset.hp = String(Math.round(window.__stormraiderStats.hp));
    document.documentElement.dataset.bossActive = window.__stormraiderStats.bossActive ? '1' : '0';
    document.documentElement.dataset.bossHp = String(Math.round(window.__stormraiderStats.bossHp));
    document.documentElement.dataset.bossMaxHp = String(Math.round(window.__stormraiderStats.bossMaxHp));
    document.documentElement.dataset.bossPhase = String(window.__stormraiderStats.bossPhase);
    document.documentElement.dataset.bossVariant = String(window.__stormraiderStats.bossVariant);
    document.documentElement.dataset.activeLoad = [
      window.__stormraiderStats.activeEnemies,
      window.__stormraiderStats.activeBullets,
      window.__stormraiderStats.activeEnemyBullets,
      window.__stormraiderStats.activeExplosions,
      window.__stormraiderStats.activeHazards
    ].join('/');
  }

  private resume(): void {
    if (this.mode !== 'paused') {
      return;
    }

    this.mode = 'running';
    this.sound.play('resume');
    this.resultPanel.hide();
    this.clock.getDelta();
  }

  private openUpgradePanel(): void {
    if (this.mode !== 'running') {
      return;
    }

    this.mode = 'upgrade';
    this.sound.play('upgradeOpen');
    this.upgradeCharge -= this.upgradeThreshold;
    this.upgradeThreshold = upgradeThresholdForStage(this.upgradeStage + 1);
    this.upgradePanel.show(this.createUpgradeChoices(), this.upgradeStage);
  }

  private chooseUpgrade(id: string): void {
    if (this.mode !== 'upgrade') {
      return;
    }

    const nextLevel = Math.min(MAX_UPGRADE_LEVEL, this.getUpgradeLevel(id) + 1);
    const selected = this.upgradeOptions.find((option) => option.id === id);
    this.renderer.applyWeaponUpgrade(id as WeaponUpgradeType);
    this.sound.play('upgradeChoose');
    if (selected) {
      this.selectedUpgrades.push({
        id: selected.id,
        label: selected.label,
        title: selected.title,
        stage: this.upgradeStage,
        level: nextLevel,
        color: colorForUpgradeLevel(selected, nextLevel),
        isUltra: nextLevel >= MAX_UPGRADE_LEVEL
      });
    }
    this.upgradeStage += 1;
    this.mode = 'running';
    this.upgradePanel.hide();
    this.clock.getDelta();
  }

  private createUpgradeChoices(): UpgradeOption[] {
    const selectedCounts = new Map<string, number>();
    for (const upgrade of this.selectedUpgrades) {
      selectedCounts.set(upgrade.id, (selectedCounts.get(upgrade.id) ?? 0) + 1);
    }
    const ultraCount = countUltraUpgrades(selectedCounts);
    const candidates = this.upgradeOptions.filter((option) =>
      canOfferUpgrade(selectedCounts.get(option.id) ?? 0, ultraCount)
    );

    let seed = createUpgradeSeed(
      this.upgradeStage,
      this.score,
      this.kills,
      this.survivalSeconds,
      this.upgradeCharge
    );
    const choices: UpgradeOption[] = [];

    while (choices.length < 3 && candidates.length > 0) {
      let totalWeight = 0;
      for (const candidate of candidates) {
        const count = selectedCounts.get(candidate.id) ?? 0;
        totalWeight += upgradeOfferWeight(candidate, count, this.upgradeStage);
      }

      const roll = seededUnit(seed) * totalWeight;
      seed = nextSeed(seed);
      let cursor = 0;
      let selectedIndex = candidates.length - 1;
      for (let i = 0; i < candidates.length; i += 1) {
        const count = selectedCounts.get(candidates[i].id) ?? 0;
        cursor += upgradeOfferWeight(candidates[i], count, this.upgradeStage);
        if (roll <= cursor) {
          selectedIndex = i;
          break;
        }
      }

      const selected = candidates[selectedIndex];
      const nextLevel = Math.min(MAX_UPGRADE_LEVEL, (selectedCounts.get(selected.id) ?? 0) + 1);
      choices.push({
        ...selected,
        level: nextLevel,
        color: colorForUpgradeLevel(selected, nextLevel),
        isUltra: nextLevel >= MAX_UPGRADE_LEVEL
      });
      candidates.splice(selectedIndex, 1);
    }

    return choices;
  }

  private getUpgradeLevel(id: string): number {
    let count = 0;
    for (const upgrade of this.selectedUpgrades) {
      if (upgrade.id === id) {
        count += 1;
      }
    }
    return count;
  }

  private restart(): void {
    window.location.reload();
  }

  private async completeRun(reason = 'RUN COMPLETE'): Promise<void> {
    if (this.mode === 'complete') {
      return;
    }

    this.mode = 'complete';
    this.sound.play('complete');
    const record: RunRecord = {
      score: Math.round(this.score),
      wave: 1,
      survivalSeconds: Math.round(this.survivalSeconds),
      kills: this.kills,
      playedAt: new Date().toISOString(),
      upgrades: [...this.selectedUpgrades]
    };

    await this.store.saveLastRun(record);
    this.records = await this.store.load();
    this.hud.update({
      score: record.score,
      bestScore: this.records.best.score,
      hp: this.hp
    });
    this.resultPanel.showComplete(record, this.records.best.score, reason);
  }

  private playCombatAudio(
    firing: boolean,
    renderStats: ReturnType<Renderer['update']>
  ): void {
    if (firing && renderStats.activeBullets > 0) {
      this.sound.play('fire');
    }
    if (renderStats.hitCount > 0) {
      this.sound.play('hit');
    }
    if (renderStats.destroyedCount > 0) {
      this.sound.play('destroy');
    }
    if (renderStats.skillKills > 0 || renderStats.skillScoreDelta > 0) {
      this.sound.play('skill');
    }
    if (renderStats.collectedEnergy > 0) {
      this.sound.play('pickup');
    }
    if (renderStats.repairedHp > 0) {
      this.sound.play('repair');
    }
    if (renderStats.damageTaken > 0) {
      this.sound.play('damage');
    }
    if (renderStats.bombs < this.previousBombs) {
      this.sound.play('skill');
    }
    if (renderStats.bossJustEntered || renderStats.bossPhaseChanged) {
      this.sound.play('skill');
    }
    this.previousBombs = renderStats.bombs;
  }
}

function createUpgradeSeed(stage: number, score: number, kills: number, survivalSeconds: number, charge: number): number {
  const roundedScore = Math.max(0, Math.round(score));
  const roundedTime = Math.max(0, Math.round(survivalSeconds * 10));
  const roundedCharge = Math.max(0, Math.round(charge * 10));
  return nextSeed(
    stage * 2654435761 ^
    roundedScore * 2246822519 ^
    kills * 3266489917 ^
    roundedTime * 668265263 ^
    roundedCharge * 374761393
  );
}

function seededUnit(seed: number): number {
  return nextSeed(seed) / 0x100000000;
}

function nextSeed(seed: number): number {
  let value = seed >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
}

function upgradeThresholdForStage(stage: number): number {
  if (stage <= 1) {
    return 4;
  }
  const earlyRamp = 4 + (stage - 1) * 3;
  const lateRelief = Math.max(0, stage - 5);
  return Math.min(22, earlyRamp - lateRelief);
}

function isLocalDebugHost(): boolean {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

function isDebugStatsEnabled(): boolean {
  return isLocalDebugHost() || new URLSearchParams(window.location.search).has('verify');
}

function canOfferUpgrade(currentLevel: number, ultraCount: number): boolean {
  if (currentLevel >= MAX_UPGRADE_LEVEL) {
    return false;
  }
  if (currentLevel >= SOFT_UPGRADE_CAP && ultraCount >= MAX_ULTRA_UPGRADES) {
    return false;
  }
  return true;
}

function countUltraUpgrades(selectedCounts: Map<string, number>): number {
  let count = 0;
  for (const level of selectedCounts.values()) {
    if (level >= MAX_UPGRADE_LEVEL) {
      count += 1;
    }
  }
  return count;
}

function upgradeOfferWeight(option: UpgradeOptionDefinition, currentLevel: number, stage: number): number {
  const nextLevel = currentLevel + 1;
  const progress = clamp01((stage - 1) / 11);
  const category = upgradeCategory(option);
  const categoryWeight = category === 'offense'
    ? 0.78 + progress * 0.92
    : 1.52 - progress * 0.66;
  const focusWeight = 1 / (1 + currentLevel * 0.34);
  const capstoneWeight = nextLevel >= MAX_UPGRADE_LEVEL ? 1.38 : 1;
  const midBuildWeight = currentLevel > 0 ? 1.12 : 1;
  return categoryWeight * focusWeight * capstoneWeight * midBuildWeight;
}

function upgradeCategory(option: UpgradeOptionDefinition): 'offense' | 'support' {
  if (option.category === 'offense' || option.category === 'support') {
    return option.category;
  }
  return OFFENSE_UPGRADES.has(option.id) ? 'offense' : 'support';
}

function colorForUpgradeLevel(option: UpgradeOptionDefinition, level: number): string {
  if (level >= MAX_UPGRADE_LEVEL) {
    return option.ultraColor ?? DEFAULT_ULTRA_COLORS.get(option.id) ?? '#ffffff';
  }
  return UPGRADE_LEVEL_COLORS[Math.max(0, Math.min(UPGRADE_LEVEL_COLORS.length - 1, level - 1))];
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}
