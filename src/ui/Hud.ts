import { i18n } from './I18n';

interface HudState {
  score: number;
  bestScore: number;
  hp: number;
  activeBullets?: number;
  bulletPoolSize?: number;
  activeEnemies?: number;
  enemyPoolSize?: number;
  activeExplosions?: number;
  explosionPoolSize?: number;
  hitCount?: number;
  destroyedCount?: number;
  damageTaken?: number;
  bombs?: number;
  cooldown1?: number;
  cooldown2?: number;
  cooldown3?: number;
  bossActive?: boolean;
  bossHp?: number;
  bossMaxHp?: number;
  bossPhase?: number;
  upgradeCharge?: number;
  upgradeThreshold?: number;
  weaponLevel?: number;
  firing?: boolean;
}

export class Hud {
  private readonly score = document.querySelector<HTMLElement>('#hud-score');
  private readonly best = document.querySelector<HTMLElement>('#hud-best');
  private readonly hpText = document.querySelector<HTMLElement>('#hud-hp-text');
  private readonly hpBar = document.querySelector<HTMLElement>('#hud-hp-bar');
  private readonly hpLossBar = document.querySelector<HTMLElement>('#hud-hp-loss-bar');
  private readonly health = document.querySelector<HTMLElement>('.hud__health');
  private readonly bullets = document.querySelector<HTMLElement>('#hud-bullets');
  private readonly enemies = document.querySelector<HTMLElement>('#hud-enemies');
  private readonly effects = document.querySelector<HTMLElement>('#hud-effects');
  private readonly fire = document.querySelector<HTMLElement>('#hud-fire');
  private readonly xpBar = document.querySelector<HTMLElement>('#hud-xp-bar');
  private readonly xpText = document.querySelector<HTMLElement>('#hud-xp-text');
  private readonly skill1 = document.querySelector<HTMLButtonElement>('#skill-shock');
  private readonly skill2 = document.querySelector<HTMLButtonElement>('#skill-burst');
  private readonly skill3 = document.querySelector<HTMLButtonElement>('#skill-missile');
  private readonly bomb = document.querySelector<HTMLButtonElement>('#skill-bomb');
  private readonly bossPanel = document.querySelector<HTMLElement>('#boss-panel');
  private readonly bossPhase = document.querySelector<HTMLElement>('#boss-phase');
  private readonly bossHpBar = document.querySelector<HTMLElement>('#boss-hp-bar');
  private readonly bossHpText = document.querySelector<HTMLElement>('#boss-hp-text');
  private lastState: HudState | null = null;
  private lastHpRatio = 1;
  private previousBossActive = false;
  private previousBossPhase = 0;
  private healthTrailTimer = 0;
  private bossAnimationTimer = 0;

  constructor() {
    i18n.subscribe(() => {
      i18n.applyStaticText();
      if (this.lastState) {
        this.update(this.lastState);
      }
    });
  }

  update(state: HudState): void {
    this.lastState = state;
    if (this.score) {
      this.score.textContent = formatScore(state.score);
    }
    if (this.best) {
      this.best.textContent = formatScore(state.bestScore);
    }
    this.updateHealthBar(state.hp, state.damageTaken ?? 0);
    if (this.bullets) {
      this.bullets.textContent = `${state.activeBullets ?? 0}/${state.bulletPoolSize ?? 0}`;
    }
    if (this.enemies) {
      this.enemies.textContent = `${state.activeEnemies ?? 0}/${state.enemyPoolSize ?? 0}`;
    }
    if (this.effects) {
      this.effects.textContent = `${state.activeExplosions ?? 0}/${state.explosionPoolSize ?? 0}`;
      this.effects.classList.toggle('hud__value--hot', (state.destroyedCount ?? 0) > 0);
    }
    if (this.fire) {
      this.fire.textContent = state.firing ? i18n.t('hud.fireAuto') : i18n.t('hud.fireOff');
    }
    const charge = Math.max(0, Math.floor(state.upgradeCharge ?? 0));
    const threshold = Math.max(1, Math.floor(state.upgradeThreshold ?? 6));
    const level = Math.max(1, Math.floor(state.weaponLevel ?? 1));
    this.updateXpBar(charge, threshold, level);
    this.updateSkillButton(this.skill1, '1', state.cooldown1 ?? 0);
    this.updateSkillButton(this.skill2, '2', state.cooldown2 ?? 0);
    this.updateSkillButton(this.skill3, '3', state.cooldown3 ?? 0);
    if (this.bomb) {
      this.bomb.textContent = `SP ${state.bombs ?? 3}`;
      this.bomb.disabled = (state.bombs ?? 3) <= 0;
    }
    this.updateBossPanel(state);
  }

  private updateSkillButton(button: HTMLButtonElement | null, label: string, cooldown: number): void {
    if (!button) {
      return;
    }

    button.textContent = cooldown > 0 ? cooldown.toFixed(1) : label;
    button.disabled = cooldown > 0;
  }

  private updateXpBar(charge: number, threshold: number, level: number): void {
    const ratio = Math.max(0, Math.min(1, charge / threshold));
    if (this.xpBar) {
      this.xpBar.style.transform = `scaleX(${ratio})`;
      this.xpBar.classList.toggle('hud__xp-bar--ready', ratio >= 1);
    }
    if (this.xpText) {
      this.xpText.textContent = i18n.t('hud.powerValue', { level, charge, threshold });
      this.xpText.classList.toggle('hud__xp-text--ready', ratio >= 0.82);
    }
  }

  private updateHealthBar(hpValue: number, damageTaken: number): void {
    const hp = Math.max(0, Math.min(100, Math.round(hpValue)));
    const ratio = hp / 100;
    const level = healthLevel(hp);
    if (this.hpText) {
      this.hpText.textContent = `${hp}/100`;
    }
    if (this.health) {
      this.health.dataset.healthLevel = level;
      this.health.classList.toggle('hud__health--hit', damageTaken > 0);
    }
    if (this.hpBar) {
      this.hpBar.style.transform = `scaleX(${ratio})`;
    }
    if (this.hpLossBar) {
      if (ratio > this.lastHpRatio) {
        this.hpLossBar.style.transitionDuration = '180ms';
        this.hpLossBar.style.transform = `scaleX(${ratio})`;
      } else if (ratio < this.lastHpRatio) {
        this.hpLossBar.style.transitionDuration = '0ms';
        this.hpLossBar.style.transform = `scaleX(${this.lastHpRatio})`;
        window.clearTimeout(this.healthTrailTimer);
        this.healthTrailTimer = window.setTimeout(() => {
          if (this.hpLossBar) {
            this.hpLossBar.style.transitionDuration = '520ms';
            this.hpLossBar.style.transform = `scaleX(${ratio})`;
          }
        }, 130);
      }
    }

    this.lastHpRatio = ratio;
  }

  private updateBossPanel(state: HudState): void {
    const bossActive = state.bossActive === true && (state.bossMaxHp ?? 0) > 0;
    if (this.bossPanel) {
      this.bossPanel.hidden = !bossActive;
    }
    if (!bossActive) {
      this.previousBossActive = false;
      this.previousBossPhase = 0;
      return;
    }

    const hp = Math.max(0, state.bossHp ?? 0);
    const maxHp = Math.max(1, state.bossMaxHp ?? 1);
    const ratio = Math.max(0, Math.min(1, hp / maxHp));
    const phase = state.bossPhase ?? 1;
    if (!this.previousBossActive) {
      this.flashBossPanel('boss-panel--enter');
    } else if (phase > this.previousBossPhase) {
      this.flashBossPanel('boss-panel--phase-shift');
    }
    this.previousBossActive = true;
    this.previousBossPhase = phase;
    if (this.bossPhase) {
      this.bossPhase.textContent = i18n.t('boss.phase', { phase });
      this.bossPhase.classList.toggle('boss-panel__phase--hot', phase >= 3);
    }
    if (this.bossHpBar) {
      this.bossHpBar.style.transform = `scaleX(${ratio})`;
    }
    if (this.bossHpText) {
      this.bossHpText.textContent = `${Math.ceil(hp)}/${Math.ceil(maxHp)}`;
    }
  }

  private flashBossPanel(className: string): void {
    if (!this.bossPanel) {
      return;
    }

    this.bossPanel.classList.remove('boss-panel--enter', 'boss-panel--phase-shift');
    void this.bossPanel.offsetWidth;
    this.bossPanel.classList.add(className);
    window.clearTimeout(this.bossAnimationTimer);
    this.bossAnimationTimer = window.setTimeout(() => {
      this.bossPanel?.classList.remove(className);
    }, 760);
  }
}

function formatScore(score: number): string {
  return Math.max(0, Math.round(score)).toString().padStart(6, '0');
}

function healthLevel(hp: number): string {
  if (hp < 20) {
    return 'critical';
  }
  if (hp < 45) {
    return 'danger';
  }
  if (hp < 75) {
    return 'warn';
  }
  return 'safe';
}
