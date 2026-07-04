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

export interface GameConfig {
  enemies: Record<string, EnemyDefinition>;
  playerWeapon: WeaponDefinition;
  stage: WaveEventDefinition[];
}

interface WeaponConfigFile {
  player_basic?: WeaponDefinition;
}

const CONFIG_BASE = '/config';

export async function loadGameConfig(): Promise<GameConfig> {
  const [enemies, weapons, waves] = await Promise.all([
    fetchJson<Record<string, EnemyDefinition>>(`${CONFIG_BASE}/enemies.json`),
    fetchJson<WeaponConfigFile>(`${CONFIG_BASE}/weapons.json`),
    fetchJson<Record<string, WaveEventDefinition[]>>(`${CONFIG_BASE}/waves.json`)
  ]);

  const playerWeapon = weapons.player_basic;
  const stage = waves.stage_01;
  if (!playerWeapon || !Array.isArray(stage)) {
    throw new Error('Invalid game config: missing player_basic weapon or stage_01 wave.');
  }

  return {
    enemies,
    playerWeapon,
    stage: [...stage].sort((a, b) => a.time - b.time)
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return (await response.json()) as T;
}
