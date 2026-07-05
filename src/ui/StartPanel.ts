import { i18n } from './I18n';

interface StartPanelOptions {
  onStart: () => void;
}

export class StartPanel {
  private readonly root = document.querySelector<HTMLDivElement>('#start-panel');
  private readonly startButton = document.querySelector<HTMLButtonElement>('#start-run');

  constructor(private readonly options: StartPanelOptions) {
    this.startButton?.addEventListener('click', () => this.start());
    document.addEventListener('keydown', this.handleKeyDown);
    i18n.subscribe(() => i18n.applyStaticText(this.root ?? document));
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

  private start(): void {
    this.hide();
    this.options.onStart();
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
