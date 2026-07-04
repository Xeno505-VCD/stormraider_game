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
  private readonly hp = document.querySelector<HTMLElement>('#hud-hp');
  private readonly bullets = document.querySelector<HTMLElement>('#hud-bullets');
  private readonly enemies = document.querySelector<HTMLElement>('#hud-enemies');
  private readonly effects = document.querySelector<HTMLElement>('#hud-effects');
  private readonly fire = document.querySelector<HTMLElement>('#hud-fire');
  private readonly power = document.querySelector<HTMLElement>('#hud-power');
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

  update(state: HudState): void {
    if (this.score) {
      this.score.textContent = formatScore(state.score);
    }
    if (this.best) {
      this.best.textContent = formatScore(state.bestScore);
    }
    if (this.hp) {
      this.hp.textContent = String(Math.max(0, Math.round(state.hp)));
      this.hp.classList.toggle('hud__value--danger', (state.damageTaken ?? 0) > 0 || state.hp <= 30);
    }
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
      this.fire.textContent = state.firing ? 'AUTO' : 'OFF';
    }
    if (this.power) {
      const charge = Math.max(0, Math.floor(state.upgradeCharge ?? 0));
      const threshold = Math.max(1, Math.floor(state.upgradeThreshold ?? 6));
      const level = Math.max(1, Math.floor(state.weaponLevel ?? 1));
      this.power.textContent = `L${level} ${charge}/${threshold}`;
      this.power.classList.toggle('hud__value--hot', charge >= threshold - 2);
      this.updateXpBar(charge, threshold, level);
    }
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
      this.xpText.textContent = `L${level} ${charge}/${threshold}`;
      this.xpText.classList.toggle('hud__xp-text--ready', ratio >= 0.82);
    }
  }

  private updateBossPanel(state: HudState): void {
    const bossActive = state.bossActive === true && (state.bossMaxHp ?? 0) > 0;
    if (this.bossPanel) {
      this.bossPanel.hidden = !bossActive;
    }
    if (!bossActive) {
      return;
    }

    const hp = Math.max(0, state.bossHp ?? 0);
    const maxHp = Math.max(1, state.bossMaxHp ?? 1);
    const ratio = Math.max(0, Math.min(1, hp / maxHp));
    if (this.bossPhase) {
      this.bossPhase.textContent = `PHASE ${state.bossPhase ?? 1}`;
      this.bossPhase.classList.toggle('boss-panel__phase--hot', (state.bossPhase ?? 1) >= 3);
    }
    if (this.bossHpBar) {
      this.bossHpBar.style.transform = `scaleX(${ratio})`;
    }
    if (this.bossHpText) {
      this.bossHpText.textContent = `${Math.ceil(hp)}/${Math.ceil(maxHp)}`;
    }
  }
}

function formatScore(score: number): string {
  return Math.max(0, Math.round(score)).toString().padStart(6, '0');
}
