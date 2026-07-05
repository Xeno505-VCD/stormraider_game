import type { RunRecord, RunUpgradeRecord } from '../data/LocalRunStore';
import { i18n } from './I18n';

interface ResultPanelOptions {
  onResume: () => void;
  onRestart: () => void;
}

export class ResultPanel {
  private readonly root = document.querySelector<HTMLDivElement>('#result-panel');
  private readonly mode = document.querySelector<HTMLElement>('#result-mode');
  private readonly title = document.querySelector<HTMLElement>('#result-title');
  private readonly summary = document.querySelector<HTMLElement>('#result-summary');
  private readonly score = document.querySelector<HTMLElement>('#result-score');
  private readonly best = document.querySelector<HTMLElement>('#result-best');
  private readonly kills = document.querySelector<HTMLElement>('#result-kills');
  private readonly time = document.querySelector<HTMLElement>('#result-time');
  private readonly upgrades = document.querySelector<HTMLElement>('#result-upgrades');
  private readonly resume = document.querySelector<HTMLButtonElement>('#resume-run');
  private readonly restart = document.querySelector<HTMLButtonElement>('#restart-run');
  private lastMode = 'RUN COMPLETE';
  private lastTitleKey = 'result.completeTitle';
  private lastSummaryKey = 'result.completeBody';
  private lastScore = 0;
  private lastBestScore = 0;
  private lastKills = 0;
  private lastSurvivalSeconds = 0;
  private lastUpgrades: RunUpgradeRecord[] = [];

  constructor(private readonly options: ResultPanelOptions) {
    this.resume?.addEventListener('click', () => this.options.onResume());
    this.restart?.addEventListener('click', () => this.options.onRestart());
    i18n.subscribe(() => {
      i18n.applyStaticText();
      this.setContent(
        this.lastMode,
        this.lastTitleKey,
        this.lastScore,
        this.lastBestScore,
        this.lastKills,
        this.lastSurvivalSeconds,
        this.lastUpgrades,
        this.lastSummaryKey
      );
    });
  }

  showPaused(
    score: number,
    bestScore: number,
    kills: number,
    survivalSeconds: number,
    upgrades: RunUpgradeRecord[]
  ): void {
    this.setContent(
      'PAUSED',
      'result.pauseTitle',
      score,
      bestScore,
      kills,
      survivalSeconds,
      upgrades,
      'result.pauseBody'
    );
    if (this.resume) {
      this.resume.hidden = false;
    }
    this.show();
  }

  showComplete(record: RunRecord, bestScore: number, reason = 'RUN COMPLETE'): void {
    this.setContent(
      reason,
      'result.completeTitle',
      record.score,
      bestScore,
      record.kills,
      record.survivalSeconds,
      record.upgrades ?? [],
      'result.completeBody'
    );
    if (this.resume) {
      this.resume.hidden = true;
    }
    this.show();
  }

  hide(): void {
    if (this.root) {
      this.root.hidden = true;
    }
  }

  private show(): void {
    if (this.root) {
      this.root.hidden = false;
    }
  }

  private setContent(
    mode: string,
    titleKey: string,
    score: number,
    bestScore: number,
    kills: number,
    survivalSeconds: number,
    upgrades: RunUpgradeRecord[],
    summaryKey: string
  ): void {
    this.lastMode = mode;
    this.lastTitleKey = titleKey;
    this.lastSummaryKey = summaryKey;
    this.lastScore = score;
    this.lastBestScore = bestScore;
    this.lastKills = kills;
    this.lastSurvivalSeconds = survivalSeconds;
    this.lastUpgrades = [...upgrades];
    if (this.mode) {
      this.mode.textContent = i18n.translateReason(mode);
    }
    if (this.title) {
      this.title.textContent = i18n.t(titleKey);
    }
    if (this.summary) {
      this.summary.textContent = i18n.t(summaryKey);
    }
    if (this.score) {
      this.score.textContent = formatScore(score);
    }
    if (this.best) {
      this.best.textContent = formatScore(bestScore);
    }
    if (this.kills) {
      this.kills.textContent = String(kills);
    }
    if (this.time) {
      this.time.textContent = `${Math.round(survivalSeconds)}s`;
    }
    this.renderUpgrades(upgrades);
  }

  private renderUpgrades(upgrades: RunUpgradeRecord[]): void {
    if (!this.upgrades) {
      return;
    }

    this.upgrades.replaceChildren();
    if (upgrades.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'result-panel__upgrade-empty';
      empty.textContent = i18n.t('result.noModules');
      this.upgrades.append(empty);
      return;
    }

    for (const upgrade of upgrades) {
      const item = document.createElement('div');
      const label = document.createElement('span');
      const title = document.createElement('strong');
      const stage = document.createElement('em');

      item.className = 'result-panel__upgrade';
      label.textContent = i18n.upgrade(upgrade.id, 'label', upgrade.label);
      title.textContent = i18n.upgrade(upgrade.id, 'title', upgrade.title);
      stage.textContent = i18n.t('result.moduleStage', { stage: upgrade.stage });
      item.append(label, title, stage);
      this.upgrades.append(item);
    }
  }
}

function formatScore(score: number): string {
  return Math.max(0, Math.round(score)).toString().padStart(6, '0');
}
