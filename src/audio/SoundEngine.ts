export type SoundEvent =
  'start' |
  'fire' |
  'hit' |
  'destroy' |
  'pickup' |
  'repair' |
  'damage' |
  'skill' |
  'upgradeOpen' |
  'upgradeChoose' |
  'pause' |
  'resume' |
  'complete';

const MUTED_STORAGE_KEY = 'stormraider.audio.muted';
const VOLUME_STORAGE_KEY = 'stormraider.audio.volume';

type SoundShape = {
  frequency: number;
  endFrequency: number;
  duration: number;
  gain: number;
  type: OscillatorType;
  cooldown: number;
};

const SHAPES: Record<SoundEvent, SoundShape> = {
  start: { frequency: 180, endFrequency: 440, duration: 0.18, gain: 0.13, type: 'sawtooth', cooldown: 0.08 },
  fire: { frequency: 760, endFrequency: 520, duration: 0.045, gain: 0.04, type: 'square', cooldown: 0.075 },
  hit: { frequency: 520, endFrequency: 800, duration: 0.065, gain: 0.06, type: 'triangle', cooldown: 0.045 },
  destroy: { frequency: 160, endFrequency: 72, duration: 0.2, gain: 0.11, type: 'sawtooth', cooldown: 0.065 },
  pickup: { frequency: 920, endFrequency: 1360, duration: 0.1, gain: 0.07, type: 'sine', cooldown: 0.045 },
  repair: { frequency: 480, endFrequency: 800, duration: 0.14, gain: 0.08, type: 'sine', cooldown: 0.08 },
  damage: { frequency: 190, endFrequency: 96, duration: 0.18, gain: 0.12, type: 'sawtooth', cooldown: 0.16 },
  skill: { frequency: 250, endFrequency: 660, duration: 0.22, gain: 0.105, type: 'triangle', cooldown: 0.18 },
  upgradeOpen: { frequency: 360, endFrequency: 920, duration: 0.24, gain: 0.11, type: 'sine', cooldown: 0.2 },
  upgradeChoose: { frequency: 760, endFrequency: 1240, duration: 0.16, gain: 0.105, type: 'triangle', cooldown: 0.12 },
  pause: { frequency: 360, endFrequency: 220, duration: 0.09, gain: 0.065, type: 'sine', cooldown: 0.08 },
  resume: { frequency: 260, endFrequency: 440, duration: 0.09, gain: 0.065, type: 'sine', cooldown: 0.08 },
  complete: { frequency: 210, endFrequency: 130, duration: 0.3, gain: 0.12, type: 'triangle', cooldown: 0.4 }
};

const MASTER_GAIN = 0.38;
const DEFAULT_VOLUME = 0.7;

export class SoundEngine {
  private context: AudioContext | null = null;
  private output: GainNode | null = null;
  private muted = localStorage.getItem(MUTED_STORAGE_KEY) === 'true';
  private volume = loadStoredVolume();
  private unlocked = false;
  private readonly lastPlayed = new Map<SoundEvent, number>();

  isMuted(): boolean {
    return this.muted;
  }

  getVolume(): number {
    return this.volume;
  }

  setVolume(volume: number): void {
    this.volume = clamp01(volume);
    localStorage.setItem(VOLUME_STORAGE_KEY, String(this.volume));
    this.syncOutputGain();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    localStorage.setItem(MUTED_STORAGE_KEY, String(muted));
    this.syncOutputGain();
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    if (!this.muted) {
      void this.unlockAndPlay('resume');
    }
    return this.muted;
  }

  async unlockAndPlay(event: SoundEvent): Promise<void> {
    await this.unlock();
    this.play(event);
  }

  async unlock(): Promise<void> {
    if (!this.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.context = new AudioContextClass();
      this.output = this.context.createGain();
      this.output.gain.value = this.outputGain();
      this.output.connect(this.context.destination);
    }

    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
    this.unlocked = true;
  }

  play(event: SoundEvent): void {
    if (this.muted || !this.context || !this.output || !this.unlocked) {
      return;
    }

    const shape = SHAPES[event];
    const now = this.context.currentTime;
    const last = this.lastPlayed.get(event) ?? -999;
    if (now - last < shape.cooldown) {
      return;
    }
    this.lastPlayed.set(event, now);

    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = shape.type;
    oscillator.frequency.setValueAtTime(shape.frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, shape.endFrequency), now + shape.duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(shape.gain, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + shape.duration);
    oscillator.connect(gain);
    gain.connect(this.output);
    oscillator.start(now);
    oscillator.stop(now + shape.duration + 0.02);
  }

  private syncOutputGain(): void {
    if (!this.output) {
      return;
    }
    this.output.gain.setTargetAtTime(this.outputGain(), this.context?.currentTime ?? 0, 0.02);
  }

  private outputGain(): number {
    return this.muted ? 0 : MASTER_GAIN * this.volume;
  }
}

function loadStoredVolume(): number {
  const stored = Number(localStorage.getItem(VOLUME_STORAGE_KEY));
  return Number.isFinite(stored) ? clamp01(stored) : DEFAULT_VOLUME;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
