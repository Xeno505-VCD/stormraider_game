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
  private readonly skill1 = document.querySelector<HTMLButtonElement>('#skill-shock');
  private readonly skill2 = document.querySelector<HTMLButtonElement>('#skill-burst');
  private readonly skill3 = document.querySelector<HTMLButtonElement>('#skill-missile');
  private readonly bomb = document.querySelector<HTMLButtonElement>('#skill-bomb');

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
    this.updateSkillButton(this.skill1, '1', state.cooldown1 ?? 0);
    this.updateSkillButton(this.skill2, '2', state.cooldown2 ?? 0);
    this.updateSkillButton(this.skill3, '3', state.cooldown3 ?? 0);
    if (this.bomb) {
      this.bomb.textContent = `SP ${state.bombs ?? 3}`;
      this.bomb.disabled = (state.bombs ?? 3) <= 0;
    }
  }

  private updateSkillButton(button: HTMLButtonElement | null, label: string, cooldown: number): void {
    if (!button) {
      return;
    }

    button.textContent = cooldown > 0 ? cooldown.toFixed(1) : label;
    button.disabled = cooldown > 0;
  }
}

function formatScore(score: number): string {
  return Math.max(0, Math.round(score)).toString().padStart(6, '0');
}
