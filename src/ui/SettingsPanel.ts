import { i18n } from './I18n';
import type { Language } from './I18n';
import type { UpgradeOptionDefinition } from '../data/GameConfig';

interface SettingsPanelOptions {
  onOpen?: () => boolean;
  onResume?: () => boolean;
  canResume?: () => boolean;
  isAudioMuted?: () => boolean;
  onToggleAudio?: () => boolean;
  getAudioVolume?: () => number;
  onAudioVolumeChange?: (volume: number) => number | void;
  upgradeOptions?: UpgradeOptionDefinition[];
}

const LEVEL_COLORS = ['#7ca7ff', '#27d8ff', '#7affd6', '#ffcf33', '#ff8a3d', '#ff5da8'];
const DEFAULT_ULTRA_COLOR = '#f6f1ff';
const ULTRA_LEVEL = 7;

export class SettingsPanel {
  private readonly button = document.querySelector<HTMLButtonElement>('#settings-button');
  private readonly panel = document.querySelector<HTMLDivElement>('#settings-panel');
  private readonly close = document.querySelector<HTMLButtonElement>('#settings-close');
  private readonly pauseToggle = document.querySelector<HTMLButtonElement>('#settings-pause-toggle');
  private readonly audioToggle = document.querySelector<HTMLButtonElement>('#settings-audio-toggle');
  private readonly audioVolume = document.querySelector<HTMLInputElement>('#settings-audio-volume');
  private readonly audioVolumeValue = document.querySelector<HTMLElement>('#settings-audio-volume-value');
  private readonly codexSection = document.querySelector<HTMLElement>('#settings-codex');
  private readonly codexToggle = document.querySelector<HTMLButtonElement>('#settings-codex-toggle');
  private readonly codexBody = document.querySelector<HTMLDivElement>('#settings-codex-body');
  private readonly codexList = document.querySelector<HTMLDivElement>('#settings-codex-list');
  private readonly languageButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.settings-panel__choice')
  );
  private pausedFromOpen = false;
  private codexExpanded = false;
  private expandedCodexId: string | undefined;
  private readonly selectedCodexLevels = new Map<string, number>();

  constructor(private readonly options: SettingsPanelOptions = {}) {
    this.button?.addEventListener('click', () => this.toggle());
    this.close?.addEventListener('click', () => this.hide());
    this.codexToggle?.addEventListener('click', () => {
      this.codexExpanded = !this.codexExpanded;
      this.sync();
    });
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

    this.renderCodex(language);
  }

  private renderCodex(language: Language): void {
    if (!this.codexList) {
      return;
    }

    this.codexSection?.classList.toggle('settings-panel__codex--expanded', this.codexExpanded);
    if (this.codexToggle) {
      this.codexToggle.setAttribute('aria-expanded', String(this.codexExpanded));
    }
    if (this.codexBody) {
      this.codexBody.hidden = !this.codexExpanded;
    }
    if (!this.codexExpanded) {
      this.codexList.replaceChildren();
      return;
    }

    const options = this.options.upgradeOptions ?? [];
    this.codexList.replaceChildren();
    for (const option of options) {
      const isExpanded = option.id === this.expandedCodexId;
      const selectedLevel = this.selectedCodexLevels.get(option.id) ?? ULTRA_LEVEL;
      const card = document.createElement('article');
      card.className = 'settings-panel__codex-card';
      card.classList.toggle('settings-panel__codex-card--expanded', isExpanded);
      card.style.setProperty('--upgrade-color', option.ultraColor ?? DEFAULT_ULTRA_COLOR);

      const head = document.createElement('button');
      head.className = 'settings-panel__codex-head';
      head.type = 'button';
      head.setAttribute('aria-expanded', String(isExpanded));
      head.addEventListener('click', () => {
        this.expandedCodexId = isExpanded ? undefined : option.id;
        if (!isExpanded && !this.selectedCodexLevels.has(option.id)) {
          this.selectedCodexLevels.set(option.id, ULTRA_LEVEL);
        }
        this.sync();
      });

      const arrow = document.createElement('span');
      arrow.className = 'settings-panel__codex-arrow';
      arrow.textContent = '›';

      const titleWrap = document.createElement('div');
      const label = document.createElement('span');
      label.className = 'settings-panel__codex-label';
      label.textContent = i18n.upgrade(option.id, 'label', option.label);

      const title = document.createElement('strong');
      title.textContent = i18n.upgrade(option.id, 'title', option.title);
      titleWrap.append(label, title);

      const category = document.createElement('em');
      category.className = 'settings-panel__codex-category';
      category.textContent = i18n.t(
        option.category === 'support' ? 'settings.codexSupport' : 'settings.codexOffense'
      );

      head.append(arrow, titleWrap, category);
      card.append(head);

      if (isExpanded) {
        const strip = document.createElement('div');
      strip.className = 'settings-panel__level-strip';
      strip.setAttribute('aria-label', i18n.t('settings.codexLevelBand'));
        for (let level = 1; level <= ULTRA_LEVEL; level += 1) {
          const dot = document.createElement('button');
          dot.className = 'settings-panel__level-dot';
          dot.type = 'button';
          dot.style.setProperty('--level-color', levelColor(option, level));
          dot.textContent = String(level);
          dot.classList.toggle('settings-panel__level-dot--ultra', level === ULTRA_LEVEL);
          dot.classList.toggle('settings-panel__level-dot--active', level === selectedLevel);
          dot.setAttribute('aria-pressed', String(level === selectedLevel));
          dot.addEventListener('click', (event) => {
            event.stopPropagation();
            this.selectedCodexLevels.set(option.id, level);
            this.sync();
          });
          strip.append(dot);
        }

        const demo = this.createCodexDemo(option, selectedLevel);
        const effectText = document.createElement('p');
        effectText.className = 'settings-panel__codex-summary';
        effectText.textContent =
          selectedLevel === ULTRA_LEVEL
            ? codexText(option, 'ultra', language) ?? i18n.upgrade(option.id, 'description', option.description)
            : codexText(option, 'base', language) ?? i18n.upgrade(option.id, 'description', option.description);

        card.append(strip, demo, effectText);
      }

      this.codexList.append(card);
    }
  }

  private createCodexDemo(option: UpgradeOptionDefinition, level: number): HTMLElement {
    const demo = document.createElement('div');
    demo.className = `settings-panel__demo settings-panel__demo--${option.id}`;
    demo.style.setProperty('--shot-color', levelColor(option, level));
    demo.setAttribute('aria-label', i18n.t('settings.codexDemo'));

    const lane = document.createElement('div');
    lane.className = 'settings-panel__demo-lane';
    demo.append(lane);

    const ship = document.createElement('span');
    ship.className = 'settings-panel__demo-ship';
    demo.append(ship);

    const spec = demoSpec(option.id, level);
    for (let index = 0; index < spec.bullets; index += 1) {
      const bullet = document.createElement('span');
      bullet.className = `settings-panel__demo-shot settings-panel__demo-shot--${spec.shape}`;
      const laneIndex = index % spec.lanes;
      const burstIndex = Math.floor(index / spec.lanes);
      const offset = spec.lanes === 1 ? 0 : laneIndex - (spec.lanes - 1) / 2;
      bullet.style.setProperty('--lane-offset', String(offset * spec.spread));
      bullet.style.setProperty('--shot-delay', `${burstIndex * spec.delay + laneIndex * 0.05}s`);
      bullet.style.setProperty('--shot-duration', `${spec.duration}s`);
      bullet.style.setProperty('--shot-scale', String(spec.scale));
      demo.append(bullet);
    }

    for (let index = 0; index < spec.effects; index += 1) {
      const effect = document.createElement('span');
      effect.className = `settings-panel__demo-effect settings-panel__demo-effect--${spec.effect}`;
      effect.style.setProperty('--effect-delay', `${index * 0.3}s`);
      effect.style.setProperty('--effect-color', levelColor(option, level));
      demo.append(effect);
    }

    return demo;
  }
}

function levelColor(option: UpgradeOptionDefinition, level: number): string {
  return level >= ULTRA_LEVEL ? option.ultraColor ?? DEFAULT_ULTRA_COLOR : LEVEL_COLORS[level - 1] ?? LEVEL_COLORS[0];
}

function demoSpec(id: string, level: number): {
  bullets: number;
  delay: number;
  duration: number;
  effect: string;
  effects: number;
  lanes: number;
  scale: number;
  shape: string;
  spread: number;
} {
  const ultra = level >= ULTRA_LEVEL;
  const baseLanes = Math.min(7, 1 + Math.floor((level + 1) / 2));
  const common = {
    bullets: baseLanes * (ultra ? 3 : 2),
    delay: ultra ? 0.22 : 0.32,
    duration: ultra ? 1.05 : 1.3,
    effect: 'spark',
    effects: ultra ? 4 : 2,
    lanes: baseLanes,
    scale: ultra ? 1.2 : 1,
    shape: 'bolt',
    spread: ultra ? 12 : 9
  };

  if (id === 'spread' || id === 'fork' || id === 'wing') {
    const lanes = Math.min(7, id === 'spread' ? level : Math.max(3, baseLanes));
    return { ...common, bullets: lanes * 3, lanes, spread: id === 'fork' ? 15 : 11 };
  }
  if (id === 'rapid' || id === 'critical') {
    return { ...common, bullets: ultra ? 18 : 10, delay: ultra ? 0.12 : 0.18, duration: 0.92, lanes: level > 3 ? 3 : 2 };
  }
  if (id === 'damage' || id === 'heavy' || id === 'surge') {
    return { ...common, bullets: ultra ? 8 : 5, effect: 'burst', effects: ultra ? 5 : 3, lanes: id === 'surge' ? 1 : 2, scale: ultra ? 1.65 : 1.25, shape: 'shell' };
  }
  if (id === 'pierce' || id === 'velocity') {
    return { ...common, bullets: ultra ? 10 : 6, duration: ultra ? 0.78 : 1, effect: 'line', effects: ultra ? 4 : 2, lanes: level > 4 ? 3 : 1, shape: 'rail' };
  }
  if (id === 'chain') {
    return { ...common, bullets: ultra ? 9 : 5, effect: 'arc', effects: ultra ? 6 : 3, lanes: 3 };
  }
  if (id === 'magnet' || id === 'salvage') {
    return { ...common, bullets: 3, duration: 1.35, effect: 'crystal', effects: ultra ? 7 : 4, lanes: 1, shape: 'dot' };
  }
  if (id === 'shield') {
    return { ...common, bullets: 4, effect: 'shield', effects: ultra ? 4 : 2, lanes: 2, shape: 'dot' };
  }
  if (id === 'pulse') {
    return { ...common, bullets: 3, effect: 'pulse', effects: ultra ? 4 : 2, lanes: 1, shape: 'wave' };
  }
  if (id === 'capacitor' || id === 'arsenal') {
    return { ...common, bullets: ultra ? 7 : 4, effect: id === 'arsenal' ? 'bomb' : 'cooldown', effects: ultra ? 5 : 3, lanes: 1, shape: 'dot' };
  }
  return common;
}

function codexText(
  option: UpgradeOptionDefinition,
  field: 'base' | 'ultra',
  language: Language
): string | undefined {
  const codex = option.codex;
  if (!codex) {
    return undefined;
  }

  if (field === 'base') {
    return language === 'zh' ? codex.baseZh || codex.baseEn : codex.baseEn || codex.baseZh;
  }
  return language === 'zh' ? codex.ultraZh || codex.ultraEn : codex.ultraEn || codex.ultraZh;
}
