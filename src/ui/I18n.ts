export type Language = 'en' | 'zh';

type Listener = () => void;

const STORAGE_KEY = 'stormraider.language';

const messages: Record<Language, Record<string, string>> = {
  en: {
    'canvas.label': 'Stormraider Game canvas',
    'hud.score': 'SCORE',
    'hud.best': 'BEST',
    'hud.hp': 'HP',
    'hud.bullets': 'BULLETS',
    'hud.enemies': 'ENEMIES',
    'hud.power': 'POWER',
    'hud.vfx': 'VFX',
    'hud.fire': 'FIRE',
    'hud.fireAuto': 'AUTO',
    'hud.fireOff': 'OFF',
    'hud.xpAria': 'Upgrade experience',
    'hud.healthAria': 'Player health',
    'hud.powerValue': 'POWER L{level} {charge}/{threshold}',
    'boss.name': 'BOSS // TEMPEST CORE',
    'boss.phase': 'PHASE {phase}',
    'upgrade.stage': 'UPGRADE {stage}',
    'upgrade.choose': 'Choose Module',
    'result.lastScore': 'LAST SCORE',
    'result.bestScore': 'BEST SCORE',
    'result.kills': 'KILLS',
    'result.survival': 'SURVIVAL',
    'result.resume': 'Resume',
    'result.restart': 'Restart',
    'result.paused': 'PAUSED',
    'result.manualEnd': 'MANUAL END',
    'result.destroyed': 'DESTROYED',
    'result.complete': 'RUN COMPLETE',
    'result.pauseTitle': 'Stormraider Holding Pattern',
    'result.completeTitle': 'Run Saved Locally',
    'settings.button': 'SET',
    'settings.title': 'Settings',
    'settings.close': 'Close settings',
    'settings.closeShort': 'X',
    'settings.language': 'Language',
    'boot.loading': 'LOADING STORMRAIDER',
    'boot.failed': 'BOOT FAILED',
    'start.eyebrow': 'PLAYTEST BUILD',
    'start.title': 'Stormraider',
    'start.body': 'Survive the storm lane, collect POWER, and shape your weapon before the Boss line breaks through.',
    'start.play': 'Start Run',
    'upgrade.spread.label': 'VECTOR',
    'upgrade.spread.title': 'Split Thunder',
    'upgrade.spread.description': 'Add one more firing lane, up to a five-lane storm.',
    'upgrade.damage.label': 'CORE',
    'upgrade.damage.title': 'Charged Rounds',
    'upgrade.damage.description': 'Increase bullet damage against elites and Boss armor.',
    'upgrade.rapid.label': 'ENGINE',
    'upgrade.rapid.title': 'Overclock',
    'upgrade.rapid.description': 'Reduce fire interval for denser sustained pressure.',
    'upgrade.velocity.label': 'RAIL',
    'upgrade.velocity.title': 'Ion Acceleration',
    'upgrade.velocity.description': 'Increase bullet speed and keep the screen cleaner.',
    'upgrade.pierce.label': 'LANCE',
    'upgrade.pierce.title': 'Piercing Current',
    'upgrade.pierce.description': 'Bullets punch through one more target before fading.',
    'upgrade.heavy.label': 'SHELL',
    'upgrade.heavy.title': 'Heavy Thunderhead',
    'upgrade.heavy.description': 'Bullets grow larger and hit harder, but travel slightly slower.',
    'upgrade.fork.label': 'FORK',
    'upgrade.fork.title': 'Forked Wake',
    'upgrade.fork.description': 'Widen side lanes so split shots carve a broader arc.',
    'upgrade.chain.label': 'ARC',
    'upgrade.chain.title': 'Storm Relay',
    'upgrade.chain.description': 'Destroyed enemies release a short-range lightning burst.',
    'upgrade.magnet.label': 'COIL',
    'upgrade.magnet.title': 'Graviton Coil',
    'upgrade.magnet.description': 'Extend pickup attraction and collect crystals more safely.',
    'upgrade.wing.label': 'WING',
    'upgrade.wing.title': 'Escort Vanes',
    'upgrade.wing.description': 'Add flanking wing shots that sweep wider lanes beside the main volley.',
    'upgrade.surge.label': 'SURGE',
    'upgrade.surge.title': 'Storm Capacitor',
    'upgrade.surge.description': 'Periodically fire an overcharged center bolt with extra impact radius.',
    'upgrade.capacitor.label': 'CD',
    'upgrade.capacitor.title': 'Flux Capacitor',
    'upgrade.capacitor.description': 'Shorten all skill cooldowns and keep emergency tools available more often.',
    'upgrade.arsenal.label': 'SP',
    'upgrade.arsenal.title': 'Reserve Arsenal',
    'upgrade.arsenal.description': 'Increase SP bomb capacity and immediately refill one bomb.'
  },
  zh: {
    'canvas.label': '雷霆战机游戏画布',
    'hud.score': '积分',
    'hud.best': '最高',
    'hud.hp': '生命',
    'hud.bullets': '子弹',
    'hud.enemies': '敌机',
    'hud.power': '能量',
    'hud.vfx': '特效',
    'hud.fire': '开火',
    'hud.fireAuto': '自动',
    'hud.fireOff': '关闭',
    'hud.xpAria': '升级经验',
    'hud.healthAria': '玩家生命值',
    'hud.powerValue': '能量 L{level} {charge}/{threshold}',
    'boss.name': '首领 // 风暴核心',
    'boss.phase': '阶段 {phase}',
    'upgrade.stage': '升级 {stage}',
    'upgrade.choose': '选择模块',
    'result.lastScore': '本局分数',
    'result.bestScore': '最高分数',
    'result.kills': '击杀',
    'result.survival': '生存',
    'result.resume': '继续',
    'result.restart': '重开',
    'result.paused': '暂停',
    'result.manualEnd': '手动结束',
    'result.destroyed': '已被击毁',
    'result.complete': '本局完成',
    'result.pauseTitle': '雷霆战机待命中',
    'result.completeTitle': '本局记录已保存',
    'settings.button': '设置',
    'settings.title': '设置',
    'settings.close': '关闭设置',
    'settings.closeShort': '关',
    'settings.language': '语言',
    'boot.loading': '正在载入雷霆战机',
    'boot.failed': '启动失败',
    'start.eyebrow': '试玩版本',
    'start.title': '雷霆战机',
    'start.body': '在雷暴航道中生存，收集能量，并在首领防线压下前塑造你的武器。',
    'start.play': '开始任务',
    'upgrade.spread.label': '分裂',
    'upgrade.spread.title': '裂雷分流',
    'upgrade.spread.description': '增加一条射击轨道，最终形成五线雷暴。',
    'upgrade.damage.label': '核心',
    'upgrade.damage.title': '充能弹芯',
    'upgrade.damage.description': '提高子弹伤害，更适合击穿精英与首领装甲。',
    'upgrade.rapid.label': '引擎',
    'upgrade.rapid.title': '超频连射',
    'upgrade.rapid.description': '缩短开火间隔，让持续火力更加密集。',
    'upgrade.velocity.label': '轨道',
    'upgrade.velocity.title': '离子加速',
    'upgrade.velocity.description': '提高子弹速度，更快清理屏幕威胁。',
    'upgrade.pierce.label': '长枪',
    'upgrade.pierce.title': '贯流电矛',
    'upgrade.pierce.description': '子弹命中后可继续贯穿额外目标。',
    'upgrade.heavy.label': '重弹',
    'upgrade.heavy.title': '雷云重弹',
    'upgrade.heavy.description': '子弹更大且伤害更高，但飞行速度略微降低。',
    'upgrade.fork.label': '分叉',
    'upgrade.fork.title': '分叉尾迹',
    'upgrade.fork.description': '扩大侧向弹道，让分裂射击覆盖更宽弧线。',
    'upgrade.chain.label': '电弧',
    'upgrade.chain.title': '风暴传导',
    'upgrade.chain.description': '击毁敌人后释放一次短距离连锁雷击。',
    'upgrade.magnet.label': '磁圈',
    'upgrade.magnet.title': '重力线圈',
    'upgrade.magnet.description': '提高拾取物吸附范围，让收集晶体更安全。',
    'upgrade.wing.label': '侧翼',
    'upgrade.wing.title': '护航翼片',
    'upgrade.wing.description': '增加侧翼护航弹，在主弹幕两侧扫出更宽的清场区域。',
    'upgrade.surge.label': '过载',
    'upgrade.surge.title': '风暴电容',
    'upgrade.surge.description': '周期性发射一枚过载中轴弹，拥有更高伤害和更大命中半径。',
    'upgrade.capacitor.label': '冷却',
    'upgrade.capacitor.title': '通量电容',
    'upgrade.capacitor.description': '缩短所有技能冷却，让紧急工具更频繁可用。',
    'upgrade.arsenal.label': 'SP',
    'upgrade.arsenal.title': '备用弹仓',
    'upgrade.arsenal.description': '提高 SP 炸弹容量，并立刻补充一枚炸弹。'
  }
};

class I18n {
  private language: Language = loadLanguage();
  private readonly listeners = new Set<Listener>();

  constructor() {
    this.applyDocumentLanguage();
  }

  getLanguage(): Language {
    return this.language;
  }

  setLanguage(language: Language): void {
    if (this.language === language) {
      return;
    }

    this.language = language;
    localStorage.setItem(STORAGE_KEY, language);
    this.applyDocumentLanguage();
    this.applyStaticText();
    for (const listener of this.listeners) {
      listener();
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  t(key: string, values?: Record<string, string | number>): string {
    const template = messages[this.language][key] ?? messages.en[key] ?? key;
    if (!values) {
      return template;
    }

    return Object.entries(values).reduce(
      (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
      template
    );
  }

  upgrade(id: string, field: 'label' | 'title' | 'description', fallback: string): string {
    const key = `upgrade.${id}.${field}`;
    const translated = messages[this.language][key] ?? messages.en[key];
    return translated ?? fallback;
  }

  translateReason(reason: string): string {
    if (reason === 'PAUSED') {
      return this.t('result.paused');
    }
    if (reason === 'MANUAL END') {
      return this.t('result.manualEnd');
    }
    if (reason === 'DESTROYED') {
      return this.t('result.destroyed');
    }
    if (reason === 'RUN COMPLETE') {
      return this.t('result.complete');
    }
    return reason;
  }

  applyStaticText(root: ParentNode = document): void {
    for (const element of root.querySelectorAll<HTMLElement>('[data-i18n]')) {
      const key = element.dataset.i18n;
      if (key) {
        element.textContent = this.t(key);
      }
    }

    for (const element of root.querySelectorAll<HTMLElement>('[data-i18n-aria-label]')) {
      const key = element.dataset.i18nAriaLabel;
      if (key) {
        element.setAttribute('aria-label', this.t(key));
      }
    }
  }

  private applyDocumentLanguage(): void {
    document.documentElement.lang = this.language === 'zh' ? 'zh-CN' : 'en';
  }
}

function loadLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'zh') {
    return stored;
  }
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export const i18n = new I18n();
