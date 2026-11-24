import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { bulkAdd, deleteRow, putRow, saveSettings, wipeEverything } from './lib/db';
import { TABLES, type Settings, type TableName, type Tables } from './types';

type Row<T extends TableName> = Tables[T][number];

interface Store {
  tables: Tables;
  settings: Settings;
  save: <T extends TableName>(table: T, row: Row<T>) => Promise<number>;
  addMany: (data: Partial<Tables>) => Promise<void>;
  remove: (table: TableName, id: number) => Promise<void>;
  setSettings: (patch: Partial<Settings>) => Promise<void>;
  lock: () => void;
  wipe: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('Store not ready');
  return s;
}

export function StoreProvider(props: { cryptoKey: CryptoKey; initial: { tables: Tables; settings: Settings }; onLock: () => void; children: ReactNode }) {
  const { cryptoKey: key } = props;
  const [tables, setTables] = useState<Tables>(props.initial.tables);
  const [settings, setSettingsState] = useState<Settings>(props.initial.settings);

  const save = useCallback(async <T extends TableName>(table: T, row: Row<T>) => {
    const id = await putRow(key, table, row as { id?: number });
    setTables((prev) => {
      const list = prev[table] as Array<{ id?: number }>;
      const withId = { ...row, id };
      const next = row.id ? list.map((r) => (r.id === id ? withId : r)) : [...list, withId];
      return { ...prev, [table]: next };
    });
    return id;
  }, [key]);

  const addMany = useCallback(async (data: Partial<Tables>) => {
    const added: Partial<Record<TableName, object[]>> = {};
    for (const t of TABLES) {
      const rows = (data[t] ?? []) as object[];
      if (!rows.length) continue;
      const ids = await bulkAdd(key, t, rows);
      added[t] = rows.map((r, i) => ({ ...r, id: ids[i] }));
    }
    setTables((prev) => {
      const next = { ...prev } as Record<TableName, object[]>;
      for (const t of TABLES) if (added[t]) next[t] = [...(prev[t] as object[]), ...added[t]!];
      return next as unknown as Tables;
    });
  }, [key]);

  const remove = useCallback(async (table: TableName, id: number) => {
    await deleteRow(table, id);
    setTables((prev) => ({ ...prev, [table]: (prev[table] as Array<{ id?: number }>).filter((r) => r.id !== id) }));
  }, []);

  const settingsRef = useRef(settings);
  const setSettings = useCallback(async (patch: Partial<Settings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettingsState(next);
    await saveSettings(key, next);
  }, [key]);

  const wipe = useCallback(async () => {
    await wipeEverything();
    location.reload();
  }, []);

  const value = useMemo<Store>(() => ({ tables, settings, save, addMany, remove, setSettings, lock: props.onLock, wipe }), [tables, settings, save, addMany, remove, setSettings, props.onLock, wipe]);
  return <Ctx.Provider value={value}>{props.children}</Ctx.Provider>;
}
