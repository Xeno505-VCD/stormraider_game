export interface RunRecord {
  score: number;
  wave: number;
  survivalSeconds: number;
  kills: number;
  playedAt: string;
  upgrades?: RunUpgradeRecord[];
}

export interface RunUpgradeRecord {
  id: string;
  label: string;
  title: string;
  stage: number;
}

export interface StoredRecords {
  last: RunRecord | null;
  best: RunRecord;
}

const DB_NAME = 'stormraider_game';
const STORE_NAME = 'records';
const RECORD_KEY = 'solo_records';
const DB_VERSION = 1;

export class LocalRunStore {
  static emptyRecords(): StoredRecords {
    return {
      last: null,
      best: {
        score: 0,
        wave: 0,
        survivalSeconds: 0,
        kills: 0,
        playedAt: ''
      }
    };
  }

  async load(): Promise<StoredRecords> {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(RECORD_KEY);
      request.addEventListener('success', () => {
        resolve((request.result as StoredRecords | undefined) ?? LocalRunStore.emptyRecords());
      });
      request.addEventListener('error', () => reject(request.error));
    });
  }

  async saveLastRun(record: RunRecord): Promise<void> {
    const current = await this.load();
    const next: StoredRecords = {
      last: record,
      best: record.score > current.best.score ? record : current.best
    };
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(next, RECORD_KEY);
      transaction.addEventListener('complete', () => resolve());
      transaction.addEventListener('error', () => reject(transaction.error));
    });
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.addEventListener('upgradeneeded', () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    });
    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () => reject(request.error));
  });
}
