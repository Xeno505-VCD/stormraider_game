export interface InputState {
  moveX: number;
  moveY: number;
  firing: boolean;
  pausePressed: boolean;
  endRunPressed: boolean;
  skill1Pressed: boolean;
  skill2Pressed: boolean;
  skill3Pressed: boolean;
  bombPressed: boolean;
  autoSkills: boolean;
}

export class InputRouter {
  private readonly keys = new Set<string>();
  private autoFire = true;
  private autoSkills = true;
  private pausePressed = false;
  private endRunPressed = false;
  private skill1Pressed = false;
  private skill2Pressed = false;
  private skill3Pressed = false;
  private bombPressed = false;
  private pointerActive = false;
  private pointerStartX = 0;
  private pointerStartY = 0;
  private pointerX = 0;
  private pointerY = 0;

  attach(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('pointerdown', this.handlePointerDown, { passive: true });
    window.addEventListener('pointermove', this.handlePointerMove, { passive: true });
    window.addEventListener('pointerup', this.handlePointerUp, { passive: true });
    window.addEventListener('pointercancel', this.handlePointerUp, { passive: true });
    document.querySelector('#skill-shock')?.addEventListener('click', () => {
      this.skill1Pressed = true;
    });
    document.querySelector('#skill-burst')?.addEventListener('click', () => {
      this.skill2Pressed = true;
    });
    document.querySelector('#skill-missile')?.addEventListener('click', () => {
      this.skill3Pressed = true;
    });
    document.querySelector('#skill-bomb')?.addEventListener('click', () => {
      this.bombPressed = true;
    });
  }

  snapshot(): InputState {
    let moveX = axis(this.keys.has('KeyD') || this.keys.has('ArrowRight'), this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    let moveY = axis(this.keys.has('KeyW') || this.keys.has('ArrowUp'), this.keys.has('KeyS') || this.keys.has('ArrowDown'));

    if (this.pointerActive) {
      moveX = clamp((this.pointerX - this.pointerStartX) / 90, -1, 1);
      moveY = clamp(-(this.pointerY - this.pointerStartY) / 90, -1, 1);
    }

    const state = {
      moveX,
      moveY,
      firing: this.autoFire || this.keys.has('KeyJ') || this.pointerActive,
      pausePressed: this.pausePressed,
      endRunPressed: this.endRunPressed,
      skill1Pressed: this.skill1Pressed,
      skill2Pressed: this.skill2Pressed,
      skill3Pressed: this.skill3Pressed,
      bombPressed: this.bombPressed,
      autoSkills: this.autoSkills
    };
    this.pausePressed = false;
    this.endRunPressed = false;
    this.skill1Pressed = false;
    this.skill2Pressed = false;
    this.skill3Pressed = false;
    this.bombPressed = false;
    return state;
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'KeyF' && !this.keys.has('KeyF')) {
      this.autoFire = !this.autoFire;
    }
    if (event.code === 'KeyT' && !this.keys.has('KeyT')) {
      this.autoSkills = !this.autoSkills;
    }
    if (event.code === 'Escape' && !this.keys.has('Escape')) {
      this.pausePressed = true;
    }
    if (event.code === 'KeyR' && !this.keys.has('KeyR')) {
      this.endRunPressed = true;
    }
    if (event.code === 'Digit1' && !this.keys.has('Digit1')) {
      this.skill1Pressed = true;
    }
    if (event.code === 'Digit2' && !this.keys.has('Digit2')) {
      this.skill2Pressed = true;
    }
    if (event.code === 'Digit3' && !this.keys.has('Digit3')) {
      this.skill3Pressed = true;
    }
    if (event.code === 'Space' && !this.keys.has('Space')) {
      this.bombPressed = true;
    }
    this.keys.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (isHudControl(event.target)) {
      return;
    }
    this.pointerActive = true;
    this.pointerStartX = event.clientX;
    this.pointerStartY = event.clientY;
    this.pointerX = event.clientX;
    this.pointerY = event.clientY;
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (!this.pointerActive) {
      return;
    }
    this.pointerX = event.clientX;
    this.pointerY = event.clientY;
  };

  private readonly handlePointerUp = (): void => {
    this.pointerActive = false;
  };
}

function axis(positive: boolean, negative: boolean): number {
  if (positive === negative) {
    return 0;
  }
  return positive ? 1 : -1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isHudControl(target: EventTarget | null): boolean {
  return target instanceof HTMLElement &&
    target.closest('.hud__button, .settings-button, .settings-panel, .start-panel, .upgrade-panel, .result-panel') != null;
}
