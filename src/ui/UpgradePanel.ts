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

  constructor(private readonly options: UpgradePanelOptions) {}

  show(options: UpgradeOption[], stage: number): void {
    if (this.stage) {
      this.stage.textContent = `UPGRADE ${stage}`;
    }
    if (this.optionsRoot) {
      this.optionsRoot.replaceChildren();
      for (const option of options) {
        const button = document.createElement('button');
        const label = document.createElement('span');
        const title = document.createElement('strong');
        const description = document.createElement('span');

        button.className = 'upgrade-panel__option';
        button.type = 'button';
        button.dataset.upgradeId = option.id;
        label.className = 'upgrade-panel__label';
        label.textContent = option.label;
        title.textContent = option.title;
        description.textContent = option.description;
        button.append(label, title, description);
        button.addEventListener('click', () => this.options.onChoose(option.id));
        this.optionsRoot.append(button);
      }
    }
    if (this.root) {
      this.root.hidden = false;
    }
  }

  hide(): void {
    if (this.root) {
      this.root.hidden = true;
    }
  }
}
