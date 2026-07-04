export interface EnemyDefinition {
  hp: number;
  speed: number;
  score: number;
  kind?: 'drone' | 'elite' | 'boss';
  radius?: number;
  scale?: number;
  supportInterval?: number;
  phaseThresholds?: number[];
}

export interface WeaponDefinition {
  fireRate: number;
  damage: number;
  speed: number;
  tracks: number[];
}

export interface WaveEventDefinition {
  time: number;
  type: string;
  count: number;
  path: string;
  interval?: number;
}

export interface UpgradeOptionDefinition {
  id: string;
  label: string;
  title: string;
  description: string;
}

export interface GameConfig {
  enemies: Record<string, EnemyDefinition>;
  playerWeapon: WeaponDefinition;
  stage: WaveEventDefinition[];
  upgrades: UpgradeOptionDefinition[];
}

interface WeaponConfigFile {
  player_basic?: WeaponDefinition;
}

interface UpgradeConfigFile {
  options?: UpgradeOptionDefinition[];
}

const CONFIG_BASE = '/config';

export async function loadGameConfig(): Promise<GameConfig> {
  const [enemies, weapons, waves, upgrades] = await Promise.all([
    fetchJson<Record<string, EnemyDefinition>>(`${CONFIG_BASE}/enemies.json`),
    fetchJson<WeaponConfigFile>(`${CONFIG_BASE}/weapons.json`),
    fetchJson<Record<string, WaveEventDefinition[]>>(`${CONFIG_BASE}/waves.json`),
    fetchJson<UpgradeConfigFile>(`${CONFIG_BASE}/upgrades.json`)
  ]);

  const playerWeapon = weapons.player_basic;
  const stage = waves.stage_01;
  const upgradeOptions = upgrades.options;
  if (!playerWeapon || !Array.isArray(stage) || !Array.isArray(upgradeOptions) || upgradeOptions.length < 3) {
    throw new Error('Invalid game config: missing player_basic weapon, stage_01 wave, or at least 3 upgrade options.');
  }

  return {
    enemies,
    playerWeapon,
    stage: [...stage].sort((a, b) => a.time - b.time),
    upgrades: upgradeOptions
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return (await response.json()) as T;
}
