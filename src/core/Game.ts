import { Clock } from 'three';
import { Renderer } from '../render/Renderer';
import { Hud } from '../ui/Hud';
import { ResultPanel } from '../ui/ResultPanel';
import { StartPanel } from '../ui/StartPanel';
import { UpgradePanel, type UpgradeOption } from '../ui/UpgradePanel';
import { InputRouter } from '../input/InputRouter';
import type { GameConfig, UpgradeOptionDefinition } from '../data/GameConfig';
import { LocalRunStore, type RunRecord, type RunUpgradeRecord, type StoredRecords } from '../data/LocalRunStore';
import type { WeaponUpgradeType } from '../gameplay/PlayerBulletPool';

type GameMode = 'ready' | 'running' | 'paused' | 'upgrade' | 'complete';

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
  private upgradeThreshold = 6;
  private upgradeStage = 1;
  private records: StoredRecords = LocalRunStore.emptyRecords();
  private selectedUpgrades: RunUpgradeRecord[] = [];
  private readonly upgradeOptions: UpgradeOptionDefinition[];
  private readonly upgradePanel = new UpgradePanel({
    onChoose: (id) => this.chooseUpgrade(id)
  });

  constructor(
    canvas: HTMLCanvasElement,
    private readonly store: LocalRunStore,
    config: GameConfig
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
      hp: this.hp
    });

    this.input.attach();
    window.addEventListener('resize', this.handleResize);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.renderer.resize();
    this.renderer.renderIdle();
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
      this.animationFrame = requestAnimationFrame(this.tick);
      return;
    }

    const renderStats = this.renderer.update(dt, inputState);
    this.score += dt * 12 + renderStats.scoreDelta + renderStats.skillScoreDelta;
    this.kills += renderStats.destroyedCount + renderStats.skillKills;
    this.upgradeCharge += renderStats.collectedEnergy;
    this.survivalSeconds += dt;
    this.hp = Math.max(0, Math.min(100, this.hp - renderStats.damageTaken + renderStats.repairedHp));
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
    this.resultPanel.hide();
    this.clock.getDelta();
    return true;
  }

  canResumeFromSettings(): boolean {
    return this.mode === 'paused';
  }

  private beginRun(): void {
    if (this.mode !== 'ready') {
      return;
    }

    this.mode = 'running';
    this.clock.getDelta();
  }

  private resume(): void {
    if (this.mode !== 'paused') {
      return;
    }

    this.mode = 'running';
    this.resultPanel.hide();
    this.clock.getDelta();
  }

  private openUpgradePanel(): void {
    if (this.mode !== 'running') {
      return;
    }

    this.mode = 'upgrade';
    this.upgradeCharge -= this.upgradeThreshold;
    this.upgradeThreshold = Math.min(24, this.upgradeThreshold + 3);
    this.upgradePanel.show(this.createUpgradeChoices(), this.upgradeStage);
  }

  private chooseUpgrade(id: string): void {
    if (this.mode !== 'upgrade') {
      return;
    }

    this.renderer.applyWeaponUpgrade(id as WeaponUpgradeType);
    const selected = this.upgradeOptions.find((option) => option.id === id);
    if (selected) {
      this.selectedUpgrades.push({
        id: selected.id,
        label: selected.label,
        title: selected.title,
        stage: this.upgradeStage
      });
    }
    this.upgradeStage += 1;
    this.mode = 'running';
    this.upgradePanel.hide();
    this.clock.getDelta();
  }

  private createUpgradeChoices(): UpgradeOption[] {
    const start = (this.upgradeStage - 1) % this.upgradeOptions.length;
    return [
      this.upgradeOptions[start],
      this.upgradeOptions[(start + 1) % this.upgradeOptions.length],
      this.upgradeOptions[(start + 2) % this.upgradeOptions.length]
    ];
  }

  private restart(): void {
    window.location.reload();
  }

  private async completeRun(reason = 'RUN COMPLETE'): Promise<void> {
    if (this.mode === 'complete') {
      return;
    }

    this.mode = 'complete';
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
}
