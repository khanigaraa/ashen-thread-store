/**
 * Storage adapter used by the shop core. The demo uses browser storage;
 * tests use memory. A real backend can replace this later.
 */
export interface StorageAdapter {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
}

export function memoryStorage(): StorageAdapter {
  const data = new Map<string, string>();
  return {
    get<T>(key: string) {
      const raw = data.get(key);
      return raw === undefined ? undefined : (JSON.parse(raw) as T);
    },
    set(key, value) {
      data.set(key, JSON.stringify(value));
    },
    remove(key) {
      data.delete(key);
    },
  };
}

/**
 * localStorage-backed adapter. Falls back to memory when storage is
 * unavailable (private mode, blocked site data).
 */
export function browserStorage(prefix = 'th:'): StorageAdapter {
  const fallback = memoryStorage();
  let ls: Storage | undefined;
  try {
    ls = window.localStorage;
    const probe = `${prefix}__probe`;
    ls.setItem(probe, '1');
    ls.removeItem(probe);
  } catch {
    ls = undefined;
  }
  if (!ls) return fallback;
  const store = ls;

  return {
    get<T>(key: string) {
      try {
        const raw = store.getItem(prefix + key);
        return raw === null ? undefined : (JSON.parse(raw) as T);
      } catch {
        return fallback.get<T>(key);
      }
    },
    set(key, value) {
      try {
        store.setItem(prefix + key, JSON.stringify(value));
      } catch {
        fallback.set(key, value);
      }
    },
    remove(key) {
      try {
        store.removeItem(prefix + key);
      } catch {
        fallback.remove(key);
      }
    },
  };
}
