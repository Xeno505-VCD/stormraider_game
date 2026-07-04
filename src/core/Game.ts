import { Clock } from 'three';
import { Renderer } from '../render/Renderer';
import { Hud } from '../ui/Hud';
import { ResultPanel } from '../ui/ResultPanel';
import { InputRouter } from '../input/InputRouter';
import type { GameConfig } from '../data/GameConfig';
import { LocalRunStore, type RunRecord, type StoredRecords } from '../data/LocalRunStore';

type GameMode = 'running' | 'paused' | 'complete';

export class Game {
  private readonly clock = new Clock();
  private readonly renderer: Renderer;
  private readonly hud = new Hud();
  private readonly resultPanel = new ResultPanel({
    onResume: () => this.resume(),
    onRestart: () => this.restart()
  });
  private readonly input = new InputRouter();
  private animationFrame = 0;
  private mode: GameMode = 'running';
  private score = 0;
  private hp = 100;
  private kills = 0;
  private survivalSeconds = 0;
  private records: StoredRecords = LocalRunStore.emptyRecords();

  constructor(
    canvas: HTMLCanvasElement,
    private readonly store: LocalRunStore,
    config: GameConfig
  ) {
    this.renderer = new Renderer(canvas, config);
  }

  async start(): Promise<void> {
    this.records = await this.store.load();
    this.hud.update({
      score: this.score,
      bestScore: this.records.best.score,
      hp: this.hp
    });

    this.input.attach();
    window.addEventListener('resize', this.handleResize);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.renderer.resize();
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

    if (inputState.pausePressed) {
      this.togglePause();
    }
    if (inputState.endRunPressed && this.mode !== 'complete') {
      void this.completeRun('MANUAL END');
    }

    if (this.mode !== 'running') {
      this.animationFrame = requestAnimationFrame(this.tick);
      return;
    }

    const renderStats = this.renderer.update(dt, inputState);
    this.score += dt * 12 + renderStats.scoreDelta + renderStats.skillScoreDelta;
    this.kills += renderStats.destroyedCount + renderStats.skillKills;
    this.survivalSeconds += dt;
    this.hp = Math.max(0, this.hp - renderStats.damageTaken);
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
      firing: inputState.firing
    });

    if (this.hp <= 0) {
      void this.completeRun('DESTROYED');
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
    this.resultPanel.showPaused(this.score, Math.max(this.records.best.score, this.score), this.kills, this.survivalSeconds);
  }

  private resume(): void {
    if (this.mode !== 'paused') {
      return;
    }

    this.mode = 'running';
    this.resultPanel.hide();
    this.clock.getDelta();
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
      playedAt: new Date().toISOString()
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
