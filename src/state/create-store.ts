import { useSyncExternalStore } from 'react';

export type Store<T> = {
  get: () => T;
  set: (next: T) => void;
  subscribe: (listener: () => void) => () => void;
};

// Module-level state shared across screens (no state library yet, see CLAUDE.md).
// Session-only by itself; src/state/persist.ts saves a store to localStorage (web), wired in _layout.tsx.
export function createStore<T>(initial: T): Store<T> {
  let value = initial;
  const listeners = new Set<() => void>();

  return {
    get: () => value,
    set: (next) => {
      if (Object.is(next, value)) return;
      value = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
