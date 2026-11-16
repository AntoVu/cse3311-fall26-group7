import type { Store } from '@/state/create-store';
import { browserStorage, type KeyValueStorage } from '@/state/key-value-storage';

/**
 * Every key the app saves, so Reset Mavigator can remove exactly those: the live site shares its
 * storage with the team's other tools on the same github.io address. ScheduleProvider saves the
 * class list itself; persist() adds the rest as they are wired up.
 */
export const savedKeys = new Set<string>(['schedule']);

/** Removes everything the app saved, as if this were a new user. The caller reloads the page. */
export function forgetEverything(storage: KeyValueStorage = browserStorage) {
  for (const key of savedKeys) storage.removeItem(key);
}

/**
 * Loads a store's saved value, then saves every change. Which storage is used is hidden behind
 * KeyValueStorage; the app uses the browser's localStorage.
 */
export function persist<T>(store: Store<T>, key: string, storage: KeyValueStorage = browserStorage): () => void {
  savedKeys.add(key);
  try {
    const saved = storage.getItem(key);

    if (saved !== null) {
      store.set(JSON.parse(saved) as T);
    }

    return store.subscribe(() => {
      try {
        storage.setItem(key, JSON.stringify(store.get()));
      } catch {
        // Keep the app working if storage is unavailable.
      }
    });
  } catch {
    // Ignore missing or corrupt saved data.
    return () => {};
  }
}
