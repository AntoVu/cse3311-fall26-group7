import type { Store } from '@/state/create-store';
import { browserStorage, type KeyValueStorage } from '@/state/key-value-storage';

/**
 * Loads a store's saved value, then saves every change. Which storage is used is hidden behind
 * KeyValueStorage; the app uses the browser's localStorage.
 */
export function persist<T>(store: Store<T>, key: string, storage: KeyValueStorage = browserStorage): () => void {
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
