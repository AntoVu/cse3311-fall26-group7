/**
 * Where saved settings live. persist() and ScheduleProvider only need to read and write strings
 * by key, so they depend on this interface rather than on the browser's localStorage directly.
 * That hides which storage is used: the web build passes browserStorage, tests pass memoryStorage(),
 * and a native storage can be added later without changing the code that saves.
 */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** The browser's localStorage. Reads return null and writes do nothing where it does not exist (native). */
export const browserStorage: KeyValueStorage = {
  getItem: (key) => (typeof localStorage === 'undefined' ? null : localStorage.getItem(key)),
  setItem: (key, value) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  },
};

/** An in-memory storage, for tests. */
export function memoryStorage(): KeyValueStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}
