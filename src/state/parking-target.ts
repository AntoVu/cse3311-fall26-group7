import { createStore, useStore } from '@/state/create-store';

/**
 * The building picked on the Parking tab to park for (a POI id), instead of the next class.
 * Session-only: a visit that isn't for a class is a one-off.
 */
export const parkingTargetStore = createStore<string | null>(null);

export function useParkingTarget(): string | null {
  return useStore(parkingTargetStore);
}
