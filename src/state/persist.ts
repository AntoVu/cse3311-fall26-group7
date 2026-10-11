import type { Store } from '@/state/create-store';

export function persist<T>(store: Store<T>, key: string): () => void {
  try {
    if (typeof localStorage === 'undefined') {
      return () => {};
    }

    const saved = localStorage.getItem(key);

    if (saved !== null) {
      store.set(JSON.parse(saved) as T);
    }

    return store.subscribe(() => {
      try {
        localStorage.setItem(key, JSON.stringify(store.get()));
      } catch {
        // Keep the app working if storage is unavailable.
      }
    });
  } catch {
    // Ignore missing or corrupt saved data.
    return () => {};
  }
}