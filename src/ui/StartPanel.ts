import { i18n } from './I18n';
import type { StoredRecords } from '../data/LocalRunStore';

interface StartPanelOptions {
  onStart: () => void | Promise<void>;
}

export class StartPanel {
  private readonly root = document.querySelector<HTMLDivElement>('#start-panel');
  private readonly startButton = document.querySelector<HTMLButtonElement>('#start-run');
  private readonly bestScore = document.querySelector<HTMLElement>('#start-best-score');
  private readonly lastScore = document.querySelector<HTMLElement>('#start-last-score');
  private readonly lastTime = document.querySelector<HTMLElement>('#start-last-time');
  private records: StoredRecords | null = null;

  constructor(private readonly options: StartPanelOptions) {
    this.startButton?.addEventListener('click', () => this.start());
    document.addEventListener('keydown', this.handleKeyDown);
    i18n.subscribe(() => {
      i18n.applyStaticText(this.root ?? document);
      this.renderRecords();
    });
  }

  show(): void {
    if (this.root) {
      this.root.hidden = false;
    }
  }

  hide(): void {
    if (this.root) {
      this.root.hidden = true;
    }
  }

  setRecords(records: StoredRecords): void {
    this.records = records;
    this.renderRecords();
  }

  private start(): void {
    this.hide();
    this.options.onStart();
  }

  private renderRecords(): void {
    if (this.bestScore) {
      this.bestScore.textContent = formatScore(this.records?.best.score ?? 0);
    }
    if (this.lastScore) {
      const last = this.records?.last;
      this.lastScore.textContent = last ? formatScore(last.score) : i18n.t('start.noRecord');
    }
    if (this.lastTime) {
      const last = this.records?.last;
      this.lastTime.textContent = last ? formatSeconds(last.survivalSeconds) : '--';
    }
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (this.root?.hidden !== false) {
      return;
    }

    if (event.code === 'Enter' || event.code === 'Space') {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.start();
    }
  };
}

function formatScore(score: number): string {
  return Math.max(0, Math.round(score)).toString().padStart(6, '0');
}

function formatSeconds(seconds: number): string {
  return `${Math.max(0, Math.round(seconds))}s`;
}
