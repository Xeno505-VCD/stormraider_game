import { i18n } from './I18n';

interface SettingsPanelOptions {
  onOpen?: () => boolean;
  onResume?: () => boolean;
  canResume?: () => boolean;
  isAudioMuted?: () => boolean;
  onToggleAudio?: () => boolean;
  getAudioVolume?: () => number;
  onAudioVolumeChange?: (volume: number) => number | void;
}

export class SettingsPanel {
  private readonly button = document.querySelector<HTMLButtonElement>('#settings-button');
  private readonly panel = document.querySelector<HTMLDivElement>('#settings-panel');
  private readonly close = document.querySelector<HTMLButtonElement>('#settings-close');
  private readonly pauseToggle = document.querySelector<HTMLButtonElement>('#settings-pause-toggle');
  private readonly audioToggle = document.querySelector<HTMLButtonElement>('#settings-audio-toggle');
  private readonly audioVolume = document.querySelector<HTMLInputElement>('#settings-audio-volume');
  private readonly audioVolumeValue = document.querySelector<HTMLElement>('#settings-audio-volume-value');
  private readonly languageButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.settings-panel__choice')
  );
  private pausedFromOpen = false;

  constructor(private readonly options: SettingsPanelOptions = {}) {
    this.button?.addEventListener('click', () => this.toggle());
    this.close?.addEventListener('click', () => this.hide());
    this.pauseToggle?.addEventListener('click', () => this.toggleCombatPause());
    this.audioToggle?.addEventListener('click', () => {
      this.options.onToggleAudio?.();
      this.sync();
    });
    this.audioVolume?.addEventListener('input', () => {
      const volume = Number(this.audioVolume?.value ?? 0) / 100;
      this.options.onAudioVolumeChange?.(volume);
      this.sync();
    });
    for (const button of this.languageButtons) {
      button.addEventListener('click', () => {
        const language = button.dataset.language;
        if (language === 'en' || language === 'zh') {
          i18n.setLanguage(language);
        }
      });
    }

    this.panel?.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.hide();
      }
      event.stopPropagation();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.panel?.hidden === false) {
        event.preventDefault();
        event.stopPropagation();
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

    if (this.panel.hidden) {
      this.show();
    } else {
      this.hide();
    }
  }

  private show(): void {
    if (!this.panel) {
      return;
    }

    this.panel.hidden = false;
    this.pausedFromOpen = this.options.onOpen?.() ?? false;
    this.sync();
  }

  private hide(resumeSettingsPause = true): void {
    if (this.panel) {
      this.panel.hidden = true;
    }

    if (resumeSettingsPause && this.pausedFromOpen) {
      this.options.onResume?.();
    }
    this.pausedFromOpen = false;
    this.sync();
  }

  private toggleCombatPause(): void {
    if (this.options.canResume?.()) {
      this.options.onResume?.();
      this.pausedFromOpen = false;
      this.hide(false);
      return;
    }

    this.pausedFromOpen = this.options.onOpen?.() ?? false;
    this.sync();
  }

  private sync(): void {
    const language = i18n.getLanguage();
    for (const button of this.languageButtons) {
      const active = button.dataset.language === language;
      button.classList.toggle('settings-panel__choice--active', active);
      button.setAttribute('aria-pressed', String(active));
    }

    if (this.pauseToggle) {
      const canResume = this.options.canResume?.() ?? false;
      this.pauseToggle.textContent = i18n.t(canResume ? 'settings.resumeRun' : 'settings.paused');
      this.pauseToggle.disabled = !canResume;
      this.pauseToggle.setAttribute('aria-pressed', String(canResume));
    }

    if (this.audioToggle) {
      const muted = this.options.isAudioMuted?.() ?? false;
      this.audioToggle.textContent = i18n.t(muted ? 'settings.soundOff' : 'settings.soundOn');
      this.audioToggle.setAttribute('aria-pressed', String(!muted));
    }

    if (this.audioVolume) {
      const volumePercent = Math.round((this.options.getAudioVolume?.() ?? 0.7) * 100);
      this.audioVolume.value = String(volumePercent);
      this.audioVolume.setAttribute('aria-label', i18n.t('settings.volume'));
      if (this.audioVolumeValue) {
        this.audioVolumeValue.textContent = `${volumePercent}%`;
      }
    }
  }
}
