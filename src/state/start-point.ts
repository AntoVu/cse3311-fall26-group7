import { createStore, useStore } from '@/state/create-store';
import type { StartPoint } from '@/routing/start-point';

/**
 * Where routes start from, chosen in the start-point sheet. Null means the user has not
 * picked yet, and screens ask rather than guessing. Session-only, like the other stores here.
 */
export const startPointStore = createStore<StartPoint | null>(null);

export function useStartPoint(): StartPoint | null {
  return useStore(startPointStore);
}

export function setStartPoint(startPoint: StartPoint | null) {
  startPointStore.set(startPoint);
}
