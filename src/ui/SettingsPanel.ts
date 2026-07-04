import { i18n } from './I18n';

export class SettingsPanel {
  private readonly button = document.querySelector<HTMLButtonElement>('#settings-button');
  private readonly panel = document.querySelector<HTMLDivElement>('#settings-panel');
  private readonly close = document.querySelector<HTMLButtonElement>('#settings-close');
  private readonly languageButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.settings-panel__choice')
  );

  constructor() {
    this.button?.addEventListener('click', () => this.toggle());
    this.close?.addEventListener('click', () => this.hide());
    for (const button of this.languageButtons) {
      button.addEventListener('click', () => {
        const language = button.dataset.language;
        if (language === 'en' || language === 'zh') {
          i18n.setLanguage(language);
        }
      });
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.panel?.hidden === false) {
        this.hide();
      }
    });

    i18n.subscribe(() => this.sync());
    this.sync();
  }

  private toggle(): void {
    if (!this.panel) {
      return;
    }

    this.panel.hidden = !this.panel.hidden;
  }

  private hide(): void {
    if (this.panel) {
      this.panel.hidden = true;
    }
  }

  private sync(): void {
    const language = i18n.getLanguage();
    for (const button of this.languageButtons) {
      const active = button.dataset.language === language;
      button.classList.toggle('settings-panel__choice--active', active);
      button.setAttribute('aria-pressed', String(active));
    }
  }
}
