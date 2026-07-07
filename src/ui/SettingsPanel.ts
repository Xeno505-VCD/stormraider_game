import { i18n } from './I18n';
import type { Language } from './I18n';
import type { EnemyDefinitionMap, UpgradeOptionDefinition } from '../data/GameConfig';

interface SettingsPanelOptions {
  onOpen?: () => boolean;
  onResume?: () => boolean;
  canResume?: () => boolean;
  isAudioMuted?: () => boolean;
  onToggleAudio?: () => boolean;
  getAudioVolume?: () => number;
  onAudioVolumeChange?: (volume: number) => number | void;
  upgradeOptions?: UpgradeOptionDefinition[];
  enemyDefinitions?: EnemyDefinitionMap;
}

const LEVEL_COLORS = ['#7ca7ff', '#27d8ff', '#7affd6', '#ffcf33', '#ff8a3d', '#ff5da8'];
const DEFAULT_ULTRA_COLOR = '#f6f1ff';
const ULTRA_LEVEL = 7;

interface EnemyCodexMeta {
  accent: string;
  bullets: number;
  className: string;
  labelEn: string;
  labelZh: string;
  roleEn: string;
  roleZh: string;
  titleEn: string;
  titleZh: string;
}

interface EnemyCodexEntry {
  id: string;
  definition: NonNullable<EnemyDefinitionMap[string]>;
  meta: EnemyCodexMeta;
}

interface ModulePreviewSpec {
  kind: string;
  part: string;
  parts: number;
  signature: string;
  signatureMarkers: number;
}

const ENEMY_CODEX_ORDER = [
  'drone',
  'skimmer',
  'wraith',
  'elite',
  'sentinel',
  'bulwark',
  'boss_01',
  'boss_02',
  'boss_03'
];

const ENEMY_CODEX_META: Record<string, EnemyCodexMeta> = {
  drone: {
    accent: '#27d8ff',
    bullets: 2,
    className: 'drone',
    labelEn: 'Scout',
    labelZh: '侦察',
    roleEn: 'Light front-line aircraft that wanders near the upper field and applies gentle early pressure.',
    roleZh: '前期轻型小怪，会在屏幕上方游荡，用较轻压力建立基础节奏。',
    titleEn: 'Scout Drone',
    titleZh: '侦察无人机'
  },
  skimmer: {
    accent: '#7affd6',
    bullets: 3,
    className: 'skimmer',
    labelEn: 'Fast',
    labelZh: '高速',
    roleEn: 'Fast side skimmer that shifts lanes quickly and punishes slow horizontal reactions.',
    roleZh: '高速侧翼小怪，横向换位更快，用来考验左右移动反应。',
    titleEn: 'Razor Skimmer',
    titleZh: '掠行刀翼机'
  },
  wraith: {
    accent: '#9b5cff',
    bullets: 3,
    className: 'wraith',
    labelEn: 'Phase',
    labelZh: '相位',
    roleEn: 'Thin phase craft with drifting shots that becomes more dangerous in later waves.',
    roleZh: '薄型相位机，后期会用带漂移感的弹幕增加压力。',
    titleEn: 'Phase Wraith',
    titleZh: '相位幽影机'
  },
  elite: {
    accent: '#ff8a3d',
    bullets: 3,
    className: 'elite',
    labelEn: 'Elite',
    labelZh: '精英',
    roleEn: 'Baseline elite with thicker armor and slower, more deliberate lane pressure.',
    roleZh: '基础精英单位，装甲更厚，弹幕节奏更慢但压迫更明确。',
    titleEn: 'Elite Raider',
    titleZh: '精英突击机'
  },
  sentinel: {
    accent: '#ffcf33',
    bullets: 4,
    className: 'sentinel',
    labelEn: 'Cannon',
    labelZh: '炮艇',
    roleEn: 'Braced gunship that fires narrow, faster elite shots once late pressure unlocks.',
    roleZh: '带炮架的精英炮艇，后期会发射更窄、更快的精英弹。',
    titleEn: 'Sentinel Gunship',
    titleZh: '哨卫炮艇'
  },
  bulwark: {
    accent: '#ff6a2a',
    bullets: 2,
    className: 'bulwark',
    labelEn: 'Siege',
    labelZh: '重装',
    roleEn: 'Heavy elite with the highest non-Boss durability and slow crushing rounds.',
    roleZh: '重装精英，拥有非 Boss 最高耐久，并使用缓慢厚重的压制弹。',
    titleEn: 'Bulwark Siege',
    titleZh: '堡垒重装机'
  },
  boss_01: {
    accent: '#ff3ea5',
    bullets: 5,
    className: 'boss-one',
    labelEn: 'Boss I',
    labelZh: '首领 I',
    roleEn: 'Opening Boss built around bloom/scatter pressure and visible phase shifts.',
    roleZh: '第一类 Boss，以散射、开花式弹幕和阶段切换压迫为主。',
    titleEn: 'Tempest Core',
    titleZh: '风暴核心'
  },
  boss_02: {
    accent: '#b17cff',
    bullets: 6,
    className: 'boss-two',
    labelEn: 'Boss II',
    labelZh: '首领 II',
    roleEn: 'Carrier Boss with side rails, interceptor pressure, and a larger armor pool.',
    roleZh: '航母型 Boss，拥有侧轨、拦截弹幕和更厚的装甲池。',
    titleEn: 'Carrier Bastion',
    titleZh: '堡垒航母'
  },
  boss_03: {
    accent: '#5ee1ff',
    bullets: 7,
    className: 'boss-three',
    labelEn: 'Boss III',
    labelZh: '首领 III',
    roleEn: 'Flagship Boss using lock-on spikes, phase mirrors, and late curtain pressure.',
    roleZh: '旗舰型 Boss，会使用锁定尖刺、相位镜面和后期帘幕弹。',
    titleEn: 'Phase Flagship',
    titleZh: '相位旗舰'
  }
};

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
  private readonly codexUltraPreview = document.querySelector<HTMLButtonElement>('#settings-codex-ultra-preview');
  private readonly codexBody = document.querySelector<HTMLDivElement>('#settings-codex-body');
  private readonly codexList = document.querySelector<HTMLDivElement>('#settings-codex-list');
  private readonly enemyCodexSection = document.querySelector<HTMLElement>('#settings-enemy-codex');
  private readonly enemyCodexToggle = document.querySelector<HTMLButtonElement>('#settings-enemy-codex-toggle');
  private readonly enemyCodexBody = document.querySelector<HTMLDivElement>('#settings-enemy-codex-body');
  private readonly enemyCodexList = document.querySelector<HTMLDivElement>('#settings-enemy-codex-list');
  private readonly languageButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.settings-panel__choice')
  );
  private pausedFromOpen = false;
  private codexExpanded = false;
  private enemyCodexExpanded = false;
  private expandedCodexId: string | undefined;
  private expandedEnemyId: string | undefined;
  private pendingCodexScrollId: string | undefined;
  private readonly selectedCodexLevels = new Map<string, number>();

  constructor(private readonly options: SettingsPanelOptions = {}) {
    this.button?.addEventListener('click', () => this.toggle());
    this.close?.addEventListener('click', () => this.hide());
    this.codexToggle?.addEventListener('click', () => {
      this.codexExpanded = !this.codexExpanded;
      this.sync();
    });
    this.codexUltraPreview?.addEventListener('click', () => this.showNextUltraPreview());
    this.enemyCodexToggle?.addEventListener('click', () => {
      this.enemyCodexExpanded = !this.enemyCodexExpanded;
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

  private showNextUltraPreview(): void {
    const options = this.options.upgradeOptions ?? [];
    if (options.length === 0) {
      return;
    }

    const currentIndex = options.findIndex((option) => option.id === this.expandedCodexId);
    const next = options[(currentIndex + 1 + options.length) % options.length];
    this.codexExpanded = true;
    this.expandedCodexId = next.id;
    this.pendingCodexScrollId = next.id;
    this.selectedCodexLevels.set(next.id, ULTRA_LEVEL);
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
    this.renderEnemyCodex(language);
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
    if (options.length > 0) {
      this.codexList.append(this.createCodexShowcaseRail(options));
    }
    const activeOption = options.find((option) => option.id === this.expandedCodexId);
    if (activeOption) {
      const activeLevel = this.selectedCodexLevels.get(activeOption.id) ?? ULTRA_LEVEL;
      const showcaseDeck = this.createCodexShowcaseDeck(activeOption, activeLevel, language);
      this.codexList.append(showcaseDeck);
      if (this.pendingCodexScrollId === activeOption.id) {
        this.pendingCodexScrollId = undefined;
        window.requestAnimationFrame(() => showcaseDeck.scrollIntoView({ block: 'nearest' }));
      }
    }
  }

  private createCodexShowcaseRail(options: UpgradeOptionDefinition[]): HTMLElement {
    const rail = document.createElement('div');
    rail.className = 'settings-panel__showcase-rail';
    rail.setAttribute('aria-label', i18n.t('settings.codexShowcase'));

    for (let index = 0; index < options.length; index += 1) {
      const option = options[index];
      const isActive = option.id === this.expandedCodexId;
      const chip = document.createElement('button');
      chip.className = 'settings-panel__showcase-chip';
      chip.classList.toggle('settings-panel__showcase-chip--active', isActive);
      chip.type = 'button';
      chip.dataset.upgradeId = option.id;
      chip.style.setProperty('--showcase-color', option.ultraColor ?? DEFAULT_ULTRA_COLOR);
      chip.setAttribute('aria-pressed', String(isActive));
      chip.setAttribute(
        'aria-label',
        `${i18n.t('settings.codexShowcase')} ${i18n.upgrade(option.id, 'title', option.title)}`
      );
      chip.addEventListener('click', (event) => {
        event.stopPropagation();
        this.codexExpanded = true;
        this.expandedCodexId = option.id;
        this.pendingCodexScrollId = option.id;
        this.selectedCodexLevels.set(option.id, ULTRA_LEVEL);
        this.sync();
      });

      const number = document.createElement('span');
      number.className = 'settings-panel__showcase-number';
      number.textContent = String(index + 1).padStart(2, '0');

      const label = document.createElement('strong');
      label.textContent = i18n.upgrade(option.id, 'label', option.label);

      chip.append(number, label);
      rail.append(chip);
    }

    return rail;
  }

  private createCodexLevelStrip(option: UpgradeOptionDefinition, selectedLevel: number): HTMLElement {
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

    return strip;
  }

  private createCodexShowcaseDeck(option: UpgradeOptionDefinition, level: number, language: Language): HTMLElement {
    const deck = document.createElement('section');
    deck.className = 'settings-panel__showcase-deck';
    deck.style.setProperty('--showcase-color', option.ultraColor ?? DEFAULT_ULTRA_COLOR);
    deck.style.setProperty('--showcase-level-color', levelColor(option, level));
    deck.setAttribute(
      'aria-label',
      `${i18n.t('settings.codexShowcaseDeck')} ${i18n.upgrade(option.id, 'title', option.title)}`
    );

    const head = document.createElement('div');
    head.className = 'settings-panel__showcase-deck-head';

    const titleWrap = document.createElement('div');
    const label = document.createElement('span');
    label.className = 'settings-panel__showcase-deck-label';
    label.textContent = i18n.t('settings.codexShowcaseDeck');

    const title = document.createElement('strong');
    title.className = 'settings-panel__showcase-deck-title';
    title.textContent = i18n.upgrade(option.id, 'title', option.title);
    titleWrap.append(label, title);

    const stage = document.createElement('em');
    stage.className = 'settings-panel__showcase-deck-stage';
    stage.textContent = `L${level}`;

    head.append(titleWrap, stage);

    const effectText = document.createElement('p');
    effectText.className = 'settings-panel__codex-summary';
    effectText.textContent =
      level >= ULTRA_LEVEL
        ? codexText(option, 'ultra', language) ?? i18n.upgrade(option.id, 'description', option.description)
        : codexText(option, 'base', language) ?? i18n.upgrade(option.id, 'description', option.description);

    deck.append(
      head,
      this.createCodexLevelStrip(option, level),
      this.createCodexModulePreview(option, level),
      this.createCodexDemo(option, level),
      effectText
    );
    return deck;
  }

  private renderEnemyCodex(language: Language): void {
    if (!this.enemyCodexList) {
      return;
    }
    const enemyCodexList = this.enemyCodexList;

    this.enemyCodexSection?.classList.toggle('settings-panel__codex--expanded', this.enemyCodexExpanded);
    if (this.enemyCodexToggle) {
      this.enemyCodexToggle.setAttribute('aria-expanded', String(this.enemyCodexExpanded));
    }
    if (this.enemyCodexBody) {
      this.enemyCodexBody.hidden = !this.enemyCodexExpanded;
    }
    if (!this.enemyCodexExpanded) {
      enemyCodexList.replaceChildren();
      return;
    }

    const entries = this.enemyCodexEntries();
    enemyCodexList.replaceChildren();
    if (entries.length === 0) {
      return;
    }

    if (!this.expandedEnemyId || !entries.some((entry) => entry.id === this.expandedEnemyId)) {
      this.expandedEnemyId = entries[0].id;
    }

    enemyCodexList.append(this.createEnemyShowcaseRail(entries, language));

    const activeEntry = entries.find((entry) => entry.id === this.expandedEnemyId);
    if (activeEntry) {
      enemyCodexList.append(this.createEnemyShowcaseDeck(activeEntry, language));
    }
  }

  private enemyCodexEntries(): EnemyCodexEntry[] {
    const enemies = this.options.enemyDefinitions ?? {};
    const entries: EnemyCodexEntry[] = [];
    for (const id of ENEMY_CODEX_ORDER) {
      const definition = enemies[id];
      const meta = ENEMY_CODEX_META[id];
      if (definition && meta) {
        entries.push({ id, definition, meta });
      }
    }
    return entries;
  }

  private createEnemyShowcaseRail(entries: EnemyCodexEntry[], language: Language): HTMLElement {
    const rail = document.createElement('div');
    rail.className = 'settings-panel__showcase-rail settings-panel__showcase-rail--enemy';
    rail.setAttribute('aria-label', i18n.t('settings.enemyShowcase'));

    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      const isActive = entry.id === this.expandedEnemyId;
      const chip = document.createElement('button');
      chip.className = 'settings-panel__showcase-chip settings-panel__showcase-chip--enemy';
      chip.classList.toggle('settings-panel__showcase-chip--active', isActive);
      chip.type = 'button';
      chip.dataset.enemyId = entry.id;
      chip.style.setProperty('--showcase-color', entry.meta.accent);
      chip.setAttribute('aria-pressed', String(isActive));
      chip.setAttribute(
        'aria-label',
        `${i18n.t('settings.enemyShowcase')} ${language === 'zh' ? entry.meta.titleZh : entry.meta.titleEn}`
      );
      chip.addEventListener('click', (event) => {
        event.stopPropagation();
        this.enemyCodexExpanded = true;
        this.expandedEnemyId = entry.id;
        this.sync();
      });

      const number = document.createElement('span');
      number.className = 'settings-panel__showcase-number';
      number.textContent = String(index + 1).padStart(2, '0');

      const label = document.createElement('strong');
      label.textContent = language === 'zh' ? entry.meta.labelZh : entry.meta.labelEn;

      chip.append(number, label);
      rail.append(chip);
    }

    return rail;
  }

  private createEnemyShowcaseDeck(entry: EnemyCodexEntry, language: Language): HTMLElement {
    const deck = document.createElement('section');
    deck.className = 'settings-panel__showcase-deck settings-panel__showcase-deck--enemy';
    deck.style.setProperty('--showcase-color', entry.meta.accent);
    deck.style.setProperty('--showcase-level-color', entry.meta.accent);
    deck.setAttribute(
      'aria-label',
      `${i18n.t('settings.enemyShowcaseDeck')} ${language === 'zh' ? entry.meta.titleZh : entry.meta.titleEn}`
    );

    const head = document.createElement('div');
    head.className = 'settings-panel__showcase-deck-head';

    const titleWrap = document.createElement('div');
    const label = document.createElement('span');
    label.className = 'settings-panel__showcase-deck-label';
    label.textContent = i18n.t('settings.enemyShowcaseDeck');

    const title = document.createElement('strong');
    title.className = 'settings-panel__showcase-deck-title';
    title.textContent = language === 'zh' ? entry.meta.titleZh : entry.meta.titleEn;
    titleWrap.append(label, title);

    const stage = document.createElement('em');
    stage.className = 'settings-panel__showcase-deck-stage';
    stage.textContent = enemyKindLabel(entry.definition.kind);

    head.append(titleWrap, stage);
    deck.append(
      head,
      this.createEnemyDemo(entry.meta),
      this.createEnemyStats(entry.definition),
      this.createEnemySummary(entry.meta, language)
    );
    return deck;
  }

  private createEnemyDemo(meta: EnemyCodexMeta): HTMLElement {
    const demo = document.createElement('div');
    demo.className = `settings-panel__enemy-demo settings-panel__enemy-demo--${meta.className}`;
    demo.style.setProperty('--enemy-color', meta.accent);

    const field = document.createElement('span');
    field.className = 'settings-panel__enemy-field';
    demo.append(field);

    const sprite = document.createElement('span');
    sprite.className = 'settings-panel__enemy-sprite';
    demo.append(sprite);

    const lanes = Math.max(2, Math.min(5, meta.bullets));
    for (let index = 0; index < meta.bullets; index += 1) {
      const shot = document.createElement('span');
      const laneIndex = index % lanes;
      const burstIndex = Math.floor(index / lanes);
      const offset = laneIndex - (lanes - 1) / 2;
      shot.className = 'settings-panel__enemy-shot';
      shot.style.setProperty('--enemy-shot-offset', String(offset * 10));
      shot.style.setProperty('--enemy-shot-delay', `${burstIndex * 0.26 + laneIndex * 0.07}s`);
      demo.append(shot);
    }

    return demo;
  }

  private createEnemyStats(definition: NonNullable<EnemyDefinitionMap[string]>): HTMLElement {
    const stats = document.createElement('div');
    stats.className = 'settings-panel__enemy-stats';
    stats.append(
      createEnemyStat(i18n.t('settings.enemyHp'), String(definition.hp)),
      createEnemyStat(i18n.t('settings.enemySpeed'), definition.speed.toFixed(2)),
      createEnemyStat(i18n.t('settings.enemyScore'), String(definition.score)),
      createEnemyStat(i18n.t('settings.enemyScale'), (definition.scale ?? 1).toFixed(2))
    );
    return stats;
  }

  private createEnemySummary(meta: EnemyCodexMeta, language: Language): HTMLElement {
    const summary = document.createElement('p');
    summary.className = 'settings-panel__codex-summary';
    summary.textContent = language === 'zh' ? meta.roleZh : meta.roleEn;
    return summary;
  }

  private createCodexModulePreview(option: UpgradeOptionDefinition, level: number): HTMLElement {
    const spec = moduleSpec(option.id, level);
    const preview = document.createElement('div');
    preview.className = `settings-panel__module-preview settings-panel__module-preview--${spec.kind} settings-panel__module-preview--trait-${spec.signature}`;
    preview.classList.toggle('settings-panel__module-preview--ultra', level >= ULTRA_LEVEL);
    preview.style.setProperty('--module-color', levelColor(option, level));
    preview.style.setProperty('--module-stage', String(Math.max(1, Math.min(ULTRA_LEVEL, level))));
    preview.setAttribute('aria-label', i18n.t('settings.codexModule'));

    const label = document.createElement('span');
    label.className = 'settings-panel__module-label';
    label.textContent = i18n.t('settings.codexModule');

    const stage = document.createElement('span');
    stage.className = 'settings-panel__module-stage';
    stage.textContent = `L${level}`;

    const rail = document.createElement('span');
    rail.className = 'settings-panel__module-rail';

    const bus = document.createElement('span');
    bus.className = 'settings-panel__module-bus';

    const core = document.createElement('span');
    core.className = 'settings-panel__module-core-node';

    const calibration = document.createElement('span');
    calibration.className = 'settings-panel__module-calibration';

    const shadow = document.createElement('span');
    shadow.className = 'settings-panel__module-shadow';

    const depth = document.createElement('span');
    depth.className = 'settings-panel__module-depth';

    preview.append(label, stage, shadow, depth, rail, bus, core, calibration);

    for (const side of [-1, 1]) {
      for (const offset of [-1, 1]) {
        const bolt = document.createElement('span');
        bolt.className = 'settings-panel__module-bolt';
        bolt.style.setProperty('--bolt-side', String(side));
        bolt.style.setProperty('--bolt-offset', String(offset));
        preview.append(bolt);
      }
    }

    for (const side of [-1, 1]) {
      const hardpoint = document.createElement('span');
      hardpoint.className = 'settings-panel__module-hardpoint';
      hardpoint.style.setProperty('--hardpoint-side', String(side));
      preview.append(hardpoint);
    }

    const clampCount = Math.max(2, Math.min(6, Math.ceil(spec.parts / 2)));
    for (let index = 0; index < clampCount; index += 1) {
      const clamp = document.createElement('span');
      clamp.className = 'settings-panel__module-clamp';
      const offset = index - (clampCount - 1) / 2;
      clamp.style.setProperty('--clamp-offset', String(offset * 30));
      clamp.style.setProperty('--clamp-delay', `${index * 0.06}s`);
      preview.append(clamp);
    }

    for (let index = 0; index < spec.signatureMarkers; index += 1) {
      const signature = document.createElement('span');
      signature.className = `settings-panel__module-signature settings-panel__module-signature--${spec.signature}`;
      const offset = index - (spec.signatureMarkers - 1) / 2;
      signature.style.setProperty('--signature-offset', String(offset * 16));
      signature.style.setProperty('--signature-side', index % 2 === 0 ? '1' : '-1');
      signature.style.setProperty('--signature-delay', `${index * 0.07}s`);
      preview.append(signature);
    }

    for (let index = 0; index < spec.parts; index += 1) {
      const part = document.createElement('span');
      part.className = `settings-panel__module-part settings-panel__module-part--${spec.part}`;
      const offset = index - (spec.parts - 1) / 2;
      part.style.setProperty('--module-offset', String(offset));
      part.style.setProperty('--module-delay', `${index * 0.08}s`);

      const shell = document.createElement('span');
      shell.className = 'settings-panel__module-detail settings-panel__module-detail--shell';
      const emitter = document.createElement('span');
      emitter.className = 'settings-panel__module-detail settings-panel__module-detail--emitter';
      const hinge = document.createElement('span');
      hinge.className = 'settings-panel__module-detail settings-panel__module-detail--hinge';
      const facet = document.createElement('span');
      facet.className = 'settings-panel__module-detail settings-panel__module-detail--facet';
      part.append(shell, hinge, facet, emitter);

      preview.append(part);
    }

    const ventCount = Math.max(2, Math.min(7, 2 + Math.floor(level / 2)));
    for (let index = 0; index < ventCount; index += 1) {
      const vent = document.createElement('span');
      vent.className = 'settings-panel__module-vent';
      const offset = index - (ventCount - 1) / 2;
      vent.style.setProperty('--vent-offset', String(offset * 13));
      vent.style.setProperty('--vent-delay', `${index * 0.08}s`);
      preview.append(vent);
    }

    const sparkCount = level >= ULTRA_LEVEL ? 4 : Math.max(0, Math.floor(level / 3) - 1);
    for (let index = 0; index < sparkCount; index += 1) {
      const spark = document.createElement('span');
      spark.className = 'settings-panel__module-spark';
      spark.style.setProperty('--spark-offset', String((index - (sparkCount - 1) / 2) * 18));
      spark.style.setProperty('--spark-delay', `${index * 0.16}s`);
      preview.append(spark);
    }

    return preview;
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
    const target = document.createElement('span');
    target.className = `settings-panel__demo-target settings-panel__demo-target--${spec.signature}`;
    target.style.setProperty('--effect-color', levelColor(option, level));
    demo.append(target);

    for (let index = 0; index < spec.markers; index += 1) {
      const marker = document.createElement('span');
      marker.className = `settings-panel__demo-signature settings-panel__demo-signature--${spec.signature}`;
      const offset = spec.markers === 1 ? 0 : index - (spec.markers - 1) / 2;
      marker.style.setProperty('--demo-marker-offset', String(offset * spec.markerSpread));
      marker.style.setProperty('--demo-marker-delay', `${index * 0.08}s`);
      marker.style.setProperty('--effect-color', levelColor(option, level));
      demo.append(marker);
    }

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

function createEnemyStat(label: string, value: string): HTMLElement {
  const stat = document.createElement('span');
  stat.className = 'settings-panel__enemy-stat';
  const title = document.createElement('em');
  title.textContent = label;
  const data = document.createElement('strong');
  data.textContent = value;
  stat.append(title, data);
  return stat;
}

function enemyKindLabel(kind: NonNullable<EnemyDefinitionMap[string]>['kind']): string {
  if (kind === 'boss') {
    return i18n.t('settings.enemyKindBoss');
  }
  if (kind === 'elite') {
    return i18n.t('settings.enemyKindElite');
  }
  return i18n.t('settings.enemyKindDrone');
}

function moduleSpec(id: string, level: number): ModulePreviewSpec {
  const detailLevel = Math.max(1, Math.min(ULTRA_LEVEL, level));
  const ultra = detailLevel >= ULTRA_LEVEL;
  const partCount = (base: number, gain: number, cap: number): number =>
    Math.min(cap, base + Math.floor(detailLevel * gain));
  const markerCount = (base: number, gain: number, cap: number): number =>
    Math.min(cap, base + Math.floor(detailLevel * gain));

  if (id === 'spread') {
    return { kind: 'wing', part: ultra ? 'blade' : 'rail', parts: partCount(2, 0.74, 7), signature: 'spread', signatureMarkers: markerCount(3, 0.34, 6) };
  }
  if (id === 'fork') {
    return { kind: 'wing', part: ultra ? 'blade' : 'rail', parts: partCount(2, 0.72, 7), signature: 'fork', signatureMarkers: markerCount(2, 0.42, 5) };
  }
  if (id === 'wing') {
    return { kind: 'wing', part: ultra ? 'blade' : 'rail', parts: partCount(2, 0.74, 7), signature: 'wing', signatureMarkers: markerCount(2, 0.38, 5) };
  }
  if (id === 'damage') {
    return { kind: 'nose', part: ultra ? 'prism' : 'barrel', parts: partCount(1, 0.68, 6), signature: 'damage', signatureMarkers: markerCount(2, 0.32, 4) };
  }
  if (id === 'pierce') {
    return { kind: 'nose', part: ultra ? 'prism' : 'barrel', parts: partCount(1, 0.68, 6), signature: 'pierce', signatureMarkers: markerCount(2, 0.42, 5) };
  }
  if (id === 'velocity') {
    return { kind: 'nose', part: ultra ? 'prism' : 'barrel', parts: partCount(1, 0.68, 6), signature: 'velocity', signatureMarkers: markerCount(2, 0.42, 5) };
  }
  if (id === 'heavy') {
    return { kind: 'nose', part: ultra ? 'prism' : 'barrel', parts: partCount(1, 0.68, 6), signature: 'heavy', signatureMarkers: markerCount(2, 0.3, 4) };
  }
  if (id === 'surge') {
    return { kind: 'nose', part: ultra ? 'prism' : 'barrel', parts: partCount(1, 0.68, 6), signature: 'surge', signatureMarkers: markerCount(2, 0.38, 5) };
  }
  if (id === 'critical') {
    return { kind: 'nose', part: ultra ? 'prism' : 'barrel', parts: partCount(1, 0.68, 6), signature: 'critical', signatureMarkers: markerCount(3, 0.28, 5) };
  }
  if (id === 'chain') {
    return { kind: 'nose', part: ultra ? 'prism' : 'barrel', parts: partCount(1, 0.68, 6), signature: 'chain', signatureMarkers: markerCount(2, 0.42, 5) };
  }
  if (id === 'rapid') {
    return { kind: 'tail', part: ultra ? 'pod' : 'vent', parts: partCount(1, 0.64, 6), signature: 'rapid', signatureMarkers: markerCount(2, 0.42, 5) };
  }
  if (id === 'capacitor') {
    return { kind: 'tail', part: ultra ? 'pod' : 'vent', parts: partCount(1, 0.64, 6), signature: 'capacitor', signatureMarkers: markerCount(2, 0.34, 5) };
  }
  if (id === 'arsenal') {
    return { kind: 'tail', part: ultra ? 'pod' : 'vent', parts: partCount(1, 0.64, 6), signature: 'arsenal', signatureMarkers: markerCount(2, 0.34, 5) };
  }
  if (id === 'pulse') {
    return { kind: 'tail', part: ultra ? 'pod' : 'vent', parts: partCount(1, 0.64, 6), signature: 'pulse', signatureMarkers: markerCount(2, 0.42, 5) };
  }
  if (id === 'shield') {
    return {
      kind: 'shield',
      part: ultra ? 'arc' : 'leaf',
      parts: partCount(2, 0.74, 7),
      signature: 'shield',
      signatureMarkers: markerCount(2, 0.42, 5)
    };
  }
  if (id === 'magnet') {
    return {
      kind: 'escort',
      part: ultra ? 'drone' : 'dock',
      parts: partCount(2, 0.62, 6),
      signature: 'magnet',
      signatureMarkers: markerCount(2, 0.42, 5)
    };
  }
  if (id === 'salvage') {
    return { kind: 'escort', part: ultra ? 'drone' : 'dock', parts: partCount(2, 0.62, 6), signature: 'salvage', signatureMarkers: markerCount(2, 0.34, 5) };
  }
  return {
    kind: 'support',
    part: ultra ? 'core' : 'cell',
    parts: partCount(1, 0.56, 5),
    signature: 'support',
    signatureMarkers: markerCount(1, 0.34, 4)
  };
}

function demoSpec(id: string, level: number): {
  bullets: number;
  delay: number;
  duration: number;
  effect: string;
  effects: number;
  lanes: number;
  markerSpread: number;
  markers: number;
  scale: number;
  shape: string;
  signature: string;
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
    markerSpread: ultra ? 18 : 14,
    markers: ultra ? 5 : 3,
    scale: ultra ? 1.2 : 1,
    shape: 'bolt',
    signature: id,
    spread: ultra ? 12 : 9
  };

  if (id === 'spread' || id === 'fork' || id === 'wing') {
    const lanes = Math.min(7, id === 'spread' ? level : Math.max(3, baseLanes));
    return { ...common, bullets: lanes * 3, lanes, markerSpread: id === 'fork' ? 22 : 18, spread: id === 'fork' ? 15 : 11 };
  }
  if (id === 'rapid' || id === 'critical') {
    return { ...common, bullets: ultra ? 18 : 10, delay: ultra ? 0.12 : 0.18, duration: 0.92, lanes: level > 3 ? 3 : 2, markerSpread: id === 'critical' ? 16 : 12, markers: ultra ? 7 : 4 };
  }
  if (id === 'damage' || id === 'heavy' || id === 'surge') {
    return { ...common, bullets: ultra ? 8 : 5, effect: 'burst', effects: ultra ? 5 : 3, lanes: id === 'surge' ? 1 : 2, markerSpread: id === 'surge' ? 12 : 16, scale: ultra ? 1.65 : 1.25, shape: 'shell' };
  }
  if (id === 'pierce' || id === 'velocity') {
    return { ...common, bullets: ultra ? 10 : 6, duration: ultra ? 0.78 : 1, effect: 'line', effects: ultra ? 4 : 2, lanes: level > 4 ? 3 : 1, markerSpread: id === 'velocity' ? 26 : 12, shape: 'rail' };
  }
  if (id === 'chain') {
    return { ...common, bullets: ultra ? 9 : 5, effect: 'arc', effects: ultra ? 6 : 3, lanes: 3, markerSpread: 18, markers: ultra ? 6 : 4 };
  }
  if (id === 'magnet' || id === 'salvage') {
    return { ...common, bullets: 3, duration: 1.35, effect: 'crystal', effects: ultra ? 7 : 4, lanes: 1, markerSpread: 20, shape: 'dot' };
  }
  if (id === 'shield') {
    return { ...common, bullets: 4, effect: 'shield', effects: ultra ? 4 : 2, lanes: 2, markerSpread: 14, shape: 'dot' };
  }
  if (id === 'pulse') {
    return { ...common, bullets: 3, effect: 'pulse', effects: ultra ? 4 : 2, lanes: 1, markerSpread: 18, shape: 'wave' };
  }
  if (id === 'capacitor' || id === 'arsenal') {
    return { ...common, bullets: ultra ? 7 : 4, effect: id === 'arsenal' ? 'bomb' : 'cooldown', effects: ultra ? 5 : 3, lanes: 1, markerSpread: id === 'arsenal' ? 20 : 13, shape: 'dot' };
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
