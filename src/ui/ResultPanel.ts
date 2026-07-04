import type { RunRecord } from '../data/LocalRunStore';

interface ResultPanelOptions {
  onResume: () => void;
  onRestart: () => void;
}

export class ResultPanel {
  private readonly root = document.querySelector<HTMLDivElement>('#result-panel');
  private readonly mode = document.querySelector<HTMLElement>('#result-mode');
  private readonly title = document.querySelector<HTMLElement>('#result-title');
  private readonly score = document.querySelector<HTMLElement>('#result-score');
  private readonly best = document.querySelector<HTMLElement>('#result-best');
  private readonly kills = document.querySelector<HTMLElement>('#result-kills');
  private readonly time = document.querySelector<HTMLElement>('#result-time');
  private readonly resume = document.querySelector<HTMLButtonElement>('#resume-run');
  private readonly restart = document.querySelector<HTMLButtonElement>('#restart-run');

  constructor(private readonly options: ResultPanelOptions) {
    this.resume?.addEventListener('click', () => this.options.onResume());
    this.restart?.addEventListener('click', () => this.options.onRestart());
  }

  showPaused(score: number, bestScore: number, kills: number, survivalSeconds: number): void {
    this.setContent('PAUSED', 'Stormraider Holding Pattern', score, bestScore, kills, survivalSeconds);
    if (this.resume) {
      this.resume.hidden = false;
    }
    this.show();
  }

  showComplete(record: RunRecord, bestScore: number, reason = 'RUN COMPLETE'): void {
    this.setContent(reason, 'Run Saved Locally', record.score, bestScore, record.kills, record.survivalSeconds);
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
    title: string,
    score: number,
    bestScore: number,
    kills: number,
    survivalSeconds: number
  ): void {
    if (this.mode) {
      this.mode.textContent = mode;
    }
    if (this.title) {
      this.title.textContent = title;
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
  }
}

function formatScore(score: number): string {
  return Math.max(0, Math.round(score)).toString().padStart(6, '0');
}
