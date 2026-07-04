import { i18n } from './I18n';

export interface UpgradeOption {
  id: string;
  title: string;
  description: string;
  label: string;
}

interface UpgradePanelOptions {
  onChoose: (id: string) => void;
}

export class UpgradePanel {
  private readonly root = document.querySelector<HTMLDivElement>('#upgrade-panel');
  private readonly optionsRoot = document.querySelector<HTMLDivElement>('#upgrade-options');
  private readonly stage = document.querySelector<HTMLElement>('#upgrade-stage');
  private currentOptions: UpgradeOption[] = [];
  private currentStage = 1;

  constructor(private readonly options: UpgradePanelOptions) {
    i18n.subscribe(() => {
      i18n.applyStaticText();
      this.render();
    });
  }

  show(options: UpgradeOption[], stage: number): void {
    this.currentOptions = options;
    this.currentStage = stage;
    this.render();
    if (this.root) {
      this.root.hidden = false;
    }
  }

  hide(): void {
    if (this.root) {
      this.root.hidden = true;
    }
  }

  private render(): void {
    if (this.stage) {
      this.stage.textContent = i18n.t('upgrade.stage', { stage: this.currentStage });
    }
    if (this.optionsRoot) {
      this.optionsRoot.replaceChildren();
      for (const option of this.currentOptions) {
        const button = document.createElement('button');
        const label = document.createElement('span');
        const title = document.createElement('strong');
        const description = document.createElement('span');

        button.className = 'upgrade-panel__option';
        button.type = 'button';
        button.dataset.upgradeId = option.id;
        label.className = 'upgrade-panel__label';
        label.textContent = i18n.upgrade(option.id, 'label', option.label);
        title.textContent = i18n.upgrade(option.id, 'title', option.title);
        description.textContent = i18n.upgrade(option.id, 'description', option.description);
        button.append(label, title, description);
        button.addEventListener('click', () => this.options.onChoose(option.id));
        this.optionsRoot.append(button);
      }
    }
  }
}
