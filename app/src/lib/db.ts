import Dexie, { type Table } from 'dexie';
import { deriveKey, open, randomSalt, seal, type Sealed } from './crypto';
import { DEFAULT_SETTINGS, TABLES, type Settings, type TableName, type Tables } from '../types';

// Every row is stored encrypted: only an auto-increment id is visible in IndexedDB.
interface EncRow extends Sealed { id?: number }
interface MetaRow { key: string; value?: unknown; iv?: Uint8Array<ArrayBuffer>; ct?: ArrayBuffer }

class IshtarDB extends Dexie {
  meta!: Table<MetaRow, string>;
  cycles!: Table<EncRow, number>;
  dailyLogs!: Table<EncRow, number>;
  checkIns!: Table<EncRow, number>;
  journal!: Table<EncRow, number>;
  perimenopause!: Table<EncRow, number>;
  meds!: Table<EncRow, number>;
  consents!: Table<EncRow, number>;
  insights!: Table<EncRow, number>;
  constructor() {
    super('ishtar');
    const stores: Record<string, string> = { meta: 'key' };
    for (const t of TABLES) stores[t] = '++id';
    this.version(1).stores(stores);
  }
}

export const db = new IshtarDB();
const VERIFIER = 'ishtar-ok';

export async function hasPin(): Promise<boolean> {
  return !!(await db.meta.get('salt'));
}

export async function createPin(pin: string): Promise<CryptoKey> {
  const salt = randomSalt();
  const key = await deriveKey(pin, salt);
  const v = await seal(key, VERIFIER);
  await db.meta.bulkPut([{ key: 'salt', value: salt }, { key: 'verifier', ...v }]);
  return key;
}

/** Returns the key if the PIN is right, otherwise null. */
export async function unlock(pin: string): Promise<CryptoKey | null> {
  const salt = (await db.meta.get('salt'))?.value as Uint8Array<ArrayBuffer> | undefined;
  const ver = await db.meta.get('verifier');
  if (!salt || !ver?.iv || !ver.ct) return null;
  const key = await deriveKey(pin, salt);
  try {
    const v = await open<string>(key, { iv: ver.iv, ct: ver.ct });
    return v === VERIFIER ? key : null;
  } catch {
    return null;
  }
}

export async function loadAll(key: CryptoKey): Promise<{ tables: Tables; settings: Settings }> {
  const tables = {} as Tables;
  for (const t of TABLES) {
    const rows = await db[t].toArray();
    const out = await Promise.all(rows.map(async (r) => ({ ...(await open<object>(key, r)), id: r.id })));
    (tables as unknown as Record<string, unknown[]>)[t] = out;
  }
  const s = await db.meta.get('settings');
  const settings = s?.iv && s.ct ? { ...DEFAULT_SETTINGS, ...(await open<Settings>(key, { iv: s.iv, ct: s.ct })) } : DEFAULT_SETTINGS;
  return { tables, settings };
}

export async function putRow(key: CryptoKey, table: TableName, row: { id?: number }): Promise<number> {
  const { id, ...data } = row;
  const sealed = await seal(key, data);
  return id ? (await db[table].put({ ...sealed, id }), id) : (db[table].add(sealed) as Promise<number>);
}

export async function bulkAdd(key: CryptoKey, table: TableName, rows: object[]): Promise<number[]> {
  const sealed = await Promise.all(rows.map((r) => seal(key, r)));
  return db[table].bulkAdd(sealed, { allKeys: true }) as Promise<number[]>;
}

export async function deleteRow(table: TableName, id: number) {
  await db[table].delete(id);
}

export async function saveSettings(key: CryptoKey, settings: Settings) {
  const sealed = await seal(key, settings);
  await db.meta.put({ key: 'settings', ...sealed });
}

/** One-tap "delete all my data": removes the whole database, PIN included. */
export async function wipeEverything() {
  db.close();
  await Dexie.delete('ishtar');
  try {
    localStorage.clear();
  } catch {
    /* ignore */
  }
}
